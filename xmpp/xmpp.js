const WebSocket = require("ws").Server;
const XMLBuilder = require("xmlbuilder");
const XMLParser = require("xml-parser");
const express = require("express");
const app = express();

const log = require("../structs/log.js");
const functions = require("../structs/functions.js");

const tokens = require("../model/tokens.js");
const User = require("../model/user.js");
const Friends = require("../model/friends.js");

const port = 80;
const wss = new WebSocket({ server: app.listen(port, () => log.xmpp(`XMPP and Matchmaker started listening on port ${port}`)) });
const matchmaker = require("../matchmaker/matchmaker.js");

global.Clients = [];

// multi user chat rooms (global chat/party chat)
global.MUCs = [];

app.get("/", (req, res) => {
    res.set("Content-Type", "text/plain");

    var data = JSON.stringify({
        "Clients": {
            "amount": global.Clients.length,
            "clients": global.Clients.map(i => i.displayName)
        }
    }, null, 2);

    res.send(data);
})

app.get("/clients", (req, res) => {
    res.set("Content-Type", "text/plain");
    
    var data = JSON.stringify({
        "amount": global.Clients.length,
        "clients": global.Clients.map(i => i.displayName)
    }, null, 2);
    
    res.send(data);
})

wss.on('connection', async (ws) => {
    // Start matchmaker if it's not connecting for xmpp.
    if (ws.protocol.toLowerCase() != "xmpp") return matchmaker(ws);

    var accountId = "";
    var displayName = "";
    var token = "";
    var jid = "";
    var resource = "";
    var ID = functions.MakeID();
    var Authenticated = false;

    ws.on('message', async (message) => {
        if (Buffer.isBuffer(message)) message = message.toString();
        const msg = XMLParser(message);
        if (!msg || !msg.root || !msg.root.name) return Error(ws);

        switch (msg.root.name) {
            case "open":
                ws.send(XMLBuilder.create("open")
                .attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-framing")
                .attribute("from", "prod.ol.epicgames.com")
                .attribute("id", ID)
                .attribute("version", "1.0")
                .attribute("xml:lang", "en").toString())
                
                if (Authenticated == true) {
                    ws.send(XMLBuilder.create("stream:features").attribute("xmlns:stream", "http://etherx.jabber.org/streams")
                    .element("ver").attribute("xmlns", "urn:xmpp:features:rosterver").up()
                    .element("starttls").attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-tls").up()
                    .element("bind").attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-bind").up()
                    .element("compression").attribute("xmlns", "http://jabber.org/features/compress")
                    .element("method", "zlib").up().up()
                    .element("session").attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-session").up().toString())
                } else {
                    ws.send(XMLBuilder.create("stream:features").attribute("xmlns:stream", "http://etherx.jabber.org/streams")
                    .element("mechanisms").attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-sasl")
                    .element("mechanism", "PLAIN").up().up()
                    .element("ver").attribute("xmlns", "urn:xmpp:features:rosterver").up()
                    .element("starttls").attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-tls").up()
                    .element("compression").attribute("xmlns", "http://jabber.org/features/compress")
                    .element("method", "zlib").up().up()
                    .element("auth").attribute("xmlns", "http://jabber.org/features/iq-auth").up().toString())
                }
            break;

            case "auth":
                if (global.Clients.find(i => i.client == ws) || accountId) return;
                if (!msg.root.content) return Error(ws);
                if (!functions.DecodeBase64(msg.root.content)) return Error(ws);
                if (!functions.DecodeBase64(msg.root.content).includes("\u0000")) return Error(ws);

                var jwtTokens = await tokens.findOne({ accessTokens: { $exists: true }, refreshTokens: { $exists: true }, clientTokens: { $exists: true } });

                var decodedBase64 = functions.DecodeBase64(msg.root.content).split("\u0000");
                var object = jwtTokens.accessTokens.find(i => i.token == decodedBase64[2]);
                if (!object) return Error(ws);

                var user = await User.findOne({ accountId: object.accountId });

                if (global.Clients.find(i => i.accountId == user.accountId)) return Error(ws);

                accountId = user.accountId;
                displayName = user.username;
                token = object.token;

                if (decodedBase64 && accountId && displayName && token && decodedBase64.length == 3) {
                    Authenticated = true;
                    log.xmpp(`An xmpp client with the displayName ${displayName} has logged in.`);

                    ws.send(XMLBuilder.create("success").attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-sasl").toString());
                } else {
                    return Error(ws);
                }
            break;

            case "iq":
                switch (msg.root.attributes.id) {
                    case "_xmpp_bind1":
                        if (global.Clients.find(i => i.client == ws) || resource || !accountId) return;
                        if (!msg.root.children.find(i => i.name == "bind")) return;
                        if (!msg.root.children.find(i => i.name == "bind").children.find(i => i.name == "resource")) return;
                        if (!msg.root.children.find(i => i.name == "bind").children.find(i => i.name == "resource").content) return;

                        resource = msg.root.children.find(i => i.name == "bind").children.find(i => i.name == "resource").content;
                        jid = `${accountId}@prod.ol.epicgames.com/${resource}`;

                        ws.send(XMLBuilder.create("iq")
                        .attribute("to", jid)
                        .attribute("id", "_xmpp_bind1")
                        .attribute("xmlns", "jabber:client")
                        .attribute("type", "result")
                        .element("bind")
                        .attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-bind")
                        .element("jid", jid).up().up().toString())
                    break;

                    case "_xmpp_session1":
                        if (!global.Clients.find(i => i.client == ws)) return Error(ws);
                        var xml = XMLBuilder.create("iq")
                        .attribute("to", jid)
                        .attribute("from", "prod.ol.epicgames.com")
                        .attribute("id", "_xmpp_session1")
                        .attribute("xmlns", "jabber:client")
                        .attribute("type", "result");

                        ws.send(xml.toString());
                        await getPresenceFromFriends(ws);
                    break;

                    default:
                        if (!global.Clients.find(i => i.client == ws)) return Error(ws);
                        var xml = XMLBuilder.create("iq")
                        .attribute("to", jid)
                        .attribute("from", "prod.ol.epicgames.com")
                        .attribute("id", msg.root.attributes.id)
                        .attribute("xmlns", "jabber:client")
                        .attribute("type", "result");

                        ws.send(xml.toString());
                }
            break;

            case "message":
                if (!global.Clients.find(i => i.client == ws)) return Error(ws);
                if (!msg.root.children.find(i => i.name == "body") || !msg.root.children.find(i => i.name == "body").content) return;

                var body = msg.root.children.find(i => i.name == "body").content;

                switch (msg.root.attributes.type) {
                    case "chat":
                        if (!msg.root.attributes.to) return;
                        var receiver = global.Clients.find(i => i.jid.split("/")[0] == msg.root.attributes.to);
                        var sender = global.Clients.find(i => i.client == ws);
                        if (!receiver || !sender) return;
                        if (receiver == sender) return;

                        receiver.client.send(XMLBuilder.create("message")
                        .attribute("to", receiver.jid)
                        .attribute("from", sender.jid)
                        .attribute("xmlns", "jabber:client")
                        .attribute("type", "chat")
                        .element("body", body).up().toString())
                        return;
                    break;

                    case "groupchat":
                        if (!msg.root.attributes.to) return;
                        var sender = global.Clients.find(i => i.client == ws);
                        if (!sender) return;

                        var MUC = global.MUCs.find(i => i.roomName == msg.root.attributes.to.split("@")[0]);
                        if (!MUC) return;

                        MUC.members.forEach(member => {
                            var ClientData = global.Clients.find(i => i.accountId == member.accountId);
                            if (!ClientData) return;

                            ClientData.client.send(XMLBuilder.create("message")
                            .attribute("to", ClientData.jid)
                            .attribute("from", getMUCmember(MUC.roomName, sender.accountId))
                            .attribute("xmlns", "jabber:client")
                            .attribute("type", "groupchat")
                            .element("body", body).up().toString())
                        })
                        return;
                    break;
                }

                if (isJSON(body)) {
                    var object = JSON.parse(body);
                    if (!object.hasOwnProperty("type") || typeof object.type != "string") return;
                    if (!msg.root.attributes.to) return;
                    if (!msg.root.attributes.id) return;

                    functions.sendXmppMessageToClient(ws, msg, body);
                }
            break;

            case "presence":
                if (!global.Clients.find(i => i.client == ws)) return Error(ws);

                if (msg.root.attributes.type == "unavailable") {
                    if (!msg.root.attributes.to) return;

                    if (msg.root.attributes.to.endsWith("@muc.prod.ol.epicgames.com") || msg.root.attributes.to.split("/")[0].endsWith("@muc.prod.ol.epicgames.com")) {
                        if (msg.root.attributes.to.toLowerCase().startsWith("party-")) {
                            var MUC = global.MUCs.find(i => i.roomName == msg.root.attributes.to.split("@")[0]);
                            if (!MUC) return;
    
                            var MUCIndex = global.MUCs.findIndex(i => i.roomName == msg.root.attributes.to.split("@")[0]);
    
                            const client = global.Clients.find(i => i.client == ws);
                            if (global.MUCs[MUCIndex].members.find(i => i.accountId == client.accountId)) {
                                global.MUCs[MUCIndex].members.splice(global.MUCs[MUCIndex].members.findIndex(i => i.accountId == client.accountId), 1);
                            }

                            ws.send(XMLBuilder.create("presence")
                            .attribute("to", client.jid)
                            .attribute("from", getMUCmember(global.MUCs[MUCIndex].roomName, client.accountId))
                            .attribute("xmlns", "jabber:client")
                            .attribute("type", "unavailable")
                            .element("x").attribute("xmlns", "http://jabber.org/protocol/muc#user")
                            .element("item")
                            .attribute("nick", getMUCmember(global.MUCs[MUCIndex].roomName, client.accountId).replace(`${global.MUCs[MUCIndex].roomName}@muc.prod.ol.epicgames.com/`, ""))
                            .attribute("jid", client.jid)
                            .attribute("role", "none").up()
                            .element("status").attribute("code", "110").up()
                            .element("status").attribute("code", "100").up()
                            .element("status").attribute("code", "170").up().up().toString())
                            return;
                        }
                    }
                }

                if (msg.root.children.find(i => i.name == "x")) {
                    if (msg.root.children.find(i => i.name == "x").children.find(i => i.name == "history")) {
                        if (!msg.root.attributes.to) return;

                        var MUC = global.MUCs.find(i => i.roomName == msg.root.attributes.to.split("@")[0]);
                        if (!MUC) global.MUCs.push({
                            "roomName": msg.root.attributes.to.split("@")[0],
                            "members": [],
                        });

                        var MUCIndex = global.MUCs.findIndex(i => i.roomName == msg.root.attributes.to.split("@")[0]);

                        const client = global.Clients.find(i => i.client == ws);
                        global.MUCs[MUCIndex].members.push({ accountId: client.accountId });

                        ws.send(XMLBuilder.create("presence")
                        .attribute("to", client.jid)
                        .attribute("from", getMUCmember(global.MUCs[MUCIndex].roomName, client.accountId))
                        .attribute("xmlns", "jabber:client")
                        .element("x").attribute("xmlns", "http://jabber.org/protocol/muc#user")
                        .element("item")
                        .attribute("nick", getMUCmember(global.MUCs[MUCIndex].roomName, client.accountId).replace(`${global.MUCs[MUCIndex].roomName}@muc.prod.ol.epicgames.com/`, ""))
                        .attribute("jid", client.jid)
                        .attribute("role", "participant")
                        .attribute("affiliation", "none").up()
                        .element("status").attribute("code", "110").up()
                        .element("status").attribute("code", "100").up()
                        .element("status").attribute("code", "170").up()
                        .element("status").attribute("code", "201").up().up().toString())

                        global.MUCs[MUCIndex].members.forEach(member => {
                            var ClientData = global.Clients.find(i => i.accountId == member.accountId);
                            if (!ClientData) return;

                            ws.send(XMLBuilder.create("presence")
                            .attribute("from", getMUCmember(global.MUCs[MUCIndex].roomName, ClientData.accountId))
                            .attribute("to", client.jid)
                            .attribute("xmlns", "jabber:client")
                            .element("x")
                            .attribute("xmlns", "http://jabber.org/protocol/muc#user")
                            .element("item")
                            .attribute("nick", getMUCmember(global.MUCs[MUCIndex].roomName, ClientData.accountId).replace(`${global.MUCs[MUCIndex].roomName}@muc.prod.ol.epicgames.com/`, ""))
                            .attribute("jid", ClientData.jid)
                            .attribute("role", "participant")
                            .attribute("affiliation", "none").up().up().toString())
                        })

                        global.MUCs[MUCIndex].members.forEach(member => {
                            var ClientData = global.Clients.find(i => i.accountId == member.accountId);
                            if (!ClientData) return;

                            if (client.accountId.toLowerCase() != ClientData.accountId.toLowerCase()) {
                                ClientData.client.send(XMLBuilder.create("presence")
                                .attribute("from", getMUCmember(global.MUCs[MUCIndex].roomName, client.accountId))
                                .attribute("to", ClientData.jid)
                                .attribute("xmlns", "jabber:client")
                                .element("x")
                                .attribute("xmlns", "http://jabber.org/protocol/muc#user")
                                .element("item")
                                .attribute("nick", getMUCmember(global.MUCs[MUCIndex].roomName, client.accountId).replace(`${global.MUCs[MUCIndex].roomName}@muc.prod.ol.epicgames.com/`, ""))
                                .attribute("jid", client.jid)
                                .attribute("role", "participant")
                                .attribute("affiliation", "none").up().up().toString())
                            }
                        })
                        return;
                    }
                }

                if (!msg.root.children.find(i => i.name == "status") || !msg.root.children.find(i => i.name == "status").content) return;
                if (!isJSON(msg.root.children.find(i => i.name == "status").content)) return;
                if (Array.isArray(JSON.parse(msg.root.children.find(i => i.name == "status").content))) return;

                var body = msg.root.children.find(i => i.name == "status").content;
                var away = false;
                if (msg.root.children.find(i => i.name == "show")) away = true;

                await updatePresenceForFriends(ws, body, away, false);
                functions.getPresenceFromUser(accountId, accountId, false);
            break;
        }

        if (!global.Clients.find(i => i.client == ws)) {
            if (accountId && displayName && token && jid && ID && resource && Authenticated == true) {
                global.Clients.push({
                    client: ws,
                    accountId: accountId,
                    displayName: displayName,
                    token: token,
                    jid: jid,
                    resource: resource,
                    lastPresenceUpdate: {
                        away: false,
                        status: "{}" 
                    } 
                });
            }
        }
    })
    
    ws.on('close', () => RemoveClient(ws))
})

function Error(ws) {
    ws.send(XMLBuilder.create("close").attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-framing").toString());
    ws.close();
}

function RemoveClient(ws) {
    var client = global.Clients.find(i => i.client == ws);
    if (!client) return;

    var ClientStatus = JSON.parse(client.lastPresenceUpdate.status);
    var partyId = "";

    switch (true) {
        case (!ClientStatus.Properties): break;
        case (isObject(ClientStatus.Properties)): {
            for (var key in ClientStatus.Properties) {
                if (key.toLowerCase().startsWith("party")) {
                    if (ClientStatus.Properties[key] && isObject(ClientStatus.Properties[key])) partyId = ClientStatus.Properties[key].partyId;
                }
            }
        }
    }

    global.Clients.forEach(ClientData => {
        if (client.accountId.toLowerCase() != ClientData.accountId.toLowerCase()) {
            ClientData.client.send(XMLBuilder.create("message")
            .attribute("id", functions.MakeID().replace(/-/ig, "").toUpperCase())
            .attribute("from", client.jid)
            .attribute("xmlns", "jabber:client")
            .attribute("to", ClientData.jid)
            .element("body", JSON.stringify({
                "type": "com.epicgames.party.memberexited",
                "payload": {
                    "partyId": partyId,
                    "memberId": client.accountId,
                    "wasKicked": false
                },
                "timestamp": new Date().toISOString()
            })).up().toString());
        }
    });

    updatePresenceForFriends(ws, "{}", false, true);

    log.xmpp(`An xmpp client with the displayName ${global.Clients.find(i => i.client == ws).displayName} has logged out.`);

    global.Clients.splice(global.Clients.findIndex(i => i.client == ws), 1);
}

async function getPresenceFromFriends(ws) {
    var SenderData = global.Clients.find(i => i.client == ws);
    if (!SenderData) return;

    var friends = await Friends.findOne({ accountId: SenderData.accountId });
    var accepted = friends.list.accepted;

    accepted.forEach(friend => {
        var ClientData = global.Clients.find(i => i.accountId == friend.accountId);
        if (!ClientData) return;

        var xml = XMLBuilder.create("presence")
        .attribute("to", SenderData.jid)
        .attribute("xmlns", "jabber:client")
        .attribute("from", ClientData.jid)

        if (ClientData.lastPresenceUpdate.away == true) xml = xml.attribute("type", "available").element("show", "away").up().element("status", ClientData.lastPresenceUpdate.status).up();
        else xml = xml.attribute("type", "available").element("status", ClientData.lastPresenceUpdate.status).up();

        SenderData.client.send(xml.toString())
    })
}

async function updatePresenceForFriends(ws, body, away, offline) {
    var SenderData = global.Clients.find(i => i.client == ws);
    if (!SenderData) return;

    var SenderIndex = global.Clients.findIndex(i => i.client == ws);
    global.Clients[SenderIndex].lastPresenceUpdate.away = away;
    global.Clients[SenderIndex].lastPresenceUpdate.status = body;

    var friends = await Friends.findOne({ accountId: SenderData.accountId });
    var accepted = friends.list.accepted;

    accepted.forEach(friend => {
        var ClientData = global.Clients.find(i => i.accountId == friend.accountId);
        if (!ClientData) return;
            
        var xml = XMLBuilder.create("presence")
        .attribute("to", ClientData.jid)
        .attribute("xmlns", "jabber:client")
        .attribute("from", SenderData.jid)

        if (offline == true) xml = xml.attribute("type", "unavailable");
        else xml = xml.attribute("type", "available")

        if (away == true) xml = xml.element("show", "away").up().element("status", body).up();
        else xml = xml.element("status", body).up();

        ClientData.client.send(xml.toString())
    })
}

function getMUCmember(roomName, accountId) {
    let client = global.Clients.find(i => i.accountId == accountId);
    if (!client) return `${roomName}@muc.prod.ol.epicgames.com`;

    return `${roomName}@muc.prod.ol.epicgames.com/${encodeURI(client.displayName)}:${client.accountId}:${client.resource}`
}

function isObject(value) {
    if (typeof value == "object" && !Array.isArray(value)) return true;
    else return false;
}

function isJSON(str) {
    try {
        JSON.parse(str)
    } catch (err) {
        return false;
    }
    return true;
}
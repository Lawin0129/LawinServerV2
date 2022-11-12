const XMLBuilder = require("xmlbuilder");
const uuid = require("uuid");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

const User = require("../model/user.js");
const Profile = require("../model/profiles.js");
const profileManager = require("../structs/profile.js");
const Friends = require("../model/friends.js");

async function sleep(ms) {
    await new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    })
}

function GetVersionInfo(req) {
    var memory = {
        season: 0,
        build: 0.0,
        CL: "",
        lobby: ""
    }

    if (req.headers["user-agent"]) {
        var CL = "";

        try {
            var BuildID = req.headers["user-agent"].split("-")[3].split(",")[0]
            if (!Number.isNaN(Number(BuildID))) {
                CL = BuildID;
            }

            if (Number.isNaN(Number(BuildID))) {
                var BuildID = req.headers["user-agent"].split("-")[3].split(" ")[0]
                if (!Number.isNaN(Number(BuildID))) {
                    CL = BuildID;
                }
            }
        } catch (err) {
            try {
                var BuildID = req.headers["user-agent"].split("-")[1].split("+")[0]
                if (!Number.isNaN(Number(BuildID))) {
                    CL = BuildID;
                }
            } catch (err) {}
        }

        try {
            var Build = req.headers["user-agent"].split("Release-")[1].split("-")[0];

            if (Build.split(".").length == 3) {
                Value = Build.split(".");
                Build = Value[0] + "." + Value[1] + Value[2];
            }

            memory.season = Number(Build.split(".")[0]);
            memory.build = Number(Build);
            memory.CL = CL;
            memory.lobby = `LobbySeason${memory.season}`;

            if (Number.isNaN(memory.season)) {
                throw new Error();
            }
        } catch (err) {
            memory.season = 2;
            memory.build = 2.0;
            memory.CL = CL;
            memory.lobby = "LobbyWinterDecor";
        }
    }

    return memory;
}

function getContentPages(req) {
    const memory = GetVersionInfo(req);

    const contentpages = JSON.parse(JSON.stringify(require("../responses/contentpages.json")));

    var Language = "en";

    try {
        if (req.headers["accept-language"]) {
            if (req.headers["accept-language"].includes("-") && req.headers["accept-language"] != "es-419") {
                Language = req.headers["accept-language"].split("-")[0];
            } else {
                Language = req.headers["accept-language"];
            }
        }
    } catch {}

    const modes = ["saveTheWorldUnowned", "battleRoyale", "creative", "saveTheWorld"];
    const news = ["savetheworldnews", "battleroyalenews"]

    try {
        modes.forEach(mode => {
            contentpages.subgameselectdata[mode].message.title = contentpages.subgameselectdata[mode].message.title[Language]
            contentpages.subgameselectdata[mode].message.body = contentpages.subgameselectdata[mode].message.body[Language]
        })
    } catch (err) {}

    try {
        if (memory.build < 5.30) { 
            news.forEach(mode => {
                contentpages[mode].news.messages[0].image = "https://cdn.discordapp.com/attachments/927739901540188200/930879507496308736/discord.png";
                contentpages[mode].news.messages[1].image = "https://cdn.discordapp.com/attachments/927739901540188200/930879519882088508/lawin.png";
            })
        }
    } catch (err) {}

    try {
        contentpages.dynamicbackgrounds.backgrounds.backgrounds[0].stage = `season${memory.season}`;
        contentpages.dynamicbackgrounds.backgrounds.backgrounds[1].stage = `season${memory.season}`;

        if (memory.season == 10) {
            contentpages.dynamicbackgrounds.backgrounds.backgrounds[0].stage = "seasonx";
            contentpages.dynamicbackgrounds.backgrounds.backgrounds[1].stage = "seasonx";
        }

        if (memory.build == 11.31 || memory.build == 11.40) {
            contentpages.dynamicbackgrounds.backgrounds.backgrounds[0].stage = "Winter19";
            contentpages.dynamicbackgrounds.backgrounds.backgrounds[1].stage = "Winter19";
        }

        if (memory.build == 19.01) {
            contentpages.dynamicbackgrounds.backgrounds.backgrounds[0].stage = "winter2021";
            contentpages.dynamicbackgrounds.backgrounds.backgrounds[0].backgroundimage = "https://cdn.discordapp.com/attachments/927739901540188200/930880158167085116/t-bp19-lobby-xmas-2048x1024-f85d2684b4af.png";
            contentpages.subgameinfo.battleroyale.image = "https://cdn.discordapp.com/attachments/927739901540188200/930880421514846268/19br-wf-subgame-select-512x1024-16d8bb0f218f.jpg";
            contentpages.specialoffervideo.bSpecialOfferEnabled = "true";
        }

        if (memory.season == 20) {
            if (memory.build == 20.40) {
                contentpages.dynamicbackgrounds.backgrounds.backgrounds[0].backgroundimage = "https://cdn2.unrealengine.com/t-bp20-40-armadillo-glowup-lobby-2048x2048-2048x2048-3b83b887cc7f.jpg"
            } else {
                contentpages.dynamicbackgrounds.backgrounds.backgrounds[0].backgroundimage = "https://cdn2.unrealengine.com/t-bp20-lobby-2048x1024-d89eb522746c.png";
            }
        }

        if (memory.season == 21) {
            contentpages.dynamicbackgrounds.backgrounds.backgrounds[0].backgroundimage = "https://cdn2.unrealengine.com/s21-lobby-background-2048x1024-2e7112b25dc3.jpg"
        }
    } catch (err) {}

    return contentpages;
}

function getItemShop() {
    const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "responses", "catalog.json")).toString());
    const CatalogConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "Config", "catalog_config.json").toString()));

    try {
        for (var value in CatalogConfig) {
            if (Array.isArray(CatalogConfig[value].itemGrants)) {
                if (CatalogConfig[value].itemGrants.length != 0) {
                    const CatalogEntry = {"devName":"","offerId":"","fulfillmentIds":[],"dailyLimit":-1,"weeklyLimit":-1,"monthlyLimit":-1,"categories":[],"prices":[{"currencyType":"MtxCurrency","currencySubType":"","regularPrice":0,"finalPrice":0,"saleExpiration":"9999-12-02T01:12:00Z","basePrice":0}],"matchFilter":"","filterWeight":0,"appStoreId":[],"requirements":[],"offerType":"StaticPrice","giftInfo":{"bIsEnabled":false,"forcedGiftBoxTemplateId":"","purchaseRequirements":[],"giftRecordIds":[]},"refundable":true,"metaInfo":[],"displayAssetPath":"","itemGrants":[],"sortPriority":0,"catalogGroupPriority":0};

                    if (value.toLowerCase().startsWith("daily")) {
                        let store = catalog.storefronts.find(p => p.name == "BRDailyStorefront");
                        
                        if (store) {
                            let i = catalog.storefronts.findIndex(p => p.name == "BRDailyStorefront");

                            CatalogEntry.requirements = [];
                            CatalogEntry.itemGrants = [];

                            for (var x in CatalogConfig[value].itemGrants) {
                                if (typeof CatalogConfig[value].itemGrants[x] == "string") {
                                    if (CatalogConfig[value].itemGrants[x].length != 0) {
                                        CatalogEntry.devName = CatalogConfig[value].itemGrants[0]
                                        CatalogEntry.offerId = CatalogConfig[value].itemGrants[0]

                                        CatalogEntry.requirements.push({ "requirementType": "DenyOnItemOwnership", "requiredId": CatalogConfig[value].itemGrants[x], "minQuantity": 1 })
                                        CatalogEntry.itemGrants.push({ "templateId": CatalogConfig[value].itemGrants[x], "quantity": 1 });
                                    }
                                }
                            }

                            CatalogEntry.prices[0].basePrice = CatalogConfig[value].price
                            CatalogEntry.prices[0].regularPrice = CatalogConfig[value].price
                            CatalogEntry.prices[0].finalPrice = CatalogConfig[value].price

                            if (CatalogEntry.itemGrants.length != 0) {
                                catalog.storefronts[i].catalogEntries.push(CatalogEntry);
                            }
                        }
                    }

                    if (value.toLowerCase().startsWith("featured")) {
                        let store = catalog.storefronts.find(p => p.name == "BRWeeklyStorefront");
                        
                        if (store) {
                            let i = catalog.storefronts.findIndex(p => p.name == "BRWeeklyStorefront");

                            CatalogEntry.requirements = [];
                            CatalogEntry.itemGrants = [];

                            for (var x in CatalogConfig[value].itemGrants) {
                                if (typeof CatalogConfig[value].itemGrants[x] == "string") {
                                    if (CatalogConfig[value].itemGrants[x].length != 0) {
                                        CatalogEntry.devName = CatalogConfig[value].itemGrants[0]
                                        CatalogEntry.offerId = CatalogConfig[value].itemGrants[0]

                                        CatalogEntry.requirements.push({ "requirementType": "DenyOnItemOwnership", "requiredId": CatalogConfig[value].itemGrants[x], "minQuantity": 1 })
                                        CatalogEntry.itemGrants.push({ "templateId": CatalogConfig[value].itemGrants[x], "quantity": 1 });
                                    }
                                }
                            }

                            CatalogEntry.prices[0].basePrice = CatalogConfig[value].price
                            CatalogEntry.prices[0].regularPrice = CatalogConfig[value].price
                            CatalogEntry.prices[0].finalPrice = CatalogConfig[value].price

                            if (CatalogEntry.itemGrants.length != 0) {
                                catalog.storefronts[i].catalogEntries.push(CatalogEntry);
                            }
                        }
                    }
                }
            }
        }
    } catch (err) {}

    return catalog;
}

function MakeID() {
    return uuid.v4();
}

function sendXmppMessageToAll(body) {
    if (!global.Clients) return;
    if (typeof body == "object") body = JSON.stringify(body);

    global.Clients.forEach(ClientData => {
        ClientData.client.send(XMLBuilder.create("message")
        .attribute("from", "xmpp-admin@prod.ol.epicgames.com")
        .attribute("xmlns", "jabber:client")
        .attribute("to", ClientData.jid)
        .element("body", `${body}`).up().toString());
    });
}

function sendXmppMessageToClient(ws, msg, body) {
    if (!global.Clients) return;
    if (typeof body == "object") body = JSON.stringify(body);

    var sender = global.Clients.find(i => i.client == ws);
    var receiver = global.Clients.find(i => i.jid.split("/")[0] == msg.root.attributes.to || i.jid == msg.root.attributes.to);
    if (!receiver || !sender) return;

    receiver.client.send(XMLBuilder.create("message")
    .attribute("from", sender.jid)
    .attribute("id", msg.root.attributes.id)
    .attribute("to", receiver.jid)
    .attribute("xmlns", "jabber:client")
    .element("body", body).up().toString());
}

function sendXmppMessageToId(body, toAccountId) {
    if (!global.Clients) return;
    if (typeof body == "object") body = JSON.stringify(body);

    var receiver = global.Clients.find(i => i.accountId == toAccountId);
    if (!receiver) return;

    receiver.client.send(XMLBuilder.create("message")
    .attribute("from", "xmpp-admin@prod.ol.epicgames.com")
    .attribute("to", receiver.jid)
    .attribute("xmlns", "jabber:client")
    .element("body", body).up().toString());
}

function getPresenceFromUser(fromId, toId, unavailable) {
    if (!global.Clients) return;
    var SenderData = global.Clients.find(i => i.accountId == fromId);
    var ClientData = global.Clients.find(i => i.accountId == toId);
    var availability = unavailable == true ? "unavailable" : "available";
    if (!SenderData || !ClientData) return;

    var xml = XMLBuilder.create("presence")
    .attribute("to", ClientData.jid)
    .attribute("xmlns", "jabber:client")
    .attribute("from", SenderData.jid)

    if (SenderData.lastPresenceUpdate.away == true) xml = xml.attribute("type", availability).element("show", "away").up().element("status", SenderData.lastPresenceUpdate.status).up();
    else xml = xml.attribute("type", availability).element("status", SenderData.lastPresenceUpdate.status).up();

    ClientData.client.send(xml.toString())
}

async function registerUser(discordId, username, email, plainPassword) {
    email = email.toLowerCase();

    if (!discordId || !username || !email || !plainPassword) return { message: "Username/email/password is required.", status: 400 };

    if (await User.findOne({ discordId })) return { message: "You already created an account!", status: 400 };

    const accountId = MakeID().replace(/-/ig, "");

    // filters
    const emailFilter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    if (!emailFilter.test(email)) return { message: "You did not provide a valid email address!", status: 400 };
    if (username.length >= 25) return { message: "Your username must be less than 25 characters long.", status: 400 };
    if (username.length < 3) return { message: "Your username must be atleast 3 characters long.", status: 400 };
    if (plainPassword.length >= 128) return { message: "Your password must be less than 128 characters long.", status: 400 };
    if (plainPassword.length < 8) return { message: "Your password must be atleast 8 characters long.", status: 400 };

    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    try {
        await User.create({ created: new Date().toISOString(), discordId, accountId, username, username_lower: username.toLowerCase(), email, password: hashedPassword }).then(async (i) => {
            await Profile.create({ created: i.created, accountId: i.accountId, profiles: profileManager.createProfiles(i.accountId) });
            await Friends.create({ created: i.created, accountId: i.accountId });
        });
    } catch (err) {
        if (err.code == 11000) return { message: `Username or email is already in use.`, status: 400 };

        return { message: "An unknown error has occured, please try again later.", status: 400 };
    };

    return { message: `Successfully created an account with the username ${username}`, status: 200 };
}

function DecodeBase64(str) {
    return Buffer.from(str, 'base64').toString()
}

module.exports = {
    sleep,
    GetVersionInfo,
    getContentPages,
    getItemShop,
    MakeID,
    sendXmppMessageToAll,
    sendXmppMessageToClient,
    sendXmppMessageToId,
    getPresenceFromUser,
    registerUser,
    DecodeBase64
}
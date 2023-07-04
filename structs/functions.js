const XMLBuilder = require("xmlbuilder");
const uuid = require("uuid");
const bcrypt = require("bcrypt");
const fs = require("fs");
const crypto = require("crypto");
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
    let memory = {
        season: 0,
        build: 0.0,
        CL: "0",
        lobby: ""
    }

    if (req.headers["user-agent"]) {
        let CL = "";

        try {
            let BuildID = req.headers["user-agent"].split("-")[3].split(",")[0];

            if (!Number.isNaN(Number(BuildID))) CL = BuildID;
            else {
                BuildID = req.headers["user-agent"].split("-")[3].split(" ")[0];

                if (!Number.isNaN(Number(BuildID))) CL = BuildID;
            }
        } catch {
            try {
                let BuildID = req.headers["user-agent"].split("-")[1].split("+")[0];

                if (!Number.isNaN(Number(BuildID))) CL = BuildID;
            } catch {}
        }

        try {
            let Build = req.headers["user-agent"].split("Release-")[1].split("-")[0];

            if (Build.split(".").length == 3) {
                let Value = Build.split(".");
                Build = Value[0] + "." + Value[1] + Value[2];
            }

            memory.season = Number(Build.split(".")[0]);
            memory.build = Number(Build);
            memory.CL = CL;
            memory.lobby = `LobbySeason${memory.season}`;

            if (Number.isNaN(memory.season)) throw new Error();
        } catch {
            if (Number(memory.CL) < 3724489) {
                memory.season = 0;
                memory.build = 0.0;
                memory.CL = CL;
                memory.lobby = "LobbySeason0";
            } else if (Number(memory.CL) <= 3790078) {
                memory.season = 1;
                memory.build = 1.0;
                memory.CL = CL;
                memory.lobby = "LobbySeason1";
            } else {
                memory.season = 2;
                memory.build = 2.0;
                memory.CL = CL;
                memory.lobby = "LobbyWinterDecor";
            }
        }
    }

    return memory;
}

function getContentPages(req) {
    const memory = GetVersionInfo(req);

    const contentpages = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "responses", "contentpages.json")).toString());

    let Language = "en";

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
    const news = ["savetheworldnews", "battleroyalenews"];

    try {
        modes.forEach(mode => {
            contentpages.subgameselectdata[mode].message.title = contentpages.subgameselectdata[mode].message.title[Language]
            contentpages.subgameselectdata[mode].message.body = contentpages.subgameselectdata[mode].message.body[Language]
        })
    } catch {}

    try {
        if (memory.build < 5.30) { 
            news.forEach(mode => {
                contentpages[mode].news.messages[0].image = "https://cdn.discordapp.com/attachments/927739901540188200/930879507496308736/discord.png";
                contentpages[mode].news.messages[1].image = "https://cdn.discordapp.com/attachments/927739901540188200/930879519882088508/lawin.png";
            });
        }
    } catch {}

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
    } catch {}

    return contentpages;
}

function getItemShop() {
    const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "responses", "catalog.json")).toString());
    const CatalogConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "Config", "catalog_config.json").toString()));

    try {
        for (let value in CatalogConfig) {
            if (!Array.isArray(CatalogConfig[value].itemGrants)) continue;
            if (CatalogConfig[value].itemGrants.length == 0) continue;
            
            const CatalogEntry = {"devName":"","offerId":"","fulfillmentIds":[],"dailyLimit":-1,"weeklyLimit":-1,"monthlyLimit":-1,"categories":[],"prices":[{"currencyType":"MtxCurrency","currencySubType":"","regularPrice":0,"finalPrice":0,"saleExpiration":"9999-12-02T01:12:00Z","basePrice":0}],"meta":{"SectionId":"Featured","TileSize":"Small"},"matchFilter":"","filterWeight":0,"appStoreId":[],"requirements":[],"offerType":"StaticPrice","giftInfo":{"bIsEnabled":true,"forcedGiftBoxTemplateId":"","purchaseRequirements":[],"giftRecordIds":[]},"refundable":false,"metaInfo":[{"key":"SectionId","value":"Featured"},{"key":"TileSize","value":"Small"}],"displayAssetPath":"","itemGrants":[],"sortPriority":0,"catalogGroupPriority":0};

            let i = catalog.storefronts.findIndex(p => p.name == (value.toLowerCase().startsWith("daily") ? "BRDailyStorefront" : "BRWeeklyStorefront"));
            if (i == -1) continue;

            if (value.toLowerCase().startsWith("daily")) {
                // Make featured items appear on the left side of the screen
                CatalogEntry.sortPriority = -1;
            } else {
                CatalogEntry.meta.TileSize = "Normal";
                CatalogEntry.metaInfo[1].value = "Normal";
            }

            for (let itemGrant of CatalogConfig[value].itemGrants) {
                if (typeof itemGrant != "string") continue;
                if (itemGrant.length == 0) continue;

                CatalogEntry.requirements.push({ "requirementType": "DenyOnItemOwnership", "requiredId": itemGrant, "minQuantity": 1 });
                CatalogEntry.itemGrants.push({ "templateId": itemGrant, "quantity": 1 });
            }

            CatalogEntry.prices = [{
                "currencyType": "MtxCurrency",
                "currencySubType": "",
                "regularPrice": CatalogConfig[value].price,
                "finalPrice": CatalogConfig[value].price,
                "saleExpiration": "9999-12-02T01:12:00Z",
                "basePrice": CatalogConfig[value].price
            }];

            if (CatalogEntry.itemGrants.length > 0) {
                let uniqueIdentifier = crypto.createHash("sha1").update(`${JSON.stringify(CatalogConfig[value].itemGrants)}_${CatalogConfig[value].price}`).digest("hex");

                CatalogEntry.devName = uniqueIdentifier;
                CatalogEntry.offerId = uniqueIdentifier;

                catalog.storefronts[i].catalogEntries.push(CatalogEntry);
            }
        }
    } catch {}

    return catalog;
}

function getOfferID(offerId) {
    const catalog = getItemShop();

    for (let storefront of catalog.storefronts) {
        let findOfferId = storefront.catalogEntries.find(i => i.offerId == offerId);

        if (findOfferId) return {
            name: storefront.name,
            offerId: findOfferId
        };
    }
}

function MakeID() {
    return uuid.v4();
}

function sendXmppMessageToAll(body) {
    if (!global.Clients) return;
    if (typeof body == "object") body = JSON.stringify(body);

    global.Clients.forEach(ClientData => {
        ClientData.client.send(XMLBuilder.create("message")
        .attribute("from", `xmpp-admin@${global.xmppDomain}`)
        .attribute("xmlns", "jabber:client")
        .attribute("to", ClientData.jid)
        .element("body", `${body}`).up().toString());
    });
}

function sendXmppMessageToId(body, toAccountId) {
    if (!global.Clients) return;
    if (typeof body == "object") body = JSON.stringify(body);

    let receiver = global.Clients.find(i => i.accountId == toAccountId);
    if (!receiver) return;

    receiver.client.send(XMLBuilder.create("message")
    .attribute("from", `xmpp-admin@${global.xmppDomain}`)
    .attribute("to", receiver.jid)
    .attribute("xmlns", "jabber:client")
    .element("body", `${body}`).up().toString());
}

function getPresenceFromUser(fromId, toId, offline) {
    if (!global.Clients) return;

    let SenderData = global.Clients.find(i => i.accountId == fromId);
    let ClientData = global.Clients.find(i => i.accountId == toId);

    if (!SenderData || !ClientData) return;

    let xml = XMLBuilder.create("presence")
    .attribute("to", ClientData.jid)
    .attribute("xmlns", "jabber:client")
    .attribute("from", SenderData.jid)
    .attribute("type", offline ? "unavailable" : "available")

    if (SenderData.lastPresenceUpdate.away) xml = xml.element("show", "away").up().element("status", SenderData.lastPresenceUpdate.status).up();
    else xml = xml.element("status", SenderData.lastPresenceUpdate.status).up();

    ClientData.client.send(xml.toString());
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

    const allowedCharacters = (" !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~").split("");
    
    for (let character of username) {
        if (!allowedCharacters.includes(character)) return { message: "Your username has special characters, please remove them and try again.", status: 400 };
    }

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
    return Buffer.from(str, 'base64').toString();
}

function UpdateTokens() {
    fs.writeFileSync("./tokenManager/tokens.json", JSON.stringify({
        accessTokens: global.accessTokens,
        refreshTokens: global.refreshTokens,
        clientTokens: global.clientTokens
    }, null, 2));
}

module.exports = {
    sleep,
    GetVersionInfo,
    getContentPages,
    getItemShop,
    getOfferID,
    MakeID,
    sendXmppMessageToAll,
    sendXmppMessageToId,
    getPresenceFromUser,
    registerUser,
    DecodeBase64,
    UpdateTokens
}
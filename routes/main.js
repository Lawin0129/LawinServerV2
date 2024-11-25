const express = require("express");
const fs = require("fs");
const app = express.Router();
const path = require("path");

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");

const config = JSON.parse(fs.readFileSync("./Config/config.json").toString());

const functions = require("../structs/functions.js");

app.post("/fortnite/api/game/v2/chat/*/*/*/pc", (req, res) => {
    let resp = config.chat.EnableGlobalChat ? { "GlobalChatRooms": [{ "roomName": "lawinserverglobal" }] } : {};

    res.json(resp);
});

app.post("/fortnite/api/game/v2/tryPlayOnPlatform/account/*", (req, res) => {
    res.setHeader("Content-Type", "text/plain");
    res.send(true);
});

app.get("/launcher/api/public/distributionpoints/", (req, res) => {
    res.json({
        "distributions": [
            "https://download.epicgames.com/",
            "https://download2.epicgames.com/",
            "https://download3.epicgames.com/",
            "https://download4.epicgames.com/",
            "https://epicgames-download1.akamaized.net/"
        ]
    });
});

app.get("/launcher/api/public/assets/*", async (req, res) => {
    res.json({
        "appName": "FortniteContentBuilds",
        "labelName": "LawinServer",
        "buildVersion": "++Fortnite+Release-20.00-CL-19458861-Windows",
        "catalogItemId": "5cb97847cee34581afdbc445400e2f77",
        "expires": "9999-12-31T23:59:59.999Z",
        "items": {
            "MANIFEST": {
                "signature": "LawinServer",
                "distribution": "https://lawinserver.ol.epicgames.com/",
                "path": "Builds/Fortnite/Content/CloudDir/LawinServer.manifest",
                "hash": "55bb954f5596cadbe03693e1c06ca73368d427f3",
                "additionalDistributions": []
            },
            "CHUNKS": {
                "signature": "LawinServer",
                "distribution": "https://lawinserver.ol.epicgames.com/",
                "path": "Builds/Fortnite/Content/CloudDir/LawinServer.manifest",
                "additionalDistributions": []
            }
        },
        "assetId": "FortniteContentBuilds"
    });
})

app.get("/Builds/Fortnite/Content/CloudDir/*.manifest", async (req, res) => {
    res.set("Content-Type", "application/octet-stream")
    const ver = functions.GetVersionInfo(req)
    var manifest;

    if (ver.build >= 28) {
        manifest = fs.readFileSync(path.join(__dirname, "..", "responses", "CloudDir", "LawinServerNew.manifest"));
    } else {
        manifest = fs.readFileSync(path.join(__dirname, "..", "responses", "CloudDir", "LawinServer.manifest"));
    }


    res.status(200).send(manifest).end();
})

app.get("/Builds/Fortnite/Content/CloudDir/*.chunk", async (req, res) => {
    res.set("Content-Type", "application/octet-stream")

    const chunk = fs.readFileSync(path.join(__dirname, "..", "responses", "CloudDir", "LawinServer.chunk"));

    res.status(200).send(chunk).end();
})

app.get("/Builds/Fortnite/Content/CloudDir/*.ini", async (req, res) => {
    const ini = fs.readFileSync(path.join(__dirname, "..", "responses", "CloudDir", "Full.ini"));

    res.status(200).send(ini).end();
})

app.get("/waitingroom/api/waitingroom", (req, res) => {
    res.status(204);
    res.end();
});

app.get("/socialban/api/public/v1/*", (req, res) => {
    res.json({
        "bans": [],
        "warnings": []
    });
});

app.get("/fortnite/api/game/v2/events/tournamentandhistory/*/EU/WindowsClient", (req, res) => {
    res.json({});
});

app.get("/fortnite/api/statsv2/account/:accountId", (req, res) => {
    res.json({
        "startTime": 0,
        "endTime": 0,
        "stats": {},
        "accountId": req.params.accountId
    });
});

app.get("/statsproxy/api/statsv2/account/:accountId", (req, res) => {
    res.json({
        "startTime": 0,
        "endTime": 0,
        "stats": {},
        "accountId": req.params.accountId
    });
});

app.get("/fortnite/api/stats/accountId/:accountId/bulk/window/alltime", (req, res) => {
    res.json({
        "startTime": 0,
        "endTime": 0,
        "stats": {},
        "accountId": req.params.accountId
    });
});

app.post("/fortnite/api/feedback/*", (req, res) => {
    res.status(200);
    res.end();
});

app.post("/fortnite/api/statsv2/query", (req, res) => {
    res.json([]);
});

app.post("/statsproxy/api/statsv2/query", (req, res) => {
    res.json([]);
});

app.post("/fortnite/api/game/v2/events/v2/setSubgroup/*", (req, res) => {
    res.status(204);
    res.end();
});

app.get("/fortnite/api/game/v2/enabled_features", (req, res) => {
    res.json([]);
});

app.get("/api/v1/events/Fortnite/download/*", (req, res) => {
    res.json({});
});

app.get("/fortnite/api/game/v2/twitch/*", (req, res) => {
    res.status(200);
    res.end();
});

app.get("/fortnite/api/game/v2/world/info", (req, res) => {
    res.json({});
});

app.post("/fortnite/api/game/v2/chat/*/recommendGeneralChatRooms/pc", (req, res) => {
    res.json({});
});

app.get("/fortnite/api/receipts/v1/account/*/receipts", (req, res) => {
    res.json([]);
});

app.get("/fortnite/api/game/v2/leaderboards/cohort/*", (req, res) => {
    res.json([]);
});

app.post("/datarouter/api/v1/public/data", (req, res) => {
    res.status(204);
    res.end();
});

module.exports = app;
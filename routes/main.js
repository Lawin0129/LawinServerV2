const express = require("express");
const app = express.Router();

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");

app.post("/fortnite/api/game/v2/tryPlayOnPlatform/account/*", verifyToken, (req, res) => {
    res.setHeader("Content-Type", "text/plain");
    res.send(true);
})

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
})

app.get("/waitingroom/api/waitingroom", (req, res) => {
    res.status(204);
    res.end();
})

app.get("/socialban/api/public/v1/*", verifyToken, (req, res) => {
    res.json({
        "bans": [],
        "warnings": []
    });
})

app.get("/fortnite/api/game/v2/events/tournamentandhistory/*/EU/WindowsClient", verifyToken, (req, res) => {
    res.json({});
})

app.get("/fortnite/api/statsv2/account/:accountId", verifyToken, (req, res) => {
    res.json({
        "startTime": 0,
        "endTime": 0,
        "stats": {},
        "accountId": req.user.accountId
    });
})

app.get("/statsproxy/api/statsv2/account/:accountId", verifyToken, (req, res) => {
    res.json({
        "startTime": 0,
        "endTime": 0,
        "stats": {},
        "accountId": req.user.accountId
    });
})

app.get("/fortnite/api/stats/accountId/:accountId/bulk/window/alltime", verifyToken, (req, res) => {
    res.json({
        "startTime": 0,
        "endTime": 0,
        "stats": {},
        "accountId": req.user.accountId
    })
})

app.post("/fortnite/api/feedback/*", verifyToken, (req, res) => {
    res.status(200);
    res.end();
})

app.post("/fortnite/api/statsv2/query", verifyToken, (req, res) => {
    res.json([]);
})

app.post("/statsproxy/api/statsv2/query", verifyToken, (req, res) => {
    res.json([]);
})

app.post("/fortnite/api/game/v2/events/v2/setSubgroup/*", verifyToken, (req, res) => {
    res.status(204);
    res.end();
})

app.get("/fortnite/api/game/v2/enabled_features", verifyToken, (req, res) => {
    res.json([])
})

app.get("/api/v1/events/Fortnite/download/*", verifyToken, (req, res) => {
    res.json({})
})

app.get("/fortnite/api/game/v2/twitch/*", verifyToken, (req, res) => {
    res.status(200);
    res.end();
})

app.get("/fortnite/api/game/v2/world/info", verifyToken, (req, res) => {
    res.json({});
})

app.post("/fortnite/api/game/v2/chat/*/*/*/pc", verifyToken, (req, res) => {
    res.json({ "GlobalChatRooms": [{ "roomName": "lawinserverglobal" }] })
})

app.post("/fortnite/api/game/v2/chat/*/recommendGeneralChatRooms/pc", verifyToken, (req, res) => {
    res.json({});
})

app.get("/fortnite/api/receipts/v1/account/*/receipts", verifyToken, (req, res) => {
    res.json([])
})

app.get("/fortnite/api/game/v2/leaderboards/cohort/*", verifyToken, (req, res) => {
    res.json([])
})

app.post("/datarouter/api/v1/public/data", (req, res) => {
    res.status(204);
    res.end();
})

module.exports = app;
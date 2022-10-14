const express = require("express");
const app = express.Router();
const functions = require("../structs/functions.js");

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");

app.get("/fortnite/api/matchmaking/session/findPlayer/*", verifyToken, async (req, res) => {
    res.status(200);
    res.end();
})

app.get("/fortnite/api/game/v2/matchmakingservice/ticket/player/*", verifyToken, async (req, res) => {
    res.cookie("buildUniqueId", req.query.bucketId.split(":")[0]);

    res.json({
        "serviceUrl": "ws://lawinservermatchmaker.herokuapp.com",
        "ticketType": "mms-player",
        "payload": "69=",
        "signature": "420="
    })
    res.end();
})

app.get("/fortnite/api/game/v2/matchmaking/account/:accountId/session/:sessionId", verifyToken, async (req, res) => {
    res.json({
        "accountId": req.params.accountId,
        "sessionId": req.params.sessionId,
        "key": "AOJEv8uTFmUh7XM2328kq9rlAzeQ5xzWzPIiyKn2s7s="
    })
})

app.get("/fortnite/api/matchmaking/session/:session_id", verifyToken, async (req, res) => {
    res.json({
        "id": req.params.session_id,
        "ownerId": functions.MakeID().replace(/-/ig, "").toUpperCase(),
        "ownerName": "[DS]fortnite-liveeugcec1c2e30ubrcore0a-z8hj-1968",
        "serverName": "[DS]fortnite-liveeugcec1c2e30ubrcore0a-z8hj-1968",
        "serverAddress": "164.92.177.128",
        "serverPort": 7777,
        "maxPublicPlayers": 220,
        "openPublicPlayers": 175,
        "maxPrivatePlayers": 0,
        "openPrivatePlayers": 0,
        "attributes": {
          "REGION_s": "EU",
          "GAMEMODE_s": "FORTATHENA",
          "ALLOWBROADCASTING_b": true,
          "SUBREGION_s": "GB",
          "DCID_s": "FORTNITE-LIVEEUGCEC1C2E30UBRCORE0A-14840880",
          "tenant_s": "Fortnite",
          "MATCHMAKINGPOOL_s": "Any",
          "STORMSHIELDDEFENSETYPE_i": 0,
          "HOTFIXVERSION_i": 0,
          "PLAYLISTNAME_s": "Playlist_DefaultSolo",
          "SESSIONKEY_s": functions.MakeID().replace(/-/ig, "").toUpperCase(),
          "TENANT_s": "Fortnite",
          "BEACONPORT_i": 15009
        },
        "publicPlayers": [],
        "privatePlayers": [],
        "totalPlayers": 45,
        "allowJoinInProgress": false,
        "shouldAdvertise": false,
        "isDedicated": false,
        "usesStats": false,
        "allowInvites": false,
        "usesPresence": false,
        "allowJoinViaPresence": true,
        "allowJoinViaPresenceFriendsOnly": false,
        "buildUniqueId": req.cookies.buildUniqueId || "0",
        "lastUpdated": new Date().toISOString(),
        "started": false
      })
})

app.post("/fortnite/api/matchmaking/session/*/join", verifyToken, async (req, res) => {
    res.status(204);
    res.end();
})

app.post("/fortnite/api/matchmaking/session/matchMakingRequest", verifyToken, async (req, res) => {
    res.json([])
})

module.exports = app;
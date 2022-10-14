const express = require("express");
const app = express.Router();

const functions = require("../structs/functions.js");

const Friends = require("../model/friends.js");
const friendManager = require("../structs/friend.js");

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");

app.get("/friends/api/v1/*/settings", verifyToken, async (req, res) => {
    res.json({})
});

app.get("/friends/api/v1/*/blocklist", verifyToken, async (req, res) => {
    res.json([])
});

app.get("/friends/api/public/friends/:accountId", verifyToken, async (req, res) => {
    let response = [];

    const friends = await Friends.findOne({ accountId: req.user.accountId }).lean();

    friends.list.accepted.forEach(friend => {
        response.push({
            "accountId": friend.accountId,
            "status": "ACCEPTED",
            "direction": "OUTBOUND",
            "created": friend.created,
            "favorite": false
        })
    })
    friends.list.incoming.forEach(friend => {
        response.push({
            "accountId": friend.accountId,
            "status": "PENDING",
            "direction": "INBOUND",
            "created": friend.created,
            "favorite": false
        })
    })
    friends.list.outgoing.forEach(friend => {
        response.push({
            "accountId": friend.accountId,
            "status": "PENDING",
            "direction": "OUTBOUND",
            "created": friend.created,
            "favorite": false
        })
    })

    res.json(response);
});

app.post("/friends/api/public/friends/*/:receiverId", verifyToken, async (req, res) => {
    let sender = await Friends.findOne({ accountId: req.user.accountId });
    let receiver = await Friends.findOne({ accountId: req.params.receiverId });
    if (!sender || !receiver) return res.status(403).end();

    if (sender.list.incoming.find(i => i.accountId == receiver.accountId)) {
        if (!await friendManager.acceptFriendReq(sender.accountId, receiver.accountId)) return res.status(403).end();

        functions.getPresenceFromUser(sender.accountId, receiver.accountId, false);
        functions.getPresenceFromUser(receiver.accountId, sender.accountId, false);
    } else if (!sender.list.outgoing.find(i => i.accountId == receiver.accountId)) {
        if (!await friendManager.sendFriendReq(sender.accountId, receiver.accountId)) return res.status(403).end();
    }

    res.status(204).end();
});

app.post("/friends/api/v1/*/friends/:receiverId", verifyToken, async (req, res) => {
    let sender = await Friends.findOne({ accountId: req.user.accountId });
    let receiver = await Friends.findOne({ accountId: req.params.receiverId });
    if (!sender || !receiver) return res.status(403).end();

    if (sender.list.incoming.find(i => i.accountId == receiver.accountId)) {
        if (!await friendManager.acceptFriendReq(sender.accountId, receiver.accountId)) return res.status(403).end();

        functions.getPresenceFromUser(sender.accountId, receiver.accountId, false);
        functions.getPresenceFromUser(receiver.accountId, sender.accountId, false);
    } else if (!sender.list.outgoing.find(i => i.accountId == receiver.accountId)) {
        if (!await friendManager.sendFriendReq(sender.accountId, receiver.accountId)) return res.status(403).end();
    }

    res.status(204).end();
});

app.delete("/friends/api/public/friends/*/:receiverId", verifyToken, async (req, res) => {
    let sender = await Friends.findOne({ accountId: req.user.accountId });
    let receiver = await Friends.findOne({ accountId: req.params.receiverId });
    if (!sender || !receiver) return res.status(403).end();

    if (!await friendManager.deleteFriend(sender.accountId, receiver.accountId)) return res.status(403).end();

    functions.getPresenceFromUser(sender.accountId, receiver.accountId, true);
    functions.getPresenceFromUser(receiver.accountId, sender.accountId, true);

    res.status(204).end();
});

app.delete("/friends/api/v1/*/friends/:receiverId", verifyToken, async (req, res) => {
    let sender = await Friends.findOne({ accountId: req.user.accountId });
    let receiver = await Friends.findOne({ accountId: req.params.receiverId });
    if (!sender || !receiver) return res.status(403).end();

    if (!await friendManager.deleteFriend(sender.accountId, receiver.accountId)) return res.status(403).end();

    functions.getPresenceFromUser(sender.accountId, receiver.accountId, true);
    functions.getPresenceFromUser(receiver.accountId, sender.accountId, true);

    res.status(204).end();
});

app.post("/friends/api/public/blocklist/*/:receiverId", verifyToken, async (req, res) => {
    let sender = await Friends.findOne({ accountId: req.user.accountId });
    let receiver = await Friends.findOne({ accountId: req.params.receiverId });
    if (!sender || !receiver) return res.status(403).end();

    if (!await friendManager.blockFriend(sender.accountId, receiver.accountId)) return res.status(403).end();

    functions.getPresenceFromUser(sender.accountId, receiver.accountId, true);
    functions.getPresenceFromUser(receiver.accountId, sender.accountId, true);

    res.status(204).end();
});

app.post("/friends/api/v1/*/blocklist/:receiverId", verifyToken, async (req, res) => {
    let sender = await Friends.findOne({ accountId: req.user.accountId });
    let receiver = await Friends.findOne({ accountId: req.params.receiverId });
    if (!sender || !receiver) return res.status(403).end();

    if (!await friendManager.blockFriend(sender.accountId, receiver.accountId)) return res.status(403).end();

    functions.getPresenceFromUser(sender.accountId, receiver.accountId, true);
    functions.getPresenceFromUser(receiver.accountId, sender.accountId, true);

    res.status(204).end();
});

app.delete("/friends/api/public/blocklist/*/:receiverId", verifyToken, async (req, res) => {
    let sender = await Friends.findOne({ accountId: req.user.accountId });
    let receiver = await Friends.findOne({ accountId: req.params.receiverId });
    if (!sender || !receiver) return res.status(403).end();

    if (!await friendManager.deleteFriend(sender.accountId, receiver.accountId)) return res.status(403).end();

    res.status(204).end();
});

app.delete("/friends/api/v1/*/blocklist/:receiverId", verifyToken, async (req, res) => {
    let sender = await Friends.findOne({ accountId: req.user.accountId });
    let receiver = await Friends.findOne({ accountId: req.params.receiverId });
    if (!sender || !receiver) return res.status(403).end();

    if (!await friendManager.deleteFriend(sender.accountId, receiver.accountId)) return res.status(403).end();

    res.status(204).end();
});

app.get("/friends/api/v1/:accountId/summary", verifyToken, async (req, res) => {
    var response = {
        "friends": [],
        "incoming": [],
        "outgoing": [],
        "suggested": [],
        "blocklist": [],
        "settings": {
            "acceptInvites": "public"
        }
    }

    const friends = await Friends.findOne({ accountId: req.user.accountId }).lean();

    friends.list.accepted.forEach(friend => {
        response.friends.push({
            "accountId": friend.accountId,
            "groups": [],
            "mutual": 0,
            "alias": "",
            "note": "",
            "favorite": false,
            "created": friend.created
        })
    })
    friends.list.incoming.forEach(friend => {
        response.incoming.push({
            "accountId": friend.accountId,
            "mutual": 0,
            "favorite": false,
            "created": friend.created
        })
    })
    friends.list.outgoing.forEach(friend => {
        response.outgoing.push({
            "accountId": friend.accountId,
            "favorite": false
        })
    })
    friends.list.blocked.forEach(friend => {
        response.blocklist.push({
            "accountId": friend.accountId
        })
    })

    res.json(response);
});

app.get("/friends/api/public/list/fortnite/*/recentPlayers", verifyToken, async (req, res) => {
    res.json([])
});

app.get("/friends/api/public/blocklist/*", verifyToken, async (req, res) => {
    var friends = await Friends.findOne({ accountId: req.user.accountId }).lean();

    res.json({
        "blockedUsers": friends.list.blocked.map(i => i.accountId)
    })
});

module.exports = app;
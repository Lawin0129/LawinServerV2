const express = require("express");
const app = express.Router();

const functions = require("../structs/functions.js");

const Friends = require("../model/friends.js");
const friendManager = require("../structs/friend.js");

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");

app.get("/friends/api/v1/*/settings", (req, res) => {
    res.json({});
});

app.get("/friends/api/v1/*/blocklist", (req, res) => {
    res.json([]);
});

app.get("/friends/api/public/list/fortnite/*/recentPlayers", (req, res) => {
    res.json([]);
});

app.get("/friends/api/public/friends/:accountId", verifyToken, async (req, res) => {
    let response = [];

    const friends = await Friends.findOne({ accountId: req.user.accountId }).lean();

    friends.list.accepted.forEach(acceptedFriend => {
        response.push({
            "accountId": acceptedFriend.accountId,
            "status": "ACCEPTED",
            "direction": "OUTBOUND",
            "created": acceptedFriend.created,
            "favorite": false
        });
    });

    friends.list.incoming.forEach(incomingFriend => {
        response.push({
            "accountId": incomingFriend.accountId,
            "status": "PENDING",
            "direction": "INBOUND",
            "created": incomingFriend.created,
            "favorite": false
        });
    });

    friends.list.outgoing.forEach(outgoingFriend => {
        response.push({
            "accountId": outgoingFriend.accountId,
            "status": "PENDING",
            "direction": "OUTBOUND",
            "created": outgoingFriend.created,
            "favorite": false
        });
    });

    res.json(response);
});

app.post("/friends/api/*/friends*/:receiverId", verifyToken, async (req, res) => {
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

app.delete("/friends/api/*/friends*/:receiverId", verifyToken, async (req, res) => {
    let sender = await Friends.findOne({ accountId: req.user.accountId });
    let receiver = await Friends.findOne({ accountId: req.params.receiverId });
    if (!sender || !receiver) return res.status(403).end();

    if (!await friendManager.deleteFriend(sender.accountId, receiver.accountId)) return res.status(403).end();

    functions.getPresenceFromUser(sender.accountId, receiver.accountId, true);
    functions.getPresenceFromUser(receiver.accountId, sender.accountId, true);

    res.status(204).end();
});

app.post("/friends/api/*/blocklist*/:receiverId", verifyToken, async (req, res) => {
    let sender = await Friends.findOne({ accountId: req.user.accountId });
    let receiver = await Friends.findOne({ accountId: req.params.receiverId });
    if (!sender || !receiver) return res.status(403).end();

    if (!await friendManager.blockFriend(sender.accountId, receiver.accountId)) return res.status(403).end();

    functions.getPresenceFromUser(sender.accountId, receiver.accountId, true);
    functions.getPresenceFromUser(receiver.accountId, sender.accountId, true);

    res.status(204).end();
});

app.delete("/friends/api/*/blocklist*/:receiverId", verifyToken, async (req, res) => {
    let sender = await Friends.findOne({ accountId: req.user.accountId });
    let receiver = await Friends.findOne({ accountId: req.params.receiverId });
    if (!sender || !receiver) return res.status(403).end();

    if (!await friendManager.deleteFriend(sender.accountId, receiver.accountId)) return res.status(403).end();

    res.status(204).end();
});

app.get("/friends/api/v1/:accountId/summary", verifyToken, async (req, res) => {
    let response = {
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

    friends.list.accepted.forEach(acceptedFriend => {
        response.friends.push({
            "accountId": acceptedFriend.accountId,
            "groups": [],
            "mutual": 0,
            "alias": acceptedFriend.alias ? acceptedFriend.alias : "",
            "note": "",
            "favorite": false,
            "created": acceptedFriend.created
        });
    });

    friends.list.incoming.forEach(incomingFriend => {
        response.incoming.push({
            "accountId": incomingFriend.accountId,
            "mutual": 0,
            "favorite": false,
            "created": incomingFriend.created
        });
    });

    friends.list.outgoing.forEach(outgoingFriend => {
        response.outgoing.push({
            "accountId": outgoingFriend.accountId,
            "favorite": false
        });
    });

    friends.list.blocked.forEach(blockedFriend => {
        response.blocklist.push({
            "accountId": blockedFriend.accountId
        });
    });

    res.json(response);
});

app.get("/friends/api/public/blocklist/*", verifyToken, async (req, res) => {
    let friends = await Friends.findOne({ accountId: req.user.accountId }).lean();

    res.json({
        "blockedUsers": friends.list.blocked.map(i => i.accountId)
    });
});

app.all("/friends/api/v1/*/friends/:friendId/alias", verifyToken, getRawBody, async (req, res) => {
    let friends = await Friends.findOne({ accountId: req.user.accountId }).lean();
    const aliasPattern = /[\p{LD} \-_.'\u2018\u2019]+/gu;

    if (!friends.list.accepted.find(i => i.accountId == req.params.friendId)) return error.createError(
        "errors.com.epicgames.friends.friendship_not_found",
        `Friendship between ${req.user.accountId} and ${req.params.friendId} does not exist`, 
        [req.user.accountId,req.params.friendId], 14004, undefined, 404, res
    );

    const friendIndex = friends.list.accepted.findIndex(i => i.accountId == req.params.friendId);

    switch (req.method) {
        case "PUT":
            if (!(aliasPattern.test(req.rawBody)) || (req.rawBody < 3) || (req.rawBody > 16)) return error.createError(
                "errors.com.epicgames.validation.validation_failed",
                "Validation Failed. Invalid fields were [alias]", 
                ["[alias]"], 1040, undefined, 404, res
            );
            
            friends.list.accepted[friendIndex].alias = req.rawBody;
            
            await friends.updateOne({ $set: { list: friends.list } });
        break;

        case "DELETE":
            friends.list.accepted[friendIndex].alias = "";
            
            await friends.updateOne({ $set: { list: friends.list } });
        break;
    }

    res.status(204).end();
});

function getRawBody(req, res, next) {
    if (req.headers["content-length"]) {
        if (Number(req.headers["content-length"]) > 16) return res.status(403).json({ "error": "File size must be 16 bytes or less." });
    }

    try {
        req.rawBody = "";
        req.on("data", (chunk) => req.rawBody += chunk);
        req.on("end", () => next());
    } catch {
        res.status(400).json({ "error": "Something went wrong while trying to access the request body." });
    }
}

module.exports = app;
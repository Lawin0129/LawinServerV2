const express = require("express");
const app = express();
const profile = require("./../model/profiles.js")

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");


app.get("/fortnite/api/game/v2/privacy/account/:accountId", verifyToken , async (req, res) => {
    const profiles = await profile.findOne({ accountId: req.user.accountId });

    if(!profiles) return res.status(400).end();

    res.json({
        accountId: profiles.accountId,
        optOutOfPublicLeaderboards: profiles.profiles.athena.stats.attributes.optOutOfPublicLeaderboards
    }).end();
})

app.post("/fortnite/api/game/v2/privacy/account/:accountId", verifyToken , async (req, res) => {
    const profiles = await profile.findOne({ accountId: req.user.accountId });

    if(!profiles) return res.status(400).end();

    let profile = profiles.profiles.athena;

    profile.stats.attributes.optOutOfPublicLeaderboards = req.body.optOutOfPublicLeaderboards

    await profiles.updateOne({ $set: { [`profiles.athena`]: profile} });

    res.json({
        accountId: profiles.accountId,
        optOutOfPublicLeaderboards: profile.stats.attributes.optOutOfPublicLeaderboards
    }).end();
})

module.exports = app;
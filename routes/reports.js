const express = require("express");
const app = express.Router();

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");
const User = require("../model/user.js");
const config = require("../Config/config.json");
const {Client, Intents} = require("discord.js");
const Discord = require("discord.js");

app.post("/fortnite/api/game/v2/toxicity/account/:reporter/report/:reportedPlayer", verifyToken, async (req, res) => {

    const reporter = req.params.reporter;
    const reportedPlayer = req.params.reportedPlayer;
    
    let reporterData = await User.findOne({ accountId: reporter }).lean();
    let reportedPlayerData = await User.findOne({ accountId: reportedPlayer }).lean();
    
    const reason = req.body.reason || 'No reason provided';
    const details = req.body.details || 'No details provided';
    const markedasknown = req.body.bUserMarkedAsKnown ? 'Yes' : 'No';

    const user = await User.findOneAndUpdate({ accountId: reportedPlayer } , { $inc: { reports: 1 } }, { new: true });

    res.status(200).send({ "success": true });

});

module.exports = app;

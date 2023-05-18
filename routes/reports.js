const express = require("express");
const app = express.Router();

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");
const User = require("../model/user.js");

app.post("/fortnite/api/game/v2/toxicity/account/:reporter/report/:reportedPlayer", verifyToken, async (req, res, next) => {
    try {
        const reporter = req.params.reporter;
        const reportedPlayer = req.params.reportedPlayer;

        if (!reporter || !reportedPlayer) {
            res.status(400).send({ success: false, error: 'Missing reporter or reportedPlayer' });
            return;
        }

        let reporterData;
        let reportedPlayerData;

        try {
            reporterData = await User.findOne({ accountId: reporter });
            reportedPlayerData = await User.findOne({ accountId: reportedPlayer });
        } catch (error) {
            console.error(error);
            res.status(500).send({ success: false, error: 'Internal Server Error' });
            return;
        }

        const reason = req.body.reason || 'No reason provided';
        const details = req.body.details || 'No details provided';
        const markedasknown = req.body.bUserMarkedAsKnown ? 'Yes' : 'No';

        let user;

        try {
            user = await User.findOneAndUpdate(
                { accountId: reportedPlayer },
                { $inc: { reports: 1 } },
                { new: true }
            );
        } catch (error) {
            console.error(error);
            res.status(500).send({ success: false, error: 'Internal Server Error' });
            return;
        }

        if (!user) {
            res.status(404).send({ success: false, error: 'User not found' });
            return;
        }

        res.status(200).send({ success: true });

    } catch (error) {
        console.error(error);
    }
});

module.exports = app;

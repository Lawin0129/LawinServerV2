const express = require("express");
const app = express.Router();

const error = require("../structs/error.js");

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");
const User = require("../model/user.js");

app.get("/account/api/public/account", verifyToken, async (req, res) => {
    var response = [];

    if (typeof req.query.accountId == "string") {
        var user = await User.findOne({ accountId: req.query.accountId, banned: false }).lean();

        if (user) {
            response.push({
                id: user.accountId,
                displayName: user.username,
                externalAuths: {}
            })
        }
    }

    if (Array.isArray(req.query.accountId)) {
        for (var x in req.query.accountId) {
            var user = await User.findOne({ accountId: req.query.accountId[x], banned: false }).lean();

            if (user) {
                response.push({
                    id: user.accountId,
                    displayName: user.username,
                    externalAuths: {}
                })
            }
        }
    }

    res.json(response)
});

app.get("/account/api/public/account/displayName/:displayName", verifyToken, async (req, res) => {
    var user = await User.findOne({ username_lower: req.params.displayName.toLowerCase(), banned: false }).lean();
    if (!user) return error.createError(
        "errors.com.epicgames.account.account_not_found",
        `Sorry, we couldn't find an account for ${req.params.displayName}`, 
        [req.params.displayName], 18007, undefined, 404, res
    );
    
    res.json({
        id: user.accountId,
        displayName: user.username,
        externalAuths: {}
    });
});

app.get("/account/api/public/account/:accountId", verifyToken, async (req, res) => {
    res.json({
        id: req.user.accountId,
        displayName: req.user.username,
        name: "Lawin",
        email: req.user.email,
        failedLoginAttempts: 0,
        lastLogin: new Date().toISOString(),
        numberOfDisplayNameChanges: 0,
        ageGroup: "UNKNOWN",
        headless: false,
        country: "US",
        lastName: "Server",
        preferredLanguage: "en",
        canUpdateDisplayName: false,
        tfaEnabled: false,
        emailVerified: true,
        minorVerified: false,
        minorExpected: false,
        minorStatus: "UNKNOWN"
    })
});

app.get("/account/api/public/account/*/externalAuths", verifyToken, async (req, res) => {
    res.json([])
});

module.exports = app;
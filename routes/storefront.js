const express = require("express");
const app = express.Router();

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");
const keychain = require("../responses/keychain.json");

app.get("/fortnite/api/storefront/v2/catalog", verifyToken, async (req, res) => {
    if (req.headers["user-agent"].includes("2870186")) return res.status(404).end();

    res.json({
        refreshIntervalHrs: 24,
        dailyPurchaseHrs: 24,
        expiration: "9999-12-31T00:00:00.000Z",
        storefronts: []
    });
});

app.get("/fortnite/api/storefront/v2/keychain", verifyToken, async (req, res) => {
    res.json(keychain);
});

app.get("/catalog/api/shared/bulk/offers", verifyToken, async (req, res) => {
    res.json({});
});

module.exports = app;
const express = require("express");
const app = express.Router();
const Profile = require("../model/profiles.js");
const Friends = require("../model/friends.js");
const functions = require("../structs/functions.js");

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");
const keychain = require("../responses/keychain.json");

app.get("/fortnite/api/storefront/v2/catalog", (req, res) => {
    if (req.headers["user-agent"].includes("2870186")) return res.status(404).end();

    res.json(functions.getItemShop());
});

app.get("/fortnite/api/storefront/v2/gift/check_eligibility/recipient/:recipientId/offer/:offerId", verifyToken, async (req, res) => {
    const findOfferId = functions.getOfferID(req.params.offerId);
    if (!findOfferId) return error.createError(
        "errors.com.epicgames.fortnite.id_invalid",
        `Offer ID (id: "${req.params.offerId}") not found`,
        [req.params.offerId], 16027, undefined, 400, res
    );

    let sender = await Friends.findOne({ accountId: req.user.accountId }).lean();

    if (!sender.list.accepted.find(i => i.accountId == req.params.recipientId) && req.params.recipientId != req.user.accountId) return error.createError(
        "errors.com.epicgames.friends.no_relationship",
        `User ${req.user.accountId} is not friends with ${req.params.recipientId}`,
        [req.user.accountId,req.params.recipientId], 28004, undefined, 403, res
    );

    const profiles = await Profile.findOne({ accountId: req.params.recipientId });

    let athena = profiles.profiles["athena"];

    for (let itemGrant of findOfferId.offerId.itemGrants) {
        for (let itemId in athena.items) {
            if (itemGrant.templateId.toLowerCase() == athena.items[itemId].templateId.toLowerCase()) return error.createError(
                "errors.com.epicgames.modules.gamesubcatalog.purchase_not_allowed",
                `Could not purchase catalog offer ${findOfferId.offerId.devName}, item ${itemGrant.templateId}`,
                [findOfferId.offerId.devName,itemGrant.templateId], 28004, undefined, 403, res
            );
        }
    }

    res.json({
        price: findOfferId.offerId.prices[0],
        items: findOfferId.offerId.itemGrants
    });
});

app.get("/fortnite/api/storefront/v2/keychain", (req, res) => {
    res.json(keychain);
});

app.get("/catalog/api/shared/bulk/offers", (req, res) => {
    res.json({});
});

module.exports = app;

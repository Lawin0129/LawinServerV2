const express = require("express");
const app = express.Router();

const Profile = require("../model/profiles.js");
const profileManager = require("../structs/profile.js");
const error = require("../structs/error.js");
const functions = require("../structs/functions.js");

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");

app.post("/fortnite/api/game/v2/profile/*/client/MarkItemSeen", verifyToken, async (req, res) => {
    if (!await profileManager.validateProfile(req.user.accountId, req.query.profileId)) return res.status(403).json(error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${req.query.profileId}`, 
        [req.query.profileId], 12813, undefined)
    );

    const profiles = await Profile.findOne({ accountId: req.user.accountId });
    let profile = profiles.profiles[req.query.profileId];

    if (req.query.profileId == "athena") {
        const memory = functions.GetVersionInfo(req);

        profile.stats.attributes.season_num = memory.season;
    }

    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn || 0;
    let QueryRevision = req.query.rvn || -1;
    let StatChanged = false;

    let missingFields = [];
    if (!req.body.itemIds) missingFields.push("itemIds");

    if (missingFields.length > 0) return res.status(400).json(error.createError(
        "errors.com.epicgames.validation.validation_failed",
        `Validation Failed. [${missingFields.join(", ")}] field(s) is missing.`,
        [`[${missingFields.join(", ")}]`], 1040, undefined)
    );

    if (!Array.isArray(req.body.itemIds)) return res.status(400).json(error.createError(
        "errors.com.epicgames.validation.validation_failed",
        `Validation Failed. 'itemIds' is not an array.`,
        ["itemIds"], 1040, undefined)
    );
    
    for (let i in req.body.itemIds) {
        if (!profile.items[req.body.itemIds[i]]) continue;
        
        profile.items[req.body.itemIds[i]].attributes.item_seen = true;
        
        ApplyProfileChanges.push({
            "changeType": "itemAttrChanged",
            "itemId": req.body.itemIds[i],
            "attributeName": "item_seen",
            "attributeValue": true
        });

        StatChanged = true;
    }

    if (StatChanged) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();
    }

    if (QueryRevision != BaseRevision) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });

    if (StatChanged) await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
});

app.post("/fortnite/api/game/v2/profile/*/client/SetItemFavoriteStatusBatch", verifyToken, async (req, res) => {
    if (!await profileManager.validateProfile(req.user.accountId, req.query.profileId)) return res.status(403).json(error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${req.query.profileId}`, 
        [req.query.profileId], 12813, undefined)
    );

    if (req.query.profileId != "athena") return res.status(400).json(error.createError(
        "errors.com.epicgames.modules.profiles.invalid_command",
        `SetItemFavoriteStatusBatch is not valid on ${req.query.profileId} profile`, 
        ["SetItemFavoriteStatusBatch",req.query.profileId], 12801, undefined)
    );

    const profiles = await Profile.findOne({ accountId: req.user.accountId });
    let profile = profiles.profiles[req.query.profileId];

    if (req.query.profileId == "athena") {
        const memory = functions.GetVersionInfo(req);

        profile.stats.attributes.season_num = memory.season;
    }

    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn || 0;
    let QueryRevision = req.query.rvn || -1;
    let StatChanged = false;

    let missingFields = [];
    if (!req.body.itemIds) missingFields.push("itemIds");
    if (!req.body.itemFavStatus) missingFields.push("itemFavStatus");

    if (missingFields.length > 0) return res.status(400).json(error.createError(
        "errors.com.epicgames.validation.validation_failed",
        `Validation Failed. [${missingFields.join(", ")}] field(s) is missing.`,
        [`[${missingFields.join(", ")}]`], 1040, undefined)
    );

    if (!Array.isArray(req.body.itemIds)) return res.status(400).json(error.createError(
        "errors.com.epicgames.validation.validation_failed",
        `Validation Failed. 'itemIds' is not an array.`,
        ["itemIds"], 1040, undefined)
    );

    if (!Array.isArray(req.body.itemFavStatus)) return res.status(400).json(error.createError(
        "errors.com.epicgames.validation.validation_failed",
        `Validation Failed. 'itemFavStatus' is not an array.`,
        ["itemFavStatus"], 1040, undefined)
    );

    for (let i in req.body.itemIds) {
        if (!profile.items[req.body.itemIds[i]]) continue;
        if (typeof req.body.itemFavStatus[i] != "boolean") continue;

        profile.items[req.body.itemIds[i]].attributes.favorite = req.body.itemFavStatus[i];

        ApplyProfileChanges.push({
            "changeType": "itemAttrChanged",
            "itemId": req.body.itemIds[i],
            "attributeName": "favorite",
            "attributeValue": profile.items[req.body.itemIds[i]].attributes.favorite
        })

        StatChanged = true;
    }

    if (StatChanged) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();
    }

    if (QueryRevision != BaseRevision) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });

    if (StatChanged) await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
});

app.post("/fortnite/api/game/v2/profile/*/client/SetBattleRoyaleBanner", verifyToken, async (req, res) => {
    if (!await profileManager.validateProfile(req.user.accountId, req.query.profileId)) return res.status(403).json(error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${req.query.profileId}`, 
        [req.query.profileId], 12813, undefined)
    );

    if (req.query.profileId != "athena") return res.status(400).json(error.createError(
        "errors.com.epicgames.modules.profiles.invalid_command",
        `SetBattleRoyaleBanner is not valid on ${req.query.profileId} profile`, 
        ["SetBattleRoyaleBanner",req.query.profileId], 12801, undefined)
    );

    const profiles = await Profile.findOne({ accountId: req.user.accountId });
    let profile = profiles.profiles[req.query.profileId];

    const memory = functions.GetVersionInfo(req);

    if (req.query.profileId == "athena") profile.stats.attributes.season_num = memory.season;

    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn || 0;
    let QueryRevision = req.query.rvn || -1;
    let StatChanged = false;

    let missingFields = [];
    if (!req.body.homebaseBannerIconId) missingFields.push("homebaseBannerIconId");
    if (!req.body.homebaseBannerColorId) missingFields.push("homebaseBannerColorId");

    if (missingFields.length > 0) return res.status(400).json(error.createError(
        "errors.com.epicgames.validation.validation_failed",
        `Validation Failed. [${missingFields.join(", ")}] field(s) is missing.`,
        [`[${missingFields.join(", ")}]`], 1040, undefined)
    );

    if (typeof req.body.homebaseBannerIconId != "string") return res.status(400).json(error.createError(
        "errors.com.epicgames.validation.validation_failed",
        `Validation Failed. 'homebaseBannerIconId' is not a string.`,
        ["homebaseBannerIconId"], 1040, undefined)
    );

    if (typeof req.body.homebaseBannerColorId != "string") return res.status(400).json(error.createError(
        "errors.com.epicgames.validation.validation_failed",
        `Validation Failed. 'homebaseBannerColorId' is not a string.`,
        ["homebaseBannerColorId"], 1040, undefined)
    );

    let returnError = true;
    let bannerProfileId = memory.build < 3.5 ? "profile0" : "common_core";

    for (let itemId in profiles.profiles[bannerProfileId].items) {
        if (profiles.profiles[bannerProfileId].items[itemId].templateId.startsWith(`HomebaseBannerIcon:${req.body.homebaseBannerIconId}`)) returnError = false;
    }

    if (returnError) return res.status(400).json(error.createError(
        "errors.com.epicgames.fortnite.item_not_found",
        `Banner template 'HomebaseBannerIcon:${req.body.homebaseBannerIconId}' not found in profile`, 
        [`HomebaseBannerIcon:${req.body.homebaseBannerIconId}`], 16006, undefined)
    );

    returnError = true;
    
    for (let itemId in profiles.profiles[bannerProfileId].items) {
        if (profiles.profiles[bannerProfileId].items[itemId].templateId.startsWith(`HomebaseBannerColor:${req.body.homebaseBannerColorId}`)) returnError = false;
    }

    if (returnError) return res.status(400).json(error.createError(
        "errors.com.epicgames.fortnite.item_not_found",
        `Banner template 'HomebaseBannerColor:${req.body.homebaseBannerColorId}' not found in profile`, 
        [`HomebaseBannerColor:${req.body.homebaseBannerColorId}`], 16006, undefined)
    );

    profile.stats.attributes.banner_icon = req.body.homebaseBannerIconId;
    profile.stats.attributes.banner_color = req.body.homebaseBannerColorId;

    ApplyProfileChanges.push({
        "changeType": "statModified",
        "name": "banner_icon",
        "value": profile.stats.attributes.banner_icon
    });
    
    ApplyProfileChanges.push({
        "changeType": "statModified",
        "name": "banner_color",
        "value": profile.stats.attributes.banner_color
    });

    StatChanged = true;

    if (StatChanged) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();
    }

    if (QueryRevision != BaseRevision) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });

    if (StatChanged) await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
});

app.post("/fortnite/api/game/v2/profile/*/client/EquipBattleRoyaleCustomization", verifyToken, async (req, res) => {
    if (!await profileManager.validateProfile(req.user.accountId, req.query.profileId)) return res.status(403).json(error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${req.query.profileId}`, 
        [req.query.profileId], 12813, undefined)
    );

    if (req.query.profileId != "athena") return res.status(400).json(error.createError(
        "errors.com.epicgames.modules.profiles.invalid_command",
        `EquipBattleRoyaleCustomization is not valid on ${req.query.profileId} profile`, 
        ["EquipBattleRoyaleCustomization",req.query.profileId], 12801, undefined)
    );

    const profiles = await Profile.findOne({ accountId: req.user.accountId });
    let profile = profiles.profiles[req.query.profileId];

    if (req.query.profileId == "athena") {
        const memory = functions.GetVersionInfo(req);

        profile.stats.attributes.season_num = memory.season;
    }

    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn || 0;
    let QueryRevision = req.query.rvn || -1;
    let StatChanged = false;
    let specialCosmetics = [
        "athenacharacter:cid_random",
        "athenabackpack:bid_random",
        "athenapickaxe:pickaxe_random",
        "athenaglider:glider_random",
        "athenaskydivecontrail:trails_random",
        "athenaitemwrap:wrap_random",
        "athenamusicpack:musicpack_random",
        "athenaloadingscreen:lsid_random"
    ];

    let missingFields = [];
    if (!req.body.slotName) missingFields.push("slotName");

    if (missingFields.length > 0) return res.status(400).json(error.createError(
        "errors.com.epicgames.validation.validation_failed",
        `Validation Failed. [${missingFields.join(", ")}] field(s) is missing.`,
        [`[${missingFields.join(", ")}]`], 1040, undefined)
    );

    if (typeof req.body.itemToSlot != "string") return res.status(400).json(error.createError(
        "errors.com.epicgames.validation.validation_failed",
        `Validation Failed. 'itemToSlot' is not a string.`,
        ["itemToSlot"], 1040, undefined)
    );

    if (typeof req.body.slotName != "string") return res.status(400).json(error.createError(
        "errors.com.epicgames.validation.validation_failed",
        `Validation Failed. 'slotName' is not a string.`,
        ["slotName"], 1040, undefined)
    );

    if (!profile.items[req.body.itemToSlot] && req.body.itemToSlot) {
        let item = req.body.itemToSlot.toLowerCase();

        if (!specialCosmetics.includes(item)) {
            return res.status(400).json(error.createError(
                "errors.com.epicgames.fortnite.id_invalid",
                `Item (id: "${req.body.itemToSlot}") not found`, 
                [req.body.itemToSlot], 16027, undefined)
            );
        }
    }

    if (profile.items[req.body.itemToSlot]) {
        if (!profile.items[req.body.itemToSlot].templateId.startsWith(`Athena${req.body.slotName}:`)) return res.status(400).json(error.createError(
            "errors.com.epicgames.fortnite.id_invalid",
            `Cannot slot item of type ${profile.items[req.body.itemToSlot].templateId.split(":")[0]} in slot of category ${req.body.slotName}`, 
            [profile.items[req.body.itemToSlot].templateId.split(":")[0],req.body.slotName], 16027, undefined)
        );

        let Variants = req.body.variantUpdates;
        let item = req.body.itemToSlot.toLowerCase();

        if (Variants && !specialCosmetics.includes(item)) {
            for (let i in Variants) {
                if (!Variants[i].channel) continue;
                if (!Variants[i].active) continue;

                let index = profile.items[req.body.itemToSlot].attributes.variants.findIndex(x => x.channel == Variants[i].channel);

                if (index == -1) continue;
                if (!profile.items[req.body.itemToSlot].attributes.variants[index].owned.includes(Variants[i].active)) continue;

                profile.items[req.body.itemToSlot].attributes.variants[index].active = Variants[i].active;
            }

            ApplyProfileChanges.push({
                "changeType": "itemAttrChanged",
                "itemId": req.body.itemToSlot,
                "attributeName": "variants",
                "attributeValue": profile.items[req.body.itemToSlot].attributes.variants
            })
        }
    }

    let slotNames = ["Character","Backpack","Pickaxe","Glider","SkyDiveContrail","MusicPack","LoadingScreen"];
    
    switch (req.body.slotName) {
        case "Dance":
            var indexwithinslot = req.body.indexWithinSlot || 0;

            if (indexwithinslot >= 0 && indexwithinslot <= 5) {
                profile.stats.attributes.favorite_dance[indexwithinslot] = req.body.itemToSlot || "";

                StatChanged = true;
            }
        break;

        case "ItemWrap":
            var indexwithinslot = req.body.indexWithinSlot || 0;

            switch (true) {
                case indexwithinslot >= 0 && indexwithinslot <= 7:
                    profile.stats.attributes.favorite_itemwraps[indexwithinslot] = req.body.itemToSlot || "";
                    StatChanged = true;
                break;

                case indexwithinslot == -1:
                    for (var i = 0; i < 7; i++) {
                        profile.stats.attributes.favorite_itemwraps[i] = req.body.itemToSlot || "";
                    }
                    StatChanged = true;
                break;
            }
        break;

        default:
            if (!slotNames.includes(req.body.slotName)) break;
            let Category = (`favorite_${req.body.slotName}`).toLowerCase();

            profile.stats.attributes[Category] = req.body.itemToSlot || "";
            StatChanged = true;
        break;
    }

    if (StatChanged) {
        let Category = (`favorite_${req.body.slotName}`).toLowerCase();
        if (Category == "favorite_itemwrap") Category += "s";

        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();

        ApplyProfileChanges.push({
            "changeType": "statModified",
            "name": Category,
            "value": profile.stats.attributes[Category]
        });
    }

    if (QueryRevision != BaseRevision) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });

    if (StatChanged) await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
});

app.post("/fortnite/api/game/v2/profile/*/client/:operation", verifyToken, async (req, res) => {
    if (!await profileManager.validateProfile(req.user.accountId, req.query.profileId)) return res.status(403).json(error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${req.query.profileId}`, 
        [req.query.profileId], 12813, undefined)
    );

    const profiles = await Profile.findOne({ accountId: req.user.accountId }).lean();
    let profile = profiles.profiles[req.query.profileId];

    if (req.query.profileId == "athena") {
        const memory = functions.GetVersionInfo(req);

        profile.stats.attributes.season_num = memory.season;
    }

    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn || 0;
    let QueryRevision = req.query.rvn || -1;

    switch (req.params.operation) {
        case "QueryProfile": break;
        case "ClientQuestLogin": break;
        case "RefreshExpeditions": break;
        case "GetMcpTimeForLogin": break;
        case "IncrementNamedCounterStat": break;
        case "SetHardcoreModifier": break;
        case "SetMtxPlatform": break;
        case "PurchaseCatalogEntry": break;

        default:
            res.status(404).json(error.createError(
                "errors.com.epicgames.fortnite.operation_not_found",
                `Operation ${req.params.operation} not valid`, 
                [req.params.operation], 16035, undefined)
            );
        return;
    }

    if (QueryRevision != BaseRevision) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
});

module.exports = app;

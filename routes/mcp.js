const express = require("express");
const app = express.Router();

const Profile = require("../model/profiles.js");
const profileManager = require("../structs/profile.js");
const error = require("../structs/error.js");
const functions = require("../structs/functions.js");

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");

app.post("/fortnite/api/game/v2/profile/*/client/MarkItemSeen", verifyToken, async (req, res) => {
    if (!await profileManager.validateProfile(req.user.accountId, req.query.profileId)) return error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${req.query.profileId}`, 
        [req.query.profileId], 12813, undefined, 403, res
    );

    if (req.query.profileId != "athena") return error.createError(
        "errors.com.epicgames.modules.profiles.invalid_command",
        `SetItemFavoriteStatusBatch is not valid on ${req.query.profileId} profile`, 
        ["SetItemFavoriteStatusBatch",req.query.profileId], 12801, undefined, 400, res
    );

    const profiles = await Profile.findOne({ accountId: req.user.accountId });
    let profile = profiles.profiles[req.query.profileId];

    if (profile.profileId == "athena") {
        const memory = functions.GetVersionInfo(req);

        profile.stats.attributes.season_num = memory.season;

        if (memory.season == 2) {
            profile.stats.attributes.book_level = 70;
            profile.stats.attributes.season_match_boost = 110;
        } else {
            profile.stats.attributes.book_level = 100;
            profile.stats.attributes.season_match_boost = 120;
        }
    }

    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn || 0;
    let QueryRevision = req.query.rvn || -1;
    let StatChanged = false;

    var missingFields = [];
    if (!req.body.itemIds) missingFields.push("itemIds");

    if (missingFields.length > 0) {
        return error.createError(
            "errors.com.epicgames.validation.validation_failed",
            `Validation Failed. [${missingFields.join(", ")}] field(s) is missing.`,
            [`[${missingFields.join(", ")}]`], 1040, undefined, 400, res
        );
    }

    if (Array.isArray(req.body.itemIds)) {
        for (var i in req.body.itemIds) {
            if (!profile.items[req.body.itemIds[i]]) {
                return error.createError(
                    "errors.com.epicgames.fortnite.id_invalid",
                    `Item (id: "${req.body.itemIds[i]}") not found`,
                    [req.body.itemIds[i]], 16027, undefined, 400, res
                );
            }

            profile.items[req.body.itemIds[i]].attributes.item_seen = true;

            ApplyProfileChanges.push({
                "changeType": "itemAttrChanged",
                "itemId": req.body.itemIds[i],
                "attributeName": "item_seen",
                "attributeValue": profile.items[req.body.itemIds[i]].attributes.item_seen
            })

            StatChanged = true;
        }
    }

    if (StatChanged == true) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();
        
        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
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

app.post("/fortnite/api/game/v2/profile/*/client/SetItemFavoriteStatusBatch", verifyToken, async (req, res) => {
    if (!await profileManager.validateProfile(req.user.accountId, req.query.profileId)) return error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${req.query.profileId}`, 
        [req.query.profileId], 12813, undefined, 403, res
    );

    if (req.query.profileId != "athena") return error.createError(
        "errors.com.epicgames.modules.profiles.invalid_command",
        `SetItemFavoriteStatusBatch is not valid on ${req.query.profileId} profile`, 
        ["SetItemFavoriteStatusBatch",req.query.profileId], 12801, undefined, 400, res
    );

    const profiles = await Profile.findOne({ accountId: req.user.accountId });
    let profile = profiles.profiles[req.query.profileId];

    if (profile.profileId == "athena") {
        const memory = functions.GetVersionInfo(req);

        profile.stats.attributes.season_num = memory.season;

        if (memory.season == 2) {
            profile.stats.attributes.book_level = 70;
            profile.stats.attributes.season_match_boost = 110;
        } else {
            profile.stats.attributes.book_level = 100;
            profile.stats.attributes.season_match_boost = 120;
        }
    }

    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn || 0;
    let QueryRevision = req.query.rvn || -1;
    let StatChanged = false;

    var missingFields = [];
    if (!req.body.itemIds) missingFields.push("itemIds");
    if (!req.body.itemFavStatus) missingFields.push("itemFavStatus");

    if (missingFields.length > 0) {
        return error.createError(
            "errors.com.epicgames.validation.validation_failed",
            `Validation Failed. [${missingFields.join(", ")}] field(s) is missing.`,
            [`[${missingFields.join(", ")}]`], 1040, undefined, 400, res
        );
    }

    if (Array.isArray(req.body.itemIds) && Array.isArray(req.body.itemFavStatus)) {
        for (var i in req.body.itemIds) {
            if (!profile.items[req.body.itemIds[i]]) {
                return error.createError(
                    "errors.com.epicgames.fortnite.id_invalid",
                    `Item (id: "${req.body.itemIds[i]}") not found`,
                    [req.body.itemIds[i]], 16027, undefined, 400, res
                );
            }

            if (typeof req.body.itemFavStatus[i] == "boolean") {
                profile.items[req.body.itemIds[i]].attributes.favorite = req.body.itemFavStatus[i];

                ApplyProfileChanges.push({
                    "changeType": "itemAttrChanged",
                    "itemId": req.body.itemIds[i],
                    "attributeName": "favorite",
                    "attributeValue": profile.items[req.body.itemIds[i]].attributes.favorite
                })

                StatChanged = true;
            }
        }
    }

    if (StatChanged == true) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();
        
        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
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

app.post("/fortnite/api/game/v2/profile/*/client/SetBattleRoyaleBanner", verifyToken, async (req, res) => {
    if (!await profileManager.validateProfile(req.user.accountId, req.query.profileId)) return error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${req.query.profileId}`, 
        [req.query.profileId], 12813, undefined, 403, res
    );

    if (req.query.profileId != "athena") return error.createError(
        "errors.com.epicgames.modules.profiles.invalid_command",
        `SetBattleRoyaleBanner is not valid on ${req.query.profileId} profile`, 
        ["SetBattleRoyaleBanner",req.query.profileId], 12801, undefined, 400, res
    );

    const profiles = await Profile.findOne({ accountId: req.user.accountId });
    let profile = profiles.profiles[req.query.profileId];

    if (profile.profileId == "athena") {
        const memory = functions.GetVersionInfo(req);

        profile.stats.attributes.season_num = memory.season;

        if (memory.season == 2) {
            profile.stats.attributes.book_level = 70;
            profile.stats.attributes.season_match_boost = 110;
        } else {
            profile.stats.attributes.book_level = 100;
            profile.stats.attributes.season_match_boost = 120;
        }
    }

    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn || 0;
    let QueryRevision = req.query.rvn || -1;
    let StatChanged = false;

    var missingFields = [];
    if (!req.body.homebaseBannerIconId) missingFields.push("homebaseBannerIconId");
    if (!req.body.homebaseBannerColorId) missingFields.push("homebaseBannerColorId");

    if (missingFields.length > 0) {
        return error.createError(
            "errors.com.epicgames.validation.validation_failed",
            `Validation Failed. [${missingFields.join(", ")}] field(s) is missing.`, 
            [`[${missingFields.join(", ")}]`], 1040, undefined, 400, res
        );
    }

    var returnError = true;

    for (var itemId in profiles.profiles["common_core"].items) {
        if (profiles.profiles["common_core"].items[itemId].templateId.startsWith(`HomebaseBannerIcon:${req.body.homebaseBannerIconId}`)) returnError = false;
    }

    if (returnError == true) return error.createError(
        "errors.com.epicgames.fortnite.item_not_found",
        `Banner template 'HomebaseBannerIcon:${req.body.homebaseBannerIconId}' not found in profile`, 
        [`HomebaseBannerIcon:${req.body.homebaseBannerIconId}`], 16006, undefined, 400, res
    );

    returnError = true;
    
    for (var itemId in profiles.profiles["common_core"].items) {
        if (profiles.profiles["common_core"].items[itemId].templateId.startsWith(`HomebaseBannerColor:${req.body.homebaseBannerColorId}`)) returnError = false;
    }

    if (returnError == true) return error.createError(
        "errors.com.epicgames.fortnite.item_not_found",
        `Banner template 'HomebaseBannerColor:${req.body.homebaseBannerColorId}' not found in profile`, 
        [`HomebaseBannerColor:${req.body.homebaseBannerColorId}`], 16006, undefined, 400, res
    );
    
    if (req.body.homebaseBannerIconId && req.body.homebaseBannerColorId) {
        if (typeof req.body.homebaseBannerIconId == "string" && typeof req.body.homebaseBannerColorId == "string") {
            profile.stats.attributes.banner_icon = req.body.homebaseBannerIconId;
            profile.stats.attributes.banner_color = req.body.homebaseBannerColorId;

            ApplyProfileChanges.push({
                "changeType": "statModified",
                "name": "banner_icon",
                "value": profile.stats.attributes.banner_icon
            })
    
            ApplyProfileChanges.push({
                "changeType": "statModified",
                "name": "banner_color",
                "value": profile.stats.attributes.banner_color
            })

            StatChanged = true;
        }
    }

    if (StatChanged == true) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();
        
        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
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

app.post("/fortnite/api/game/v2/profile/*/client/EquipBattleRoyaleCustomization", verifyToken, async (req, res) => {
    if (!await profileManager.validateProfile(req.user.accountId, req.query.profileId)) return error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${req.query.profileId}`, 
        [req.query.profileId], 12813, undefined, 403, res
    );

    if (req.query.profileId != "athena") return error.createError(
        "errors.com.epicgames.modules.profiles.invalid_command",
        `EquipBattleRoyaleCustomization is not valid on ${req.query.profileId} profile`, 
        ["EquipBattleRoyaleCustomization",req.query.profileId], 12801, undefined, 400, res
    );

    const profiles = await Profile.findOne({ accountId: req.user.accountId });
    let profile = profiles.profiles[req.query.profileId];

    if (profile.profileId == "athena") {
        const memory = functions.GetVersionInfo(req);

        profile.stats.attributes.season_num = memory.season;

        if (memory.season == 2) {
            profile.stats.attributes.book_level = 70;
            profile.stats.attributes.season_match_boost = 110;
        } else {
            profile.stats.attributes.book_level = 100;
            profile.stats.attributes.season_match_boost = 120;
        }
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

    var missingFields = [];
    if (!req.body.slotName) missingFields.push("slotName");

    if (missingFields.length > 0) {
        return error.createError(
            "errors.com.epicgames.validation.validation_failed",
            `Validation Failed. [${missingFields.join(", ")}] field(s) is missing.`, 
            [`[${missingFields.join(", ")}]`], 1040, undefined, 400, res
        );
    }

    if (!profile.items[req.body.itemToSlot] && req.body.itemToSlot) {
        let item = req.body.itemToSlot
        if (typeof item == "string") item = item.toLowerCase()

        if (!specialCosmetics.includes(item)) {
            return error.createError(
                "errors.com.epicgames.fortnite.id_invalid",
                `Item (id: "${req.body.itemToSlot}") not found`, 
                [req.body.itemToSlot], 16027, undefined, 400, res
            );
        }
    }

    if (profile.items[req.body.itemToSlot]) {
        if (!profile.items[req.body.itemToSlot].templateId.startsWith(`Athena${req.body.slotName}:`)) return error.createError(
            "errors.com.epicgames.fortnite.id_invalid",
            `Cannot slot item of type ${profile.items[req.body.itemToSlot].templateId.split(":")[0]} in slot of category ${req.body.slotName}`, 
            [profile.items[req.body.itemToSlot].templateId.split(":")[0],req.body.slotName], 16027, undefined, 400, res
        );

        let Variants = req.body.variantUpdates;
        let item = req.body.itemToSlot
        if (typeof item == "string") item = item.toLowerCase()

        if (Variants && !specialCosmetics.includes(item)) {
            for (var i in Variants) {
                if (!Variants[i].channel) break;
                if (!Variants[i].active) break;
                if (!profile.items[req.body.itemToSlot].attributes.variants.find(x => x.channel == Variants[i].channel)) break;
                if (!profile.items[req.body.itemToSlot].attributes.variants.find(x => x.channel == Variants[i].channel).owned.includes(Variants[i].active)) break;

                let index = profile.items[req.body.itemToSlot].attributes.variants.findIndex(x => x.channel == Variants[i].channel);
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
            let Category = (`favorite_${req.body.slotName}`).toLowerCase()

            profile.stats.attributes[Category] = req.body.itemToSlot || "";
            StatChanged = true;
        break;
    }

    if (StatChanged == true) {
        let Category = (`favorite_${req.body.slotName}`).toLowerCase()
        if (Category == "favorite_itemwrap") Category += "s";

        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();

        ApplyProfileChanges.push({
            "changeType": "statModified",
            "name": Category,
            "value": profile.stats.attributes[Category]
        })
        
        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
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

app.post("/fortnite/api/game/v2/profile/*/client/:operation", verifyToken, async (req, res) => {
    if (!await profileManager.validateProfile(req.user.accountId, req.query.profileId)) return error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${req.query.profileId}`, 
        [req.query.profileId], 12813, undefined, 403, res
    );

    const profiles = await Profile.findOne({ accountId: req.user.accountId }).lean();
    let profile = profiles.profiles[req.query.profileId];

    if (profile.profileId == "athena") {
        const memory = functions.GetVersionInfo(req);

        profile.stats.attributes.season_num = memory.season;

        if (memory.season == 2) {
            profile.stats.attributes.book_level = 70;
            profile.stats.attributes.season_match_boost = 110;
        } else {
            profile.stats.attributes.book_level = 100;
            profile.stats.attributes.season_match_boost = 120;
        }
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

        default:
            error.createError(
                "errors.com.epicgames.fortnite.operation_not_found",
                `Operation ${req.params.operation} not valid`, 
                [req.params.operation], 16035, undefined, 404, res
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

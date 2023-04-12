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

    let bannerProfileId = memory.build < 3.5 ? "profile0" : "common_core";

    let HomebaseBannerIconID = "";
    let HomebaseBannerColorID = "";

    for (let itemId in profiles.profiles[bannerProfileId].items) {
        let templateId = profiles.profiles[bannerProfileId].items[itemId].templateId;

        if (templateId.toLowerCase() == `HomebaseBannerIcon:${req.body.homebaseBannerIconId}`.toLowerCase()) HomebaseBannerIconID = itemId;
        if (templateId.toLowerCase() == `HomebaseBannerColor:${req.body.homebaseBannerColorId}`.toLowerCase()) HomebaseBannerColorID = itemId;
    }

    if (!HomebaseBannerIconID) return res.status(400).json(error.createError(
        "errors.com.epicgames.fortnite.item_not_found",
        `Banner template 'HomebaseBannerIcon:${req.body.homebaseBannerIconId}' not found in profile`, 
        [`HomebaseBannerIcon:${req.body.homebaseBannerIconId}`], 16006, undefined)
    );

    if (!HomebaseBannerColorID) return res.status(400).json(error.createError(
        "errors.com.epicgames.fortnite.item_not_found",
        `Banner template 'HomebaseBannerColor:${req.body.homebaseBannerColorId}' not found in profile`, 
        [`HomebaseBannerColor:${req.body.homebaseBannerColorId}`], 16006, undefined)
    );

    let activeLoadoutId = profile.stats.attributes.loadouts[profile.stats.attributes.active_loadout_index];

    profile.stats.attributes.banner_icon = req.body.homebaseBannerIconId;
    profile.stats.attributes.banner_color = req.body.homebaseBannerColorId;

    profile.items[activeLoadoutId].attributes.banner_icon_template = req.body.homebaseBannerIconId;
    profile.items[activeLoadoutId].attributes.banner_color_template = req.body.homebaseBannerColorId;

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
        } else {
            if (!item.startsWith((`Athena${req.body.slotName}:`).toLowerCase())) return res.status(400).json(error.createError(
                "errors.com.epicgames.fortnite.id_invalid",
                `Cannot slot item of type ${item.split(":")[0]} in slot of category ${req.body.slotName}`, 
                [item.split(":")[0],req.body.slotName], 16027, undefined)
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

        if (Array.isArray(Variants)) {
            for (let i in Variants) {
                if (typeof Variants[i] != "object") continue;
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
            });
        }
    }

    let slotNames = ["Character","Backpack","Pickaxe","Glider","SkyDiveContrail","MusicPack","LoadingScreen"];

    let activeLoadoutId = profile.stats.attributes.loadouts[profile.stats.attributes.active_loadout_index];
    let templateId = profile.items[req.body.itemToSlot] ? profile.items[req.body.itemToSlot].templateId : req.body.itemToSlot;
    
    switch (req.body.slotName) {
        case "Dance":
            if (!profile.items[activeLoadoutId].attributes.locker_slots_data.slots[req.body.slotName]) break;

            var indexwithinslot = Number(req.body.indexWithinSlot) || 0;

            if (indexwithinslot >= 0 && indexwithinslot <= 5) {
                profile.stats.attributes.favorite_dance[indexwithinslot] = req.body.itemToSlot;
                profile.items[activeLoadoutId].attributes.locker_slots_data.slots.Dance.items[indexwithinslot] = templateId;

                StatChanged = true;
            }
        break;

        case "ItemWrap":
            if (!profile.items[activeLoadoutId].attributes.locker_slots_data.slots[req.body.slotName]) break;

            var indexwithinslot = Number(req.body.indexWithinSlot) || 0;

            switch (true) {
                case indexwithinslot >= 0 && indexwithinslot <= 7:
                    profile.stats.attributes.favorite_itemwraps[indexwithinslot] = req.body.itemToSlot;
                    profile.items[activeLoadoutId].attributes.locker_slots_data.slots.ItemWrap.items[indexwithinslot] = templateId;

                    StatChanged = true;
                break;

                case indexwithinslot == -1:
                    for (var i = 0; i < 7; i++) {
                        profile.stats.attributes.favorite_itemwraps[i] = req.body.itemToSlot;
                        profile.items[activeLoadoutId].attributes.locker_slots_data.slots.ItemWrap.items[i] = templateId;
                    }

                    StatChanged = true;
                break;
            }
        break;

        default:
            if (!slotNames.includes(req.body.slotName)) break;
            if (!profile.items[activeLoadoutId].attributes.locker_slots_data.slots[req.body.slotName]) break;

            profile.stats.attributes[(`favorite_${req.body.slotName}`).toLowerCase()] = req.body.itemToSlot;
            profile.items[activeLoadoutId].attributes.locker_slots_data.slots[req.body.slotName].items = [templateId];

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

app.post("/fortnite/api/game/v2/profile/*/client/SetCosmeticLockerBanner", verifyToken, async (req, res) => {
    if (!await profileManager.validateProfile(req.user.accountId, req.query.profileId)) return res.status(403).json(error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${req.query.profileId}`, 
        [req.query.profileId], 12813, undefined)
    );

    if (req.query.profileId != "athena") return res.status(400).json(error.createError(
        "errors.com.epicgames.modules.profiles.invalid_command",
        `SetCosmeticLockerBanner is not valid on ${req.query.profileId} profile`, 
        ["SetCosmeticLockerBanner",req.query.profileId], 12801, undefined)
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
    if (!req.body.bannerIconTemplateName) missingFields.push("bannerIconTemplateName");
    if (!req.body.bannerColorTemplateName) missingFields.push("bannerColorTemplateName");
    if (!req.body.lockerItem) missingFields.push("lockerItem");

    if (missingFields.length > 0) return res.status(400).json(error.createError(
        "errors.com.epicgames.validation.validation_failed",
        `Validation Failed. [${missingFields.join(", ")}] field(s) is missing.`,
        [`[${missingFields.join(", ")}]`], 1040, undefined)
    );

    if (typeof req.body.lockerItem != "string") return res.status(400).json(error.createError(
        "errors.com.epicgames.validation.validation_failed",
        `Validation Failed. 'lockerItem' is not a string.`,
        ["lockerItem"], 1040, undefined)
    );

    if (typeof req.body.bannerIconTemplateName != "string") return res.status(400).json(error.createError(
        "errors.com.epicgames.validation.validation_failed",
        `Validation Failed. 'bannerIconTemplateName' is not a string.`,
        ["bannerIconTemplateName"], 1040, undefined)
    );

    if (typeof req.body.bannerColorTemplateName != "string") return res.status(400).json(error.createError(
        "errors.com.epicgames.validation.validation_failed",
        `Validation Failed. 'bannerColorTemplateName' is not a string.`,
        ["bannerColorTemplateName"], 1040, undefined)
    );

    if (!profile.items[req.body.lockerItem]) return res.status(400).json(error.createError(
        "errors.com.epicgames.fortnite.id_invalid",
        `Item (id: "${req.body.lockerItem}") not found`, 
        [req.body.lockerItem], 16027, undefined)
    );

    if (profile.items[req.body.lockerItem].templateId.toLowerCase() != "cosmeticlocker:cosmeticlocker_athena") return res.status(400).json(error.createError(
        "errors.com.epicgames.fortnite.id_invalid",
        `lockerItem id is not a cosmeticlocker`, 
        ["lockerItem"], 16027, undefined)
    );

    let bannerProfileId = "common_core";

    let HomebaseBannerIconID = "";
    let HomebaseBannerColorID = "";

    for (let itemId in profiles.profiles[bannerProfileId].items) {
        let templateId = profiles.profiles[bannerProfileId].items[itemId].templateId;

        if (templateId.toLowerCase() == `HomebaseBannerIcon:${req.body.bannerIconTemplateName}`.toLowerCase()) HomebaseBannerIconID = itemId;
        if (templateId.toLowerCase() == `HomebaseBannerColor:${req.body.bannerColorTemplateName}`.toLowerCase()) HomebaseBannerColorID = itemId;
    }

    if (!HomebaseBannerIconID) return res.status(400).json(error.createError(
        "errors.com.epicgames.fortnite.item_not_found",
        `Banner template 'HomebaseBannerIcon:${req.body.bannerIconTemplateName}' not found in profile`, 
        [`HomebaseBannerIcon:${req.body.bannerIconTemplateName}`], 16006, undefined)
    );

    if (!HomebaseBannerColorID) return res.status(400).json(error.createError(
        "errors.com.epicgames.fortnite.item_not_found",
        `Banner template 'HomebaseBannerColor:${req.body.bannerColorTemplateName}' not found in profile`, 
        [`HomebaseBannerColor:${req.body.bannerColorTemplateName}`], 16006, undefined)
    );

    profile.items[req.body.lockerItem].attributes.banner_icon_template = req.body.bannerIconTemplateName;
    profile.items[req.body.lockerItem].attributes.banner_color_template = req.body.bannerColorTemplateName;

    profile.stats.attributes.banner_icon = req.body.bannerIconTemplateName;
    profile.stats.attributes.banner_color = req.body.bannerColorTemplateName;

    ApplyProfileChanges.push({
        "changeType": "itemAttrChanged",
        "itemId": req.body.lockerItem,
        "attributeName": "banner_icon_template",
        "attributeValue": profile.items[req.body.lockerItem].attributes.banner_icon_template
    });

    ApplyProfileChanges.push({
        "changeType": "itemAttrChanged",
        "itemId": req.body.lockerItem,
        "attributeName": "banner_color_template",
        "attributeValue": profile.items[req.body.lockerItem].attributes.banner_color_template
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

app.post("/fortnite/api/game/v2/profile/*/client/SetCosmeticLockerSlot", verifyToken, async (req, res) => {
    if (!await profileManager.validateProfile(req.user.accountId, req.query.profileId)) return res.status(403).json(error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${req.query.profileId}`, 
        [req.query.profileId], 12813, undefined)
    );

    if (req.query.profileId != "athena") return res.status(400).json(error.createError(
        "errors.com.epicgames.modules.profiles.invalid_command",
        `SetCosmeticLockerSlot is not valid on ${req.query.profileId} profile`, 
        ["SetCosmeticLockerSlot",req.query.profileId], 12801, undefined)
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
    if (!req.body.category) missingFields.push("category");
    if (!req.body.lockerItem) missingFields.push("lockerItem");

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

    if (typeof req.body.lockerItem != "string") return res.status(400).json(error.createError(
        "errors.com.epicgames.validation.validation_failed",
        `Validation Failed. 'lockerItem' is not a string.`,
        ["lockerItem"], 1040, undefined)
    );

    if (typeof req.body.category != "string") return res.status(400).json(error.createError(
        "errors.com.epicgames.validation.validation_failed",
        `Validation Failed. 'category' is not a string.`,
        ["category"], 1040, undefined)
    );

    let itemToSlotID = "";

    if (req.body.itemToSlot) {
        for (let itemId in profile.items) {
            if (profile.items[itemId].templateId.toLowerCase() == req.body.itemToSlot.toLowerCase()) { itemToSlotID = itemId; break; };
        }
    }

    if (!profile.items[req.body.lockerItem]) return res.status(400).json(error.createError(
        "errors.com.epicgames.fortnite.id_invalid",
        `Item (id: "${req.body.lockerItem}") not found`, 
        [req.body.lockerItem], 16027, undefined)
    );

    if (profile.items[req.body.lockerItem].templateId.toLowerCase() != "cosmeticlocker:cosmeticlocker_athena") return res.status(400).json(error.createError(
        "errors.com.epicgames.fortnite.id_invalid",
        `lockerItem id is not a cosmeticlocker`, 
        ["lockerItem"], 16027, undefined)
    );

    if (!profile.items[itemToSlotID] && req.body.itemToSlot) {
        let item = req.body.itemToSlot.toLowerCase();

        if (!specialCosmetics.includes(item)) {
            return res.status(400).json(error.createError(
                "errors.com.epicgames.fortnite.id_invalid",
                `Item (id: "${req.body.itemToSlot}") not found`, 
                [req.body.itemToSlot], 16027, undefined)
            );
        } else {
            if (!item.startsWith((`Athena${req.body.category}:`).toLowerCase())) return res.status(400).json(error.createError(
                "errors.com.epicgames.fortnite.id_invalid",
                `Cannot slot item of type ${item.split(":")[0]} in slot of category ${req.body.category}`, 
                [item.split(":")[0],req.body.category], 16027, undefined)
            );
        }
    }

    if (profile.items[itemToSlotID]) {
        if (!profile.items[itemToSlotID].templateId.startsWith(`Athena${req.body.category}:`)) return res.status(400).json(error.createError(
            "errors.com.epicgames.fortnite.id_invalid",
            `Cannot slot item of type ${profile.items[itemToSlotID].templateId.split(":")[0]} in slot of category ${req.body.category}`, 
            [profile.items[itemToSlotID].templateId.split(":")[0],req.body.category], 16027, undefined)
        );

        let Variants = req.body.variantUpdates;

        if (Array.isArray(Variants)) {
            for (let i in Variants) {
                if (typeof Variants[i] != "object") continue;
                if (!Variants[i].channel) continue;
                if (!Variants[i].active) continue;

                let index = profile.items[itemToSlotID].attributes.variants.findIndex(x => x.channel == Variants[i].channel);

                if (index == -1) continue;
                if (!profile.items[itemToSlotID].attributes.variants[index].owned.includes(Variants[i].active)) continue;

                profile.items[itemToSlotID].attributes.variants[index].active = Variants[i].active;
            }

            ApplyProfileChanges.push({
                "changeType": "itemAttrChanged",
                "itemId": itemToSlotID,
                "attributeName": "variants",
                "attributeValue": profile.items[itemToSlotID].attributes.variants
            });
        }
    }
    
    switch (req.body.category) {
        case "Dance":
            if (!profile.items[req.body.lockerItem].attributes.locker_slots_data.slots[req.body.category]) break;

            var indexwithinslot = Number(req.body.slotIndex) || 0;

            if (indexwithinslot >= 0 && indexwithinslot <= 5) {
                profile.items[req.body.lockerItem].attributes.locker_slots_data.slots.Dance.items[indexwithinslot] = req.body.itemToSlot || "";
                profile.stats.attributes.favorite_dance[indexwithinslot] = itemToSlotID || req.body.itemToSlot;

                StatChanged = true;
            }
        break;

        case "ItemWrap":
            if (!profile.items[req.body.lockerItem].attributes.locker_slots_data.slots[req.body.category]) break;

            var indexwithinslot = Number(req.body.slotIndex) || 0;

            switch (true) {
                case indexwithinslot >= 0 && indexwithinslot <= 7:
                    profile.items[req.body.lockerItem].attributes.locker_slots_data.slots.ItemWrap.items[indexwithinslot] = req.body.itemToSlot || "";
                    profile.stats.attributes.favorite_itemwraps[indexwithinslot] = itemToSlotID || req.body.itemToSlot;

                    StatChanged = true;
                break;

                case indexwithinslot == -1:
                    for (var i = 0; i < 7; i++) {
                        profile.items[req.body.lockerItem].attributes.locker_slots_data.slots.ItemWrap.items[i] = req.body.itemToSlot || "";
                        profile.stats.attributes.favorite_itemwraps[i] = itemToSlotID || req.body.itemToSlot;
                    }

                    StatChanged = true;
                break;
            }
        break;

        default:
            if (!profile.items[req.body.lockerItem].attributes.locker_slots_data.slots[req.body.category]) break;

            profile.items[req.body.lockerItem].attributes.locker_slots_data.slots[req.body.category].items = [req.body.itemToSlot];
            profile.stats.attributes[(`favorite_${req.body.category}`).toLowerCase()] = itemToSlotID || req.body.itemToSlot;

            StatChanged = true;
        break;
    }

    if (StatChanged) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();

        ApplyProfileChanges.push({
            "changeType": "itemAttrChanged",
            "itemId": req.body.lockerItem,
            "attributeName": "locker_slots_data",
            "attributeValue": profile.items[req.body.lockerItem].attributes.locker_slots_data
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

const User = require("../../model/user.js");
const Profile = require("../../model/profiles.js");
const functions = require("../../structs/functions.js");
const fs = require("fs");

module.exports = {
    commandInfo: {
        name: "clear-items-for-shop",
        description: "Clears anything in your profile that is from the item shop."
    },
    execute: async (interaction) => {
        await interaction.deferReply({ ephemeral: true });
        
        const targetUser = await User.findOne({ discordId: interaction.user.id }).lean();
        if (!targetUser) return interaction.editReply({ content: "You do not have a registered account!", ephemeral: true });

        const profiles = await Profile.findOne({ accountId: targetUser.accountId });

        let athena = profiles.profiles["athena"];
        let StatChanged = false;

        const CatalogConfig = JSON.parse(fs.readFileSync("./Config/catalog_config.json").toString());

        if (!athena.items) athena.items = {};
    
        for (let value in CatalogConfig) {
            if (!Array.isArray(CatalogConfig[value].itemGrants)) continue;
            if (CatalogConfig[value].itemGrants.length == 0) continue;

            for (let itemGrant of CatalogConfig[value].itemGrants) {
                if (typeof itemGrant != "string") continue;
                if (itemGrant.length == 0) continue;

                for (let itemId in athena.items) {
                    if (athena.items[itemId].templateId.toLowerCase() != itemGrant.toLowerCase()) continue;

                    delete athena.items[itemId];
                    
                    StatChanged = true;
                }
            }
        }

        if (StatChanged) {
            athena.rvn += 1;
            athena.commandRevision += 1;
            athena.updated = new Date().toISOString();

            await profiles.updateOne({ $set: { [`profiles.athena`]: athena } });

            if (global.Clients.some(i => i.accountId == targetUser.accountId)) global.giftReceived[targetUser.accountId] = true;

            functions.sendXmppMessageToId({
                type: "com.epicgames.gift.received",
                payload: {},
                timestamp: new Date().toISOString()
            }, targetUser.accountId);

            return interaction.editReply({ content: "Successfully cleared items in your profile that are from the item shop."});
        }
        
        interaction.editReply({ content: `You do not own any items that are from the item shop.`, ephemeral: true });
    }
}
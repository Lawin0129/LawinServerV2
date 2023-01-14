const { MessageEmbed } = require("discord.js");
const tokens = require("../../model/tokens.js");
const User = require("../../model/user.js");
const config = require("../../Config/config.json");

module.exports = {
    commandInfo: {
        name: "kick",
        description: "Kick someone out of their current session by their username.",
        options: [
            {
                name: "username",
                description: "Target username.",
                required: true,
                type: 3 // string
            }
        ]
    },
    execute: async (interaction) => {
        let msg = "";
        
        if (!config.moderators.includes(interaction.user.id)) return interaction.reply({ content: "You do not have moderator permissions.", ephemeral: true });
    
        const { options } = interaction;
        const targetUser = await User.findOne({ username_lower: (options.get("username").value).toLowerCase() });
    
        if (!targetUser) msg = "The account username you entered does not exist.";
    
        if (targetUser) {
            let removed = false;

            var jwtTokens = await tokens.findOne({ accessTokens: { $exists: true }, refreshTokens: { $exists: true } });

            if (jwtTokens.accessTokens.find(i => i.accountId == targetUser.accountId)) {
                let index = jwtTokens.accessTokens.findIndex(i => i.accountId == targetUser.accountId);
                await jwtTokens.updateOne({ [`accessTokens.${index}`]: {"0":"remove"} });
                await jwtTokens.updateOne({ $pull: { "accessTokens": {"0":"remove"} } });

                removed = true;
            }

            if (jwtTokens.refreshTokens.find(i => i.accountId == targetUser.accountId)) {
                let index = jwtTokens.refreshTokens.findIndex(i => i.accountId == targetUser.accountId);
                await jwtTokens.updateOne({ [`refreshTokens.${index}`]: {"0":"remove"} });
                await jwtTokens.updateOne({ $pull: { "refreshTokens": {"0":"remove"} } });
            }

            if (global.Clients.find(client => client.accountId == targetUser.accountId)) {
                var ClientData = global.Clients.find(client => client.accountId == targetUser.accountId);

                ClientData.client.close();
            }

            if (removed) msg = `Successfully kicked ${targetUser.username}`;
            else msg = `There are no current active sessions by ${targetUser.username}`;
        }
    
        let embed = new MessageEmbed()
        .setAuthor({ name: "Moderation", iconURL: "https://cdn.discordapp.com/attachments/927739901540188200/1020458073019666492/unknown.png" })
        .setFields(
            { name: "Message", value: msg },
        )
        .setTimestamp()

        interaction.reply({ embeds: [embed], ephemeral: true });
    }
}
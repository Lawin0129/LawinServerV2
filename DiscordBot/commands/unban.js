const { MessageEmbed } = require("discord.js");
const User = require("../../model/user.js");
const fs = require("fs");
const path = require("path");
const config = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "Config", "config.json")).toString());

module.exports = {
    commandInfo: {
        name: "unban",
        description: "Unban a user from the backend by their username.",
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
        else if (targetUser.banned == false) msg = "This account is already unbanned.";
    
        if (targetUser && targetUser.banned == true) {
            await targetUser.updateOne({ $set: { banned: false } });
            msg = `Successfully unbanned ${targetUser.username}`;
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
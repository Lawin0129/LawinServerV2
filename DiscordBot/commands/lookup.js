const { MessageEmbed } = require("discord.js");
const User = require("../../model/user.js");

module.exports = {
    commandInfo: {
        name: "lookup",
        description: "Retrieves someones account info.",
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
        await interaction.deferReply({ ephemeral: true });

        const { options } = interaction;
        
        const user = await User.findOne({ username_lower: (options.get("username").value).toLowerCase() }).lean();
        if (!user) return interaction.editReply({ content: "The account username you entered does not exist.", ephemeral: true });

        let onlineStatus = global.Clients.some(i => i.accountId == user.accountId);

        let embed = new MessageEmbed()
        .setColor("#56ff00")
        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.avatarURL() })
        .setFields(
            { name: "Discord", value: `<@${user.discordId}>` },
            { name: "Created", value: `${new Date(user.created)}`.substring(0, 15) },
            { name: "Online", value: `${onlineStatus ? "Yes" : "No"}` },
            { name: "Banned", value: `${user.banned ? "Yes" : "No"}` },
            { name: 'Username', value: user.username }
        )
        .setTimestamp()

        interaction.editReply({ embeds: [embed], ephemeral: true });
    }
}
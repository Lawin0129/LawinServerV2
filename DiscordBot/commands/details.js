const { MessageEmbed } = require("discord.js");
const User = require("../../model/user.js");

module.exports = {
    commandInfo: {
        name: "details",
        description: "Retrieves your account info."
    },
    execute: async (interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const user = await User.findOne({ discordId: interaction.user.id }).lean();
        if (!user) return interaction.editReply({ content: "You do not have a registered account!", ephemeral: true });

        let embed = new MessageEmbed()
        .setColor("#56ff00")
        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.avatarURL() })
        .setFields(
            { name: "Created", value: `${new Date(user.created)}`.substring(0, 15) },
            { name: "Banned?", value: `${user.banned}` },
            { name: "Account ID", value: user.accountId },
            { name: 'Username', value: user.username },
            { name: 'Email', value: user.email }
        )
        .setTimestamp()

        interaction.editReply({ embeds: [embed], ephemeral: true });
    }
}
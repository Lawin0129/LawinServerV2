const { MessageEmbed } = require("discord.js");
const User = require("../../model/user.js");

module.exports = {
    commandInfo: {
        name: "change-username",
        description: "Change your username.",
        options: [
            {
                name: "username",
                description: "Your new username.",
                required: true,
                type: 3 // string
            }
        ]
    },
    execute: async (interaction) => {
        const user = await User.findOne({ discordId: interaction.user.id });
        if (!user) return interaction.reply({ content: "You do not have a registered account!", ephemeral: true });

        const { options } = interaction;

        let username = options.get("username").value;

        if (username.length >= 25) return interaction.reply({ content: "Your username must be less than 25 characters long.", ephemeral: true });
        if (username.length < 3) return interaction.reply({ content: "Your username must be atleast 3 characters long.", ephemeral: true });

        try {
            await user.updateOne({ $set: { username: username, username_lower: username.toLowerCase() } });
        } catch (err) {
            return interaction.reply({ content: "This username is already in use!", ephemeral: true });
        }

        interaction.reply({ content: `Successfully changed your username to ${username}`, ephemeral: true });
    }
}
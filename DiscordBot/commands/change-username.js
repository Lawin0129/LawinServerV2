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
        await interaction.deferReply({ ephemeral: true });

        const user = await User.findOne({ discordId: interaction.user.id });
        if (!user) return interaction.editReply({ content: "You do not have a registered account!", ephemeral: true });

        let accessToken = global.accessTokens.find(i => i.accountId == user.accountId);
        if (accessToken) return interaction.editReply({ content: "Failed to change username as you are currently logged in to Fortnite.\nRun the /sign-out-of-all-sessions command to sign out.", ephemeral: true });

        const { options } = interaction;

        let username = options.get("username").value;

        if (username.length >= 25) return interaction.editReply({ content: "Your username must be less than 25 characters long.", ephemeral: true });
        if (username.length < 3) return interaction.editReply({ content: "Your username must be atleast 3 characters long.", ephemeral: true });

        const allowedCharacters = (" !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~").split("");
    
        for (let character of username) {
            if (!allowedCharacters.includes(character)) return interaction.editReply({ content: "Your username has special characters, please remove them and try again.", ephemeral: true });
        }

        try {
            await user.updateOne({ $set: { username: username, username_lower: username.toLowerCase() } });
        } catch {
            return interaction.editReply({ content: "This username is already in use!", ephemeral: true });
        }

        interaction.editReply({ content: `Successfully changed your username to ${username}`, ephemeral: true });
    }
}
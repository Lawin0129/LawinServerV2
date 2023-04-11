const User = require("../../model/user.js");
const bcrypt = require("bcrypt");

module.exports = {
    commandInfo: {
        name: "change-password",
        description: "Change your password.",
        options: [
            {
                name: "password",
                description: "Your new password.",
                required: true,
                type: 3 // string
            }
        ]
    },
    execute: async (interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const user = await User.findOne({ discordId: interaction.user.id });
        if (!user) return interaction.editReply({ content: "You do not have a registered account!", ephemeral: true });

        const { options } = interaction;

        let plainPassword = options.get("password").value;

        if (plainPassword.length >= 128) return interaction.editReply({ content: "Your password must be less than 128 characters long.", ephemeral: true });
        if (plainPassword.length < 8) return interaction.editReply({ content: "Your password must be atleast 8 characters long.", ephemeral: true });

        let hashedPassword = await bcrypt.hash(plainPassword, 10);
            
        await user.updateOne({ $set: { password: hashedPassword } });

        interaction.editReply({ content: `Successfully changed your password.`, ephemeral: true });
    }
}
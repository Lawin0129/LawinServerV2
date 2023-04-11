const User = require("../../model/user.js");
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("./Config/config.json").toString());

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
        await interaction.deferReply({ ephemeral: true });
        
        if (!config.moderators.includes(interaction.user.id)) return interaction.editReply({ content: "You do not have moderator permissions.", ephemeral: true });
    
        const { options } = interaction;
        const targetUser = await User.findOne({ username_lower: (options.get("username").value).toLowerCase() });
    
        if (!targetUser) return interaction.editReply({ content: "The account username you entered does not exist.", ephemeral: true });
        else if (!targetUser.banned) return interaction.editReply({ content: "This account is already unbanned.", ephemeral: true });

        await targetUser.updateOne({ $set: { banned: false } });
        
        interaction.editReply({ content: `Successfully unbanned ${targetUser.username}`, ephemeral: true });
    }
}
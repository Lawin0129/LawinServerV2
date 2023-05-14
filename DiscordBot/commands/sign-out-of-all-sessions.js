const User = require("../../model/user.js");
const functions = require("../../structs/functions.js");

module.exports = {
    commandInfo: {
        name: "sign-out-of-all-sessions",
        description: "Signs you out if you have an active session."
    },
    execute: async (interaction) => {
        await interaction.deferReply({ ephemeral: true });
        
        const targetUser = await User.findOne({ discordId: interaction.user.id }).lean();
        if (!targetUser) return interaction.editReply({ content: "You do not have a registered account!", ephemeral: true });

        let refreshToken = global.refreshTokens.findIndex(i => i.accountId == targetUser.accountId);
        if (refreshToken != -1) global.refreshTokens.splice(refreshToken, 1);

        let accessToken = global.accessTokens.findIndex(i => i.accountId == targetUser.accountId);
        if (accessToken != -1) {
            global.accessTokens.splice(accessToken, 1);

            let xmppClient = global.Clients.find(client => client.accountId == targetUser.accountId);
            if (xmppClient) xmppClient.client.close();
        }

        if (accessToken != -1 || refreshToken != -1) {
            functions.UpdateTokens();

            return interaction.editReply({ content: `Successfully signed out of all sessions!`, ephemeral: true });
        }
        
        interaction.editReply({ content: `You have no current active sessions.`, ephemeral: true });
    }
}
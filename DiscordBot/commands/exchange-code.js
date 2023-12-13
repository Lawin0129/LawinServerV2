const { MessageEmbed } = require("discord.js");
const User = require("../../model/user.js");
const functions = require("../../structs/functions.js");

module.exports = {
    commandInfo: {
        name: "otp-code",
        description: "Generates an One Time Password (OTP) for login. (One time use and expires after 5 mins if unused)."
    },
    execute: async (interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const user = await User.findOne({ discordId: interaction.user.id }).lean();
        if (!user) return interaction.editReply({ content: "You do not have a registered account!", ephemeral: true });

        let exchange_code = functions.MakeID().replace(/-/ig, "");

        global.exchangeCodes.push({
            accountId: user.accountId,
            exchange_code: exchange_code,
            creatingClientId: ""
        });
        
        setTimeout(() => {
            let exchangeCode = global.exchangeCodes.findIndex(i => i.exchange_code == exchange_code);

            if (exchangeCode != -1) global.exchangeCodes.splice(exchangeCode, 1);
        }, 300000) // remove exchange code in 5 minutes if unused

        let embed = new MessageEmbed()
        .setColor("#56ff00")
        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.avatarURL() })
        .setFields(
            { name: "OTP Code", value: exchange_code },
        )
        .setTimestamp()

        interaction.editReply({ content: "Successfully generated an OTP code.", embeds: [embed], ephemeral: true });
    }
}

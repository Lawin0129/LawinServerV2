const { MessageEmbed } = require("discord.js");
const User = require("../../model/user.js");
const functions = require("../../structs/functions.js");

module.exports = {
    commandInfo: {
        name: "exchange-code",
        description: "Generates an exchange code for login. (One time use and expires after 5 mins)."
    },
    execute: async (interaction) => {
        const user = await User.findOne({ discordId: interaction.user.id }).lean();
        if (!user) return interaction.reply({ content: "You do not have a registered account!", ephemeral: true });

        let exchange_code = functions.MakeID().replace(/-/ig, "");

        global.exchangeCodes.push({
            accountId: user.accountId,
            exchange_code: exchange_code,
            creatingClientId: ""
        });
        
        setTimeout(() => {
            if (global.exchangeCodes.find(i => i.exchange_code == exchange_code)) {
                global.exchangeCodes.splice(global.exchangeCodes.findIndex(i => i.exchange_code == exchange_code), 1)
            }
        }, 300000)

        let embed = new MessageEmbed()
        .setColor("#56ff00")
        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.avatarURL() })
        .setFields(
            { name: "Exchange Code", value: exchange_code }
        )
        .setTimestamp()

        interaction.reply({ content: "Successfully generated an exchange code.", embeds: [embed], ephemeral: true });
    }
}
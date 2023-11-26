const { MessageEmbed } = require("discord.js");
const functions = require("../../structs/functions.js");
const fs = require("fs");
const config = require("../../Config/config.json");

module.exports = {
    commandInfo: {
        name: "createsac",
        description: "Creates a Support-A-Creator Code.",
        options: [
            {
                name: "code",
                description: "The Code.",
                required: true,
                type: 3 // string
            },            
            {
                name: "owner",
                description: "InGame Name of the codes owner.",
                required: true,
                type: 3
            },
        ],
    },
    execute: async (interaction) => {
        await interaction.deferReply({ ephemeral: true });

        if (!config.moderators.includes(interaction.user.id)) return interaction.editReply({ content: "You do not have moderator permissions.", ephemeral: true });

        const { options } = interaction;

        const code = options.get("code").value;
        const username = options.get("owner").value;
        const creator = interaction.user.id;
        await functions.createSAC(code, username, creator).then(resp => {

            if (resp.message == undefined) return interaction.editReply({ content: "There was an unknown error!", ephemeral: true})

            if (resp.status >= 400) return interaction.editReply({ content: resp.message, ephemeral: true });

            interaction.editReply({ content: resp.message, ephemeral: true });
        });
    }
}

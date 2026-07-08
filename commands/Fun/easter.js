const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');

const mongoose = require('mongoose');

const ConfigurationSchema = new mongoose.Schema({
    "GuildId": String,
    "StaffRoleID": String,
    "TicketViewerId": String,
    "InfectedRoleID": String,
    "AfkRoleID": String,
    "LogsChannelID": String,
    "LevelsChannelID": String,
    "CakeGiftMessage": String,
    "BackupCreateInterval": Number,
    "BackupDeleteInterval": Number
});
const Configuration = mongoose.models.Configuration || mongoose.model('Configuration', ConfigurationSchema);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('easter')
        .setDescription('Get a special surprise!')
        .addSubcommand(command => 
            command
                .setName("egg")
                .setDescription("Get a special surprise!")
        ),
    async execute(interaction) {

        await interaction.deferReply();

        const config = await Configuration.findOne({ GuildId: interaction.guild.id });

        await interaction.editReply({ content: config.CakeGiftMessage });
    }
}

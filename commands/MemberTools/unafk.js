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
        .setName('unafk')
        .setDescription('Remove your AFK status.'),
    async execute(interaction) {

        const config = await Configuration.findOne({ GuildId: interaction.guild.id })

        const AfkRole = interaction.guild.roles.cache.get(config.AfkRoleID);

        if (!AfkRole) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | AFK Role Missing')
                .setDescription('AFK role not found. Please contact the server administrator.')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            return interaction.reply({ embeds: [embed] });
        }

        if (interaction.member.roles.cache.has(AfkRole.id)) {
            await interaction.member.roles.remove(AfkRole);
            const embed = new EmbedBuilder()
                .setTitle('✅ Success | AFK Status')
                .setDescription('Your AFK status has been removed.')
                .setColor('Green')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        } else {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | AFK Status')
                .setDescription('You are not currently AFK.')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        }
    }
}

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, userMention } = require('discord.js');

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
        .setName('rename')
        .setDescription('Give yourself a new name.')
        .addStringOption(option =>
            option
                .setName("name")
                .setDescription("Name to change it to.")
        ),
    async execute(interaction) {
        await interaction.deferReply()

        const newName = interaction.options.getString('name');

        const config = await Configuration.findOne({ GuildId: interaction.guild.id });

        if (!interaction.member.permissions.has(PermissionFlagsBits.ChangeNickname)) {
            const Embed = new EmbedBuilder()
                .setTitle("❌ Oops! | Permission Denied")
                .setDescription(`You do not have the sufficient permission to change your username!`)
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            await interaction.editReply({ embeds: [Embed] })

            return
        }

        await interaction.member.edit({ nick: newName });

        const Embed = new EmbedBuilder()
            .setTitle('✅ Success | User Action')
            .setDescription(`Your nickname has been set to: ${userMention(interaction.user.id)}`)
            .setColor('Green')
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();

        await interaction.editReply({ embeds: [Embed] });
    }
}
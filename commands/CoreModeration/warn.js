const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { userMention } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const ticket = require('../Ticket/ticket');

const WarningSchema = new mongoose.Schema({
    GuildId: String,
    userId: String,
    moderatorId: String,
    reason: String,
    timestamp: Date
});

const Warning = mongoose.models.Warning || mongoose.model('Warning', WarningSchema);

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
        .setName('warn')
        .setDescription('Warn a user in the server')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to warn')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('The reason for warning the user')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply()

        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id);

        const reason = interaction.options.getString('reason');

        if (user.id === interaction.member.id) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Self Action')
                .setDescription('You cannot warn yourself.')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

        if (member.roles.highest.position >= interaction.member.roles.highest.position && !interaction.member.permissions.has("Administrator") && user.id !== interaction.guild.ownerId) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Permission Conflict')
                .setDescription('You cannot warn this user because they have a higher or equal role than you.')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

        const config = await Configuration.findOne({ GuildId: interaction.guild.id });

        if (!interaction.member.roles.cache.has(config.StaffRoleID)) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Permission Denied')
                .setDescription('You are not allowed to use this command!')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] })
            return
        }

        // Storing the warning...

        const newWarning = await Warning.insertOne({
            GuildId: interaction.guild.id,
            userId: user.id,
            moderatorId: interaction.user.id,
            reason: reason,
            timestamp: new Date()
        })

        const Warnings = await Warning.find({ GuildId: interaction.guild.id, userId: user.id })

        // Sending the message...

        const Embed = new EmbedBuilder()
            .setTitle('✅ Success | Moderation Action')
            .setDescription(`${userMention(user.id)} has been warned from the guild! This is their ${Warnings.length} warning.`)
            .setColor('Green')
            .addFields(
                { name: "Moderator", value: userMention(interaction.user.id), inline: false},
                { name: "Target", value: userMention(user.id), inline: false},
                { name: 'Reason', value: reason, inline: false }
            )
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();

        try {
            const LogChannel  = await interaction.client.channels.fetch(config.LogsChannelID);
            await LogChannel.send({ embeds: [Embed] });
        } catch (error) {
            console.error('Failed to send warning message to logs channel:', error);
        }

        const UserEmbed = new EmbedBuilder()
            .setTitle(`Moderation Action from ${interaction.guild.name}`)
            .setDescription(reason)
            .addFields({ name: 'Infraction ID', value: newWarning._id.toString(), inline: true })
            .addFields({ name: 'Action Type', value: "warning", inline: true })
            .addFields({ name: 'Moderator', value: `<@${interaction.member.id}>`, inline: false })
            .addFields({ name: 'Date Issued', value: newWarning.timestamp.toISOString(), inline: false })
            .setColor('Blurple')
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();
        
        try {
            await user.send({ embeds: [UserEmbed] });
        } catch (error) {
            console.error('Failed to send warning message to user:', error);
        }

        await interaction.editReply({ embeds: [Embed] });
    }
}
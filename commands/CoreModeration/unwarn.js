const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType } = require('discord.js');
const { userMention } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const ticket = require('../Ticket/ticket');

const Warning = mongoose.models.Warning;
const Configuration = mongoose.models.Configuration;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription('Remove a warning from a user in the server')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to unwarn')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id);

        const reason = interaction.options.getString('reason');

        if (user.id === interaction.member.id) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Self Action')
                .setDescription('You cannot unwarn yourself.')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

        if (member.roles.highest.position >= interaction.member.roles.highest.position && !interaction.member.permissions.has("Administrator") && user.id !== interaction.guild.ownerId) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Permission Conflict')
                .setDescription('You cannot unwarn this user because they have a higher or equal role than you.')
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

        const Warnings = await Warning.find({ GuildId: interaction.guild.id, userId: user.id });

        if (Warnings.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | No Warnings Found')
                .setDescription(`${userMention(user.id)} has no warnings in this guild.`)
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

        const WarningSelect = new StringSelectMenuBuilder()
            .setCustomId('unwarn_select')
            .setPlaceholder('Select a warning to remove')
            .addOptions(
                Warnings.map(warning => ({
                    label: `Warning #${warning._id}`,
                    description: warning.reason.slice(0, 50) + (warning.reason.length > 50 ? '...' : ''),
                    value: warning._id.toString()
                }))
            );
        
        const WarningRow = new ActionRowBuilder().addComponents(WarningSelect);

        const filter = i => i.customId === 'unwarn_select' && i.user.id === interaction.user.id;

        const message = await interaction.editReply({ content: 'Select a warning to remove:', components: [WarningRow] });

        const selectInteraction = await message.awaitMessageComponent({ filter, componentType: ComponentType.StringSelect, time: 300000 });

        const selectedWarningId = selectInteraction.values[0];

        await Warning.findOneAndDelete({ _id: selectedWarningId, GuildId: interaction.guild.id, userId: user.id });

        const WarningCount = await Warning.countDocuments({ GuildId: interaction.guild.id, userId: user.id });

        const Embed = new EmbedBuilder()
            .setTitle('✅ Success | Moderation Action')
            .setDescription(`${userMention(user.id)} has been unwarned from the guild! They now have ${WarningCount} warning.`)
            .setColor('Green')
            .setFields(
                { name: "Moderator", value: userMention(interaction.user.id), inline: false},
                { name: "Target", value: userMention(user.id), inline: false}
            )
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();

        await interaction.editReply({ embeds: [Embed], components: [] });

        try {
            const LogChannel  = await interaction.client.channels.fetch(config.LogsChannelID);
            await LogChannel.send({ embeds: [Embed] });
        } catch (error) {
            console.error('Failed to send warning message to logs channel:', error);
        }

        await interaction.editReply({ embeds: [Embed] });
    }
}
const { SlashCommandBuilder, EmbedBuilder, channelMention } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');

const mongoose = require('mongoose');

const Configuration = mongoose.models.Configuration;


module.exports = {
    data: new SlashCommandBuilder()
        .setName('lockdown')
        .setDescription('Lock down the channel.')
        .addChannelOption(option => 
            option
                .setName("channel")
                .setDescription("The channel to lock down.")
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply({ephemeral: true})

        const channel = interaction.options.getChannel('channel');

        const config = await Configuration.findOne({ GuildId: interaction.guild.id });

        if (!interaction.member.roles.cache.has(config.StaffRoleID)) {
            await interaction.editReply({ content: "You are not allowed to use this command!" })
            return
        }

        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            SendMessages: false,
            CreatePublicThreads: false,
            CreatePrivateThreads: false
        });

        const Embed = new EmbedBuilder()
            .setTitle('✅ Success | Moderation Action')
            .setDescription(`${channelMention(channel.id)} has been locked down!`)
            .setColor('Green')
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();

        try {
            const LogChannel = await interaction.client.channels.fetch(config.LogsChannelID);
            const LogEmbed = new EmbedBuilder()
                .setTitle('Channel Locked Down | Moderation Action')
                .setDescription(`${channelMention(channel.id)} was locked down by <@${interaction.user.id}>.`)
                .addFields(
                    { name: 'Channel ID', value: channel.id },
                    { name: 'Moderator', value: `<@${interaction.user.id}> (ID: ${interaction.user.id})` }
                )
                .setColor('Blue')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();

            await LogChannel.send({ embeds: [LogEmbed] });
        } catch (error) {
            console.error('Failed to send message to logs channel:', error);
        }

        await channel.send({ embeds: [Embed] });

        await interaction.editReply({ embeds: [Embed] });
    }
}

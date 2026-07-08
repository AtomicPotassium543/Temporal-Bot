const { SlashCommandBuilder, EmbedBuilder, channelMention } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');

const mongoose = require('mongoose');

const ConfigurationSchema = new mongoose.Schema({
    "GuildId": String,
    "StaffRoleID": String,
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
            .setDescription(`${channelMention(interaction.channel.id)} has been locked down!`)
            .setColor('Green')
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();

        try {
            const LogChannel  = await interaction.client.channels.fetch(config.LogsChannelID);
            await LogChannel.send({ embeds: [Embed] });
        } catch (error) {
            console.error('Failed to send message to logs channel:', error);
        }

        await channel.send({ embeds: [Embed] });

        await interaction.editReply({ embeds: [Embed] });
    }
}

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');

const mongoose = require('mongoose');

const Configuration = mongoose.models.Configuration;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('write')
        .setDescription('Write a message in the chat.')
        .addStringOption(option => 
            option
                .setName("title")
                .setDescription("The title of the message.")
                .setRequired(true)
        )
        .addStringOption(option => 
            option
                .setName("message")
                .setDescription("The message to send.")
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply({ephemeral: true})
        
        const title = interaction.options.getString('title');
        const message = interaction.options.getString('message');

        const config = await Configuration.findOne({ GuildId: interaction.guild.id });

        if (!config) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Configuration Missing')
                .setDescription("The configuration for this guild hasn't been made! Please contact an administrator for more information.")
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
            return;
        }

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

        const messageEmbed = new EmbedBuilder()
            .setTitle(title)
            .setColor('Blurple')
            .setDescription(message)

        await interaction.channel.send({ embeds: [messageEmbed] });

        const embed = new EmbedBuilder()
            .setTitle('Message Sent')
            .setDescription(`Message sent: ${message}`)
            .setColor('Blue')
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();

        try {
            const LogChannel = await interaction.client.channels.fetch(config.LogsChannelID);
            const MessageFields = Array.from({ length: Math.ceil(message.length / 1024) }, (_, index) => ({
                name: index === 0 ? 'Message' : 'Message (continued)',
                value: message.slice(index * 1024, (index + 1) * 1024)
            }));
            const LogEmbed = new EmbedBuilder()
                .setTitle('Channel Message Sent | Moderation Action')
                .setDescription(`A titled message was sent to <#${interaction.channel.id}> by <@${interaction.user.id}>.`)
                .addFields(
                    { name: 'Message title', value: title.slice(0, 1024) },
                    ...MessageFields,
                    { name: 'Channel ID', value: interaction.channel.id },
                    { name: 'Sent by', value: `<@${interaction.user.id}> (ID: ${interaction.user.id})` }
                )
                .setColor('Blurple')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();

            await LogChannel.send({ embeds: [LogEmbed] });
        } catch (error) {
            console.error('Failed to send channel message log:', error);
        }

        await interaction.editReply({ embeds: [embed] });
    }
}

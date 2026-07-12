const { SlashCommandBuilder, AttachmentBuilder, ComponentType, PermissionFlagsBits, userMention, StringSelectMenuBuilder, EmbedBuilder, ChannelType, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, DiscordjsRangeError, Client, User } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const { error } = require('node:console');

const Configuration = mongoose.models.Configuration;

module.exports = {
    
    /**
     * Logs a command execution in the designated logs channel.
     * @param { Client } client 
     * @param { String } guildId 
     * @param { String } CommandName 
     * @param { User } CommandUser 
     * @param { Object } CommandOptions 
     * @param { Object } SelectOptions 
     * @param { Object } ModalOptions 
     * @param { Object } FileAttachments 
     */
    Log: async function (client, guildId, CommandName, CommandUser, CommandOptions, SelectOptions, ModalOptions, FileAttachments) {
        
        const config = await Configuration.findOne({ GuildId: guildId });

        if (!config) {
            console.error(`Configuration not found for guild: ${guildId}`);
            return;
        }

        const logsChannelId = config.LogsChannelID;
        const logsChannel = await client.channels.fetch(logsChannelId);

        if (!logsChannel) {
            console.error(`Logs channel not found for guild: ${guildId}`);
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Command Executed')
            .addFields(
                { name: 'Command Name', value: `**/${CommandName}**`, inline: true },
                { name: 'Executed By', value: userMention(CommandUser.id), inline: true },
                { name: 'Options', value: JSON.stringify(CommandOptions, null, 2) || 'None', inline: false },
                { name: 'Select Options', value: JSON.stringify(SelectOptions, null, 2) || 'None', inline: false },
                { name: 'Modal Options', value: JSON.stringify(ModalOptions, null, 2) || 'None', inline: false },
            )
            .setTimestamp();

        try {
            await logsChannel.send({ embeds: [embed], files: FileAttachments || [] });
        } catch (error) {
            console.error(`Error sending log message for guild: ${guildId}`, error);
        }
    }
}
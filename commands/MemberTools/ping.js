const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');

const mongoose = require('mongoose');

const Configuration = mongoose.models.Configuration;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong (and maybe some technical information)!'),
    async execute(interaction) {

        await interaction.deferReply({ ephemeral: true });

        const APILatency = Math.round(interaction.client.ws.ping);
        const BotLatency = Math.round(Date.now() - interaction.createdTimestamp);
        const Ping = Math.round((APILatency + BotLatency) / 2);

        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong! | Latency Information')
            .setDescription(`**API Latency:** ${APILatency}ms\n**Bot Latency:** ${BotLatency}ms\n**Average Ping:** ${Ping}ms`)
            .setColor('Green')
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    }
}

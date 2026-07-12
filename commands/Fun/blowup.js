const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');

const mongoose = require('mongoose');

const Configuration = mongoose.models.Configuration;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blowup')
        .setDescription('Send a blowup sticker!'),
    async execute(interaction) {
        await interaction.reply({
            content: 'https://c.tenor.com/nANqORN7qhQAAAAd/tenor.gif'
        });
    }
}
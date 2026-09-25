const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');

const mongoose = require('mongoose');

const Configuration = mongoose.models.Configuration;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Set your status to AFK.'),
    async execute(interaction) {

        const config = await Configuration.findOne({ GuildId: interaction.guild.id });

        if (!config) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Configuration Error')
                .setDescription("The configuration for this guild is incomplete. Please contact an administrator for more information!")
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        }

        const AfkRole = interaction.guild.roles.cache.get(config.AfkRoleID);

        if (interaction.member.roles.cache.has(AfkRole.id)) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | AFK Status')
                .setDescription('You are already AFK.')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        } else {
            await interaction.member.roles.add(AfkRole);
            const embed = new EmbedBuilder()
                .setTitle('✅ Success | AFK Status')
                .setDescription('You have been set to AFK.')
                .setColor('Green')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        }
    }
}

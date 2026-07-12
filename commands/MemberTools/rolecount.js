const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

const Configuration = mongoose.models.Configuration;
const Level = mongoose.models.Level;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rolecount')
        .setDescription('Count users with a specific role')
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('The role to count users for')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();

        const config = await Configuration.findOne({ GuildId: interaction.guild.id });

        if (!config) {
            return interaction.editReply({ content: "The configuration for this guild hasn't been made! Please contact an administrator for more information."});
        }

        const role = interaction.options.getRole('role');

        const userCount = role.members.size;

        const Embed = new EmbedBuilder()
            .setTitle('✅ Success! | Role Count')
            .setDescription(`There are **${userCount}** users with the role @${role.name}.`)
            .setColor('Green')
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();

        await interaction.editReply({ embeds: [Embed] });
    }
}

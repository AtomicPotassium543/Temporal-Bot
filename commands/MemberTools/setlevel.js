const { SlashCommandBuilder, EmbedBuilder, userMention } = require('discord.js');

const fs = require('node:fs');
const mongoose = require('mongoose');

const Configuration = mongoose.models.Configuration;
const Level = mongoose.models.Level;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlevel')
        .setDescription('Set a user\'s level')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to set the level for')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('level')
                .setDescription('The level to set for the user')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply({ephemeral: true})

        const user = interaction.options.getUser('user');
        const level = interaction.options.getInteger('level');

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

        if (level < 0) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Invalid Level')
                .setDescription('Level must be a positive integer.')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

        await Level.findOneAndUpdate(
            { GuildId: interaction.guild.id, userId: user.id },
            { $set: { level: level }, $setOnInsert: { GuildId: interaction.guild.id, userId: user.id, Experience: 0 } },
            { upsert: true }
        );

        const Embed = new EmbedBuilder()
            .setTitle('✅ Success! | Level Updated')
            .setDescription(`${userMention(user.id)}'s level has been set to ${level}!`)
            .addFields({
                name: "Moderator",
                value: userMention(interaction.user.id)
            })
            .setColor('Green')
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();

        try {
            const LogChannel  = await interaction.client.channels.fetch(config.LogsChannelID);

            await LogChannel.send({ embeds: [Embed] });
        } catch (err) {
            console.error('Failed to send log message:', err);
        }

        await interaction.editReply({ embeds: [Embed] });
    }
}

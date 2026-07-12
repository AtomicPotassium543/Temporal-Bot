const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');

const mongoose = require('mongoose');

const Configuration = mongoose.models.Configuration;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlock the channel.')
        .addChannelOption(option => 
            option
                .setName("channel")
                .setDescription("The channel to unlock.")
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply({ephemeral: true})

        const channel = interaction.options.getChannel('channel');

        const config = await Configuration.findOne({ GuildId: interaction.guild.id });

        if (!config) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Configuration Missing')
                .setDescription('The configuration for this guild hasn\'t been made! Please contact an administrator for more information.')
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

        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            SendMessages: true,
            CreatePublicThreads: true,
            CreatePrivateThreads: true
        });

        const Embed = new EmbedBuilder()
            .setTitle('Channel Unlocked')
            .setDescription(`${channel} has been unlocked.`)
            .setColor('Green')
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();

        await channel.send({ embeds: [Embed] });

        await interaction.editReply({ embeds: [Embed] });
    }
}

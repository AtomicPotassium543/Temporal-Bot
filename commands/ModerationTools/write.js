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

        await interaction.editReply({ embeds: [embed] });
    }
}

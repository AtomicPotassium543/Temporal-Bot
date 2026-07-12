const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const mongoose = require('mongoose');

const Configuration = mongoose.models.Configuration;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('snipe')
        .setDescription('View the last message of the user.')
        .addUserOption(option => 
            option
                .setName("user")
                .setDescription("The user to view the last message of.")
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply()

        const user = interaction.options.getUser('user');

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

        const lastMessage = interaction.client.messageCache.get(user.id);


        if (!lastMessage) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | No Message')
                .setDescription('No message found for that user.')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setTitle('✅ Success! | Moderation Action')
            .setDescription(`Message sent: ${lastMessage.content}`)
            .addFields({
                name: "Attachments",
                value: lastMessage.attachments.size
                    ? lastMessage.attachments.map(a => `[${a.name}](${a.url})`).join("\n")
                    : "No attachments provided."
            })
            .setColor('Blue')
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
}

const { SlashCommandBuilder, EmbedBuilder, userMention } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');


const mongoose = require('mongoose');

const Configuration = mongoose.models.Configuration;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('execute')
        .setDescription('Send a message to a user.')
        .addStringOption(option => 
            option
                .setName("message")
                .setDescription("The message to send.")
                .setRequired(true)
        )
        .addUserOption(option => 
            option
                .setName("user")
                .setDescription("The user to send the message to.")
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply({ephemeral: true})

        const user = interaction.options.getUser('user');
        const message = interaction.options.getString('message');

        const config = await Configuration.findOne({ GuildId: interaction.guild.id });

        if (!interaction.member.roles.cache.has(config.StaffRoleID)) {
            await interaction.editReply({ content: "You are not allowed to use this command!" })
            return
        }

        const UserEmbed = new EmbedBuilder()
            .setTitle(`Message from ${interaction.guild.name}`)
            .setDescription(message)
            .setColor('Blurple')
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();
        
        await user.send({ embeds: [UserEmbed] });

        const Embed = new EmbedBuilder()
            .setTitle('✅ Success | Moderation Action')
            .setDescription(`${userMention(user.id)} has been messaged!`)
            .setColor('Green')
            .setFields(
                { name: "Message", value: message, inline: false }
            )
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();

        try {
            const LogChannel = await interaction.client.channels.fetch(config.LogsChannelID);
            const MessageFields = Array.from({ length: Math.ceil(message.length / 1024) }, (_, index) => ({
                name: index === 0 ? 'Message' : 'Message (continued)',
                value: message.slice(index * 1024, (index + 1) * 1024)
            }));
            const LogEmbed = new EmbedBuilder()
                .setTitle('Message executed | Moderation Action')
                .setDescription(`Sent by <@${interaction.user.id}> (ID: ${interaction.user.id}) to <@${user.id}> (ID: ${user.id}).`)
                .setFields(
                    { name: "Moderator (Sender):", value: `${userMention(interaction.user.id)} (ID: ${interaction.user.id})`},
                    { name: "Receiver:", value: `${userMention(user.id)} (ID: ${user.id})`}
                )
                .addFields(MessageFields)
                .setColor('Blurple')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();

            await LogChannel.send({ embeds: [LogEmbed] });
        } catch (error) {
            console.error('Failed to send direct message log:', error);
        }

        await interaction.editReply({ embeds: [Embed] });
    }
}

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { userMention } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');


const mongoose = require('mongoose');

const ConfigurationSchema = new mongoose.Schema({
    "GuildId": String,
    "StaffRoleID": String,
    "TicketViewerId": String,
    "InfectedRoleID": String,
    "AfkRoleID": String,
    "LogsChannelID": String,
    "LevelsChannelID": String,
    "CakeGiftMessage": String,
    "BackupCreateInterval": Number,
    "BackupDeleteInterval": Number
});

const Configuration = mongoose.models.Configuration || mongoose.model('Configuration', ConfigurationSchema);


module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to ban')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('The reason for banning the user')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply()

        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id);

        const reason = interaction.options.getString('reason');

        if (user.id === interaction.member.id) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Self Action')
                .setDescription('You cannot ban yourself.')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

        if (member.roles.highest.position >= interaction.member.roles.highest.position && !interaction.member.permissions.has("Administrator") && user.id !== interaction.guild.ownerId) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Permission Conflict')
                .setDescription('You cannot ban this user because they have a higher or equal role than you.')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

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

        await member.ban({ reason: reason });

        const Embed = new EmbedBuilder()
            .setTitle('✅ Success | Moderation Action')
            .setDescription(`${userMention(user.id)} has been banned from the guild!`)
            .setColor('Green')
            .addFields(
                { name: "Moderator", value: userMention(interaction.user.id), inline: false},
                { name: "Target", value: userMention(user.id), inline: false},
                { name: 'Reason', value: reason, inline: false }
            )
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();

        const UserEmbed = new EmbedBuilder()
            .setTitle(`Moderation Action from ${interaction.guild.name}`)
            .setDescription(reason)
            .addFields({ name: 'Action Type', value: "Ban", inline: true })
            .addFields({ name: 'Moderator', value: `<@${interaction.member.id}>`, inline: false })
            .addFields({ name: 'Date Issued', value: interaction.createdAt.toISOString(), inline: false })
            .setColor('Blurple')
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();
        
        await user.send({ embeds: [UserEmbed] }).catch(() => {
            console.log(`Could not send DM to ${user.tag} (${user.id})`);
        });

        try {
            const LogChannel  = await interaction.client.channels.fetch(config.LogsChannelID);
            await LogChannel.send({ embeds: [Embed] });
        } catch (error) {
            console.error('Failed to send ban message to logs channel:', error);
        }

        await interaction.editReply({ embeds: [Embed] });
    }
}

const { SlashCommandBuilder, EmbedBuilder, roleMention, userMention } = require('discord.js');

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

const RoleLevelSchema = new mongoose.Schema({
    GuildId: String,
    roleId: String,
    level: Number
});

const RoleLevel = mongoose.models.RoleLevel || mongoose.model('RoleLevel', RoleLevelSchema);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('levelsetrole')
        .setDescription('Link a level to a role.')
        .addIntegerOption(option =>
            option
                .setName('level')
                .setDescription('The level to set for the role')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('The role to link the level to')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply({ephemeral: true})

        const role = interaction.options.getRole('role');
        const level = interaction.options.getInteger('level');

        const config = await Configuration.findOne({ GuildId: interaction.guild.id })

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

        await mongoose.connect(process.env.MONGODB_URI);

        await RoleLevel.findOneAndUpdate(
            { GuildId: interaction.guild.id, roleId: role.id },
            { $set: { level: level }, $setOnInsert: { GuildId: interaction.guild.id, roleId: role.id } },
            { upsert: true, new: true }
        );

        await interaction.guild.members.fetch();

        const membersWithRole = interaction.guild.members.cache.filter(m =>
            m.roles.cache.has(role.id)
        );
        
        for (const member of membersWithRole.values()) {
            await mongoose.model('Level').findOneAndUpdate(
                { GuildId: interaction.guild.id, userId: member.id },
                { $set: { level: level }, $setOnInsert: { GuildId: interaction.guild.id, userId: member.id, Experience: 0 } },
                { upsert: true, new: true }
            );
        }
                
        const Embed = new EmbedBuilder()
            .setTitle('✅ Success! | Level Updated')
            .setDescription(`${roleMention(role.id)}'s level has been set to ${level}!`)
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

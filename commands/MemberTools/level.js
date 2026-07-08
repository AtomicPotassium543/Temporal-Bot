const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const fs = require('node:fs');
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

const LevelSchema = new mongoose.Schema({
    GuildId: String,
    userId: String,
    level: Number,
    Experience: Number
});

const Level = mongoose.models.Level || mongoose.model('Level', LevelSchema);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('View your level and experience points.'),
    async execute(interaction) {
        await interaction.deferReply()

        const config = await Configuration.findOne({ GuildId: interaction.guild.id });

        let data = await Level.findOne({ GuildId: interaction.guild.id, userId: interaction.user.id });

        if (!data) {
            await Level.create({ GuildId: interaction.guild.id, userId: interaction.user.id, level: 1, Experience: 0 });

            data = await Level.findOne({ GuildId: interaction.guild.id, userId: interaction.user.id });
        }

        const requiredXP = data.level * 10;
        const progress = Math.min(data.Experience / requiredXP, 1)

        const filledBars = Math.round(progress * 10);
        const emptyBars = 10 - filledBars;

        const XPBar = "🟨".repeat(filledBars) + "⬛".repeat(emptyBars);

        const Embed = new EmbedBuilder()
            .setTitle('Level')
            .setDescription(`Current level: ${data.level}`)
            .setColor('Green')
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();
        
        Embed.addFields(
            { name: 'XP Bar', value: `${XPBar} (${data.Experience}/${data.level * 10})`, inline: true }
        );

        await interaction.editReply({ embeds: [Embed] });
    }
}

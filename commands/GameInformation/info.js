const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, ComponentType, ActionRowBuilder } = require('discord.js');

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

const GameSchema = new mongoose.Schema({
    GuildId: String,
    name: String,
    information: String,
    releaseDate: String
});

const Game = mongoose.models.Game || mongoose.model('Game', GameSchema);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('View information about a registered game.'),
    
    select: new StringSelectMenuBuilder()
        .setCustomId('selectgame')
        .setPlaceholder('Select a game to view information for')
            .setOptions([]),
    async execute(interaction) {
        const config = await Configuration.findOne({ GuildId: interaction.guild.id });

        const games = await Game.find({ GuildId: interaction.guild.id });

        if (games.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | No Games')
                .setDescription('There are no games registered. Use the /setgame command to add a game first.')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('selectgame')
                    .setPlaceholder('Select a game')
                    .addOptions(
                        games.slice(0, 25).map(game => ({
                            label: game.name.slice(0, 100),
                            value: game._id.toString()
                        }))
                    );

        const message = await interaction.reply({ content: 'Select a game to view information for:', components: [new ActionRowBuilder().addComponents(selectMenu)] });

        const selectInteraction = await message.awaitMessageComponent({
            componentType: ComponentType.StringSelect,
            time: 60000,
            filter: i => i.user.id === interaction.user.id
        });
    
        const gameId = selectInteraction.values[0];

        const game = await Game.findOne({ _id: gameId, GuildId: interaction.guild.id });

        const Embed = new EmbedBuilder()
            .setTitle('Game Information')
            .setDescription(`Game name: ${game.name}`)
            .setColor('Blurple')
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();

        Embed.addFields(
            {
                name: "Information",
                value: game.information ? game.information : 'No information set for this game.',
            }
        );

        await interaction.editReply({ content: "", embeds: [Embed], components: [] });
    }
}
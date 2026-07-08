const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, ActionRowBuilder, ComponentType } = require('discord.js');

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
        .setName('setupdate')
        .setDescription('Set the release date for a registered game.'),
    
    modal: new ModalBuilder()
        .setCustomId('setupdate')
        .setTitle('Set Release Date')
        .addComponents(
            new TextInputBuilder()
                .setCustomId('gamerelease')
                .setLabel('Release date')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
        ),
    async execute(interaction) {

        const config = await Configuration.findOne({ GuildId: interaction.guild.id });

        if (!interaction.member.roles.cache.has(config.StaffRoleID)) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Permission Denied')
                .setDescription('You are not allowed to use this command!')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        await mongoose.connect(process.env.MONGODB_URI);
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


        const message = await interaction.reply({
            content: 'Select a game:',
            components: [new ActionRowBuilder().addComponents(selectMenu)],
            ephemeral: true,
            fetchReply: true
        });

        try {
            const selectInteraction = await message.awaitMessageComponent({
                componentType: ComponentType.StringSelect,
                time: 300000,
                filter: i => i.user.id === interaction.user.id
            });

            const gameId = selectInteraction.values[0];

            await selectInteraction.showModal(module.exports.modal);

            const modalSubmit = await selectInteraction.awaitModalSubmit({
                filter: i => i.customId === 'setupdate' && i.user.id === interaction.user.id,
                time: 60000
            });

            await modalSubmit.deferUpdate();

            const game_release = modalSubmit.fields.getTextInputValue('gamerelease');

            const gameDoc = await Game.findOne({ _id: gameId, GuildId: interaction.guild.id });

            await Game.updateOne({ _id: gameId, GuildId: interaction.guild.id }, { releaseDate: game_release });

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Success | Release Date')
                .setDescription(`Release date set for **${gameDoc.name}**`)
                .setColor('Green')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();

            await interaction.editReply({ content: "", embeds: [successEmbed], components: [], ephemeral: true });
        } catch (err) {
            console.error(err);
            await interaction.followUp({ content: 'You did not respond in time.', ephemeral: true });
        }
    }
}

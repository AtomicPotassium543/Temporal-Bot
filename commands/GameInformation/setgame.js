const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder } = require('discord.js');

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

const GameModal = new ModalBuilder()
    .setCustomId('setgame')
    .setTitle('Register Game')
    .addComponents(
        new TextInputBuilder()
            .setCustomId('gamename')
            .setLabel('Game Name')
            .setStyle('Short')
            .setRequired(true)
    );
    
module.exports = {
    data: new SlashCommandBuilder()
        .setName('setgame')
        .setDescription('Add a custom game entry so it can be used in date and info commands.'),
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

        await interaction.showModal(GameModal);

        const filter = i => i.customId === 'setgame' && i.user.id === interaction.user.id;

        try {
            const modalInteraction = await interaction.awaitModalSubmit({ filter, time: 60000 });
            const gameName = modalInteraction.fields.getTextInputValue('gamename');

            await Game.create({ GuildId: interaction.guild.id, name: gameName, information: '', releaseDate: null });

            const Embed = new EmbedBuilder()
                .setTitle('Game Added')
                .setDescription(`The game ${gameName} has been added to the database.`)
                .setColor('Blurple')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();    

            await modalInteraction.reply({ content: "", embeds: [Embed], components: [] , ephemeral: true });
        } catch (err) {
            console.error(err);
            await interaction.followUp({ content: 'You did not submit the modal in time.', ephemeral: true });
        }
    }
}

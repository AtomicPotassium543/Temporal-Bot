const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, Embed, StringSelectMenuBuilder, ActionRowBuilder, ComponentType } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');

const mongoose = require('mongoose');
const Configuration = mongoose.models.Configuration;
const Game = mongoose.models.Game;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('releasedate')
        .setDescription('View the release date of a registered game.'),

    select: new StringSelectMenuBuilder()
        .setCustomId('selectgame')
        .setPlaceholder('Select a game to view release date for')
            .setOptions([]),
    async execute(interaction) {
        const config = await Configuration.findOne({ GuildId: interaction.guild.id });

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
    
        const message = await interaction.reply({ content: 'Select a game to view release date for:', components: [new ActionRowBuilder().addComponents(selectMenu)] });
    
        const selectInteraction = await message.awaitMessageComponent({
            componentType: ComponentType.StringSelect,
            time: 60000,
            filter: i => i.user.id === interaction.user.id
        });
        
        const gameId = selectInteraction.values[0];
    
        const game = await Game.findOne({ _id: gameId, GuildId: interaction.guild.id });
    
        console.log(game)

        const Embed = new EmbedBuilder()
            .setTitle('Game Information')
            .setDescription(`Game name: ${game.name}`)
            .setColor('Blurple')
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();
    
        Embed.addFields(
            {
                name: "Release Date",
                value: game.releaseDate ? game.releaseDate : 'No release date set for this game.',
            }
        );
    
        await interaction.editReply({ content: "", embeds: [Embed], components: [] });
    }
}
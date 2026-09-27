const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, ActionRowBuilder, ComponentType } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');

const mongoose = require('mongoose');
const Configuration = mongoose.models.Configuration;
const Game = mongoose.models.Game;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removegame')
        .setDescription('Remove a registered game.'),
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

            const game = await Game.findOneAndDelete({ _id: gameId, GuildId: interaction.guild.id });

            if (!game) {
                throw new Error('Selected game was not found.');
            }

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Success | Game Removed')
                .setDescription(`Game **${game.name}** removed successfully.`)
                .setColor('Green')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();

            try {
                const LogChannel = await interaction.client.channels.fetch(config.LogsChannelID);
                const LogEmbed = new EmbedBuilder()
                    .setTitle('Game Database Log | Game Removed')
                    .setDescription(`The game **${game.name}** was removed.`)
                    .addFields(
                        { name: 'Game', value: `${game.name} (ID: ${game._id})` },
                        { name: 'Removed by', value: `<@${interaction.user.id}> (ID: ${interaction.user.id})` }
                    )
                    .setColor('Green')
                    .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                    .setTimestamp();

                await LogChannel.send({ embeds: [LogEmbed] });
            } catch (err) {
                console.error('Failed to send game removal message to logs channel:', err);
            }

            await interaction.editReply({ content: "", embeds: [successEmbed], components: [], ephemeral: true });
        } catch (err) {
            console.error(err);
            await interaction.followUp({ content: 'You did not respond in time.', ephemeral: true });
        }
    }
}

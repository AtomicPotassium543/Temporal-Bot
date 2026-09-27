const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, StringSelectMenuBuilder, TextInputStyle, ActionRowBuilder, ComponentType } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');

const mongoose = require('mongoose');
const Configuration = mongoose.models.Configuration;
const Game = mongoose.models.Game;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('typeinfo')
        .setDescription('Set the information for a registered game.'),

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
                .setDescription('There are no games registered.')
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
                time: 60000,
                filter: i => i.user.id === interaction.user.id
            });

            const gameId = selectInteraction.values[0];

            const modal = new ModalBuilder()
                .setCustomId(`setinfo_${gameId}`)
                .setTitle('Set Game Information');

            const input = new TextInputBuilder()
                .setCustomId('gameinfo')
                .setLabel('Game Information')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(input));

            await selectInteraction.showModal(modal);

            const modalSubmit = await selectInteraction.awaitModalSubmit({
                time: 60000,
                filter: i =>
                    i.customId === `setinfo_${gameId}` &&
                    i.user.id === interaction.user.id
            });

            const game_info = modalSubmit.fields.getTextInputValue('gameinfo');

            const gameDoc = await Game.findOne({ _id: gameId, GuildId: interaction.guild.id });

            await Game.updateOne(
                { _id: gameId, GuildId: interaction.guild.id },
                { information: game_info }
            );

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Success | Game Information')
                .setDescription(`Information set for **${gameDoc.name}**`)
                .setColor('Green')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();

            try {
                const LogChannel = await interaction.client.channels.fetch(config.LogsChannelID);
                const LogEmbed = new EmbedBuilder()
                    .setTitle('Game Information Updated')
                    .setDescription(game_info)
                    .addFields(
                        { name: 'Game', value: `${gameDoc.name} (ID: ${gameDoc._id})` },
                        { name: 'Info', value: game_info},
                        { name: 'Updated by', value: `<@${interaction.user.id}> (ID: ${interaction.user.id})` }
                    )
                    .setColor('Green')
                    .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                    .setTimestamp();

                await LogChannel.send({ embeds: [LogEmbed] });
            } catch (err) {
                console.error('Failed to send game information update to logs channel:', err);
            }

            await modalSubmit.reply({ content: "", embeds: [successEmbed], ephemeral: true });
        } catch (err) {
            console.error(err);
            await interaction.followUp({ content: 'You did not respond in time.', ephemeral: true });
        }
    }
};
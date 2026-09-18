const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, ActionRowBuilder, ComponentType } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');

const mongoose = require('mongoose');
const Configuration = mongoose.models.Configuration;
const Character = mongoose.models.Character;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removecharacter')
        .setDescription('Remove a registered character.'),
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

        const characters = await Character.find({ GuildId: interaction.guild.id });

        if (characters.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | No Characters')
                .setDescription('There are no characters registered. Use the /setcharacter command to add a character first.')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('selectcharacter')
            .setPlaceholder('Select a character')
            .addOptions(
                characters.slice(0, 25).map(character => ({
                    label: character.name.slice(0, 100),
                    value: character._id.toString()
                }))
            );


        const message = await interaction.reply({
            content: 'Select a character:',
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

            await Game.deleteOne({ _id: gameId, GuildId: interaction.guild.id });

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Success | Character Removed')
                .setDescription("Character removed successfully.")
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

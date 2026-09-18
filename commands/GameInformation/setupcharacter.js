const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');

const mongoose = require('mongoose');
const Configuration = mongoose.models.Configuration;
const Character = mongoose.models.Character;

const CharacterModal = new ModalBuilder()
    .setCustomId('setupcharacter')
    .setTitle('Register Character')
    .addComponents(
        new TextInputBuilder()
            .setCustomId('charactername')
            .setLabel('Character Name')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
    );

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setupcharacter')
        .setDescription('Add a custom character entry so that it can be used in random character command.'),
    async execute(interaction) {

        const config = await Configuration.findOne({ GuildId: interaction.guild.id });

        if (!interaction.member.roles.cache.has(config.StaffRoleID)) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Permission Denied')
                .setDescription('You are not allowed to use this command!')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            return interaction.reply({ embeds: [embed], ephemeral: true});
        }

        const characterCount = await Character.countDocuments({ GuildId: interaction.guild.id });

        if (characterCount >= 25) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Character Limit Reached')
                .setDescription('You have reached the maximum limit of 25 characters. Please remove a character before adding a new one.')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        await interaction.showModal(CharacterModal);

        const filter = i => i.customId === 'setupcharacter' && i.user.id === interaction.user.id;

        try {
            const modalInteraction = await interaction.awaitModalSubmit({ filter, time: 60000 });
            const characterName = modalInteraction.fields.getTextInputValue('charactername');

                await Character.create({ GuildId: interaction.guild.id, name: characterName });

            const Embed = new EmbedBuilder()
                .setTitle('Character Added')
                .setDescription(`The character ${characterName} has been added to the database.`)
                .setColor('Blurple')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();

            await modalInteraction.reply({ content: "", embeds: [Embed], components: [], ephemeral: true });
        } catch (err) {
            console.error(err);
            await interaction.followUp({ content: 'You did not submit the modal in time.', ephemeral: true });
        }
    }
}

const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');

const mongoose = require('mongoose');
const Configuration = mongoose.models.Configuration;
const Character = mongoose.models.Character;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('randomcharacter')
        .setDescription('Display a random registered character.'),
    async execute(interaction) {
        await interaction.deferReply()

        const AllCharacters = await Character.find({ GuildId: interaction.guild.id });
        
        if (AllCharacters.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | No Characters')
                .setDescription('There are no characters registered yet to pick from.')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

        const randomCharacter = AllCharacters[Math.floor(Math.random() * AllCharacters.length)];

        const Embed = new EmbedBuilder()
            .setTitle('Random Character')
            .setDescription(`The random character is: **${randomCharacter.name}**.`)
            .setColor('Green')
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();

        await interaction.editReply({ content: "", embeds: [Embed], components: [] });
    }
}

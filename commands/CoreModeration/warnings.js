const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

const Warning = mongoose.models.Warning;
const Configuration = mongoose.models.Configuration;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('View warnings for a user')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to view warnings for')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply()

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');

        const member = await interaction.guild.members.fetch(user.id);
        const config = await Configuration.findOne({ GuildId: interaction.guild.id });
        // Finding the warnings...


        const Data = await Warning.find({ GuildId: interaction.guild.id, userId: user.id });


        if (Data.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | No Warnings')
                .setDescription('This user has no warnings.')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

        console.log(Data)

        const Embed = new EmbedBuilder()
            .setTitle(`Warnings for ${user.tag}`)
            .setDescription(Data.map((w, i) => `**${i + 1}.** ${w.reason} - <@${w.moderatorId}> (${w.timestamp.toLocaleString()})`).join('\n'))
            .setColor('Blurple')
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();
        
        await interaction.editReply({ embeds: [Embed] });
    }
}

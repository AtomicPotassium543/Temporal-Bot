const { SlashCommandBuilder, EmbedBuilder, userMention } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');

const mongoose = require('mongoose');

const Configuration = mongoose.models.Configuration;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('infect')
        .setDescription('Infect a user.')
        .addUserOption(option => 
            option
                .setName("user")
                .setDescription("The user to infect.")
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply()

        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id);

        const config = await Configuration.findOne({ GuildId: interaction.guild.id });

        if (!interaction.member.roles.cache.has(config.StaffRoleID)) {
            await interaction.editReply({ content: "You are not allowed to use this command!" })
            return
        }

        if (member.roles.cache.has(config.InfectedRoleID)) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops! | Infected User!')
                .setDescription(`${userMention(user.id)} is already infected! Use \`/cure\` on them first in order to infect them!`)
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });

            return
        }

        await member.roles.add(config.InfectedRoleID);
        
        const Embed = new EmbedBuilder()
            .setTitle('✅ Success | Moderation Action')
            .setDescription(`${userMention(user.id)} has been infected!`)
            .setColor('Green')
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();

        await interaction.editReply({ embeds: [Embed] });
    }
}

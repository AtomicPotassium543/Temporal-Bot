const { SlashCommandBuilder, EmbedBuilder, roleMention, userMention } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');


const mongoose = require('mongoose');

const Configuration = mongoose.models.Configuration;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cure')
        .setDescription('Cure a user.')
        .addUserOption(option => 
            option
                .setName("user")
                .setDescription("The user to cure.")
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply()

        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id);

        const config = await Configuration.findOne({ GuildId: interaction.guild.id })

        if (interaction.member.roles.cache.has(config.InfectedRoleID)) {     
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops! | Infected user!')
                .setDescription("You are infected! You can't use this command.")
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            return
        }

        if (!member.roles.cache.has(config.InfectedRoleID)) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops! | Uninfected user!')
                .setDescription(`${userMention(user.id)} is already cured! Use \`/infect\` on them first in order to cure them!`)
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            
            return
        }

        await member.roles.remove(config.InfectedRoleID);

        const Embed = new EmbedBuilder()
            .setTitle('✅ Success | Moderation Action')
            .setDescription(`${userMention(user.id)} has been cured!`)
            .setColor('Green')
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();
        
        await interaction.editReply({ embeds: [Embed] });
    }
}

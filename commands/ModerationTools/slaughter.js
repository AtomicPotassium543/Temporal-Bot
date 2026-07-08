const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slaughter')
        .setDescription('Timeout a user for a certain duration.')
        .addUserOption(option => 
            option
                .setName("user")
                .setDescription("The user to send the message to.")
                .setRequired(true)
        )
        .addNumberOption(option =>
            option
                .setName("duration")
                .setDescription("The duration of the timeout in minutes.")
                .setRequired(true)
        ),
    
    async execute(interaction) {
        await interaction.deferReply()

        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id);

        const duration = interaction.options.getNumber('duration');

        const config = await Configuration.findOne({ GuildId: interaction.guild.id });

        if (!config) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Configuration Missing')
                .setDescription('The configuration for this guild hasn\'t been made! Please contact an administrator for more information.')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        if (!(0 < duration * 60 * 1000 < 28 * 24 * 60 * 60)) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Invalid duration')
                .setDescription('The duration needs to be inbetween 0 and 40320.')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] })
            return
        }

        if (!interaction.member.roles.cache.has(config.StaffRoleID)) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Permission Denied')
                .setDescription('You are not allowed to use this command!')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] })
            return
        }

        await member.timeout(duration * 60 * 1000);

        const UserEmbed = new EmbedBuilder()
            .setTitle('Time out from the Moderation Team')
            .setDescription(`You have been timed out for ${duration} minutes.`)
            .setColor('Blue')
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();
        
        try {
            await user.send({ embeds: [UserEmbed] });
        } catch (err) {
            console.log(err)
        }

        const Embed = new EmbedBuilder()
            .setTitle('✅ Success! | Time out')
            .setDescription(`User ${user.tag} has been timed out for ${duration} minutes.`)
            .setColor('Blue')
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();

        await interaction.editReply({ embeds: [Embed] });
    }
}

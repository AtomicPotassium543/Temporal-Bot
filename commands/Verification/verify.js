const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

const Configuration = mongoose.models.Configuration;

const words = [
    "apple", "banana", "rocket", "sunshine", "panda",
    "turtle", "rainbow", "cookie", "dragon", "cloud",
    "marble", "forest", "ocean", "castle", "wizard",
    "bubble", "star", "comet", "planet", "flower",
    "penguin", "koala", "dolphin", "tiger", "rabbit",
    "cactus", "pepper", "mango", "lemon", "waffle",
    "puzzle", "guitar", "piano", "camera", "adventure",
    "island", "volcano", "thunder", "breeze", "spark",
    "crystal", "shadow", "meadow", "river", "mountain",
    "sunset", "lantern", "button", "rocket", "treasure"
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verification Administration Commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Initialize a verification process for the server.')
        ),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'create') {
            
            if (interaction.user.id != interaction.guild.ownerId) {
                return interaction.editReply({ content: 'You do not have permission to use this command.', ephemeral: true });
            }
            
            const ConfigurationData = await Configuration.findOne({ GuildId: interaction.guild.id });

            console.log(ConfigurationData);

            const UnverifiedRole = interaction.guild.roles.cache.get(ConfigurationData.UnVerifiedRoleID);

            if (!UnverifiedRole) {
                await interaction.guild.roles.create({
                    name: 'Unverified',
                    color: 'Grey',
                    permissions: []
                });

                await Configuration.updateOne({ GuildId: interaction.guild.id }, { UnVerifiedRoleID: UnverifiedRole.id });
            }

            const VerifiedRole = interaction.guild.roles.cache.get(ConfigurationData.VerifiedRoleID);

            if (!VerifiedRole) {
                await interaction.guild.roles.create({
                    name: 'Verified',
                    color: 'Green',
                    permissions: []
                });

                await Configuration.updateOne({ GuildId: interaction.guild.id }, { VerifiedRoleID: VerifiedRole.id });
            }

            const VerificationChannel = interaction.guild.channels.cache.get(ConfigurationData.VerificationChannelID);

            if (!VerificationChannel) {
                await interaction.guild.channels.create({
                    name: 'verification',
                    type: ChannelType.GuildText,
                });

                await Configuration.updateOne({ guildId: interaction.guild.id }, { VerificationChannelID: VerificationChannel.id });
            }

            const Embed = new EmbedBuilder()
                .setTitle('🔁 Verification Method | Verification')
                .setDescription(`To verify your account, please select which method you would like to use.`)
                .setFields(
                    { name: "Method 1: OAuth2 Method", value: "This method will use the Roblox OAuth2 system to verify your account. This is the recommended method.", inline: false },
                    { name: "Method 2: Description Method", value: "This method will require you to set your account description to a certain list of words to verify your account.", inline: false }
                )
                .setColor('Yellow')
                .setFooter({ text: `Powered by ${interaction.client.user.username}` });
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('verify_oauth2')
                        .setLabel('OAuth2 Method')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('verify_description')
                        .setLabel('Description Method')
                        .setStyle(ButtonStyle.Secondary)
                );

            const Message = await VerificationChannel.send({ embeds: [Embed], components: [row] });

            await interaction.editReply({ content: `Verification process has been initialized in ${(VerificationChannel)}.` });
        }
    }
};
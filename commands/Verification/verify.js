const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, userMention, ButtonStyle } = require('discord.js');

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
        .setDescription('Link your roblox account with your discord account.'),
    async execute(interaction) {
        await interaction.deferReply();

        if (!interaction.client.VerificationData) {
            interaction.client.VerificationData = new Map();
        }

        const config = await Configuration.findOne({ GuildId: interaction.guild.id });

        const Embed = new EmbedBuilder()
            .setTitle('🔁 Process Started | Verification')
            .setDescription("This will continue in your DMs.")
            .setColor('Yellow')
            .setFooter({ text: `Powered by ${interaction.client.user.username}` });

        const DMEmbed = new EmbedBuilder()
            .setTitle('🔁 Verification Method | Verification')
            .setDescription(`To verify your account, please select which method you would like to use.`)
            .setFields(
                { name: "Method 1: OAuth2 Method", value: "This method will use the Roblox OAuth2 system to verify your account. This is the recommended method.", inline: false },
                { name: "Method 2: Description Method", value: "This method will require you to set your account description to a certain list of words to verify your account.", inline: false }
            )
            .setColor('Yellow')
            .setFooter({ text: `Powered by ${interaction.client.user.username}` });

        interaction.client.VerificationData.set(interaction.user.id, {
            "verificationCode": verificationCode,
            "guildId": interaction.guild.id
        });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('oauth2')
                    .setLabel('OAuth2 Method')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://apis.roblox.com/oauth/v1/authorize?client_id=${process.env.OAUTH_CLIENT_ID}&redirect_uri=${process.env.REDIRECT_URI}&scope=openid&response_type=code&nonce=12345&state=${interaction.user.id}`),
                new ButtonBuilder()
                    .setCustomId('description')
                    .setLabel('Description Method')
                    .setStyle(ButtonStyle.Primary)
            );

        const response = await interaction.user.send({ embeds: [DMEmbed], components: [row] });

        const collector = response.createMessageComponentCollector({
            filter: (i) => i.user.id === interaction.user.id,
            time: 120000
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'description') {

                const verificationCode = words[Math.floor(Math.random() * words.length)];

                const descriptionEmbed = new EmbedBuilder()
                    .setTitle('🔁 Description Method | Verification')
                    .setDescription('Please set your Roblox account description to the following text to verify your account.')
                    .setFields({
                        name: "Verification Code", value: verificationCode, inline: false
                    })
                    .setColor('Yellow')
                    .setFooter({ text: `Powered by ${interaction.client.user.username}` });

                const verificationRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('verify')
                            .setLabel('Verify')
                            .setEmoji("✅")
                            .setStyle(ButtonStyle.Green)
                    );

                const VerificationResponse = await interaction.user.send({ embeds: [descriptionEmbed], components: [verificationRow] });

                const VerificationCollector = VerificationResponse.createMessageComponentCollector({
                    filter: (i) => i.user.id === interaction.user.id,
                    time: 300000
                });

                VerificationCollector.on('collect', async (i) => {
                    if (i.customId === 'verify') {
                        const verificationData = interaction.client.VerificationData.get(interaction.user.id);
                    }

                });

                await interaction.editReply({ embeds: [Embed] });
            }
        })
    }
};
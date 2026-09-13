

const { default: axios } = require('axios');
const { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder } = require('discord.js');
const mongoose = require('mongoose');
const { express } = require('express');
const cron = require('node-cron');

const VerificationCode = process.env.VERIFICATION_AUTHORIZATION_CODE;

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
    /**
     * @param {client} Client - The Discord client instance.  
     * @returns {Promise<void>}
     * @throws {Error} If there is an error.
     */

    initialize: async function (client) {

        const Configuration = mongoose.models.Configuration;
        const Verification = mongoose.models.Verification;
        const OAuth2Verification = mongoose.models.OAuth2Verification;

        client.VerificationData = new Map();

        client.on(Events.GuildMemberAdd, async (member) => {
            try {
                const Config = await Configuration.findOne({ guildId: member.guild.id });

                if (!Config) {
                    return
                }

                const UnverifiedRole = member.guild.roles.cache.get(Config.UnVerifiedRoleID);

                if (!UnverifiedRole) {
                    return
                }

                await member.roles.add(UnverifiedRole);

                const VerificationData = await Verification.findOne({ GuildId: member.guild.id, DiscordId: member.id });

                if (VerificationData) {
                    const VerifiedRole = member.guild.roles.cache.get(Config.VerifiedRoleID);
                    
                    if (!VerifiedRole) {
                        return
                    }

                    const RobloxId = VerificationData.RobloxId;
                    const response = await axios.get(`https://users.roblox.com/v1/users/${RobloxId}`);

                    const username = response.data.name;

                    await member.edit({ nick: username });
                    await member.roles.add(VerifiedRole);
                }
            } catch (error) {
                console.error('Error fetching configuration:', error);
            }
        });

        client.on(Events.InteractionCreate, async (interaction) => {

            if (interaction.isButton()) {

                // Verification starting point using roblox's description method
                if (interaction.customId === 'verify_description') {
                    const Config = await Configuration.findOne({ GuildId: interaction.guild.id });

                    await interaction.deferReply({ ephemeral: true });

                    const Embed = new EmbedBuilder()
                        .setDescription("This will continue in your DMs...")

                    await interaction.editReply({ embeds: [Embed] });

                    const RobloxEmbed = new EmbedBuilder()
                        .setTitle('🔁 Description Method | Verification')
                        .setDescription('Please add your Roblox Username below:')
                        .setColor('Yellow')
                        .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                        .setTimestamp();

                    const Row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('submit_username')
                                .setLabel('Submit Username')
                                .setStyle(ButtonStyle.Primary)
                        );

                    const Message = await interaction.user.send({ embeds: [RobloxEmbed], components: [Row] });

                    try {
                        const ButtonInteraction = await Message.awaitMessageComponent({ filter: i => i.customId === 'submit_username' && i.user.id === interaction.user.id, time: 60000 })

                        const Modal = new ModalBuilder()
                            .setCustomId('username_modal')
                            .setTitle('Roblox Username')
                            .addComponents(
                                new TextInputBuilder()
                                    .setCustomId('username')
                                    .setLabel('Username')
                                    .setStyle('Short')
                                    .setPlaceholder('JohnDoe123')
                                    .setRequired(true)
                            );;


                        await ButtonInteraction.showModal(Modal);

                        try {
                            const response = await ButtonInteraction.awaitModalSubmit({ filter: i => i.customId === 'username_modal' && i.user.id === interaction.user.id, time: 60000 })

                            const username = response.fields.getTextInputValue('username');

                            const RequestResponse = await axios.post("https://users.roblox.com/v1/usernames/users", {
                                usernames: [username],
                                excludeBannedUsers: true
                            });

                            const userData = RequestResponse.data;

                            if (userData.data && userData.data.length > 0) {

                                const userId = userData.data[0].id;


                                const verificationCode = words[Math.floor(Math.random() * words.length)];


                                const descriptionEmbed = new EmbedBuilder()

                                    .setTitle('🔁 Description Method | Verification')

                                    .setDescription('Please set your Roblox account description to the following text to verify your account.')

                                    .setFields({

                                        name: "Verification Code", value: verificationCode, inline: false

                                    })

                                    .setColor('Yellow')

                                    .setFooter({ text: `Powered by ${interaction.client.user.username}` });


                                const row = new ActionRowBuilder()

                                    .addComponents(

                                        new ButtonBuilder()

                                            .setCustomId('verify_description_submit')

                                            .setLabel('I have set my description')

                                            .setStyle(ButtonStyle.Primary)

                                    );


                                client.VerificationData.set(interaction.user.id, {

                                    robloxId: userId,

                                    verificationCode: verificationCode,

                                    guildId: interaction.guild.id

                                });


                                let ButtonInteraction = await interaction.user.send({ embeds: [descriptionEmbed], components: [row] });

                                await ButtonInteraction.awaitMessageComponent({ filter: i => i.customId === 'verify_description_submit' && i.user.id === interaction.user.id, time: 60000 });

                                let response = await axios.get(`https://users.roblox.com/v1/users/${userId}`);

                                const description = response.data.description;

                                if (description === verificationCode) {

                                    await Verification.findOneAndUpdate({

                                            GuildId: interaction.guild.id,

                                            DiscordId: interaction.user.id

                                        },
                                        {

                                            RobloxId: userId

                                        },
                                        {
                                            upsert: true
                                        }
                                    )


                                    const VerifiedRole = interaction.guild.roles.cache.get(Config.VerifiedRoleID);

                                    const UnverifiedRole = interaction.guild.roles.cache.get(Config.UnVerifiedRoleID);

                                    const member = await interaction.guild.members.fetch(interaction.user.id);

                                    await member.roles.add(VerifiedRole);

                                    await member.roles.remove(UnverifiedRole);

                                    await interaction.user.edit({ nick: username });

                                    client.VerificationData.delete(interaction.user.id);

                                    const successEmbed = new EmbedBuilder()
                                        .setTitle('✅ Success | Verification')
                                        .setDescription('You have successfully verified your Roblox account!')
                                        .setColor('Green')
                                        .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                                        .setTimestamp();

                                    await interaction.user.send({ embeds: [successEmbed] });

                                }

                            } else {

                                const errorEmbed = new EmbedBuilder()
                                    .setTitle('❌ Error | User Not Found')
                                    .setDescription('The Roblox user you entered does not exist. Please try again.')
                                    .setColor('Red')
                                    .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                                    .setTimestamp();

                                await interaction.user.send({ embeds: [errorEmbed] });

                            }
                        } catch (err) {
                            console.error('Error awaiting modal submit:', err);
                            await interaction.user.send('You did not submit the modal in time. Please try again.');
                            return
                        }
                    } catch (error) {
                        console.error('Error awaiting message component:', error);
                        await interaction.user.send('You did not respond in time. Please try again.');
                    }
                }

                // Verification starting point using roblox's oauth2 method
                if (interaction.customId === 'verify_oauth2') {
                    await interaction.deferReply({ ephemeral: true });

                    const Config = await Configuration.findOne({ GuildId: interaction.guild.id });

                    const result = await OAuth2Verification.insertOne({
                        GuildId: interaction.guild.id,
                        DiscordId: interaction.user.id,
                        WebVerified: false
                    });

                    const DMEmbed = new EmbedBuilder()
                        .setTitle('🔁 OAuth2 Method | Verification')
                        .setDescription('Please click the link below in order to verify your Roblox account using OAuth2.')
                        .setFields({
                            name: "⚠ DISCLAIMER", value: "DO NOT SHARE THIS LINK WITH ANYONE. Sharing this link to anyone may cause your account to be linked to their roblox account.", inline: false
                        })
                        .setColor('Yellow')
                        .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                        .setTimestamp();

                    const redirectUri = `${process.env.REDIRECT_URI}/authorization/callback`;

                    const authUrl =
                        `https://apis.roblox.com/oauth/v1/authorize` +
                        `?client_id=${process.env.OAUTH_CLIENT_ID}` +
                        `&response_type=code` +
                        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                        `&scope=openid`;

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setLabel('Verify with OAuth2')
                                .setStyle(ButtonStyle.Link)
                                .setURL(authUrl)
                        );

                    await interaction.user.send({ embeds: [DMEmbed], components: [row] });

                    const Embed = new EmbedBuilder()
                        .setDescription("This will continue in your DMs...")

                    await interaction.editReply({ embeds: [Embed] });
                }
            };
        });

        async function CheckVerified() {
            const VerifiedUsers = await OAuth2Verification.find({ WebVerified: true });

            VerifiedUsers.forEach(async (VerifiedUser) => {

                await OAuth2Verification.findOneAndDelete({ _id: VerifiedUser._id });

                const ConfigurationData = Configuration.findOne({ GuildId: VerifiedUser.GuildId });

                const Guild = await client.guilds.fetch(VerifiedUser.GuildId);
                const Member = await Guild.members.fetch(VerifiedUser.DiscordId);

                if (Member && ConfigurationData && Guild) {

                    const VerifiedRole = await Guild.roles.cache.get(ConfigurationData.VerifiedRoleID);
                    const UnVerifiedRole = await Guild.roles.cache.get(ConfigurationData.UnVerifiedRoleID)

                    if (VerifiedRole && UnVerifiedRole) {

                        let userData = await axios.get(`https://users.roblox.com/v1/users/${userId}`);

                        if (userData.data && userData.data.name) {
                            const username = userData.data.name;

                            await Member.edit({ nick: username });

                            await Member.roles.remove(UnVerifiedRole);
                            await Member.roles.add(VerifiedRole);

                            const successEmbed = new EmbedBuilder()
                                .setTitle('✅ Success | Verification')
                                .setDescription('You have successfully verified your Roblox account!')
                                .setColor('Green')
                                .setFooter({ text: `Powered by ${client.user.username}` })
                                .setTimestamp();

                            await User.send({ embeds: [successEmbed] });
                        }
                    }
                }
            })
        }

        const task = cron.schedule('* * * * *', async () => {
            await CheckVerified();
        }, {
            name: "Manages verified users.",
            description: "Verifies users who have completed the OAuth2 verification process and updates their roles accordingly.",
            timezone: "Etc/UTC"
        });

    }
}
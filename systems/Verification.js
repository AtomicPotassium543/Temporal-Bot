

const { default: axios } = require('axios');
const { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder } = require('discord.js');
const mongoose = require('mongoose');
const { express } = require('express');
const cron = require('node-cron');
const base64url = require('base64url')

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

function generateVerificationCode(length) {
    let code = '';
    for (let i = 0; i < length; i++) {
        code += words[Math.floor(Math.random() * words.length)] + ' ';
    }
    return code.trim();
}

module.exports = {
    /**
     * @param {client} Client - The Discord client instance.  
     * @returns {Promise<void>}
     * @throws {Error} If there is an error.
     */

    initialize: async function (client) {

        const Configuration = mongoose.models.Configuration;
        const Verification = mongoose.models.Verification;

        const processVerification = async (doc) => {
            try {
                const guild = await client.guilds.fetch(doc.GuildId);
                const config = await Configuration.findOne({ GuildId: doc.GuildId });
                const verifiedRole = await guild.roles.fetch(config.VerifiedRoleID);
                const unverifiedRole = await guild.roles.fetch(config.UnVerifiedRoleID);
                const member = await guild.members.fetch(doc.DiscordId);
                const robloxData = await axios.get(`https://users.roblox.com/v1/users/${doc.RobloxId}`);

                if (robloxData.data && robloxData.data.name) {

                    try {
                        await member.roles.add(verifiedRole);
                    } catch (error) {
                        console.log(error)
                    }

                    try {
                        await member.roles.remove(unverifiedRole);
                    } catch (error) {
                        console.log(error)
                    }
                    
                    try {
                        await member.edit({ nick: `${member.displayName} ${robloxData.data.name}` >= 32 ? `${member.displayName} ${robloxData.data.name}`.slice(0, 29) + "..." : `${member.displayName} ${robloxData.data.name}` });
                    } catch (error) {
                        console.log(error)
                    }

                    const successEmbed = new EmbedBuilder()
                        .setTitle('✅ Success | Verification')
                        .setDescription('You have successfully verified your Roblox account!')
                        .setColor('Green')
                        .setFooter({ text: `Powered by ${client.user.username}` })
                        .setTimestamp();

                    await member.send({ embeds: [successEmbed] });
                    return true;
                }
            } catch (error) {
                console.error('Error processing verification:', error);
            }

            return false;
        };

        cron.schedule('*/10 * * * * *', async () => {
            const pendingVerifications = await Verification.find({ Verified: false });

            for (const verification of pendingVerifications) {
                const processed = await processVerification(verification);

                if (processed) {
                    await Verification.updateOne(
                        { _id: verification._id, Verified: false },
                        { $set: { Verified: true } }
                    );
                }
            }
        }, { noOverlap: true });


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
                        const ButtonInteraction = await Message.awaitMessageComponent({ filter: i => i.customId === 'submit_username' && i.user.id === interaction.user.id, time: 180000 })

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
                            const modalResponse = await ButtonInteraction.awaitModalSubmit({ filter: i => i.customId === 'username_modal' && i.user.id === interaction.user.id, time: 60000 })

                            const username = modalResponse.fields.getTextInputValue('username');

                            const RequestResponse = await axios.post("https://users.roblox.com/v1/usernames/users", {
                                usernames: [username],
                                excludeBannedUsers: true
                            });

                            const userData = RequestResponse.data;

                            if (userData.data && userData.data.length > 0) {

                                const userId = userData.data[0].id;

                                const verificationCode = generateVerificationCode(5);

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

                                const verificationMessage = await modalResponse.reply({ embeds: [descriptionEmbed], components: [row], fetchReply: true });

                                const descriptionSetInteraction = await verificationMessage.awaitMessageComponent({ filter: i => i.customId === 'verify_description_submit' && i.user.id === interaction.user.id, time: 300000 });

                                const robloxResponse = await axios.get(`https://users.roblox.com/v1/users/${userId}`);

                                const description = robloxResponse.data.description;

                                if (description === verificationCode) {

                                    const res = await Verification.findOneAndUpdate(
                                        {
                                            GuildId: interaction.guild.id,
                                            DiscordId: interaction.user.id,
                                            Verified: false
                                        },
                                        {
                                            RobloxId: userId
                                        },
                                        {
                                            upsert: true,
                                            new: true
                                        }
                                    )

                                    // Pending verification processing to ensure roles and nickname are updated
                                    const Embed = new EmbedBuilder()
                                        .setTitle("🔁 Verification Pending | Verification")
                                        .setDescription("Your verification is pending. Please wait while we process your verification.")
                                        .setColor('Yellow')
                                        .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                                        .setTimestamp();

                                    await descriptionSetInteraction.reply({ embeds: [Embed] })

                                }

                            } else {

                                const errorEmbed = new EmbedBuilder()
                                    .setTitle('❌ Error | User Not Found')
                                    .setDescription('The Roblox user you entered does not exist. Please try again.')
                                    .setColor('Red')
                                    .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                                    .setTimestamp();

                                await modalResponse.reply({ content: "", embeds: [errorEmbed], components: [] });

                            }
                        } catch (err) {
                            console.error('Error awaiting modal submit:', err);
                            await ButtonInteraction.editReply({ content: 'You did not submit the modal in time. Please try again.', embeds: [], components: [] });
                            return
                        }
                    } catch (error) {
                        console.error('Error awaiting message component:', error);
                        await interaction.user.send({ content: 'You did not respond in time. Please try again.', embeds: [], components: [] });
                    }
                }

                // Verification starting point using roblox's oauth2 method
                if (interaction.customId === 'verify_oauth2') {
                    await interaction.deferReply({ ephemeral: true });

                    const DMEmbed = new EmbedBuilder()
                        .setTitle('🔁 OAuth2 Method | Verification')
                        .setDescription('Please click the link below in order to verify your Roblox account using OAuth2.')
                        .setFields({
                            name: "⚠ DISCLAIMER", value: "DO NOT SHARE THIS LINK WITH ANYONE. Sharing this link to anyone may cause your account to be linked to their roblox account.", inline: false
                        })
                        .setColor('Yellow')
                        .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                        .setTimestamp();

                    const redirectUri = `${process.env.REDIRECT_URI}/auth/roblox/callback`;

                    const state = {
                        "stage": "verification",
                        "GuildId": interaction.guild.id,
                        "DiscordId": interaction.user.id,
                    }

                    const authUrl =
                        `https://apis.roblox.com/oauth/v1/authorize` +
                        `?client_id=${process.env.OAUTH_CLIENT_ID}` +
                        `&response_type=code` +
                        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                        `&scope=openid%20profile` +
                        `&state=${base64url.encode(JSON.stringify(state))}`;

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



    }
}
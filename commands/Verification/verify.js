const { SlashCommandBuilder, AttachmentBuilder, ComponentType, PermissionFlagsBits, userMention, StringSelectMenuBuilder, EmbedBuilder, ChannelType, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, DiscordjsRangeError } = require('discord.js');

const axios = require('axios');

const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const { error } = require('node:console');

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
    "BackupDeleteInterval": Number,
    "GroupId": String
});

const Configuration = mongoose.models.Configuration || mongoose.model('Configuration', ConfigurationSchema);

const VerificationSchema = new mongoose.Schema({
    "GuildId": String,
    "RobloxId": String,
    "DiscordId": String
});

const Verification = mongoose.models.Verification || mongoose.model('Verification', VerificationSchema);

const AuthClientId = process.env.AUTH_CLIENT_ID;
const AuthClientSecret = process.env.AUTH_CLIENT_SECRET;

const words = [
    "apple", "banana", "orange", "grape", "melon", "peach", "pear", "plum", "cherry", "mango",
    "kiwi", "lemon", "lime", "coconut", "pineapple", "strawberry", "blueberry", "raspberry", "blackberry", "watermelon",
    "dog", "cat", "bird", "fish", "horse", "tiger", "lion", "bear", "wolf", "fox",
    "rabbit", "mouse", "deer", "zebra", "giraffe", "elephant", "monkey", "panda", "kangaroo", "otter",
    "red", "blue", "green", "yellow", "purple", "orange", "pink", "brown", "black", "white",
    "silver", "gold", "gray", "cyan", "magenta", "violet", "indigo", "turquoise", "beige", "maroon",
    "table", "chair", "desk", "window", "door", "floor", "ceiling", "lamp", "couch", "shelf",
    "computer", "keyboard", "mousepad", "monitor", "printer", "speaker", "camera", "phone", "tablet", "charger",
    "river", "mountain", "forest", "desert", "ocean", "island", "beach", "valley", "waterfall", "volcano",
    "cloud", "rain", "storm", "snow", "wind", "thunder", "lightning", "sunshine", "fog", "rainbow",
    "happy", "sad", "angry", "excited", "calm", "brave", "kind", "smart", "strong", "gentle",
    "fast", "slow", "quiet", "loud", "bright", "dark", "warm", "cold", "young", "old",
    "book", "paper", "pencil", "eraser", "notebook", "marker", "folder", "backpack", "scissors", "glue",
    "music", "movie", "game", "story", "poem", "song", "dance", "painting", "drawing", "theater",
    "coffee", "tea", "juice", "milk", "bread", "cheese", "butter", "rice", "pasta", "pizza"
]

Array.prototype.random = function(count) {
  if (!count) return this[Math.floor(Math.random() * this.length)];
  
  const shuffled = [...this].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Connect your roblox account with your discord account.'),
    /**
    * @param {ChatInputCommandInteraction} interaction
    */
    async execute(interaction) {

        await interaction.deferReply({ ephemeral: true });

        const VerificationEmbed = new EmbedBuilder()
            .setTitle("🔐 Verification Process")
            .setDescription("Please select the way you would like to verify!")
            .setColor("Blurple")
            .setFooter({ text: `Powered by ${interaction.client.user.username}` })
            .setTimestamp();

        const OAuth2 = new ButtonBuilder()
            .setLabel("OAuth2 (Recommended)")
            .setEmoji("🔗")
            .setCustomId("oauth2")
            .setStyle(ButtonStyle.Primary);

        const Cookie = new ButtonBuilder()
            .setLabel("Description Method")
            .setEmoji("🍪")
            .setCustomId("description")
            .setStyle(ButtonStyle.Secondary);

        const VerificationView = new ActionRowBuilder()
            .addComponents(OAuth2, Cookie)

        let message = await interaction.user.send({
            embeds: [VerificationEmbed],
            components: [VerificationView]
        })

        const embed = new EmbedBuilder()
            .setTitle("🔁 Verification | Process Started!")
            .setDescription("Please check your DM for more information!")
            .setColor("Blurple")
            .setFooter({ text: `Powered by ${interaction.client.user.username}` })
            .setTimestamp();

        await interaction.editReply({
            embeds: [embed]
        })

        const filter = (i) => i.user.id === interaction.user.id;

        try {
            const buttonInteraction = await message.awaitMessageComponent({
                filter,
                componentType: ComponentType.Button,
                time: 60000
            })            

            buttonInteraction.deferUpdate();

            if (buttonInteraction.customId === "oauth2") {
            
                // Do OAuth2 verification process here
            }

            if (buttonInteraction.customId === "description") {
                // Do Description verification process here
                
                

                const modal = new ModalBuilder()
                    .setCustomId('descriptionModal')
                    .setTitle('Description Verification')
                    .addComponents(
                        new TextInputBuilder()
                            .setCustomId('robloxUsername')
                            .setLabel("Enter your Roblox username")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    );
                
                await buttonInteraction.showModal(modal);

                const modalInteraction = await buttonInteraction.awaitModalSubmit({
                    filter,
                    time: 60000
                });

                const robloxUsername = modalInteraction.fields.getTextInputValue('robloxUsername');

                // Fetching user ID

                let response = await axios.post(`https://www.roblox.com/users/profile?username=${robloxUsername}`, {
                    "usernames": ["UsernameHere"],
                    "excludeBannedUsers": true
                });

                if (response.status !== 200) {
                    const errorEmbed = new EmbedBuilder()
                        .setTitle("❌ Verification | Error")
                        .setDescription("There was an error fetching your Roblox user ID. Please make sure the username is correct and try again.")
                        .setColor("Red")
                        .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                        .setTimestamp();
                }

                const userId = response.data[0].id;

                const randomSentence = words.random(5).join(" ");

                interaction.client.verificationCache.set(userId, randomSentence);

                const DescriptionEmbed = new EmbedBuilder()
                    .setTitle("🔐 Verification Process | Description Method")
                    .setDescription(`Please put the following sentence in your roblox bio, then press the button below:\n\n\`\`\`${randomSentence}\`\`\``)
                    .setColor("Blurple")
                    .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                    .setTimestamp();

                const VerifyButton = new ButtonBuilder()
                    .setLabel("Verify")
                    .setEmoji("✅")
                    .setCustomId("verify_description")
                    .setStyle(ButtonStyle.Success);

                message = await buttonInteraction.send({ embeds: [DescriptionEmbed], components: [new ActionRowBuilder().addComponents(VerifyButton)] });
            
                try {
                    buttonInteraction = await message.awaitMessageComponent({
                        filter,
                        componentType: ComponentType.Button,
                        time: 60000
                    })

                    await buttonInteraction.deferUpdate();

                    let response = await axios.get(`https://users.roblox.com/v1/users/${userId}`)

                    const description = response.data.description;

                    // Check if the description contains the random sentence

                    if (description === randomSentence) {
                        const successEmbed = new EmbedBuilder()
                            .setTitle("✅ Verification | Success")
                            .setDescription("You have successfully verified your Roblox account with your Discord account! Use `/update` to get your roles and nickname updated.")
                            .setColor("Green")
                            .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                            .setTimestamp();

                        await verification.findOneAndUpdate(
                            { GuildId: interaction.guild.id, RobloxId: userId },
                            { GuildId: interaction.guild.id, RobloxId: userId, DiscordId: interaction.user.id },
                            { upsert: true }
                        );

                        await buttonInteraction.editReply({ embeds: [successEmbed], components: [] });
                    }

                } catch (error) {
                    console.log(error)
                }
                
            
            }
        }
        catch (error) {
            console.error(error);
        }

    }
};
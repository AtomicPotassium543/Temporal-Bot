const { Client, Events, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
    /**
     * @param {Client} Client - The Discord client instance.  
     * @returns {Promise<void>}
     * @throws {Error} If there is an error.
     */

    initialize: async function (client) {
        
        const Configuration = mongoose.models.Configuration

        client.on(Events.MessageCreate, async (message) => {
            
            const ConfigurationData = await Configuration.findOne({ GuildId: message.guildId })
            
            if (!ConfigurationData) {
                return
            }

            if (!ConfigurationData.StarChannelIDs) {
                return
            }

            const StarChannelIDs = ConfigurationData.StarChannelIDs.split(",") || []

            for (const StarChannelID of StarChannelIDs) {

                if (StarChannelID === message.channelId) {
                    
                    const reactions = message.reactions
                    const StarReactions = reactions.cache.get("⭐")

                    if (!StarReactions) {
                        try {
                            await message.react("⭐");
                        } catch (err) {
                            console.log(err)
                        }
                    }

                }
            }
        })

        client.on(Events.MessageReactionAdd, async (reaction, user) => {
            
            const ConfigurationData = await Configuration.findOne({ GuildId: reaction.message.guildId })
            
            if (!ConfigurationData) {
                return
            }

            if (reaction.emoji.name !== "⭐") {
                return
            }

            const TrophyReactions = reaction.message.reactions.cache.get("🏆")

            if (TrophyReactions) {
                const trophyUsers = await TrophyReactions.users.fetch()

                if (trophyUsers.has(client.user.id)) {
                    return
                }
            }

            const StarChannelIDs = ConfigurationData.StarChannelIDs.split(",") || []

            for (const StarChannelID of StarChannelIDs) {
                const StarChannel = await reaction.message.guild.channels.fetch(StarChannelID)
                if (StarChannel) {
                    const reactions = reaction.message.reactions
                    const StarReactions = reactions.cache.get("⭐")

                    let IgnoreAmount = 1

                    if (StarReactions) {
                        const users = await StarReactions.users.fetch();
                        
                        users.forEach((user) => {
                            if (user.id === reaction.message.author.id) {
                                IgnoreAmount = 2
                            }
                        })
                    };

                    const RequiredReactions = ConfigurationData.ReactionRequirement;

                    // Checking if a message is eligible for feature

                    if (StarReactions && StarReactions.count - IgnoreAmount >= RequiredReactions) {
                        try {
                            const member = await reaction.message.guild.members.fetch(reaction.message.author.id)

                            if (!member) {
                                return
                            }

                            const FeaturedChannel = await reaction.message.guild.channels.fetch(ConfigurationData.FeaturedChannelID);
                            
                            // Add Award emoji
                            await reaction.message.react("🏆")

                            console.log(ConfigurationData.FeaturedRoleID)

                            await member.roles.add(ConfigurationData.FeaturedRoleID);
                            
                            if (FeaturedChannel) {
                                try {
                                    const FeaturedEmbed = new EmbedBuilder()
                                        .setAuthor({
                                            "name": reaction.message.author.username,
                                            "iconURL": reaction.message.author.displayAvatarURL()
                                        })
                                        .setDescription(`### **[Featured Post](${reaction.message.url})**\n\n${reaction.message.content || ""}`)
                                        .setImage(reaction.message.attachments.first()?.url || null)
                                        .setColor('Gold')
                                        .setFooter({ text: `Powered by ${reaction.message.client.user.username}`})  
                                        .setTimestamp();

                                    await FeaturedChannel.send({
                                        embeds: [FeaturedEmbed]
                                    })
                                } catch (err) {
                                    console.log(err)
                                }
                            }
                        } catch (err) {
                            console.log(err)
                        }
                    }
                }
            }
        })
    }
}
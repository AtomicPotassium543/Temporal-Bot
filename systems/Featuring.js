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

            const StarChannelIDs = ConfigurationData.StarChannelIDs.split(",") || []

            for (const StarChannelID of StarChannelIDs) {
                console.log("StarChannelID: ", StarChannelID, "reaction.message.channelId: ", reaction.message.channelId)
                const StarChannel = await reaction.message.guild.channels.fetch(StarChannelID)
                if (StarChannel) {
                    const reactions = reaction.message.reactions
                    const StarReactions = reactions.cache.get("⭐")

                    console.log(`StarReactions: ${StarReactions ? StarReactions.count : 0}`)

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

                    const TrophyReactions = reactions.cache.get("🏆")

                    const Trophyed = false

                    if (TrophyReactions) {
                        TrophyReactions.users.fetch().then((user) => {
                            if (client.id === reaction.message.author.id) {
                                Trophyed = true
                            }
                        })
                    }

                    if (StarReactions && !Trophyed && StarReactions.count - IgnoreAmount >= RequiredReactions) {
                        try {
                            const member = await reaction.message.guild.members.fetch(user.id)

                            const FeaturedChannel = await reaction.message.guild.channels.fetch(ConfigurationData.FeaturedChannelID);
                            const FeaturedRole = await reaction.message.guild.roles.fetch(ConfigurationData.FeaturedRoleID);

                            // Add Award emoji
                            await reaction.message.react("🏆")
                            
                            if (FeaturedRole) {
                                try {
                                    await member.roles.add(FeaturedRole)
                                } catch (err) {
                                    console.log(err)
                                }
                            }

                            if (FeaturedChannel) {
                                try {
                                    
                                    const FeaturedEmbed = new EmbedBuilder()
                                        .setAuthor({
                                            "name": reaction.message.author.username,
                                            "iconURL": reaction.message.author.displayAvatarURL()
                                        })
                                        .setDescription(`### **[Featured Post](${reaction.message.url})**\n\n${reaction.message.content || null}`)
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
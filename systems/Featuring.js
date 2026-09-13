const { Client, Events } = require('discord.js');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { execute } = require('../commands/Configuration/configure');

module.exports = {
    /**
     * @param {client} Client - The Discord client instance.  
     * @returns {Promise<void>}
     * @throws {Error} If there is an error connecting to the database.
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
                const StarChannel = await message.guild.channels.fetch(StarChannelID)

                if (StarChannel) {
                    
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
            
            const ConfigurationData = await Configuration.findOne({ GuildId: user.guildId })
            const channel = reaction.message.channel
            
            if (!ConfigurationData) {
                return
            }

            const StarChannelIDs = ConfigurationData.StarChannelIDs.split(",") || []

            for (const StarChannelID of StarChannelIDs) {
                const StarChannel = await message.guild.channels.fetch(StarChannelID)

                if (StarChannel) {
                    
                    const reactions = message.reactions
                    const StarReactions = reactions.cache.get("⭐")

                    let IgnoreAmount = 1

                    if (StarReactions) {
                        const users = StarReactions.users.fetch();

                        users.forEach((user) => {
                            if (user.id === reaction.message.author.id) {
                                IgnoreAmount = 2
                            }
                        })
                    };

                    const RequiredReactions = ConfigurationData.ReactionRequirement;

                    // Checking if a message is eligible for feature
                    if (StarReactions && StarReactions.count - IgnoreAmount > RequiredReactions) {
                        try {
                            const member = await user.guild.members.cache.fetch(user.id)

                            const FeaturedChannel = await user.guild.channels.fetch(ConfigurationData.FeaturedChannelID);
                            const FeaturedRole = await user.guild.roles.fetch(ConfigurationData.FeaturedRoleID);

                            if (FeaturedChannel && FeaturedRole) {
                                try {

                                    await member.roles.add(FeaturedRole)

                                    await FeaturedChannel.send({
                                        content: reaction.message.content,
                                        attachments: reaction.message.attachments
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
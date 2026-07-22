const { ChannelType, Client, Events, EmbedBuilder, userMention, roleMention, channelMention } = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
    /**
     * @param {client} Client - The Discord client instance.  
     * @returns {Promise<void>}
     * @throws {Error} 
     */
    initialize: async function (client) {

        client.on(Events.MessageCreate, async (message) => {

            console.log("reached 1")

            const Configuration = await mongoose.models.Configuration.findOne({ GuildId: message.guild.id });
            if (!Configuration) {
                return
            }

            console.log("reached 2")
            console.log(Configuration.BlacklistedWords)

            if (!Configuration.BlacklistedWords) {
                return
            }

            console.log("Reached 3")
        
            const blacklist = Configuration.BlacklistedWords.split(",") || []

            let Deleteable = false

            console.log("Reached 4")

            for (const word of blacklist) {
                const lowerCased = word.toLowerCase()
                if (message.content.toLowerCase().includes(lowerCased)) {
                    Deleteable = true
                }
            }

            if (Deleteable) {
                console.log("Reached here!")
                await message.delete({ reason: "Contains blacklisted word." })

                const LogEmbed = new EmbedBuilder()
                    .setTitle("🚨 Alert | Blacklist Violated!")
                    .setFields(
                        { name: "User", value: `${userMention(message.author.id)} - ${message.author.id}`, inline: true },
                        { name: "Channel", value: `${channelMention(message.channel.id)} - ${message.channel.id}`, inline: true },
                        { name: "Message", value: `\`\`\`${message.content}\`\`\``, inline: false }
                    )
                    .setColor("Red")
                    .setFooter({ text: `Powered by ${message.client.user.username}.` })
                    .setTimestamp();

                try {
                    const LogChannel = await message.client.channels.fetch(Configuration.LogsChannelID);

                    if (LogChannel) {
                        await LogChannel.send({ embeds: [LogEmbed] })
                    }
                } catch (err) {
                    console.log(err)
                }
            }
        })

        client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {

            console.log("reached editing")

            const Configuration = await mongoose.models.Configuration.findOne({ GuildId: oldMessage.guild.id });
            if (!Configuration) {
                return
            }

            if (!Configuration.BlacklistedWords) {
                return
            }
        
            const blacklist = Configuration.BlacklistedWords.split(" ") || []

            let Deleteable = false

            for (const word of blacklist) {
                const lowerCased = word.toLowerCase()
                if (newMessage.content.toLowerCase().includes(lowerCased)) {
                    Deleteable = true
                }
            }

            if (Deleteable) {
                await newMessage.delete({ reason: "Contains blacklisted word." })

                const LogEmbed = new EmbedBuilder()
                    .setTitle("🚨 Alert | Blacklist Violated!")
                    .setFields(
                        { name: "User", value: `${userMention(newMessage.author.id)} - ${newMessage.author.id}`, inline: true },
                        { name: "Channel", value: `${channelMention(newMessage.channel.id)} - ${newMessage.channel.id}`, inline: true },
                        { name: "Old Message", value: `\`\`\`${oldMessage.content}\`\`\``, inline: false },
                        { name: "New Message", value: `\`\`\`${newMessage.content}\`\`\``, inline: false }
                    )
                    .setFooter({ text: `Powered by ${newMessage.client.user.username}.` })
                    .setColor("Red")
                    .setTimestamp();

                try {
                    const LogChannel = await newMessage.client.channels.fetch(Configuration.LogsChannelID);

                    if (LogChannel) {
                        await LogChannel.send({ embeds: [LogEmbed] })
                    }
                } catch (err) {
                    console.log(err)
                }
            }
        })
    }
}
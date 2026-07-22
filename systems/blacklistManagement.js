const { ChannelType, Client, Events, EmbedBuilder, userMention } = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
    /**
     * @param {client} Client - The Discord client instance.  
     * @returns {Promise<void>}
     * @throws {Error} If there is an error connecting to the database.
     */
    initialize: async function (client) {

        const Configuration = await mongoose.models.Configuration.findOne({ GuildId: guild.id });
        if (!Configuration) {
            continue
        }

        const blacklist = Configuration.blacklist.split(" ") || []

        client.on(Events.MessageCreate, (message) => {

            let Deleteable = false

            for (const word of blacklist) {
                if (message.content.includes(word)) {
                    Deleteable = true
                }
            }

            if (Deleteable) {
                await message.delete({ reason: "Contains blacklisted word." })

                const LogEmbed = new EmbedBuilder()
                    .setTitle("🚨 Alert | Blacklist Violated!")
                    .setFields(
                        { name: "User", value: `${userMention(message.author.id)} - ${message.author.id}`, inline: true },
                        { name: "Channel", value: `${userMention(message.channel.id)} - ${message.channel.id}`, inline: true },
                        { name: "Message", value: `\`\`\`${message.content}\`\`\``, inline: false }
                    )
                    .setFooter(`Powered by ${message.client.user.username}.`)
                    .setTimestamp();

                try {
                    const LogChannel = await message.guild.fetch(Configuration.LogChannel);

                    if (LogChannel) {
                        await LogChannel.send({ embeds: [LogEmbed] })
                    }
                } catch (err) {
                    console.log(err)
                }
            }
        })

        client.on(Events.MessageUpdate, (oldMessage, newMessage) => {
            let Deleteable = false

            for (const word of blacklist) {
                if (newMessage.content.includes(word)) {
                    Deleteable = true
                }
            }

            if (Deleteable) {
                await newMessage.delete({ reason: "Contains blacklisted word." })

                const LogEmbed = new EmbedBuilder()
                    .setTitle("🚨 Alert | Blacklist Violated!")
                    .setFields(
                        { name: "User", value: `${userMention(newMessage.author.id)} - ${newMessage.author.id}`, inline: true },
                        { name: "Channel", value: `${userMention(newMessage.channel.id)} - ${newMessage.channel.id}`, inline: true },
                        { name: "Old Message", value: `\`\`\`${oldMessage.content}\`\`\``, inline: false },
                        { name: "New Message", value: `\`\`\`${newMessage.content}\`\`\``, inline: false }
                    )
                    .setFooter(`Powered by ${newMessage.client.user.username}.`)
                    .setTimestamp();

                try {
                    const LogChannel = await newMessage.guild.fetch(Configuration.LogChannel);

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



const { Client, ChannelType, Collection, Events } = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
    /**
     * @param {client} Client - The Discord client instance.  
     * @returns {Promise<void>}
     * @throws {Error} If there is an error connecting to the database.
     */

    initialize: async function (client) {
        const Configuration = mongoose.models.Configuration;
        
        client.on(Events.GuildMemberAdd, async member => {
            const config = await Configuration.findOne({ GuildId: member.guild.id });

            if (!config) {
                return
            }
        
            const Embed = new EmbedBuilder()
                .setTitle('🚨 Event Detected | Member Joined')
                .setDescription('A new member has joined the guild!')
                .setThumbnail(member.user.displayAvatarURL())
                .setColor('Green')
                .addFields(
                    { name: "Member", value: userMention(member.user.id), inline: true },
                    { name: "Member ID", value: member.user.id, inline: true },
                    { name: "Account Created", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: true }
                )
                .setFooter({ text: `Powered by ${member.client.user.username}` })
                .setTimestamp();
            
            try {
                LogChannel = await member.client.channels.fetch(config.LogsChannelID);
                await LogChannel.send({ embeds: [Embed] });
            } catch (error) {
                console.error('Failed to send member join message to logs channel:', error);
            }
        })

        client.on(Events.GuildMemberRemove, async member => {
            const config = await Configuration.findOne({ GuildId: member.guild.id });
        
            if (!config) {
                return
            }
        
            const Embed = new EmbedBuilder()
                .setTitle('🚨 Event Detected | Member Removed')
                .setDescription('A member has left the guild!')
                .setThumbnail(member.user.displayAvatarURL())
                .setColor('Red')
                .addFields(
                    { name: "Member", value: userMention(member.user.id), inline: true },
                    { name: "Member ID", value: member.user.id, inline: true },
                    { name: "Account Created", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: true }
                )
                .setFooter({ text: `Powered by ${member.client.user.username}` })
                .setTimestamp();
            
            try {
                LogChannel = await member.client.channels.fetch(config.LogsChannelID);
                await LogChannel.send({ embeds: [Embed] });
            } catch (error) {
                console.error('Failed to send member remove message to logs channel:', error);
            }
        })

    }
}

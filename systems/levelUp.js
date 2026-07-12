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
        const Level = mongoose.models.Level;

        client.on(Events.MessageCreate, async message => {
            try {
            
                // Ignore DMs and bots
                if (!message.guild) return;
                if (message.author.bot) return;
            
            
                const config = await Configuration.findOne({ GuildId: message.guild.id })
            
                if (!config) {
                    return
                }
            
                console.log("reached");
            
                // Create user if they don't exist
                let data = await Level.findOneAndUpdate(
                    { GuildId: message.guild.id, userId: message.author.id },
                    {
                        $setOnInsert: {
                            GuildId: message.guild.id,
                            level: 1,
                            Experience: 0
                        }
                    },
                    {
                        upsert: true
                    }
                );
            
                // Add XP
                data.Experience += 1;
            
                let leveledUp = false;
            
                while (data.Experience >= data.level * 10) {
                    data.Experience = 0;
                    data.level++;
                    leveledUp = true;
                }
            
                await data.save();
            
                if (!leveledUp) return;
            
                const channel = message.guild.channels.cache.get(
                    config.levelUpChannelID
                );
            
                if (!channel) {
                    console.error('Level-up channel not found.');
                    return;
                }
            
                const embed = new EmbedBuilder()
                    .setTitle('🎉 Woohoo! | Level up!')
                    .setDescription(
                        `${userMention(message.author.id)} has reached **Level ${data.level}**!`
                    )
                    .setColor('Gold')
                    .setFooter(`Powered by ${message.client.user.username}.`)
                    .setTimestamp();
                
                await channel.send({
                    embeds: [embed]
                });
            
            } catch (error) {
                console.error('Leveling error:', error);
            }
        });
    }
}
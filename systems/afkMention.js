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

        client.on(Events.MessageCreate, async message => {
            if (message.author.bot) return;

            if (message.mentions.users.size > 0) {
                
                const config = await Configuration.findOne({ GuildId: message.guild.id })
            
                if (!config) {
                    return
                }
            
                const afkRole = message.guild.roles.cache.get(config.AfkRoleID)
            
                let user
            
                if (!afkRole) {
                    return
                }
            
                afkUsers = afkRole.members.map(m => m.user.id);
            
                const mentionedAfkUsers = message.mentions.users.filter(user => afkUsers.includes(user.id));
            
                if (mentionedAfkUsers.size > 0) {
                    const reply = mentionedAfkUsers.map(user => `${userMention(user.id)} is currently AFK.`).join('\n');
                    await message.reply({ content: reply, flags: MessageFlags.SuppressNotifications });
                }
            }
        });
    }
}
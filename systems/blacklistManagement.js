const { ChannelType, Client, Events } = require('discord.js');
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

        // TODO: Split blacklist into a list. ("a b c d" -> ['a", "b", "c", "d"])
        const blacklist = Configuration.blacklist || []

        client.on(Events.MessageCreate, (message) => {
            for (const word of blacklist) {
                if (message.content.has(word)) {
                    await message.delete({ reason: "Contains blacklisted word." })
                }
            }
        })

        client.on(Events.MessageUpdate, (_, message) => {
            for (const word of blacklist) {
                if (message.content.has(word)) {
                    await message.delete({ reason: "Contains blacklisted word." })
                }
            }
        })
        
    }
}
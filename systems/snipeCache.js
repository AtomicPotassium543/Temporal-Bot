const { Client, ChannelType, Collection, Events } = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
    /**
     * @param {client} Client - The Discord client instance.  
     * @returns {Promise<void>}
     * @throws {Error} If there is an error connecting to the database.
     */

    initialize: async function (client) {
        // Creating MessageCache for storing messages that have been deleted for potential retrieval
        const messageCache = new Collection();
        client.messageCache = messageCache

        // Cache deleted messages for potential retrieval
        client.on(Events.MessageDelete, async message => {
            messageCache.set(message.author.id, message);
        });
    }
}
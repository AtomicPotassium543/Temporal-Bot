

const { Client, ChannelType, Collection, Events } = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
    /**
     * @param {client} Client - The Discord client instance.  
     * @returns {Promise<void>}
     * @throws {Error} If there is an error connecting to the database.
     */

    initialize: async function (client) {
        
        const Ticket = mongoose.models.Ticket;
        const TicketConfiguration = mongoose.models.TicketConfiguration;
        
        // Logging Ticket Messages
        client.on(Events.MessageCreate, async message => {
            if (!message.guild) return;
            const ticketData = await Ticket.findOne({ GuildId: message.guild.id, ticketId: message.channelId });
        
            if (!ticketData) return;
        
            const attachmentUrls = message.attachments && message.attachments.size > 0
                ? message.attachments.map(a => a.url || a.proxyURL || a.attachment).join(', ')
                : '';
        
            const content = message.content || '';
            const attachmentsText = attachmentUrls ? ` - ${attachmentUrls}` : '';
        
            const updatedMessages = (ticketData.messages || '') + `\n${message.author.username} (${message.author.id}): ${content}${attachmentsText}`;
        
            await Ticket.updateOne({ GuildId: message.guild.id, ticketId: message.channelId }, { messages: updatedMessages });
        })
    }
}

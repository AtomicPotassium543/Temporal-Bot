const { ChannelType, Client, Events, EmbedBuilder, userMention, roleMention, channelMention, Embed } = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
    /**
     * @param {client} Client - The Discord client instance.  
     * @returns {Promise<void>}
     * @throws {Error} 
     */
    initialize: async function (client) {

        const Configuration = mongoose.models.Configuration;

        client.on('guildMemberUpdate', async (oldMember, newMember) => {
            const oldStatus = oldMember.premiumSince;
            const newStatus = newMember.premiumSince;

            if (!oldStatus && newStatus || newStatus > oldStatus) {

                const ConfigurationData = await Configuration.findOne({ GuildId: newMember.guildId });

                if (!ConfigurationData || !Configuration.BoosterChannelID) {
                    return
                }

                const BoostChannel = await newMember.client.channels.fetch(Configuration.BoosterChannelID);

                const embed = new EmbedBuilder()
                    .setTitle("🎉 Yahoo! | Boost Detected!")
                    .setDescription(`Thank you for boosting the server, ${userMention(newMember.id)}!`)

                try {
                    await BoostChannel.send({ embeds: [embed] })
                } catch (err) {
                    console.log(err)
                }

                console.log(`${newMember.user.tag} has boosted the server.`);
            }
        });
    }
}
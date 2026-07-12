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
        const RoleLevel = mongoose.models.RoleLevel;

        client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
            const roleLevels = await RoleLevel.find({ GuildId: newMember.guild.id });
        
            const levelData = await Level.findOne({ GuildId: newMember.guild.id, userId: newMember.id })
                ?? await Level.create({ GuildId: newMember.guild.id, userId: newMember.id, level: 1, Experience: 0 });
        
            for (const roleLevel of roleLevels) {
                if (!newMember.roles.cache.has(roleLevel.roleId)) continue;
        
                if (levelData.level >= roleLevel.level) continue;
        
                await Level.findOneAndUpdate(
                    { GuildId: newMember.guild.id, userId: newMember.id },
                    { level: roleLevel.level }
                );
        
                const channel = newMember.guild.channels.cache.get(getConfig().levelUpChannelID);
                if (!channel) return;
        
                const embed = new EmbedBuilder()
                    .setTitle('🎉 Woohoo! | Level up!')
                    .setDescription(
                        `${userMention(message.author.id)} has reached **Level ${data.level}**!`
                    )
                    .setColor('Gold')
                    .setFooter(`Powered by ${message.client.user.username}.`)
                    .setTimestamp();
        
                channel.send({ embeds: [embed] });
            }
        });
    }
}
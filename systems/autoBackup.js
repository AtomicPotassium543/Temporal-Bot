const { ChannelType, Client } = require('discord.js');
const mongoose = require('mongoose');
const corn = require('node-cron');

module.exports = {
    /**
     * @param {client} Client - The Discord client instance.  
     * @returns {Promise<void>}
     * @throws {Error} If there is an error connecting to the database.
     */
    initialize: async function (client) {

        const Backup = mongoose.models.Backup;
        
        const AutoBackupLogs = mongoose.models.AutoBackupLogs;
        
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        
        const BackupCreation = async () => {
            for (const guild of client.guilds) {
                try {

                    const Configuration = await mongoose.models.Configuration.findOne({ GuildId: guild.id });
                    if (!Configuration) {
                        continue
                    }

                    const AutomaticBackups = await Backup.find({ automatic: false, GuildId: guild.id })
                
                    if (AutomaticBackups.length >= 15) {
                        continue
                    }

                    const channels = await guild.channels.fetch();
                    const Channels = channels
                        .sort((a, b) => {
                                if (a.type === ChannelType.GuildCategory && b.type !== ChannelType.GuildCategory) return -1;
                                if (a.type !== ChannelType.GuildCategory && b.type === ChannelType.GuildCategory) return 1;
                                return a.position - b.position;
                        })
                        .map((channel, index) => ({
                            id: channel.id,
                            relativeId: `channel-${index}`,
                            name: channel.name,
                            type: channel.type,
                            position: channel.position,
                            parent_id: channel.parent?.id ?? null,
                            topic: channel.topic ?? null,
                            nsfw: channel.nsfw ?? false,
                            rateLimitPerUser: channel.rateLimitPerUser ?? 0,
                            bitrate: channel.bitrate ?? null,
                            userLimit: channel.userLimit ?? null,
                            permissionOverwrites: channel.permissionOverwrites.cache.map(overwrite => ({
                                id: overwrite.id,
                                allow: overwrite.allow?.bitfield?.toString() ?? '0',
                                deny: overwrite.deny?.bitfield?.toString() ?? '0',
                                type: overwrite.type,
                            })),
                            permissionsLocked: channel.permissionsLocked,
                            deletable: channel.deletable,
                            flags: channel.flags,
                            viewable: channel.viewable
                        }))
                
                    const roles = await guild.roles.fetch();
                    const Roles = roles
                        .filter(role =>
                            role.id !== guild.roles.everyone.id &&
                            !role.tags?.botId
                        )
                        .map((role, index) => ({
                            id: role.id,
                            relativeId: `role-${index}`,
                            hoist: role.hoist,
                            name: role.name,
                            color: role.hexColor,
                            position: role.position,
                            icon: role.icon,
                            mentionable: role.mentionable,
                            unicodeEmoji: role.unicodeEmoji,
                            permissions: role.permissions.bitfield.toString()
                        }));
                
                    const roleIdToRelative = new Map(Roles.map(role => [role.id, role.relativeId]));
                    const channelIdToRelative = new Map(Channels.map(channel => [channel.id, channel.relativeId]));
                
                    const RelativeConfiguration = {}
                
                    for (const [key, value] of Object.entries(ConfigurationData?.toObject() || {})) {
                        if (key === "_id" || key === "__v") { continue }
                
                        console.log(key, value)
                
                        if (roleIdToRelative.has(value)) {
                            RelativeConfiguration[key] = roleIdToRelative.get(value);
                            continue;
                        }
                
                        if (channelIdToRelative.has(value)) {
                            RelativeConfiguration[key] = channelIdToRelative.get(value);
                            continue;
                        }
                
                        RelativeConfiguration[key] = value;
                    }
                
                    await Backup.insertOne({
                        GuildId: guild.id,
                        timestamp: Date.now(),
                        channels: Channels,
                        configuration: RelativeConfiguration,
                        roles: Roles,
                        automatic: true
                    })

                    await AutoBackupLogs.updateOne(
                        {
                            GuildId: guild.id
                        }, 
                        { 
                            $set: {
                                GuildId: guild.id,
                                timestamp: Date.now(),
                                backupId: backup._id 
                            } 
                        },
                        { upsert: true }
                    )
                } catch (err) {
                    console.log(err)
                }
            }
        };
        
        const BackupDeletion = async () => {
            for (const guild of client.guilds) {
                try {

                    const Configuration = await mongoose.models.Configuration.findOne({ GuildId: guild.id });
                    if (!Configuration) {
                        continue
                    }

                    const AutomaticBackups = (await Backup.find({ automatic: false, GuildId: guild.id })).sort((a, b) => a.timestamp - b.timestamp);

                    if (AutomaticBackups.length != 0 && AutomaticBackups[0].timestamp < Date.now() - Configuration.BackupDeleteInterval * 24 * 60 * 60 * 1000) {
                        continue
                    }

                    const BackupData = await Backup.findByIdAndDelete(AutomaticBackups[0].backupId)
                } catch (error) {
                    console.log(error)
                }
            }

            const task = cron.schedule('0 0 * * *', async () => {
                await BackupCreation();
                await BackupDeletion();
            }, {
                name: "Backup",
                description: "Creates and deletes automatic backups for all guilds.",
                timezone: "Etc/UTC"
            });

            task.start()
        };
    }
}
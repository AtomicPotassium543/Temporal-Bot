const { Role, ComponentType, roleMention, OverwriteType } = require('discord.js');
const { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuInteraction, StringSelectMenuOptionBuilder, GuildChannel, Guild, ChannelType } = require('discord.js');
const { userMention } = require('discord.js');
const mongoose = require('mongoose');
const { Channel } = require('node:diagnostics_channel');

const fs = require('node:fs');
const path = require('node:path');

const Configuration = mongoose.models.Configuration;
const Backup = mongoose.models.backup;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('backup')
        .setDescription('Backup commands for the server.')
        .addSubcommand(command =>
            command
                .setName("apply")
                .setDescription("Apply an existing backup.")
        )
        .addSubcommand(command =>
            command
                .setName("create")
                .setDescription("Create a new backup.")
        )
        .addSubcommand(command =>
            command
                .setName("delete")
                .setDescription("Delete an existing backup.")
        )
        .addSubcommand(command =>
            command
                .setName("renew")
                .setDescription("Renew an existing backup.")
        ),
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        const response = await interaction.deferReply({ ephemeral: true })

        if (interaction.user.id != interaction.guild.ownerId) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Permission Denied')
                .setDescription('You do not have the permission to run this command!')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] })

            return
        }

        const ConfigurationData = await Configuration.findOne({ GuildId: interaction.guild.id });

        if (interaction.options.getSubcommand() === "create") {

            // Checking all manual backups in order to check if guild backups >= 5
            const ManualBackups = await Backup.find({ automatic: false, GuildId: interaction.guild.id })

            if (ManualBackups.length >= 5) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Oops | Backup Limit')
                    .setDescription("You've reached the maximum amount of manual backups, please delete backups before trying again!")
                    .setColor('Red')
                    .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                    .setTimestamp();
                return await interaction.editReply({ embeds: [embed] })
            }

            // Fetch all channels & map all their properties.
            const channels = await interaction.guild.channels.fetch();
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

            // Fetch all roles & map all their properties.
            const roles = await interaction.guild.roles.fetch();
            const Roles = roles
                .filter(role =>
                    role.id !== interaction.guild.roles.everyone.id &&
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

            // Setting relative Ids (relative to Configuration) to the roles & channels for reinitializing the configuration file.
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

            // Inserting the data collected for future use
            await Backup.insertOne({
                GuildId: interaction.guild.id,
                timestamp: Date.now(),
                channels: Channels,
                configuration: RelativeConfiguration,
                roles: Roles,
                automatic: false
            })

            const embed = new EmbedBuilder()
                .setTitle('✅ Success | Backup Created')
                .setDescription("A backup has been created! Use `/backup apply` to apply it!")
                .setColor('Green')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] })
        }

        if (interaction.options.getSubcommand() === "apply") {
            try {
                const BackupData = await Backup.find({ GuildId: interaction.guild.id });
            
                if (BackupData.length === 0) {
                    return await interaction.editReply({
                        content: "There are no backups to apply from! Please create backups before applying them!"
                    });
                }
            
                const SelectionView = new ActionRowBuilder()
                    .addComponents([
                        new StringSelectMenuBuilder()
                            .setCustomId("BackupSelectionApply")
                            .addOptions(
                                BackupData.reverse().map(item => ({
                                    label: `💾 ${String(new Date(item.timestamp).getUTCHours()).padStart(2, "0")}:${String(new Date(item.timestamp).getUTCMinutes()).padStart(2, "0")} ${String(new Date(item.timestamp).getUTCDate()).padStart(2, "0")}/${String(new Date(item.timestamp).getUTCMonth() + 1).padStart(2, "0")}/${new Date(item.timestamp).getUTCFullYear()} UTC`,
                                    value: item._id.toString(),
                                    ...(item.automatic && {
                                        description: "🤖 Automatic backup."
                                    })
                                }))
                            )
                            .setMinValues(0)
                            .setMaxValues(1)
                    ]);
                
                const response = await interaction.editReply({ 
                    content: "Select the backup which you want to apply!", 
                    components: [SelectionView] 
                });
            
                const filter = (i) => {
                    i.deferUpdate();
                    return i.user.id === interaction.user.id && i.customId === 'BackupSelectionApply';
                };
            
                const selectInteraction = await response.awaitMessageComponent({ 
                    filter, 
                    componentType: ComponentType.StringSelect, 
                    time: 300_000 
                });

                const selected = selectInteraction.values[0];
                console.log(selected);
            
                const backupData = await Backup.findOne({ _id: selected, GuildId: interaction.guild.id });

                if (!backupData) {
                    return await interaction.editReply({
                        content: "Backup not found!"
                    });
                }
            
                // Send initial progress message
                await interaction.editReply({
                    content: "🔄 Applying backup... This may take a few moments.",
                    components: []
                });
            
                const categoryMap = new Map();
                const channelMap = new Map();
                const roleMap = new Map();
                const categoryRelativeMap = new Map();
                const channelRelativeMap = new Map();
                const roleRelativeMap = new Map();

                const normalizePermissionValue = (value) => {
                    if (typeof value === 'string') return BigInt(value);
                    if (typeof value === 'number') return BigInt(value);
                    return value ?? 0n;
                };

                const mapPermissionOverwrite = (overwrite) => {
                    const mappedId = roleMap.get(overwrite.id) || overwrite.id;
                    return {
                        id: mappedId,
                        allow: normalizePermissionValue(overwrite.allow),
                        deny: normalizePermissionValue(overwrite.deny),
                        type: overwrite.type,
                    };
                };

                const channels = await interaction.guild.channels.fetch();

                for (const [, channel] of channels) {
                    if (!channel) continue;
                
                    try {
                        if (channel.deletable) {
                            await channel.delete("Applying backup");
                        }
                    } catch (err) {
                        console.error(`Failed to delete channel ${channel.name}:`, err);
                    }
                }

                // Delete all roles
                const roles = await interaction.guild.roles.fetch();

                const sortedRoles = roles
                    .filter(role =>
                        role.id !== interaction.guild.roles.everyone.id &&
                        !role.managed &&
                        role.editable
                    )
                    .sort((a, b) => b.position - a.position);
                
                for (const role of sortedRoles.values()) {
                    try {
                        await role.delete("Applying backup");
                    } catch (err) {
                        console.error(`Failed to delete role ${role.name}:`, err);
                    }
                }

                backupData.roles = backupData.roles.sort((a, b) => b.position - a.position)

                // 1. CREATE ROLES FIRST
                for (const role of backupData.roles) {
                    try {
                        if (role.id === interaction.guild.roles.everyone.id) continue;

                        const created = await interaction.guild.roles.create({
                            name: role.name,
                            color: role.color || null,
                            permissions: role.permissions ? BigInt(role.permissions) : 0n,
                            hoist: role.hoist || false,
                            icon: role.icon || null,
                            mentionable: role.mentionable || false,
                            reason: "Applying backup - Role"
                        });
                        roleMap.set(role.id, created.id);
                        roleRelativeMap.set(role.relativeId, created.id);
                        console.log(`Created role: ${role.name} (${created.id})`);
                    } catch (error) {
                        console.error(`Failed to create role ${role.name}:`, error);
                    }
                }

                // 2. CREATE CATEGORIES
                for (const channel of backupData.channels) {
                    if (channel.type === ChannelType.GuildCategory) {
                        try {
                            const created = await interaction.guild.channels.create({
                                name: channel.name,
                                type: channel.type,
                                position: channel.position,
                                permissionOverwrites: channel.permissionOverwrites?.map(mapPermissionOverwrite),
                                reason: "Applying backup - Category"
                            });
                            categoryMap.set(channel.id, created.id);
                            categoryRelativeMap.set(channel.relativeId, created.id);
                            console.log(`Created category: ${channel.name} (${created.id})`);
                        } catch (error) {
                            console.error(`Failed to create category ${channel.name}:`, error);
                        }
                    }
                }

                // 3. CREATE OTHER CHANNELS
                for (const channel of backupData.channels) {
                    if (channel.type !== ChannelType.GuildCategory) {
                        try {
                            const parentId = channel.parent_id ? categoryMap.get(channel.parent_id) : null;
                            const created = await interaction.guild.channels.create({
                                name: channel.name,
                                type: channel.type,
                                parent: parentId || undefined,
                                position: channel.position,
                                topic: channel.topic || undefined,
                                nsfw: channel.nsfw,
                                rateLimitPerUser: channel.rateLimitPerUser,
                                bitrate: channel.bitrate,
                                userLimit: channel.userLimit,
                                permissionOverwrites: channel.permissionOverwrites?.map(mapPermissionOverwrite),
                                reason: "Applying backup - Channel"
                            });
                            channelMap.set(channel.id, created.id);
                            channelRelativeMap.set(channel.relativeId, created.id);
                            console.log(`Created channel: ${channel.name} (${created.id})`);
                        } catch (error) {
                            console.error(`Failed to create channel ${channel.name}:`, error);
                        }
                    }
                }

                // 4. UPDATE CONFIGURATION DATA
                const configUpdate = {};

                for (const [key, value] of Object.entries(backupData.configuration || {})) {

                    if (typeof value === "string") {
                        if (roleRelativeMap.has(value)) {
                            configUpdate[key] = roleRelativeMap.get(value);
                            continue;
                        }
                    
                        if (channelRelativeMap.has(value)) {
                            configUpdate[key] = channelRelativeMap.get(value);
                            continue;
                        }
                    
                        if (categoryRelativeMap.has(value)) {
                            configUpdate[key] = categoryRelativeMap.get(value);
                            continue;
                        }
                    }
                
                    configUpdate[key] = value;
                }

                if (Object.keys(configUpdate).length > 0) {
                    await Configuration.updateOne(
                        { GuildId: interaction.guild.id },
                        { $set: configUpdate }
                    );

                    await Backup.updateOne(
                        { _id: BackupData._id },
                        { configuration: configUpdate }
                    )
                    console.log("Configuration updated:", configUpdate);
                }
            } catch (error) {
                console.error("Backup application error:", error);
                await interaction.editReply({
                    content: `❌ Error applying backup: ${error.message || "Unknown error"}`
                });
            }
        }

        if (interaction.options.getSubcommand() === "delete") {

            const BackupData = await Backup.find({ GuildId: interaction.guild.id });

            if (BackupData.length === 0) {
                return await interaction.editReply({
                    content: "There are no backups to apply from! Please create backups before applying them!"
                })
            }

            const SelectionView = new ActionRowBuilder()
                .addComponents([
                    new StringSelectMenuBuilder()
                        .setCustomId("BackupSelectionDelete")
                        .addOptions(
                            BackupData.reverse().map(item => ({
                                label: `💾 ${String(new Date(item.timestamp).getUTCHours()).padStart(2, "0")}:${String(new Date(item.timestamp).getUTCMinutes()).padStart(2, "0")} ${String(new Date(item.timestamp).getUTCDate()).padStart(2, "0")}/${String(new Date(item.timestamp).getUTCMonth() + 1).padStart(2, "0")}/${new Date(item.timestamp).getUTCFullYear()} UTC`,
                                value: item._id.toString(), value: item._id.toString(),
                                ...(item.automatic && {
                                    description: "🤖 Automatic backup."
                                })
                            }))
                        )
                        .setMinValues(0)
                        .setMaxValues(1)
                ])

            const response = await interaction.editReply({ content: "Select the backup which you want to delete!", components: [SelectionView] })

            const filter = (i) => {
                i.deferUpdate();
                return i.user.id === interaction.user.id && i.customId === 'BackupSelectionDelete';
            };

            try {
                const selectInteraction = await response.awaitMessageComponent({ filter, ComponentType: ComponentType.StringSelect, time: 300_000 }).catch(reason => console.log(reason))
                const selected = selectInteraction.values[0]
                const BackupData = await Backup.findByIdAndDelete(selected)

                await interaction.editReply({ content: "The selected backup has been deleted!", components: [] })
            } catch (error) {
                await interaction.editReply({ content: `Error: ${error}` })
            }
        }

        if (interaction.options.getSubcommand() === "renew") {

            const BackupData = await Backup.find({ GuildId: interaction.guild.id });

            if (BackupData.length === 0) {
                return await interaction.editReply({
                    content: "There are no backups to apply from! Please create backups before applying them!"
                })
            }

            const SelectionView = new ActionRowBuilder()
                .addComponents([
                    new StringSelectMenuBuilder()
                        .setCustomId("BackupSelectionRenew")
                        .addOptions(
                            BackupData.reverse().map(item => ({
                                label: `💾 ${String(new Date(item.timestamp).getUTCHours()).padStart(2, "0")}:${String(new Date(item.timestamp).getUTCMinutes()).padStart(2, "0")} ${String(new Date(item.timestamp).getUTCDate()).padStart(2, "0")}/${String(new Date(item.timestamp).getUTCMonth() + 1).padStart(2, "0")}/${new Date(item.timestamp).getUTCFullYear()} UTC`,
                                value: item._id.toString(), value: item._id.toString(),
                                ...(item.automatic && {
                                    description: "🤖 Automatic backup."
                                })
                            }))
                        )
                        .setMinValues(0)
                        .setMaxValues(1)
                ])

            const response = await interaction.editReply({ content: "Select the backup which you want to renew!", components: [SelectionView] })

            const filter = (i) => {
                i.deferUpdate();
                return i.user.id === interaction.user.id && i.customId === 'BackupSelectionRenew';
            };

            try {
                const selectInteraction = await response.awaitMessageComponent({ filter, ComponentType: ComponentType.StringSelect, time: 300_000 }).catch(reason => console.log(reason))

                const selected = selectInteraction.values[0]

                const channels = await interaction.guild.channels.fetch();
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

                const roles = await interaction.guild.roles.fetch();
                const Roles = roles
                    .filter(role =>
                        role.id !== interaction.guild.roles.everyone.id &&
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

                const RelativeConfiguration = {};
                for (const [key, value] of Object.entries(ConfigurationData?.toObject() || {})) {
                    if (key === "_id" || key === "__v") continue;

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

                await Backup.findByIdAndUpdate(selected, {
                    timestamp: Date.now(),
                    channels: Channels,
                    roles: Roles,
                    configuration: RelativeConfiguration,
                    automatic: false
                })

                await interaction.editReply({ content: "Backup has been renewed!", components: [] })

            } catch (error) {
                await interaction.editReply({ content: `Error: ${error}` })
            }
        }
    }
}

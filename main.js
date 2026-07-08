const { Client, AttachmentBuilder, Events, ModalBuilder, GatewayIntentBits, Collection, MessageFlags, EmbedBuilder, PermissionFlagsBits, GuildChannel, ChannelType, ActionRowBuilder, ButtonBuilder, InteractionResponse, ButtonStyle, TextInputBuilder, TextInputStyle, channelMention, userMention, ButtonInteraction, roleMention } = require('discord.js');
const { AntiRaidManager } = require('discord-antiraid');

const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');
const mongoose = require('mongoose');

const AsyncTask = require('async-task');

const dotenv = require('dotenv');
const ticket = require('./commands/Ticket/ticket');

dotenv.config()

const ConfigurationSchema = new mongoose.Schema({
    "GuildId": String,
    "StaffRoleID": String,
    "TicketViewerId": String,
    "InfectedRoleID": String,
    "AfkRoleID": String,
    "LogsChannelID": String,
    "LevelsChannelID": String,
    "CakeGiftMessage": String,
    "BackupCreateInterval": Number,
    "BackupDeleteInterval": Number
});

const Configuration = mongoose.models.Configuration || mongoose.model('Configuration', ConfigurationSchema);

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(console.error);

const TOKEN = process.env.TOKEN
const GUILD_ID = process.env.GUILD_ID
const CLIENT_ID = process.env.CLIENT_ID

const client = new Client({ intents: [Object.values(GatewayIntentBits)] });

const backupSchema = new mongoose.Schema({
    GuildId: String,
    timestamp: Number,
    channels: Array,
    roles: Array,
    configuration: Object,
    automatic: Boolean
});

const Backup = mongoose.models.backup || mongoose.model('backup', backupSchema);

const AutoBackupLogsSchema = new mongoose.Schema({
    GuildId: String,
    timestamp: Number,
    backupId: String,
    automatic: Boolean
});

const AutoBackupLogs = mongoose.models.AutoBackupLogs || mongoose.model('AutoBackupLogs', AutoBackupLogsSchema);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const BackupCreation = async () => {
    while (true) {
        for (guild in client.guilds) {
            try {
                const config = await Configuration.findOne({ GuildId: guild.id });
                
                const backupDeleteInterval = Number(config.BackupDeleteInterval);

                const guild = await client.guilds.fetch(guild.id);

                const channels = await guild.channels.fetch();
                const Channels = channels.map(channel => ({
                    deletable: channel.deletable,
                    flags: channel.flags,
                    name: channel.name,
                    parent: channel.parent,
                    permissionOverwrites: channel.permissionOverwrites,
                    permissionsLocked: channel.permissionsLocked,
                    position: channel.position,
                    type: channel.type,
                    viewable: channel.viewable
                }))

                const roles = await guild.roles.fetch();
                const Roles = roles.map(role => ({
                    id: role.id,
                    hoist: role.hoist,
                    name: role.name,
                    color: role.hexColor,
                    position: role.position,
                    icon: role.icon,
                    mentionable: role.mentionable,
                    tags: role.tags,
                    unicodeEmoji: role.unicodeEmoji,
                    permissions: role.permissions.toJSON()
                }));

                const docs = await AutoBackupLogs.find({ automatic: true, GuildId: guild.id })
                    .sort({ timestamp: -1 })
                    .limit(1);

                const latest = docs[0];

                if (!latest) {
                    await Backup.create({
                        GuildId: guild.id,
                        timestamp: Date.now(),
                        configuration: config,
                        Channels,
                        Roles,
                        automatic: true
                    });

                    return
                }

                if (Date.now() - latest.timestamp > 86400000 * backupDeleteInterval) {
                    await Backup.create({
                        GuildId: guild.id,
                        timestamp: Date.now(),
                        configuration: config,
                        Channels,
                        Roles,
                        automatic: true
                    });
                }
            } catch (err) {
                console.log(err)
            }
        }
        await delay(3600000);
    }
}

const BackupDeletion = async () => {
    while (true) {
        for (guild in client.guilds) {
            try {
                const config = await Configuration.findOne({ GuildId: guild.id });
                const backupDeleteInterval = Number(config.BackupDeleteInterval);
                const guild = await client.guilds.fetch(guild.id);
                const docs = await AutoBackupLogs.find({ automatic: true, GuildId: guild.id })
                    .sort({ timestamp: 1 })
                    .limit(1);
                const oldest = docs[0];
                if (!oldest) {
                    return
                }
                if (Date.now() - oldest.timestamp > 86400000 * backupDeleteInterval) {
                    await Backup.findOneAndDelete({ _id: oldest.backupId, GuildId: guild.id });
                }
            } catch (err) {
                console.log(err)
            }
        }

        await delay(3600000);
    }
};

// Message for logging in the client & starting background tasks.
client.on(Events.ClientReady, readyClient => {
    console.log(`Logged in as ${readyClient.user.tag}!`);

    // Starting tasks
    Promise.all([
        BackupCreation(),
        BackupDeletion()
    ])

});

const messageCache = new Collection();
const verificationCache = new Collection();
client.messageCache = messageCache
client.verificationCache = verificationCache

// Cache deleted messages for potential retrieval
client.on(Events.MessageDelete, async message => {
    messageCache.set(message.author.id, message);
});

// Handle AFK mentions
client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    if (message.mentions.users.size > 0) {
        console.log("Message mentions someone");

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

const levelSchema = new mongoose.Schema({
    GuildId: String,
    userId: {
        type: String,
        required: true,
    },
    level: {
        type: Number,
        default: 1
    },
    Experience: {
        type: Number,
        default: 0
    }
});

const Level = mongoose.model('Level', levelSchema);

// Handle leveling
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

        // Handle multiple level-ups
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

const RoleLevelSchema = new mongoose.Schema({
    GuildId: String,
    roleId: String,
    level: Number
});

const RoleLevel = mongoose.model('RoleLevel', RoleLevelSchema);

// Handle role level-ups
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

// Handle slash commands
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        try {

            const config = await Configuration.findOne({ GuildId: interaction.guild.id });

            if (!config && command.data.name !== "configure") {

                const embed = new EmbedBuilder()
                    .setTitle('❌ Oops | Configuration Error')
                    .setDescription("Failed to find the configuration data for this guild. Please contact an administrator for more information!")
                    .setColor('Red')
                    .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                    .setTimestamp();

                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ embeds: [embed] }).catch();
                } else {
                    await interaction.reply({
                        embeds: [embed],
                        ephemeral: true
                    }).catch();
                }

                return
            } else if (config) {
                const schemaFields = Object.keys(config.schema.paths)
                    .filter(field => !["_id", "__v"].includes(field));

                const missingFields = schemaFields.filter(field => !(field in config.toObject()));

                if (missingFields.length > 0 && command.data.name !== "configure") {

                    const embed = new EmbedBuilder()
                        .setTitle('❌ Oops | Configuration Error')
                        .setDescription("The configuration for this guild is incomplete. Please contact an administrator for more information!")
                        .setColor('Red')
                        .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                        .setTimestamp();

                    if (interaction.deferred || interaction.replied) {
                        await interaction.editReply({ embeds: [embed] }).catch();
                    } else {
                        await interaction.reply({
                            embeds: [embed],
                            ephemeral: true
                        }).catch();
                    }

                    return
                }
            }

            await command.execute(interaction);
        } catch (error) {

            console.log(error)

            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Server-Side Error')
                .setDescription("There was an error trying to process this command! This error has been logged into our system.")
                .addFields({ name: "Error:", value: `\n\n\`\`\`${error}\`\`\`` })
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: "", embeds: [embed], components: [] }).catch();
            } else {
                await interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                }).catch();
            }

        }
    } catch (error) {
        console.log(error)
    }
});

const TicketSchema = new mongoose.Schema({
    GuildId: String,
    userId: String,
    ticketId: String,
    configurationId: String,
    messages: String
});

const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema);

const TicketConfigurationSchema = new mongoose.Schema({
    GuildId: String,
    name: String,
    reason: String,
    TicketCategoryId: String,
    TicketChannelId: String,
    TicketMessageId: String
});

const TicketConfiguration = mongoose.models.TicketConfiguration || mongoose.model('TicketConfiguration', TicketConfigurationSchema);

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

// Managing create_ticket button & CloseButton button interactions
/**
* @param {ButtonInteraction} interaction 
*/
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'create_ticket') {

        const existingTicket = await Ticket.findOne({
            GuildId: interaction.guild.id,
            userId: interaction.user.id
        });

        if (existingTicket) {
            return interaction.reply({ content: 'You already have an open ticket.', ephemeral: true });
        }

        const channelName = `ticket-${interaction.user.username.toLowerCase().slice(0, 15)}`;

        const config = await Configuration.findOne({ GuildId: interaction.guild.id })

        const TicketConfig = await TicketConfiguration.findOne({
            TicketMessageId: interaction.message.id
        });

        console.log("Debugging data: ")
        console.log(config)
        console.log(TicketConfig)
        console.log("Debugging data end")

        if (!config || !TicketConfig) {
            await interaction.reply({content: 'No ticket configuration found. Please contact an administrator.', ephemeral: true});
            return;
        }

        console.log(TicketConfig)

        const category = interaction.guild.channels.cache.get(TicketConfig.TicketCategoryId);

        if (!category) {
            await interaction.reply({ content: 'Ticket category not found. Please contact an administrator.', ephemeral: true });
            return;
        }

        const reasonInput = new TextInputBuilder()
            .setCustomId("reason")
            .setLabel("Reason")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Please give us the reason & details for opening the ticket.")
            .setMaxLength(512)
            .setMinLength(128)
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(reasonInput);

        const ReasonModal = new ModalBuilder()
            .setCustomId("ReasonModal")
            .setTitle("Ticket Creation")
            .addComponents(row);

        await interaction.showModal(ReasonModal);

        const filter = i => i.customId === 'ReasonModal' && i.user.id === interaction.user.id;

        interaction.awaitModalSubmit({ filter, time: 60_000 })
            .then(async modalInteraction => {

                await modalInteraction.deferReply({ ephemeral: true });

                const reason = modalInteraction.fields.getTextInputValue('reason');

                const channel = await modalInteraction.guild.channels.create({
                    name: channelName,
                    type: 0,
                    parent: TicketConfig.TicketCategoryId,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.roles.everyone,
                            deny: [PermissionFlagsBits.ViewChannel]
                        },
                        {
                            id: interaction.user.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                        },
                        {
                            id: config.TicketViewerId,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                        }
                    ]
                });

                const TicketEmbed = new EmbedBuilder()
                    .setTitle("Ticket Embed")
                    .setDescription("Thank you for creating a ticket! Please wait until a moderator contacts you, and in the mean while, please give us the details for your issue.")
                    .setColor("Blurple")
                    .addFields({ name: "Reason", value: `\`\`\`${reason}\`\`\``, inline: true })
                    .setFooter({ text: `Powered by ${interaction.client.user.username}.` })
                    .setTimestamp()

                const CloseTicketView = new ActionRowBuilder()
                    .setComponents([
                        new ButtonBuilder()
                            .setCustomId(`CloseButton-${channel.id}`)
                            .setLabel("Close Ticket")
                            .setEmoji("🗑️")
                            .setStyle(ButtonStyle.Danger)
                    ])

                await Ticket.create({
                    GuildId: modalInteraction.guild.id,
                    userId: modalInteraction.user.id,
                    ticketId: channel.id,
                    messages: "Logs:"
                }).catch(console.error);

                channel.send({ content: roleMention(config.TicketViewerId), embeds: [TicketEmbed], components: [CloseTicketView] })

                await modalInteraction.editReply({ content: `Your ticket has been created: ${channel}`, ephemeral: true });
            })
            .catch(err => {
                console.error(err);
            });
    }

    if (interaction.customId.startsWith('CloseButton-')) {

        await interaction.deferReply({ ephemeral: true });

        const config = await Configuration.findOne({ GuildId: interaction.guild.id });

        if (!config) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Configuration Missing')
                .setDescription("The configuration for this guild hasn't been made! Please contact an administrator for more information.")
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        const reason = "No reason provided";

        if (!interaction.member.roles.cache.has(config.TicketViewerId)) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Permission Denied')
                .setDescription('You are not allowed to use this command!')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        const TicketData = await Ticket.findOne({ GuildId: interaction.guild.id, ticketId: interaction.channelId });

        if (!TicketData) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Invalid Ticket Channel')
                .setDescription('This is not a ticket channel. Please run this in a proper ticket channel in order to delete it.')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        await Ticket.deleteOne({ GuildId: interaction.guild.id, ticketId: interaction.channelId }).catch(error =>
            console.log(error)
        );

        const member = interaction.member;

        const LogEmbed = new EmbedBuilder()
            .setTitle("Ticket Closed!")
            .setDescription(`Ticket ${interaction.channel.name} (${interaction.channel.id}) has been deleted!`)
            .addFields({ name: "Closed by", value: `${userMention(interaction.user.id)} (${interaction.user.id})`, inline: true })
            .addFields({ name: "Reason", value: reason, inline: true })
            .setColor("Blurple")
            .setFooter({ text: `Powered by ${interaction.client.user.username}` })
            .setTimestamp();

        const LogFile = new AttachmentBuilder(
            Buffer.from(TicketData.messages, 'utf-8'),
            { name: `log-${interaction.channel.name}.txt` }
        );

        await interaction.channel.delete();

        try {
            const LogChannel = await interaction.guild.channels.fetch(config.LogsChannelID);

            console.log("Type:")
            console.log(LogChannel.type);

            await LogChannel.send({ embeds: [LogEmbed], files: [LogFile] });
        } catch (error) {
            console.log(error);
        }

        if (member) {
            try {
                const UserEmbed = new EmbedBuilder()
                    .setTitle("Ticket Message")
                    .setDescription('Your ticket has been deleted. If you have any more issues, feel free to create another ticket!')
                    .addFields({ name: "Reason", value: reason, inline: true })
                    .setColor("Blurple")
                    .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                    .setTimestamp();

                await member.send({ embeds: [UserEmbed] });
            } catch (error) {
                console.log(error);
            }
        }
    }
});

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

// Managing tickets when ticket channels are deleted
/**
* @param {GuildChannel} channel 
*/
client.on(Events.ChannelDelete, async channel => {
    if (channel.type != ChannelType.GuildText) {
        return
    }

    const config = await Configuration.findOne({
        "GuildId": channel.guildId  
    })

    if (!config) {
        return
    }

    const TicketData = await Ticket.findOne({ GuildId: channel.guildId, "ticketId": channel.id })

    if (!TicketData) {
        return
    }

    await Ticket.deleteOne({ GuildId: channel.guildId, "ticketId": channel.id }).catch(error =>
        console.log(error)
    )

    const TicketName = channel.name

    const member = await channel.guild.members.fetch(TicketData.userId);

    const LogEmbed = new EmbedBuilder()
        .setTitle("Ticket Closed!")
        .setDescription(`Ticket ${Channel.name} (${Channel.id}) has been deleted!`)
        .addFields({ name: "Closed by", value: `${userMention(interaction.user.id)} (${interaction.user.id})`, inline: true })
        .addFields({ name: "Reason", value: reason, inline: true })
        .setColor("Blurple")
        .setFooter({ text: `Powered by ${interaction.client.user.username}` })
        .setTimestamp()

    const LogFile = new AttachmentBuilder(
        Buffer.from(TicketData.messages, 'utf-8'),
        { name: `log-${Channel.name}.txt` }
    );

    try {
        const LogChannel = await interaction.guild.channels.fetch(config.LogsChannelID)

        await LogChannel.send({ embeds: [LogEmbed], files: [LogFile] })
    } catch (error) {
        console.log(error)
    }

    if (member) {
        try {
            const UserEmbed = new EmbedBuilder()
                .setTitle("Ticket Message")
                .setDescription(`Your ticket has been deleted. If you have any more issues, feel free to create another ticket!`)
                .addFields({ name: "Reason", value: "Channel deletion.", inline: true })
                .setColor("Blurple")
                .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                .setTimestamp()

            await member.send({ embeds: [UserEmbed] })
        } catch (error) {
            console.log(error)
        }
    }
})

async function startBot() {
    const commandFolders = [
        "CoreModeration",
        "ModerationTools",
        "Fun",
        "Configuration",
        "MemberTools",
        "GameInformation",
        "Backup",
        "Ticket"
    ];

    const utilityFolders = []

    const commands = [];
    client.commands = new Collection();

    try {
        // Load commands
        for (const folder of commandFolders) {
            const commandsPath = path.join(__dirname, "commands", folder);

            const commandFiles = fs.readdirSync(commandsPath)
                .filter(file => file.endsWith(".js"));

            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);

                try {
                    const command = require(filePath);

                    if (!command.data || !command.execute) {
                        console.warn(`Skipping invalid command: ${file}`);
                        continue;
                    }

                    commands.push(command.data.toJSON());
                    client.commands.set(command.data.name, command);

                    console.log(`Loaded command: ${command.data.name}`);
                } catch (err) {
                    console.error(`Failed to load ${filePath}:`, err);
                }
            }
        }

        console.log(`Loaded ${commands.length} commands.`);

        // Register commands once
        const rest = new REST({ version: "10" }).setToken(TOKEN);

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );

        console.log("Slash commands registered.");

        // Login bot
        await client.login(TOKEN);

        console.log("Login request sent.");


    } catch (err) {
        console.error("Failed to start bot:", err);
    }
}

startBot().catch(console.error);
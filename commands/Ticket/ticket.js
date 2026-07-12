const { SlashCommandBuilder, AttachmentBuilder, ComponentType, PermissionFlagsBits, userMention, StringSelectMenuBuilder, EmbedBuilder, ChannelType, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, DiscordjsRangeError } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const { error } = require('node:console');

const Configuration = mongoose.models.Configuration;
const TicketConfiguration = mongoose.models.TicketConfiguration;
const Ticket = mongoose.models.Ticket;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Ticket management commands.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('prompt')
                .setDescription('Create a ticket prompt.')
                .addStringOption(option =>
                    option
                        .setName("name")
                        .setDescription("Name of the ticket category.")
                        .setMaxLength(64)
                        .setRequired(true)

                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("The reason for opening a ticket under this category.")
                        .setMaxLength(500)
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("The channel where the ticket prompt will be created.")
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option
                        .setName("category")
                        .setDescription("The category where the ticket will be created.")
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription("Add a user to the ticket.")
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user which you want to add.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription("Remove a user from the ticket.")
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user which you want to remove.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription("Delete the current ticket.")
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('The reason for which you are deleting the ticket.')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('destroy')
                .setDescription('Delete the existing ticket prompt and configuration.')
        ),
    /**
    * @param {ChatInputCommandInteraction} interaction
    */
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        if (interaction.options.getSubcommand() === "prompt") {
            if (!interaction.member.permissions.has('Administrator')) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Oops | Permission Denied')
                    .setDescription('You do not have permission to use this command.')
                    .setColor('Red')
                    .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });
                return;
            }

            const configurationAmount = await TicketConfiguration.countDocuments({ GuildId: interaction.guild.id });

            if (configurationAmount >= 5) {
                const embed = new EmbedBuilder()
                    .setTitle('⚠️ Oops | Max Ticket Setup Reached!')
                    .setDescription('This guild has reached the maximum number of ticket setups. Please delete the existing setups before creating a new one.')
                    .setColor('Yellow')
                    .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });
                return;
            }

            const Embed = new EmbedBuilder()
                .setTitle(interaction.options.getString("name"))
                .setDescription(interaction.options.getString("reason"))
                .setColor('Yellow')
                .setFooter({ text: `Powered by ${interaction.client.user.username}` });

            const channel = interaction.options.getChannel("channel");
            const category = interaction.options.getChannel("category");

            const ticketConfig = await TicketConfiguration.create({
                GuildId: interaction.guild.id,
                name: interaction.options.getString("name"),
                reason: interaction.options.getString("reason"),
                TicketCategoryId: category.id,
                TicketChannelId: channel.id,
                TicketMessageId: null
            });

            const View = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`create_ticket`)
                        .setLabel('Create Ticket')
                        .setEmoji('🎫')
                        .setStyle(ButtonStyle.Primary)
                );

            const message = await channel.send({ embeds: [Embed], components: [View] });

            await TicketConfiguration.findByIdAndUpdate(ticketConfig._id, { TicketMessageId: message.id });

            const embed = new EmbedBuilder()
                .setTitle('✅ Success! | Ticket Prompt Created')
                .setDescription('Ticket prompt created successfully.')
                .setColor('Green')
                .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
        }

        if (interaction.options.getSubcommand() === "destroy") {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Oops | Permission Denied')
                    .setDescription('You do not have permission to use this command.')
                    .setColor('Red')
                    .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                    .setTimestamp();
                return interaction.editReply({ embeds: [embed] });
            }

            const count = await TicketConfiguration.countDocuments({ GuildId: interaction.guild.id });

            if (count === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Oops | No Ticket Configuration')
                    .setDescription('No ticket configuration found. Please create a ticket prompt before attempting to delete the configuration.')
                    .setColor('Red')
                    .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                    .setTimestamp();
                return interaction.editReply({ embeds: [embed] });
            }

            const TicketConfigs = await TicketConfiguration.find({ GuildId: interaction.guild.id });

            const TicketSelect = new StringSelectMenuBuilder()
                .setCustomId('unwarn_select')
                .setPlaceholder('Select a setup to destroy.')
                .addOptions(
                    TicketConfigs.map(TicketConfig => ({
                        label: `Ticket: #${TicketConfig.name}`,
                        description: TicketConfig.reason.slice(0, 50) + (TicketConfig.reason.length > 50 ? '...' : ''),
                        value: TicketConfig._id.toString()
                    }))
                );
        
            const TicketRow = new ActionRowBuilder().addComponents(TicketSelect);

            const filter = i => i.customId === 'unwarn_select' && i.user.id === interaction.user.id;

            const message = await interaction.editReply({ content: 'Select a ticket setup to remove:', components: [TicketRow] });

            const selectInteraction = await message.awaitMessageComponent({ filter, componentType: ComponentType.StringSelect, time: 300000 });

            const selectedWarningId = selectInteraction.values[0];

            const Config = await TicketConfiguration.findById(selectedWarningId);

            const channel = await interaction.guild.channels
                .fetch(Config.TicketChannelId)
                .catch(() => null);

            if (channel) {
                const message = await channel.messages
                    .fetch(Config.TicketMessageId)
                    .catch(() => null);

                if (message) {
                    await message.delete().catch(() => { });
                }
            }

            const TicketChannels = (await interaction.guild.channels.fetch()).filter(channel => channel.parentId === Config.TicketCategoryId);

            TicketChannels.forEach(async channel => {
                await Ticket.deleteOne({ ticketId: channel.id }).catch(() => { });
                await channel.delete().catch(() => { });
            });

            await TicketConfiguration.findOneAndDelete({ _id: selectedWarningId }).catch(() => { });

            const embed = new EmbedBuilder()
                .setTitle('✅ Success! | Ticket Configuration Removed')
                .setDescription('Ticket configuration and prompt deleted successfully.')
                .setColor('Green')
                .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                .setTimestamp();
            await interaction.editReply({ embeds: [embed], components: [] });
        }

        if (interaction.options.getSubcommand() === "add") {
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

            if (!interaction.member.roles.cache.has(config.TicketViewerID)) {
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
                    .setDescription('This is not a ticket channel. Please run this in a proper ticket channel in order to add a user.')
                    .setColor('Red')
                    .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });
                return;
            }

            const user = interaction.options.getUser('user');

            try {
                await interaction.channel.permissionOverwrites.create(user, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true,
                });
            } catch (error) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Oops | Ticket Update Failed')
                    .setDescription(`Failed to add user to the ticket, reason: ${error}`)
                    .setColor('Red')
                    .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('✅ Success! | User Added')
                .setDescription(`${userMention(user.id)} has been added to the ticket by ${userMention(interaction.user.id)}.`)
                .setColor('Green')
                .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
        }

        if (interaction.options.getSubcommand() === "remove") {
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
                    .setDescription('This is not a ticket channel. Please run this in a proper ticket channel in order to remove a user.')
                    .setColor('Red')
                    .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });
                return;
            }

            const user = interaction.options.getUser('user');

            try {
                await interaction.channel.permissionOverwrites.create(user, {
                    ViewChannel: false,
                    SendMessages: false,
                    ReadMessageHistory: false,
                });
            } catch (error) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Oops | Ticket Update Failed')
                    .setDescription(`Failed to remove user from the ticket, reason: ${error}`)
                    .setColor('Red')
                    .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('✅ Success! | User Removed')
                .setDescription(`${userMention(user.id)} has been removed from the ticket by ${userMention(interaction.user.id)}.`)
                .setColor('Green')
                .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
        }

        if (interaction.options.getSubcommand() === "delete") {
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

            const reason = interaction.options.getString("reason") || "No reason provided";

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
    }
};
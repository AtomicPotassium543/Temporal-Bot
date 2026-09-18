

const { Client, ChannelType, TextInputBuilder, TextInputStyle, ActionRowBuilder, ModalBuilder, Events, PermissionFlagsBits, AttachmentBuilder, EmbedBuilder, userMention, ButtonStyle, ButtonBuilder, roleMention, GuildChannel } = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
    /**
     * @param {client} Client - The Discord client instance.  
     * @returns {Promise<void>}
     * @throws {Error} If there is an error connecting to the database.
     */

    initialize: async function (client) {

        const Configuration = mongoose.models.Configuration;
        const Ticket = mongoose.models.Ticket;
        const TicketConfiguration = mongoose.models.TicketConfiguration;

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

                if (!config || !TicketConfig) {
                    await interaction.reply({ content: 'No ticket configuration found. Please contact an administrator.', ephemeral: true });
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
                .setDescription(`Ticket ${channel.name} (${channel.id}) has been deleted!`)
                .addFields({ name: "Closed by", value: `N/A`, inline: true })
                .addFields({ name: "Reason", value: "Channel Deletion.", inline: true })
                .setColor("Blurple")
                .setFooter({ text: `Powered by ${channel.client.user.username}` })
                .setTimestamp()

            const LogFile = new AttachmentBuilder(
                Buffer.from(TicketData.messages, 'utf-8'),
                { name: `log-${channel.name}.txt` }
            );

            try {
                const LogChannel = await channel.guild.channels.fetch(config.LogsChannelID)

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
                        .setFooter({ text: `Powered by ${channel.client.user.username}` })
                        .setTimestamp()

                    await member.send({ embeds: [UserEmbed] })
                } catch (error) {
                    console.log(error)
                }
            }
        })

    }
}

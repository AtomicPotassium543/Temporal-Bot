const { SlashCommandBuilder, EmbedBuilder, ComponentType, StringSelectMenuBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder } = require('discord.js');
const { roleMention } = require('@discordjs/builders');

const fs = require('node:fs');
const path = require('node:path');

const mongoose = require('mongoose');

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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configure')
        .setDescription('Use this command to work with server configuration.'),
    async execute(interaction) {

        if (interaction.user.id != interaction.guild.ownerId) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Permission Denied')
                .setDescription('You are not allowed to use this command!')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();

            await interaction.reply({ embeds: [embed] })

            return
        }

        const config = await Configuration.findOne({ GuildId: interaction.guild.id });

        const Embed = new EmbedBuilder()
            .setTitle('Configuration Menu')
            .setDescription(`Welcome to the configuration menu!`)
            .addFields({ name: "Instructions", value: "Select the field which you wish to update! " })
            .setColor('Blue')
            .setFooter({ text: `Powered by ${interaction.client.user.username}` })
            .setTimestamp();

        const fields = [];

        ConfigurationSchema.eachPath((path) => {
            if (path == "GuildId" || path == "_id" || path == "__v") return;
        
            fields.push({
                label: path,
                value: path,
                description: config?.[path] != null
                    ? "✔ This property has been configured!"
                    : undefined
            });
        });

        const SelectView = new ActionRowBuilder()
            .addComponents([
                new StringSelectMenuBuilder()
                    .setCustomId("ConfigurationSelection")
                    .setOptions(
                        fields.map(field => ({
                            label: field.label,
                            value: field.value,
                            description: field.description
                        }))
                    )
            ])

        const message = await interaction.reply({ embeds: [Embed], components: [SelectView], ephemeral: true });

        const selectInteraction = await message.awaitMessageComponent({
            componentType: ComponentType.StringSelect,
            time: 300000,
            filter: i => i.user.id === interaction.user.id
        });

        const path = selectInteraction.values[0];


        const ConfigurationModal = new ModalBuilder()
            .setCustomId('ConfigurationModal')
            .setTitle("Configuration Modal")
            .addComponents(
                new TextInputBuilder()
                    .setCustomId(path)
                    .setLabel(path)
                    .setStyle('Paragraph')
                    .setRequired(true)
                    .setValue(config?.get(path)?.toString() ?? "")
            );

        await selectInteraction.showModal(ConfigurationModal);

        try {
            const modalInteraction = await interaction.awaitModalSubmit({
                filter: (i) => i.customId === 'ConfigurationModal' && i.user.id === interaction.user.id,
                time: 6000000
            });
        
            await modalInteraction.deferUpdate();

            const NewData = modalInteraction.fields.getTextInputValue(path);

            console.log(path)
            console.log(NewData)

            await Configuration.updateOne(
                { GuildId: modalInteraction.guild.id },
                {
                    $set: {
                        [path]: NewData
                    }
                },
                { upsert: true }
            );

            const Embed = new EmbedBuilder()
                .setTitle('Configuration updated!')
                .setDescription(`${path} has been updated to ${NewData}`)
                .setColor('Blurple')
                .setFooter({
                    text: `Powered by ${interaction.client.user.username}`
                })
                .setTimestamp();
            
            await modalInteraction.editReply({
                embeds: [Embed],
                components: []
            });
        
        } catch (error) {
            if (error.code === 'InteractionCollectorError') {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Oops | Modal Timeout')
                    .setDescription('You took too long to submit the modal.')
                    .setColor('Red')
                    .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                    .setTimestamp();
                await interaction.followUp({ embeds: [embed], components: [] });
            } else {
                throw error;
            }
        }
    }
}

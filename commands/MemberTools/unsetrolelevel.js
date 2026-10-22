const { SlashCommandBuilder, EmbedBuilder, roleMention, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, ActionRowBuilder, ComponentType } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');

const mongoose = require('mongoose');
const Configuration = mongoose.models.Configuration;
const RoleLevel = mongoose.models.RoleLevel;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removerolelevel')
        .setDescription('Unlink a role to a level.'),
    log: true,
    async execute(interaction) {

        const config = await Configuration.findOne({ GuildId: interaction.guild.id });

        if (interaction.user.id != interaction.guild.ownerId) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Permission Denied')
                .setDescription('You are not allowed to use this command!')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const roles = await RoleLevel.find({ GuildId: interaction.guild.id });

        if (roles.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | No Roles Links')
                .setDescription('There are no role linkage registered. Use the /setrolelevel command to add a role first.')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('selectrole')
            .setPlaceholder('Select a role')
            .addOptions(
                roles.slice(0, 25).filter((role) => interaction.guild.roles.cache.get(role.roleId))
                .map(role => ({
                    label: interaction.guild.roles.cache.get(role.roleId).name,
                    value: role._id.toString(),
                }))
            );


        const message = await interaction.reply({
            content: 'Select a role:',
            components: [new ActionRowBuilder().addComponents(selectMenu)],
            ephemeral: true,
            fetchReply: true
        });

        try {
            const selectInteraction = await message.awaitMessageComponent({
                componentType: ComponentType.StringSelect,
                time: 300000,
                filter: i => i.user.id === interaction.user.id
            });

            const roleId = selectInteraction.values[0];

            const roleLevel = await RoleLevel.findOneAndDelete({ _id: roleId, GuildId: interaction.guild.id });

            if (!roleLevel) {
                throw new Error('Selected role level was not found.');
            }

            const role = await interaction.guild.roles.fetch(roleLevel.roleId).catch(() => null);

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Success | Role Unlinked')
                .setDescription(`The role ${role ? role.name : roleLevel.roleId} has been unlinked from level ${roleLevel.level}.`)
                .setColor('Green')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();

            try {
                const LogChannel = await interaction.client.channels.fetch(config.LogsChannelID);
                const LogEmbed = new EmbedBuilder()
                    .setTitle('Role Level Unlinked | Member Update')
                    .setDescription(`The role ${role ? roleMention(role.id) : roleLevel.roleId} was unlinked from level **${roleLevel.level}**.`)
                    .addFields(
                        { name: 'Role ID', value: roleLevel.roleId },
                        { name: 'Level', value: String(roleLevel.level) },
                        { name: 'Unlinked by', value: `<@${interaction.user.id}> (ID: ${interaction.user.id})` }
                    )
                    .setColor('Red')
                    .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                    .setTimestamp();

                await LogChannel.send({ embeds: [LogEmbed] });
            } catch (err) {
                console.error('Failed to send role unlink message to logs channel:', err);
            }

            await interaction.editReply({ content: "", embeds: [successEmbed], components: [], ephemeral: true });
        } catch (err) {
            console.error(err);
            await interaction.followUp({ content: 'You did not respond in time.', ephemeral: true });
        }
    }
}

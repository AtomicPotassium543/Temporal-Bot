const { SlashCommandBuilder, EmbedBuilder, userMention } = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rename')
        .setDescription('Give yourself a new name.')
        .addStringOption(option =>
            option
                .setName("name")
                .setDescription("Name to change it to.")
                .setMaxLength(32)
                .setRequired(true)
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to change the name of.")
                .setRequired(false)
        ),
    log: true,
    async execute(interaction) {
        await interaction.deferReply()

        const newName = interaction.options.getString('name');
        const Target = interaction.options.getUser('user') || interaction.user;

        if (Target.higherRole.position >= interaction.member.roles.highest.position && interaction.user.id != Target.id) {
            const Embed = new EmbedBuilder()
                .setTitle('❌ Oops | Insufficient Permissions')
                .setDescription("You can't change the nickname of a user with a higher role.")
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}` })
                .setTimestamp();

            return interaction.editReply({ embeds: [Embed], ephemeral: true });
        }

        await interaction.member.edit({ nick: newName });

        const Embed = new EmbedBuilder()
            .setTitle('✅ Success | User Action')
            .setDescription(Target == interaction.user.id ? `Your nickname has been set to: ${newName}` : `${userMention(Target.id)} has been set to: ${newName}`)
            .setColor('Green')
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();

        await interaction.editReply({ embeds: [Embed] });
    }
}
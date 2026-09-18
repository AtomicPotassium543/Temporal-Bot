const { SlashCommandBuilder, EmbedBuilder, userMention } = require('discord.js');
const mongoose = require('mongoose');

const Configuration = mongoose.models.Configuration;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rename')
        .setDescription('Give yourself a new name.')
        .addStringOption(option =>
            option
                .setName("name")
                .setDescription("Name to change it to.")
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply()

        const newName = interaction.options.getString('name');

        const config = await Configuration.findOne({ GuildId: interaction.guild.id });
        
        await interaction.member.edit({ nick: newName });

        const Embed = new EmbedBuilder()
            .setTitle('✅ Success | User Action')
            .setDescription(`Your nickname has been set to: ${userMention(interaction.user.id)}`)
            .setColor('Green')
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();

        await interaction.editReply({ embeds: [Embed] });
    }
}
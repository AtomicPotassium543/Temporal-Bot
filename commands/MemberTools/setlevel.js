const { SlashCommandBuilder, EmbedBuilder, userMention } = require('discord.js');

const mongoose = require('mongoose');

const Configuration = mongoose.models.Configuration;
const Level = mongoose.models.Level;
const RoleLevel = mongoose.models.RoleLevel;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlevel')
        .setDescription('Set a user\'s level')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to set the level for')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('level')
                .setDescription('The level to set for the user')
                .setRequired(true)
        ),
    log: true,
    async execute(interaction) {
        await interaction.deferReply({ephemeral: true})

        const user = interaction.options.getUser('user');
        const level = interaction.options.getInteger('level');

        const config = await Configuration.findOne({ GuildId: interaction.guild.id });

        if (interaction.user.id != interaction.guild.ownerId) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Permission Denied')
                .setDescription('You are not allowed to use this command!')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] })
            return
        }

        if (level < 0) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Oops | Invalid Level')
                .setDescription('Level must be a positive integer.')
                .setColor('Red')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

        await Level.findOneAndUpdate(
            { GuildId: interaction.guild.id, userId: user.id },
            { $set: { level: level }, $setOnInsert: { GuildId: interaction.guild.id, userId: user.id, Experience: 0 } },
            { upsert: true }
        );

        const LevelRoles = await RoleLevel.find({
            GuildId: interaction.guild.id,
            level: {"$lte": level}
        }).sort({ fieldName: -1 })

        if (LevelRoles) {
            for (const LevelRole of LevelRoles) {
                if (LevelRole) {
                    const role = await interaction.guild.roles.fetch(LevelRole.roleId);
                    const member = await interaction.guild.members.fetch(interaction.user.id)

                    await member.roles.add(role)
                }
            }
        }

        const Embed = new EmbedBuilder()
            .setTitle('✅ Success! | Level Updated')
            .setDescription(`${userMention(user.id)}'s level has been set to ${level}!`)
            .addFields({
                name: "Moderator",
                value: userMention(interaction.user.id)
            })
            .setColor('Green')
            .setFooter({ text: `Powered by ${interaction.client.user.username}`})
            .setTimestamp();

        try {
            const LogChannel  = await interaction.client.channels.fetch(config.LogsChannelID);
            const LogEmbed = new EmbedBuilder()
                .setTitle('User Level Updated | Member Update')
                .setDescription(`The level for ${userMention(user.id)} was set to **${level}**.`)
                .addFields(
                    { name: 'User ID', value: user.id },
                    { name: 'Level', value: String(level) },
                    { name: 'Set by', value: `${userMention(interaction.user.id)} (ID: ${interaction.user.id})` }
                )
                .setColor('Green')
                .setFooter({ text: `Powered by ${interaction.client.user.username}`})
                .setTimestamp();

            await LogChannel.send({ embeds: [LogEmbed] });
        } catch (err) {
            console.error('Failed to send log message:', err);
        }

        await interaction.editReply({ embeds: [Embed] });
    }
}

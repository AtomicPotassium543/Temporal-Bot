const { Client, ChannelType, Collection, Events } = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
    /**
     * @param {client} Client - The Discord client instance.  
     * @returns {Promise<void>}
     * @throws {Error} If there is an error connecting to the database.
     */

    initialize: async function (client) {

        const Configuration = mongoose.models.Configuration;
        
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
    }
}
const { Client, AttachmentBuilder, Events, ModalBuilder, GatewayIntentBits, Collection, MessageFlags, EmbedBuilder, PermissionFlagsBits, GuildChannel, ChannelType, ActionRowBuilder, ButtonBuilder, InteractionResponse, ButtonStyle, TextInputBuilder, TextInputStyle, channelMention, userMention, ButtonInteraction, roleMention } = require('discord.js');
const { AntiRaidManager } = require('discord-antiraid');

const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');
const mongoose = require('mongoose');

const dotenv = require('dotenv');

dotenv.config()

const TOKEN = process.env.TOKEN
const GUILD_ID = process.env.GUILD_ID
const CLIENT_ID = process.env.CLIENT_ID

const client = new Client({ intents: [Object.values(GatewayIntentBits)] });

// Message for logging in the client.
client.on(Events.ClientReady, readyClient => {
    console.log(`Logged in as ${readyClient.user.tag}!`);
});

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

        const systemPath = path.join(__dirname, "systems");

        let systemFiles = fs.readdirSync(systemPath)
            .filter(file => file.endsWith(".js"));

        const db_index = systemFiles.findIndex(element => element === "db.js")
        const [element] = systemFiles.splice(db_index, 1)
        
        systemFiles.unshift(element)

        // Initialize systems
        for (const file of systemFiles) {
            const filePath = path.join(systemPath, file);

            try {
                const system = require(filePath);

                if (!system.initialize) {
                    console.warn(`Skipping invalid system: ${file}`);
                    continue;
                }

                await system.initialize(client);

                console.log(`Initialized system: ${filePath}`);
            } catch (err) {
                console.error(`Failed to initialize ${filePath}:`, err);
            }
        }

        const eventPath = path.join(__dirname, "events", file);

        const eventFiles = fs.readdirSync(systemPath)
            .filter(file => file.endsWith(".js"));

        // Initialize systems
        for (const file of eventFiles) {
            const filePath = path.join(eventPath, file);

            try {
                const system = require(filePath);

                if (!system.initialize) {
                    console.warn(`Skipping invalid system: ${file}`);
                    continue;
                }

                await system.initialize(client);

                console.log(`Initialized system: ${filePath}`);
            } catch (err) {
                console.error(`Failed to initialize ${filePath}:`, err);
            }
        }

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

        // Register commands
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
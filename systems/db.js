const { Client, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const axios = require('axios');
const cron = require('node-cron');

module.exports = {
    /**
     * @param {client} Client - The Discord client instance.  
     * @returns {Promise<void>}
     * @throws {Error} If there is an error connecting to the database.
     */

    initialize: async function (client) {
        try {
            await mongoose.connect(process.env.MONGODB_URI);
            
            const Configuration = mongoose.model('Configuration', new mongoose.Schema({
                GuildId: String,
                StaffRoleID: String,
                TicketViewerId: String,
                InfectedRoleID: String,
                AfkRoleID: String,
                LogsChannelID: String,
                LevelsChannelID: String,
                CakeGiftMessage: String,
                BackupCreateInterval: Number,
                BackupDeleteInterval: Number,
                BlacklistedWords: String,
                BoosterChannelID: String,
                StarChannelIDs: String,
                FeaturedChannelID: String,
                FeaturedRoleID: String,
                ReactionRequirement: Number,
                VerificationChannelID: String,
                VerificationMessageID: String,
                VerifiedRoleID: String,
                UnVerifiedRoleID: String
            }));
            
            mongoose.model('backup', new mongoose.Schema({
                GuildId: String,
                timestamp: Number,
                channels: Array,
                roles: Array,
                configuration: Object,
                automatic: Boolean
            }));

            mongoose.model('AutoBackupLogs', new mongoose.Schema({
                GuildId: String,
                timestamp: Number,
                backupId: String
            }));
            
            mongoose.model('Level', new mongoose.Schema({
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
            }));
            
            mongoose.model('RoleLevel', new mongoose.Schema({
                GuildId: String,
                roleId: String,
                level: Number
            }));
            
            mongoose.model('Ticket', new mongoose.Schema({
                GuildId: String,
                userId: String,
                ticketId: String,
                configurationId: String,
                messages: String
            }));
            
            mongoose.model('TicketConfiguration', new mongoose.Schema({
                GuildId: String,
                name: String,
                reason: String,
                TicketCategoryId: String,
                TicketChannelId: String,
                TicketMessageId: String
            }));

            mongoose.model('Warning', new mongoose.Schema({
                GuildId: String,
                userId: String,
                moderatorId: String,
                reason: String,
                timestamp: Date
            }));

            mongoose.model('OAuth2Verification', new mongoose.Schema({
                GuildId: String,
                RobloxId: {
                    type: String,
                    default: ""
                },
                DiscordId: String,
                WebVerified: Boolean
            }));

            mongoose.model('Verification', new mongoose.Schema({
                GuildId: String,
                RobloxId: String,
                DiscordId: String,
                Verified: {
                    type: Boolean,
                    default: false
                }
            }));

            mongoose.model('Game', new mongoose.Schema({
                GuildId: String,
                name: String,
                information: String,
                releaseDate: String
            }));
            
            mongoose.model('Character', new mongoose.Schema({
                GuildId: String,
                name: String,
                information: String
            }));

            console.log('Initialized MongoDB!');
        } catch (error) {
            console.error('Error initializing MongoDB:', error);
        }
    }
}
import "dotenv/config";

if (!process.env.DISCORD_TOKEN) {
  throw new Error("[System] Missing DISCORD_TOKEN.");
}

if (!process.env.MONGODB_URI) {
  throw new Error("[System] Missing MONGODB_URI.");
}

if (!process.env.DISCORD_GUILD_ID) {
  throw new Error("[System] Missing DISCORD_GUILD_ID.");
}

if (!process.env.BOT_LOGS_ID) {
  throw new Error("[System] Missing BOT_LOGS_ID.");
}

if (!process.env.QUOTA_REMINDER_CHANNEL_ID) {
  throw new Error("[System] Missing QUOTA_REMINDER_CHANNEL_ID.");
}

export const config = {
  discordToken: process.env.DISCORD_TOKEN,

  mongodbUri: process.env.MONGODB_URI,

  discordGuildId: process.env.DISCORD_GUILD_ID,

  logsChannelId: process.env.BOT_LOGS_ID,

  quotaReminderChannelId: process.env.QUOTA_REMINDER_CHANNEL_ID,
};

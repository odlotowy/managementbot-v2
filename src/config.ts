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

if (!process.env.QUOTA_LOG_CHANNEL_ID) {
  throw new Error("[System] Missing QUOTA_LOG_CHANNEL_ID.");
}

if (!process.env.SOTM_REQUESTS_ID) {
  throw new Error("[System] Missing SOTM_REQUESTS_ID.");
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error("[System] Missing OPENAI_API_KEY.");
}

if (!process.env.OPENAI_TRANSCRIPTION_MODEL) {
  throw new Error("[System] Missing OPENAI_TRANSCRIPTION_MODEL.");
}

if (!process.env.OPENAI_SUMMARY_MODEL) {
  throw new Error("[System] Missing OPENAI_SUMMARY_MODEL.");
}

export const config = {
  discordToken: process.env.DISCORD_TOKEN,

  mongodbUri: process.env.MONGODB_URI,

  discordGuildId: process.env.DISCORD_GUILD_ID,

  logsChannelId: process.env.BOT_LOGS_ID,

  quotaLogChannelId: process.env.QUOTA_LOG_CHANNEL_ID,

  sotmRequestsId: process.env.SOTM_REQUESTS_ID,

  OPENAI_API_KEY: process.env.OPENAI_API_KEY,

  OPENAI_TRANSCRIPTION_MODEL: process.env.OPENAI_TRANSCRIPTION_MODEL,

  OPENAI_SUMMARY_MODEL: process.env.OPENAI_SUMMARY_MODEL,
};

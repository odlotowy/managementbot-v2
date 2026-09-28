import { connectDatabase, disconnectDatabase } from "./database";
import dns from "dns";
import "./health";

import { DiscordBot } from "./discord/DiscordBot";
import { config } from "./config";
import { registerModMail } from "./systems/ModMailSystem";

async function main(): Promise<void> {
  console.log("");
  console.log("========================================");
  console.log("       FRESHWAY MANAGEMENT DISCORD BOT ");
  console.log("========================================");
  console.log("");

  dns.setServers(["0.0.0.0", "1.1.1.1"]);

  const discord = new DiscordBot();

  process.on("unhandledRejection", async (reason) => {
    console.error("[Process] Unhandled Promise Rejection:", reason);

    await discord.logger.fatal(
      "Unhandled Promise Rejection",
      reason,
      "A Promise rejection was not handled.",
    );
  });

  process.on("uncaughtException", async (error) => {
    console.error("[Process] Uncaught Exception:", error);

    await discord.logger.fatal(
      "Uncaught Exception",
      error,
      "An uncaught exception occurred.",
    );

    setTimeout(() => {
      process.exit(1);
    }, 1500);
  });

  process.on("warning", async (warning) => {
    console.warn("[Process] Warning:", warning);

    await discord.logger.warn("Node.js Warning", warning.message, {
      name: warning.name,
      stack: warning.stack,
    });
  });

  try {
    await connectDatabase(discord.logger, config.mongodbUri);

    registerModMail(discord.client);

    await discord.start();
  } catch (error) {
    console.error("[Startup] Fatal error:", error);

    await discord.logger.fatal("Fatal Startup Error", error);

    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  console.log("[System] Shutting down...");

  await disconnectDatabase();

  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("[System] Shutting down...");

  await disconnectDatabase();

  process.exit(0);
});

main().catch(async (error) => {
  console.log("[System] Fatal error:", error);

  await disconnectDatabase();

  process.exit(1);
});

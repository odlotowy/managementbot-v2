import { connectDatabase, disconnectDatabase } from "./database.js";
import dns from "dns";
import { startHealthServer } from "./health.js";

import { DiscordBot } from "./discord/DiscordBot.js";
import { config } from "./config.js";
import { registerModMail } from "./systems/ModMailSystem.js";

const gatewayMonitorUrl = process.env.BOT_MONITOR_URL;
const gatewayMonitorSecret = process.env.BOT_MONITOR_SECRET;

async function main(): Promise<void> {
  console.log("");
  console.log("========================================");
  console.log("       FRESHWAY MANAGEMENT DISCORD BOT ");
  console.log("========================================");
  console.log("");

  dns.setServers(["0.0.0.0", "1.1.1.1"]);

  const discord = new DiscordBot();
  let gatewayStatus: "ready" | "disconnected" | "reconnecting" = "disconnected";
  let heartbeatInterval: ReturnType<typeof setInterval> | undefined;

  // Track the actual Discord Gateway WebSocket state, not the REST API state.
  discord.client.on("ready", () => {
    gatewayStatus = "ready";
  });
  discord.client.on("shardReady", () => {
    gatewayStatus = "ready";
  });
  discord.client.on("shardDisconnect", () => {
    gatewayStatus = "disconnected";
  });
  discord.client.on("shardReconnecting", () => {
    gatewayStatus = "reconnecting";
  });
  discord.client.on("shardResume", () => {
    gatewayStatus = "ready";
  });

  async function sendGatewayHeartbeat(): Promise<void> {
    if (!gatewayMonitorUrl || !gatewayMonitorSecret) return;

    // isReady() is authoritative for the current client state between events.
    if (discord.client.isReady()) gatewayStatus = "ready";
    else if (gatewayStatus === "ready") gatewayStatus = "disconnected";

    const memoryUsageMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
    const ping = discord.client.ws.ping;

    try {
      const response = await fetch(gatewayMonitorUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-bot-monitor-secret": gatewayMonitorSecret,
        },
        body: JSON.stringify({
          gatewayStatus,
          pingMs: Number.isFinite(ping) && ping >= 0 ? ping : null,
          uptimeSeconds: Math.floor(process.uptime()),
          memoryUsageMb,
          shardId: 0,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        console.error(`[Monitor] Heartbeat rejected: HTTP ${response.status}`);
      }
    } catch (error) {
      console.error("[Monitor] Could not send Gateway heartbeat:", error);
    }
  }

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

    startHealthServer(discord.client);

    await discord.start();

    if (gatewayMonitorUrl && gatewayMonitorSecret) {
      await sendGatewayHeartbeat();
      heartbeatInterval = setInterval(() => {
        void sendGatewayHeartbeat();
      }, 30_000);
      console.log("[Monitor] Gateway heartbeat enabled.");
    } else {
      console.warn(
        "[Monitor] Gateway heartbeat disabled. Set BOT_MONITOR_URL and BOT_MONITOR_SECRET.",
      );
    }
  } catch (error) {
    console.error("[Startup] Fatal error:", error);

    await discord.logger.fatal("Fatal Startup Error", error);

    process.exit(1);
  }

  async function shutdown() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    await disconnectDatabase();
    process.exit(0);
  }

  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
}

main().catch(async (error) => {
  console.log("[System] Fatal error:", error);

  await disconnectDatabase();

  process.exit(1);
});

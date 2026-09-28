import { REST, Routes } from "discord.js";
import { config } from "../config";

async function clearCommands() {
  if (!config.discordToken) {
    throw new Error("Missing Discord token.");
  }

  if (!config.discordGuildId) {
    throw new Error("Missing Discord guild ID.");
  }

  const rest = new REST({ version: "10" }).setToken(config.discordToken);

  console.log("[Commands] Removing all registered guild commands...");

  await rest.put(
    Routes.applicationGuildCommands(
      "1523422601194635334",
      config.discordGuildId,
    ),
    {
      body: [],
    },
  );

  console.log("[Commands] Successfully removed all guild commands.");

  await rest.put(Routes.applicationCommands("1523422601194635334"), {
    body: [],
  });

  console.log("[Commands] Successfully removed all global commands.");
}

clearCommands().catch((error) => {
  console.error("[Commands] Failed to remove commands:", error);
  process.exit(1);
});

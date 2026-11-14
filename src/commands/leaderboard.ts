import {
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageFlags,
  SeparatorBuilder,
  SlashCommandBuilder,
  TextDisplayBuilder,
} from "discord.js";
import { config } from "../config.js";

interface LeaderboardEntry {
  count: number;
  discordId?: string;
  globalName?: string;
  username?: string;
}

interface LeaderboardResponse {
  selected: string;
  entries: LeaderboardEntry[];
}

export default {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the current management leaderboard."),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    try {
      const apiUrl = config.MANAGEMENT_API_URL;
      const botToken = config.discordToken;

      const response = await fetch(
        `${apiUrl.replace(/\/$/, "")}/api/bot/leaderboard`,
        {
          headers: {
            Authorization: `Bot ${botToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Leaderboard API returned ${response.status}.`);
      }

      const data = (await response.json()) as LeaderboardResponse;

      const container = new ContainerBuilder()
        .setAccentColor(0x5865f2)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "# Management Leaderboard\nCurrent weekly activity rankings.",
          ),
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true));

      if (!data.entries.length) {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "There are currently no approved tasks recorded this week.",
          ),
        );
      } else {
        const medals = ["🥇", "🥈", "🥉"];

        const rankings = data.entries.map((entry, index) => {
          const position = medals[index] ?? `**${index + 1}.**`;

          const user = entry.discordId
            ? `<@${entry.discordId}>`
            : (entry.globalName ?? entry.username ?? "Unknown user");

          const taskLabel = entry.count === 1 ? "task" : "tasks";

          return `${position} ${user} — **${entry.count} ${taskLabel}**`;
        });

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(rankings.join("\n")),
        );
      }

      container
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `-# Showing ${data.entries.length} managers • Approved tasks only`,
          ),
        );

      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: {
          parse: [],
        },
      });
    } catch (error) {
      console.error("[Leaderboard Command]", error);

      await interaction.editReply({
        content: "Unable to retrieve the leaderboard. Please try again later.",
      });
    }
  },
};

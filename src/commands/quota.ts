import {
  ChannelType,
  ChatInputCommandInteraction,
  Colors,
  ContainerBuilder,
  MessageFlags,
  SeparatorBuilder,
  SlashCommandBuilder,
  TextDisplayBuilder,
} from "discord.js";
import Manager from "../schemas/Manager";
import { config } from "../config";

async function sendQuotaLog(
  interaction: ChatInputCommandInteraction,
  type: "Shift" | "Ticket",
  count: number,
  messageUrl: string,
): Promise<void> {
  const channel = await interaction.client.channels.fetch(
    config.quotaLogChannelId,
  );

  if (
    !channel ||
    (channel.type !== ChannelType.GuildText &&
      channel.type !== ChannelType.GuildAnnouncement)
  ) {
    throw new Error("Quota logs channel not found or invalid.");
  }

  const container = new ContainerBuilder()
    .setAccentColor(Colors.DarkGreen)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## New ${type} has been logged\n`),
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**User:** <@${interaction.user.id}>\n**Discord ID:** ${interaction.user.id}\n**Type:** ${type}\n**Current quota:** ${count}/2\n**Date:** <t:${Math.floor(Date.now() / 1000)}:F>\n**Evidence:** [View Message](${messageUrl})`,
      ),
    );

  await channel.send({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
    allowedMentions: {
      users: [],
    },
  });
}

export default {
  data: new SlashCommandBuilder()
    .setName("quota")
    .setDescription("Log your quota")
    .addSubcommand((sub) =>
      sub
        .setName("shift")
        .setDescription("Log a shift")
        .addStringOption((o) =>
          o
            .setName("message_url")
            .setDescription("Provide a link to the shift log")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("ticket")
        .setDescription("Log a ticket")
        .addStringOption((o) =>
          o
            .setName("message_url")
            .setDescription("Provide a link to the ticket log")
            .setRequired(true),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: 64 });

    try {
      const subcommand = interaction.options.getSubcommand();
      const messageUrl = interaction.options.getString("message_url", true);

      let url: URL;

      try {
        url = new URL(messageUrl);
      } catch {
        await interaction.editReply(
          "Please provide a valid Discord message link.",
        );
        return;
      }

      const validHosts = [
        "discord.com",
        "www.discord.com",
        "discordapp.com",
        "www.discordapp.com",
      ];

      const isValidDiscordLink =
        validHosts.includes(url.hostname) &&
        /^\/channels\/\d+\/\d+\/\d+$/.test(url.pathname);

      if (url.protocol !== "https:" || !isValidDiscordLink) {
        await interaction.editReply(
          "Please provide a valid Discord message link.",
        );
        return;
      }

      const manager = await Manager.findOne({
        discordId: interaction.user.id,
      });

      if (!manager) {
        await interaction.editReply(
          "You do not have a Manager profile in the database.",
        );
        return;
      }

      // Log shift
      if (subcommand === "shift") {
        const updatedManager = await Manager.findOneAndUpdate(
          { discordId: interaction.user.id },
          {
            $inc: { shifts: 1 },
            $push: { shiftLogs: messageUrl },
          },
          { returnDocument: "before" },
        );

        if (!updatedManager) {
          await interaction.editReply(
            "Your Manager profile could not be found.",
          );
          return;
        }

        await sendQuotaLog(
          interaction,
          "Shift",
          updatedManager.shifts,
          messageUrl,
        );

        await interaction.editReply({
          content:
            `Your shift has been logged successfully.\n\n` +
            `**Shifts:** ${updatedManager.shifts}/2\n` +
            `**Log:** ${messageUrl}`,
        });

        return;
      }

      // Log ticket
      if (subcommand === "ticket") {
        const updatedManager = await Manager.findOneAndUpdate(
          { discordId: interaction.user.id },
          {
            $inc: { tickets: 1 },
            $push: { ticketLogs: messageUrl },
          },
          { returnDocument: "before" },
        );

        if (!updatedManager) {
          await interaction.editReply(
            "Your Manager profile could not be found.",
          );
          return;
        }

        await sendQuotaLog(
          interaction,
          "Ticket",
          updatedManager.tickets,
          messageUrl,
        );

        await interaction.editReply({
          content:
            `Your ticket has been logged successfully.\n\n` +
            `**Tickets:** ${updatedManager.tickets}/2\n` +
            `**Log:** ${messageUrl}`,
        });
      }
    } catch (error) {
      console.error("[Quota] Failed to log quota:", error);

      await interaction.editReply(
        "An error occurred while logging your quota. Please try again later.",
      );
    }
  },
};

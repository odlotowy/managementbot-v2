import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { WeeklyQuotaSystem } from "../systems/WeeklyQuotaReminder";

export default {
  data: new SlashCommandBuilder()
    .setName("quota-test")
    .setDescription("Test the weekly quota system.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({
      flags: 64,
    });

    try {
      const quotaSystem = new WeeklyQuotaSystem(interaction.client);

      await quotaSystem.sendTest();

      await interaction.editReply(
        "The quota check has been completed. Every manager has been sent their quota status.",
      );
    } catch (error) {
      console.error("[QuotaTest] Failed to run quota check:", error);

      await interaction.editReply(
        "Failed to run the quota check. Check the bot logs.",
      );
    }
  },
};

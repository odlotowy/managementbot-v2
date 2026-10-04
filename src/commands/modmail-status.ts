import {
  ChannelType,
  ChatInputCommandInteraction,
  Colors,
  ContainerBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SeparatorBuilder,
  SlashCommandBuilder,
  TextDisplayBuilder,
} from "discord.js";

import ModMailSettings from "../schemas/ModMailSettings";
import { MODMAIL_CONFIG } from "../config/modmail";

const config = MODMAIL_CONFIG;

export default {
  data: new SlashCommandBuilder()
    .setName("modmail")
    .setDescription("Manage the ModMail system.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand.setName("enable").setDescription("Enable the ModMail system."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("disable")
        .setDescription("Disable the ModMail system."),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const enabled = subcommand === "enable";

    const settings = await ModMailSettings.findOneAndUpdate(
      { guildId: interaction.guildId },
      {
        $set: { enabled },
        $setOnInsert: { guildId: interaction.guildId },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      },
    );

    await interaction.reply({
      content: enabled
        ? "ModMail has been **enabled**. Users can now create new conversations."
        : "ModMail has been **disabled**. Users cannot create new conversations.",
      flags: MessageFlags.Ephemeral,
    });

    // Create log container
    const logContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## ${enabled ? "<:check:1525789302989258972> ModMail Enabled" : "<:cross1:1525789345376768020> ModMail Disabled"}\n` +
            `The ModMail system has been **${enabled ? "enabled" : "disabled"}**.`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Changed by:** ${interaction.user} (\`${interaction.user.id}\`)\n` +
            `**Status:** ${settings.enabled ? "Enabled" : "Disabled"}\n` +
            `**Server:** ${interaction.guild.name} (\`${interaction.guildId}\`)\n` +
            `**Date:** <t:${Math.floor(Date.now() / 1000)}:F>`,
        ),
      );

    // Send log
    const logChannel = await interaction.guild.channels.fetch(
      MODMAIL_CONFIG.logChannelId,
    );

    if (logChannel?.type === ChannelType.GuildText && logChannel.isSendable()) {
      await logChannel.send({
        components: [logContainer],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: {
          parse: [],
        },
      });
    }
  },
};

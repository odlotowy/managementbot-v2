import {
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SeparatorBuilder,
  SlashCommandBuilder,
  TextDisplayBuilder,
} from "discord.js";
import { WarningModel } from "../schemas/Warning.js";
import { ParseDuration, FormatDuration } from "../util/ParseDuration.js";

const logchannelid = "1561746687020638218";

async function logWarning(
  interaction: ChatInputCommandInteraction,
  details: {
    action: string;
    targetId: string;
    moderatorId: string;
    reason: string;
    duration?: string;
    expiresAt?: Date;
    dmSent?: boolean;
    error?: unknown;
  },
): Promise<void> {
  const channel = await interaction.client.channels
    .fetch(logchannelid)
    .catch(() => null);

  if (!channel?.isTextBased() || !("send" in channel)) {
    console.error(
      `[Warning Logs] Logging channel unavailable: ${details.action}`,
    );
    return;
  }

  const isSuccess = details.action === "Warning Applied";

  const container = new ContainerBuilder()
    .setAccentColor(isSuccess ? 0xe67e22 : 0xe74c3c)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Warning: ${details.action}\n` +
          `**Member:** <@${details.targetId}>\n` +
          `**Member ID:** \`${details.targetId}\`\n` +
          `**Moderator:** <@${details.moderatorId}>\n` +
          `**Moderator ID:** \`${details.moderatorId}\``,
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Reason:** ${details.reason.slice(0, 1500)}`,
      ),
    );

  if (details.duration || details.expiresAt || details.dmSent !== undefined) {
    container.addSeparatorComponents(new SeparatorBuilder());

    const fields: string[] = [];

    if (details.duration) {
      fields.push(`**Duration:** ${details.duration}`);
    }

    if (details.expiresAt) {
      const timestamp = Math.floor(details.expiresAt.getTime() / 1000);

      fields.push(
        `**Expires:** <t:${timestamp}:F>`,
        `**Relative Expiration:** <t:${timestamp}:R>`,
      );
    } else if (details.duration === "Permanent") {
      fields.push("**Expiration:** Never");
    }

    if (details.dmSent !== undefined) {
      fields.push(`**DM Delivered:** ${details.dmSent ? "Yes" : "No"}`);
    }

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(fields.join("\n")),
    );
  }

  if (details.error !== undefined) {
    console.error(`[Warning Logs] ${details.action}:`, details.error);

    container
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Error:**\n\`\`\`\n${String(details.error).slice(0, 900)}\n\`\`\``,
        ),
      );
  }

  container
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# Warning logging • ${new Date().toISOString()}`,
      ),
    );

  try {
    await channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    console.error("[Warning Logs] Failed to send log:", error);
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Issue a warning")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The member to warn.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("duration")
        .setDescription(
          "Optional duration, e.g. 5s, 10m, 2h, 10d. Omit for permanent.",
        )
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the warning.")
        .setMaxLength(500)
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({
      flags: 64,
    });

    const user = interaction.options.getUser("user", true);
    const durationInput = interaction.options.getString("duration");
    const reason =
      interaction.options.getString("reason") ?? "No reason provided.";

    if (user.id === interaction.user.id) {
      await interaction.editReply("You cannot warn yourself.");
      return;
    }

    if (user.id === interaction.client.user?.id) {
      await interaction.editReply("You cannot warn the bot.");
      return;
    }

    const member = await interaction.guild.members
      .fetch(user.id)
      .catch(() => null);

    if (!member) {
      await interaction.editReply(
        "The selected user is not a member of this server.",
      );
      return;
    }

    let durationMs: number | null = null;
    let expiresAt: Date | undefined;
    let durationLabel = "Permanent";

    if (durationInput !== null) {
      durationMs = ParseDuration(durationInput);

      if (durationMs === null || durationMs <= 0) {
        await interaction.editReply(
          "Invalid duration. Use a value such as `5s`, `10m`, `2h`, or `10d`, or omit the duration for a permanent warning.",
        );
        return;
      }

      expiresAt = new Date(Date.now() + durationMs);
      durationLabel = FormatDuration(durationMs);
    }

    let warning;

    try {
      warning = await WarningModel.create({
        guildId: interaction.guild.id,
        userId: member.id,
        moderatorId: interaction.user.id,
        reason,
        duration: durationMs,
        expiresAt: expiresAt ?? null,
        active: true,
      });
    } catch (error) {
      await logWarning(interaction, {
        action: "Warning Could Not Be Saved",
        targetId: member.id,
        moderatorId: interaction.user.id,
        reason,
        duration: durationLabel,
        expiresAt,
        error,
      });

      await interaction.editReply(
        "The warning could not be saved to the database.",
      );
      return;
    }

    const container = new ContainerBuilder()
      .setAccentColor(0xe67e22)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "# Management Department Warning\n" +
            "Following a review of a recent incident, the Management Leadership Team has decided to issue you an **official warning**.",
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "This warning has been issued because your actions or behaviour did not meet the professional standards and expectations required of members of the Management Department. As a leadership representative, you are expected to set a positive example, act professionally, and follow all departmental procedures and policies.",
        ),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "Please treat this warning as a formal reminder to improve going forward. Any further misconduct, repeated concerns, or failure to meet expectations may lead to additional disciplinary action, including strikes, suspension, demotion, or removal from the department.",
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Server:** ${interaction.guild.name}\n` +
            `**Duration:** ${durationLabel}\n` +
            `**Reason:** ${reason}\n` +
            `**Issued by:** ${interaction.user.tag}\n` +
            (expiresAt
              ? `**Expires:** <t:${Math.floor(expiresAt.getTime() / 1000)}:F>\n` +
                `**Time remaining:** <t:${Math.floor(expiresAt.getTime() / 1000)}:R>`
              : "**Expires:** Never"),
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "If you believe this warning was issued incorrectly or would like to provide further context regarding the situation, you may contact a member of the Management Leadership Team for a review.",
        ),
      );

    let dmSent = true;

    try {
      await member.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      dmSent = false;
    }

    await WarningModel.updateOne({ _id: warning._id }, { $set: { dmSent } });

    await logWarning(interaction, {
      action: "Warning Applied",
      targetId: member.id,
      moderatorId: interaction.user.id,
      reason,
      duration: durationLabel,
      expiresAt,
      dmSent,
    });

    await interaction.editReply(
      `Successfully warned ${member.user.tag}. Duration: **${durationLabel}**.` +
        (dmSent
          ? " A DM was sent."
          : " The user has DMs disabled or could not be reached."),
    );
  },
};

import {
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SeparatorBuilder,
  SlashCommandBuilder,
  TextDisplayBuilder,
} from "discord.js";
import { SuspensionModel } from "../schemas/Suspension.js";
import { ParseDuration, FormatDuration } from "../util/ParseDuration.js";

const logchannelid = "1561746687020638218";

async function logSuspension(
  interaction: ChatInputCommandInteraction,
  details: {
    action: string;
    targetId: string;
    moderatorId: string;
    reason: string;
    duration?: string;
    expiresAt?: Date;
    rolesRemoved?: number;
    dmSent?: boolean;
    error?: unknown;
  },
): Promise<void> {
  const channel = await interaction.client.channels
    .fetch(logchannelid)
    .catch(() => null);

  if (!channel?.isTextBased() || !("send" in channel)) {
    console.error(
      `[Suspension Logs] Logging channel unavailable: ${details.action}`,
    );
    return;
  }

  const isSuccess = details.action === "Suspension Applied";

  const container = new ContainerBuilder()
    .setAccentColor(isSuccess ? 0x2ecc71 : 0xe74c3c)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Suspension: ${details.action}\n` +
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

  if (
    details.duration ||
    details.expiresAt ||
    details.rolesRemoved !== undefined ||
    details.dmSent !== undefined
  ) {
    container.addSeparatorComponents(new SeparatorBuilder());

    const fields: string[] = [];

    if (details.duration) {
      fields.push(`**Duration:** ${details.duration}`);
    }

    if (details.expiresAt) {
      fields.push(
        `**Expires:** <t:${Math.floor(details.expiresAt.getTime() / 1000)}:F>`,
        `**Relative Expiration:** <t:${Math.floor(details.expiresAt.getTime() / 1000)}:R>`,
      );
    }

    if (details.rolesRemoved !== undefined) {
      fields.push(`**Roles Removed:** ${details.rolesRemoved}`);
    }

    if (details.dmSent !== undefined) {
      fields.push(`**DM Delivered:** ${details.dmSent ? "Yes" : "No"}`);
    }

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(fields.join("\n")),
    );
  }

  if (details.error !== undefined) {
    console.error(`[Suspension Logs] ${details.action}:`, details.error);

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
        `-# Suspension logging • ${new Date().toISOString()}`,
      ),
    );

  try {
    await channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: {
        parse: [],
      },
    });
  } catch (error) {
    console.error("[Suspension Logs] Failed to send log:", error);
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName("suspend")
    .setDescription("Temporarilly suspend a department member.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The member to suspend.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("duration")
        .setDescription("Duration, e.g. 5s, 10m, 2h, 10d.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the suspension.")
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
      flags: MessageFlags.Ephemeral,
    });

    const target = interaction.options.getMember("user");
    const user = interaction.options.getUser("user", true);
    const durationInput = interaction.options.getString("duration", true);
    const reason =
      interaction.options.getString("reason") ?? "No reason provided.";

    const durationMs = ParseDuration(durationInput);

    if (durationMs === null) {
      await interaction.editReply(
        "Invalid duration. Use a value such as `5s`, `10m`, `2h`, or `10d`.",
      );
      return;
    }

    const member =
      target && "roles" in target && "id" in target
        ? target
        : await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      await interaction.editReply(
        "The selected user is not a member of this server.",
      );
      return;
    }

    if (member.id === interaction.user.id) {
      await interaction.editReply("You cannot suspend yourself.");
      return;
    }

    if (member.id === interaction.client.user?.id) {
      await interaction.editReply("You cannot suspend the bot.");
      return;
    }

    if (
      member.roles.highest.position >=
      (await interaction.guild.members.fetchMe()).roles.highest.position
    ) {
      await interaction.editReply(
        "I cannot manage this member because their highest role is equal to or higher than my highest role.",
      );
      return;
    }

    const suspensionRoleId = "1553788778802323627";

    const suspensionRole = interaction.guild.roles.cache.get(suspensionRoleId);

    if (
      !suspensionRole ||
      suspensionRole.managed ||
      suspensionRole.position >=
        (await interaction.guild.members.fetchMe()).roles.highest.position
    ) {
      await interaction.editReply(
        "The suspension role is missing or cannot be managed by the bot.",
      );
      return;
    }

    if (member.roles.cache.has(suspensionRoleId)) {
      await interaction.editReply(
        "This member already has the suspension role.",
      );
      return;
    }

    const existing = await SuspensionModel.findOne({
      guildId: interaction.guild.id,
      userId: member.id,
      active: true,
    });

    if (existing) {
      await interaction.editReply(
        "This member already has an active suspension.",
      );
      return;
    }

    // Only save ordinary roles the bot can actually remove and restore.
    const rolesToRemove = member.roles.cache.filter(
      (role) =>
        role.id !== interaction.guild!.id &&
        role.id !== suspensionRoleId &&
        !role.managed &&
        role.position < interaction.guild!.members.me!.roles.highest.position,
    );

    const expiresAt = new Date(Date.now() + durationMs);

    // Save the suspension before changing roles so it survives a restart.
    const suspension = await SuspensionModel.create({
      guildId: interaction.guild.id,
      userId: member.id,
      moderatorId: interaction.user.id,
      reason,
      roleIds: [...rolesToRemove.keys()],
      expiresAt,
      active: true,
    });

    try {
      if (rolesToRemove.size > 0) {
        await member.roles.remove(
          [...rolesToRemove.keys()],
          `Suspended by ${interaction.user.tag}: ${reason}`,
        );
      }

      await member.roles.add(
        suspensionRole,
        `Suspended by ${interaction.user.tag}: ${reason}`,
      );
    } catch (error) {
      console.error("Failed to apply suspension:", error);

      // Best-effort rollback if the role changes failed partway through.
      try {
        const currentMember = await interaction.guild.members.fetch(member.id);

        if (currentMember.roles.cache.has(suspensionRoleId)) {
          await currentMember.roles.remove(
            suspensionRole,
            "Rolling back failed suspension",
          );
        }

        const stillRestorable = [...rolesToRemove.keys()].filter((id) => {
          const role = interaction.guild!.roles.cache.get(id);

          return Boolean(
            role &&
            !role.managed &&
            role.position <
              interaction.guild!.members.me!.roles.highest.position,
          );
        });

        if (stillRestorable.length > 0) {
          await currentMember.roles.add(
            stillRestorable,
            "Rolling back failed suspension",
          );
        }
      } catch (rollbackError) {
        console.error("Suspension rollback failed:", rollbackError);
      }

      await SuspensionModel.deleteOne({ _id: suspension._id });

      await logSuspension(interaction, {
        action: "Suspension could not be applied",
        targetId: member.id,
        moderatorId: interaction.user.id,
        reason,
        duration: FormatDuration(durationMs),
        expiresAt,
        rolesRemoved: rolesToRemove.size,
        error,
      });

      await interaction.editReply(
        "The suspension could not be applied. Check the bot's role hierarchy and permissions.",
      );
      return;
    }

    const container = new ContainerBuilder()
      .setAccentColor(0xe74c3c)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "# Account Suspended\n" +
            "Following a review conducted by the Management Leadership Team, you have been placed under departmental suspension.",
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "During your suspension, you are temporarily relieved of your duties and responsibilities within the Management Department. You are not permitted to perform department-related tasks or represent the department until your suspension has concluded or further instructions have been provided.",
        ),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "Please use this time to reflect on the situation and ensure that any future conduct aligns with the standards and expectations of the Management Department. Depending on the outcome of the suspension, further action may be taken, including an extension of the suspension, demotion, or termination.",
        ),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "If you believe this suspension was issued incorrectly or you would like to provide additional context, you may contact a member of the Management Leadership Team for further review.",
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Server:** ${interaction.guild.name}\n` +
            `**Duration:** ${FormatDuration(durationMs)}\n` +
            `**Reason:** ${reason}\n` +
            `**Issued by:** ${interaction.user.tag}\n` +
            `**Expires:** <t:${Math.floor(expiresAt.getTime() / 1000)}:F>\n` +
            `**Time remaining:** <t:${Math.floor(expiresAt.getTime() / 1000)}:R>`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "Your previous roles will be restored when the suspension expires, provided those roles still exist and can be assigned by the bot.",
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

    await logSuspension(interaction, {
      action: "Suspension Applied",
      targetId: member.id,
      moderatorId: interaction.user.id,
      reason,
      duration: FormatDuration(durationMs),
      expiresAt,
      rolesRemoved: rolesToRemove.size,
      dmSent,
    });

    await interaction.editReply(
      `Successfully suspended ${member.user.tag} for ${FormatDuration(durationMs)}.` +
        (dmSent
          ? " A DM was sent."
          : " The user has DMs disabled or could not be reached."),
    );
  },
};

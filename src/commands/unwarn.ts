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

const logchannelid = "1561746687020638218";

export default {
  data: new SlashCommandBuilder()
    .setName("unwarn")
    .setDescription("Remove a member's most recent active warning.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The member whose warning should be removed.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for removing the warning.")
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

    const user = interaction.options.getUser("user", true);
    const reason =
      interaction.options.getString("reason") ?? "No reason provided.";

    const warning = await WarningModel.findOneAndUpdate(
      {
        guildId: interaction.guild.id,
        userId: user.id,
        active: true,
      },
      {
        $set: {
          active: false,
          revokedBy: interaction.user.id,
          revokedAt: new Date(),
          revocationReason: reason,
        },
      },
      {
        new: true,
        sort: { createdAt: -1 },
      },
    ).catch((error: unknown) => {
      console.error("[Unwarn] Failed to update warning:", error);
      return null;
    });

    if (!warning) {
      const exists = await WarningModel.exists({
        guildId: interaction.guild.id,
        userId: user.id,
        active: true,
      }).catch(() => null);

      if (exists) {
        await interaction.editReply(
          "The warning could not be removed because a database error occurred.",
        );
        return;
      }

      await interaction.editReply(
        `**${user.tag}** has no active warnings to remove.`,
      );
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000);

    const container = new ContainerBuilder()
      .setAccentColor(0x2ecc71)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "# Warning Removed\n" +
            "A warning issued to you by the Management Department has been removed.",
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Server:** ${interaction.guild.name}\n` +
            `**Removed by:** ${interaction.user.tag}\n` +
            `**Removal reason:** ${reason}\n` +
            `**Removed at:** <t:${timestamp}:F>`,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "This warning is no longer considered active in the department's records. Other warnings, if any, remain unaffected.",
        ),
      );

    let dmSent = true;

    try {
      await user.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch {
      dmSent = false;
    }

    const logContainer = new ContainerBuilder()
      .setAccentColor(0x2ecc71)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "# Warning Removed\n" +
            `**Member:** <@${user.id}>\n` +
            `**Member ID:** \`${user.id}\`\n` +
            `**Moderator:** <@${interaction.user.id}>\n` +
            `**Moderator ID:** \`${interaction.user.id}\``,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Original warning reason:** ${warning.reason}\n` +
            `**Removal reason:** ${reason}\n` +
            `**DM Delivered:** ${dmSent ? "Yes" : "No"}\n` +
            `**Warning ID:** \`${warning._id}\``,
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `-# Warning logging • ${new Date().toISOString()}`,
        ),
      );

    const logChannel = await interaction.client.channels
      .fetch(logchannelid)
      .catch(() => null);

    if (logChannel?.isTextBased() && "send" in logChannel) {
      await logChannel
        .send({
          components: [logContainer],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        })
        .catch((error: unknown) => {
          console.error("[Unwarn] Failed to send log:", error);
        });
    } else {
      console.error(`[Unwarn] Logging channel unavailable: ${logchannelid}`);
    }

    await interaction.editReply(
      `Successfully removed the most recent active warning from **${user.tag}**.` +
        (dmSent ? " A DM was sent." : " The user could not be reached by DM."),
    );
  },
};

import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Colors,
  ContainerBuilder,
  EmbedBuilder,
  Interaction,
  MessageFlags,
  PermissionFlagsBits,
  SeparatorBuilder,
  TextChannel,
  TextDisplayBuilder,
} from "discord.js";

// Configuration
const SIMULATION_CATEGORY_ID = "1553079262452523229";
const TRAINING_TEAM_ROLE_ID = "1523408377743671427";
const SIMULATION_LOG_CHANNEL_ID = "1554489304070230016";

const closingRooms = new Set<string>();

function cleanMentions(text: string): string {
  return text
    .replace(/<@!?(\d+)>/g, "@User [$1]")
    .replace(/<@&(\d+)>/g, "@Role [$1]")
    .replace(/<#(\d+)>/g, "#Channel [$1]")
    .replace(/@everyone/g, "@ everyone")
    .replace(/@here/g, "@ here");
}

async function generateTranscript(channel: TextChannel): Promise<Buffer> {
  const messages = [];
  let before: string | undefined;

  // Fetch the full message history in batches of 100
  while (true) {
    const batch = await channel.messages.fetch({
      limit: 100,
      ...(before ? { before } : {}),
    });

    if (batch.size === 0) break;

    messages.push(...batch.values());
    before = batch.last()?.id;

    if (batch.size < 100) break;
  }

  // Oldest messages first
  messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  const lines: string[] = [
    `Simulation Room Transcript`,
    `Channel: #${channel.name}`,
    `Channel ID: ${channel.id}`,
    `Generated: ${new Date().toISOString()}`,
    `Total Messages: ${messages.length}`,
    "=".repeat(70),
    "",
  ];

  for (const message of messages) {
    const timestamp = message.createdAt.toISOString();
    const author = `${message.author.username} (\`${message.author.id}\`)`;

    lines.push(`[${timestamp}] ${author}`);

    if (message.content) {
      lines.push(cleanMentions(message.content));
    }

    // Include embed text, where available
    for (const embed of message.embeds) {
      if (embed.title) lines.push(`Embed Title: ${cleanMentions(embed.title)}`);
      if (embed.description) {
        lines.push(`Embed: ${cleanMentions(embed.description)}`);
      }

      for (const field of embed.fields) {
        lines.push(
          `${cleanMentions(field.name)}: ${cleanMentions(field.value)}`,
        );
      }
    }

    // Include attachment URLs
    for (const attachment of message.attachments.values()) {
      lines.push(`Attachment: ${attachment.name ?? "file"}`);
      lines.push(attachment.url);
    }

    if (message.stickers.size > 0) {
      lines.push(`Stickers: ${message.stickers.map((s) => s.name).join(", ")}`);
    }

    lines.push("");
  }

  return Buffer.from(lines.join("\n"), "utf-8");
}

export async function handleSimulationRoom(
  interaction: Interaction,
): Promise<void> {
  if (!interaction.isButton()) return;

  if (interaction.customId === "simulation_room") {
    if (!interaction.guild) {
      await interaction.reply({
        content: "This button can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    try {
      const guild = interaction.guild;
      const user = interaction.user;

      const existing = guild.channels.cache.find(
        (channel) =>
          channel.type === ChannelType.GuildText &&
          channel.topic === `Simulation Room - ${user.id}`,
      );

      if (existing) {
        await interaction.editReply({
          content: `You already have an open Simulation Room: ${existing}`,
        });
        return;
      }

      const channel = await guild.channels.create({
        name: `simulation-${
          user.username
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "")
            .slice(0, 80) || user.id
        }`,
        type: ChannelType.GuildText,
        parent: SIMULATION_CATEGORY_ID,
        topic: `Simulation Room - ${user.id}`,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.EmbedLinks,
            ],
          },
          {
            id: TRAINING_TEAM_ROLE_ID,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.EmbedLinks,
              PermissionFlagsBits.ManageMessages,
            ],
          },
        ],
      });

      const container = new ContainerBuilder()
        .setAccentColor(Colors.DarkGrey)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## MTP - Training Stage\n\nWelcome to the Management Training Program\n\nBefore we begin the next stage, please read through <#1523363319841296518> to familiarise yourself with the rules and regulations of the program. And of course, if you have any questions regarding the training stage, please contact a member of the Training Coordination Team.\n\nWe wish you the best of luck. More details will be provided shortly.\n\n||<@&${TRAINING_TEAM_ROLE_ID}> <@${user.id}>||`,
          ),
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId("simulation_room_close")
              .setLabel("Close Simulation Room")
              .setStyle(ButtonStyle.Danger)
              .setEmoji("<:disconnected:1525789374686429314>"),
          ),
        );

      await channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });

      await interaction.editReply({
        content: `Your Simulation Room has been created: ${channel}`,
      });
    } catch (error) {
      console.error("[SimulationRoom] Creation error:", error);

      await interaction.editReply({
        content:
          "An error occurred while creating your Simulation Room. Please contact Management.",
      });
    }

    return;
  }

  if (interaction.customId !== "simulation_room_close") return;

  if (!interaction.guild || !interaction.channel) {
    await interaction.reply({
      content: "This button can only be used in a server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const channel = interaction.channel;

  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: "This is not a valid Simulation Room.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const ownerMatch = channel.topic?.match(/^Simulation Room - (\d+)$/);

  if (!ownerMatch) {
    await interaction.reply({
      content: "This channel is not a valid Simulation Room.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const ownerId = ownerMatch[1];
  const guild = interaction.guild;

  const member = await guild.members.fetch(interaction.user.id);
  const isOwner = interaction.user.id === ownerId;
  const isTrainingTeam = member.roles.cache.has(TRAINING_TEAM_ROLE_ID);
  const isManager = member.permissions.has(PermissionFlagsBits.ManageGuild);

  if (!isOwner && !isTrainingTeam && !isManager) {
    await interaction.reply({
      content: "You do not have permission to close this Simulation Room.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (closingRooms.has(channel.id)) {
    await interaction.reply({
      content: "This Simulation Room is already being closed.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  closingRooms.add(channel.id);

  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  try {
    const logChannel = await guild.channels.fetch(SIMULATION_LOG_CHANNEL_ID);

    if (!logChannel || !logChannel.isTextBased() || !("send" in logChannel)) {
      await interaction.editReply({
        content:
          "The log channel could not be found. The room was not deleted.",
      });
      return;
    }

    // Generate transcript before deleting the room
    const transcript = await generateTranscript(channel);

    const transcriptFile = new AttachmentBuilder(transcript, {
      name: `simulation-${ownerId}-${Date.now()}.txt`,
    });

    const closedAt = Math.floor(Date.now() / 1000);

    const logEmbed = new EmbedBuilder()
      .setColor(Colors.DarkGrey)
      .setTitle("Simulation Room Closed")
      .setDescription(`A Management Training Simulation Room has been closed.`)
      .addFields(
        {
          name: "Trainee",
          value: `<@${ownerId}> (\`${ownerId}\`)`,
          inline: true,
        },
        {
          name: "Closed By",
          value: `${interaction.user} (\`${interaction.user.id}\`)`,
          inline: true,
        },
        {
          name: "Channel",
          value: `#${channel.name} (\`${channel.id}\`)`,
          inline: false,
        },
        {
          name: "Closed At",
          value: `<t:${closedAt}:F>`,
          inline: true,
        },
        {
          name: "Transcript",
          value: "Attached as a .txt file.",
          inline: true,
        },
      )
      .setFooter({ text: "Management Training System" })
      .setTimestamp();

    // Save the log and transcript first
    await logChannel.send({
      embeds: [logEmbed],
      files: [transcriptFile],
      allowedMentions: { parse: [] },
    });

    // Notify the trainee by DM
    let dmSent = true;

    try {
      const trainee = await guild.client.users.fetch(ownerId);

      await trainee.send({
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.DarkGrey)
            .setTitle("Simulation Room Closed")
            .setDescription(
              `Your Management Training Simulation Room in **${guild.name}** has been closed.\n\n`,
            )
            .addFields({
              name: "Closed By",
              value: interaction.user.username,
              inline: true,
            })
            .setTimestamp(),
        ],
      });
    } catch (error) {
      dmSent = false;
      console.error("[SimulationRoom] DM error:", error);
    }

    // Confirm closure before deleting the channel
    await interaction.editReply({
      content: dmSent
        ? "Simulation Room closed successfully. The trainee has been notified and the transcript has been saved."
        : "Simulation Room closed and transcript saved, but I could not DM the trainee.",
    });

    await channel.delete("Simulation Room closed");
  } catch (error) {
    console.error("[SimulationRoom] Closing error:", error);

    await interaction
      .editReply({
        content:
          "An error occurred while closing the Simulation Room. Check the bot logs. The channel may still be open.",
      })
      .catch(() => {});
  } finally {
    closingRooms.delete(channel.id);
  }
}

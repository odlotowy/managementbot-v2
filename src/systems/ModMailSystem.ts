import ModMail, { ModMailDocument } from "../schemas/Modmail";
import ModMailSettings from "../schemas/ModMailSettings";
import { MODMAIL_CONFIG, ModMailCategory } from "../config/modmail";
import {
  ActionRowBuilder,
  ChannelType,
  Client,
  ContainerBuilder,
  Events,
  Message,
  MessageFlags,
  PermissionFlagsBits,
  SeparatorBuilder,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
} from "discord.js";

const config = MODMAIL_CONFIG;

function createContainer(title: string, description: string) {
  return new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${title}\n${description}`),
    )
    .addSeparatorComponents(new SeparatorBuilder());
}

async function sendDM(
  user: { send: (options: any) => Promise<any> },
  title: string,
  description: string,
) {
  return user.send({
    components: [createContainer(title, description)],
    flags: MessageFlags.IsComponentsV2,
  });
}

async function sendQuestions(
  user: { send: (options: any) => Promise<any> },
  question: string,
  current: number,
  total: number,
) {
  return sendDM(
    user,
    "Support Questionnaire",
    `**Question ${current + 1} of ${total}**\n\n${question}\n\n-# Please send your answer in this DM to continue.`,
  );
}

function isCategory(value: string): value is ModMailCategory {
  return Object.hasOwn(config.categories, value);
}

export function registerModMail(client: Client) {
  // Intial DM and questionnaire responses
  client.on(Events.MessageCreate, async (message: Message) => {
    try {
      if (message.author.bot || message.guild) return;

      const userId = message.author.id;

      const settings = await ModMailSettings.findOne({
        guildId: config.guildId,
      });

      if (!settings?.enabled) {
        await sendDM(
          message.author,
          "Support Unavailable",
          "Our ModMail system is currently disabled. Please try again later.",
        );
        return;
      }

      let session: ModMailDocument | null = await ModMail.findOne({
        userId,
        status: { $in: ["collecting", "open"] },
      });

      // Forward new messages into an existing conversation
      if (session?.status === "open" && session.channelId) {
        const guild = client.guilds.cache.get(session.guildId);
        const channel = guild?.channels.cache.get(session.channelId);

        if (channel?.isTextBased() && "send" in channel) {
          await channel.send({
            content: `**${message.author.username}** (\`${userId}\`):\n${message.content || "*Attachment or other media*"}`,
            files: [...message.attachments.values()].map((a) => a.url),
          });
        }

        return;
      }

      if (session?.status === "collecting") {
        const category = session.category as ModMailCategory;
        const questions = config.categories[category].questions;

        if (session.questionIndex >= questions.length) return;

        session.answers.push(message.content || "[No text answer]");
        session.questionIndex += 1;

        if (session.questionIndex < questions.length) {
          await session.save();

          await sendQuestions(
            message.author,
            questions[session.questionIndex],
            session.questionIndex,
            questions.length,
          );
          return;
        }

        await session.save();

        const guild = client.guilds.cache.get(config.guildId);
        if (!guild) {
          await sendDM(
            message.author,
            "Support Error",
            "The support server is currently unavailable. Please try again later.",
          );
          return;
        }

        const categoryChannel = config.categoryId
          ? guild.channels.cache.get(config.categoryId)
          : undefined;

        const channel = await guild.channels.create({
          name: `support-${message.author.username}`
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "")
            .slice(0, 80),
          type: ChannelType.GuildText,
          parent: categoryChannel?.id,
          topic: `ModMail | User: ${userId} | Category: ${category}`,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: client.user!.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: config.supportRoleId,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles,
              ],
            },
          ],
        });

        session.status = "open";
        session.channelId = channel.id;
        await session.save();

        const categoryInfo = config.categories[category];

        const details = session.answers
          .map(
            (answer, index) =>
              `**${index + 1}. ${questions[index]}**\n${answer}`,
          )
          .join("\n\n");

        const ticketContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## ${categoryInfo.emoji} New ModMail Conversation\n` +
                `**User:** <@${userId}>\n` +
                `**User ID:** \`${userId}\`\n` +
                `**Category:** ${category}\n` +
                `**Conversation ID:** \`${session.id}\`\n` +
                `**Created:** <t:${Math.floor(Date.now() / 1000)}:F>`,
            ),
          )
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `### Questionnaire\n${details}`,
            ),
          );

        await channel.send({
          content: `<@&${config.supportRoleId}>`,
          allowedMentions: {
            roles: [config.supportRoleId],
          },
        });

        await channel.send({
          components: [ticketContainer],
          flags: MessageFlags.IsComponentsV2,
        });

        await sendDM(
          message.author,
          "Conversation Created",
          `Your support request has been submitted successfully.\n\n**Category:** ${category}\n**Conversation ID:** \`${session.id}\`\n\nA member of our support team will respond to you here.`,
        );

        return;
      }

      // Start a new conversation
      const menu = new StringSelectMenuBuilder()
        .setCustomId("modmail_category")
        .setPlaceholder("Select a support category")
        .addOptions(
          Object.entries(config.categories).map(([key, value]) => ({
            label: key,
            description: value.description,
            value: key,
            emoji: value.emoji,
          })),
        );

      const container = createContainer(
        "Welcome to Management Department Support Section",
        "Thank you for contacting our Management Leadership team.\n\nPlease select a category below to get started. You will be asked a few questions before your conversation is created.",
      ).addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu),
      );

      await message.author.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      console.error("[ModMail] Message handler error:", error);
    }
  });

  // Category selection
  client.on(Events.InteractionCreate, async (interaction) => {
    if (
      !interaction.isStringSelectMenu() ||
      interaction.customId !== "modmail_category" ||
      interaction.guild
    )
      return;

    try {
      const categoryValue = interaction.values[0];
      if (!isCategory(categoryValue)) {
        await interaction.reply({
          content: "Invalid support category.",
        });
        return;
      }

      const existing = await ModMail.findOne({
        userId: interaction.user.id,
        status: { $in: ["collecting", "open"] },
      });

      if (existing) {
        await interaction.reply({
          content: "You already have an active support conversation.",
        });
        return;
      }

      const questions = config.categories[categoryValue].questions;

      await ModMail.create({
        userId: interaction.user.id,
        guildId: config.guildId,
        category: categoryValue,
        status: "collecting",
        questionIndex: 0,
        answers: [],
      });

      await interaction.reply({
        components: [
          createContainer(
            "Category Selected",
            `You selected **${categoryValue}**.\n\nLet's get started with a few questions. Please answer each question to proceed.`,
          ),
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      await sendQuestions(interaction.user, questions[0], 0, questions.length);
    } catch (error) {
      console.error("[ModMail] Category handler error:", error);

      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply({
            content: "An error occurred while starting your conversation.",
          })
          .catch(() => {});
      }
    }
  });

  // Staff commands
  client.on(Events.MessageCreate, async (message: Message) => {
    if (
      !message.guild ||
      message.author.bot ||
      !message.member?.roles.cache.has(config.supportRoleId)
    )
      return;

    const args = message.content.trim().split(/\s+/);
    const command = args[0]?.toLowerCase();

    if (!["-claim", "-respond", "-close"].includes(command)) return;

    try {
      const session = await ModMail.findOne({
        channelId: message.channelId,
        status: "open",
      });

      if (!session) {
        await message.reply(
          "This channel is not an active ModMail conversation.",
        );
        return;
      }

      if (command === "-claim") {
        if (session.claimedBy) {
          await message.reply(
            `This conversation has already been claimed by <@${session.claimedBy}>.`,
          );
          return;
        }

        session.claimedBy = message.author.id;
        await session.save();

        const user = await client.users.fetch(session.userId);

        await sendDM(
          user,
          "Conversation Claimed",
          `Your support conversation has been claimed by a member of our support team.\n\n` +
            `You can continue sending messages here and our team will receive them.`,
        ).catch(() => null);

        if (!message.channel.isSendable()) return;

        await message.channel.send({
          components: [
            createContainer(
              "Conversation Claimed",
              `This conversation has been claimed by <@${message.author.id}>.`,
            ),
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }

      if (command === "-respond") {
        const response = message.content.slice("-respond".length).trim();

        if (!response) {
          await message.reply("Usage: `-respond [message]`");
          return;
        }

        const user = await client.users.fetch(session.userId);

        await sendDM(user, "Management Support Team", response);

        await message.reply("Your response has been sent to the user.");
        return;
      }

      if (command === "-close") {
        if (message.channel.type !== ChannelType.GuildText) {
          await message.reply(
            "This command can only be used in a ticket text channel.",
          );
          return;
        }

        const ticketChannel = message.channel;
        const guild = message.guild;

        // Fetch the log channel
        const logChannel = await guild.channels.fetch(config.logChannelId);

        if (!logChannel?.isTextBased() || !logChannel.isSendable()) {
          await message.reply("The log channel could not be found.");
          return;
        }

        // Fetch the conversation transcript
        const fetchedMessages = await ticketChannel.messages.fetch({
          limit: 100,
        });

        const transcript = [...fetchedMessages.values()]
          .reverse()
          .map((msg) => {
            const timestamp = `<t:${Math.floor(msg.createdTimestamp / 1000)}:f>`;

            const attachments = [...msg.attachments.values()]
              .map((attachment) => attachment.url)
              .join("\n");

            let content = msg.content || "";

            // Prevent mentions from being rendered as actual mentions
            content = content
              .replace(/<@!?(\d+)>/g, "<@$1>")
              .replace(/<@&(\d+)>/g, "<@&$1>")
              .replace(/<#(\d+)>/g, "<#$1>");

            const parts = [
              `**${msg.author.tag}** (\`${msg.author.id}\`) | ${timestamp}`,
              content,
              attachments ? `Attachments:\n${attachments}` : "",
            ].filter(Boolean);

            return parts.join("\n");
          })
          .join("\n\n");

        // Send log summary
        const logContainer = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ModMail Conversation Closed\n` +
              `**User:** <@${session.userId}>\n` +
              `**User ID:** \`${session.userId}\`\n` +
              `**Category:** ${session.category}\n` +
              `**Claimed by:** ${
                session.claimedBy ? `<@${session.claimedBy}>` : "No-One"
              }\n` +
              `**Closed by:** <@${message.author.id}>\n` +
              `**Conversation ID:** \`${session.id}\`\n` +
              `**Channel:** #${ticketChannel.name}\n` +
              `**Created:** <t:${Math.floor(session.createdAt.getTime() / 1000)}:F>\n` +
              `**Closed:** <t:${Math.floor(Date.now() / 1000)}:F>`,
          ),
        );

        await logChannel.send({
          components: [logContainer],
          flags: MessageFlags.IsComponentsV2,
        });

        // Send transcript in separate messages
        const transcriptText = transcript || "No messages recorded.";
        const chunks = transcriptText.match(/[\s\S]{1,3800}/g) || [];

        for (let i = 0; i < chunks.length; i++) {
          const transcriptContainer =
            new ContainerBuilder().addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `## Conversation Transcript (${i + 1}/${chunks.length})\n${chunks[i]}`,
              ),
            );

          await logChannel.send({
            components: [transcriptContainer],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: {
              parse: [],
            },
          });
        }

        // Notify the user
        const user = await client.users.fetch(session.userId);

        await sendDM(
          user,
          "Conversation Closed",
          "Your support conversation has been closed by our support team. If you need further assistance, you can contact us again.",
        ).catch(() => null);

        // Update database
        session.status = "closed";
        session.closedAt = new Date();
        await session.save();

        // Delete ticket channel
        await ticketChannel.delete(`ModMail closed by ${message.author.tag}`);
      }
    } catch (error) {
      console.error("[ModMail] Staff command error:", error);
      await message
        .reply("An error occurred while processing this command.")
        .catch(() => {});
    }
  });
}

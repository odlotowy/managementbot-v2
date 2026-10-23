import ModMail, { ModMailDocument } from "../schemas/Modmail.js";
import ModMailSettings from "../schemas/ModMailSettings.js";
import { MODMAIL_CONFIG, ModMailCategory } from "../config/modmail.js";
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
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
} from "discord.js";

const config = MODMAIL_CONFIG;

function createContainer(title: string, description: string) {
  return new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${title}\n${description}`),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );
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
    `### Question ${current + 1} of ${total}\n\n${question}\n\n-# Reply to this message with your answer to continue.`,
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
          [
            "## Support Is Currently Unavailable",
            "Our ModMail system is temporarily disabled, so we cannot process your support request right now.",
            "",
            "-# Please try again later. We apologize for the inconvenience.",
          ].join("\n"),
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
            [
              "## Unable to Connect to Support",
              "We couldn't connect to the support server, so your request could not be processed.",
              "",
              "-# Please try again later. If the issue persists, contact a member of Management.",
            ].join("\n"),
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
                `-# A new support conversation has been opened.\n\n` +
                `**User**\n<@${userId}>\n\n` +
                `**Category**\n${category}\n\n` +
                `**Conversation ID**\n\`${session.id}\`\n\n` +
                `**Created**\n<t:${Math.floor(Date.now() / 1000)}:F>`,
            ),
          )
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `### Questionnaire Responses\n` +
                `-# Submitted details from the support request.\n\n` +
                `${details}`,
            ),
          )
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `-# ModMail • User ID: ${userId}`,
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
          [
            "## Support Request Submitted",
            "Your support request has been successfully submitted to our Management Support team.",
            "",
            "**Category**",
            category,
            "",
            "**Conversation ID**",
            `\`${session.id}\``,
            "",
            "-# A member of our support team will contact you here via DM. Please keep this conversation open and check your messages for updates.",
          ].join("\n"),
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
        "Management Department Support",
        [
          "Thank you for contacting the Management Leadership team.",
          "",
          "Select a category below to get started. You will then be guided through a short questionnaire to help us understand your request before your conversation is created.",
          "",
          "-# Please select the category that best matches your inquiry.",
        ].join("\n"),
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
            [
              `Your selected category is **${categoryValue}**.`,
              "",
              "We'll now guide you through a short questionnaire to gather the information needed for your support request.",
              "",
              "-# Please answer each question carefully. Your responses will be used to create your ModMail conversation.",
            ].join("\n"),
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
          "Support Team Assigned",
          [
            "## Your Conversation Has Been Claimed",
            "A member of our Management Support team has taken responsibility for your support request.",
            "",
            "You can continue sending messages in this DM, and your messages will be forwarded to the support team.",
            "",
            "-# Please keep this conversation open and provide any additional information relevant to your request.",
          ].join("\n"),
        ).catch(() => null);

        if (!message.channel.isSendable()) return;

        await message.channel.send({
          components: [
            createContainer(
              "Conversation Claimed",
              [
                `This ModMail conversation has been claimed by <@${message.author.id}>.`,
                "",
                "The assigned staff member is now responsible for handling this request and assisting the user.",
                "",
                `-# Claimed by: ${message.author.tag}`,
              ].join("\n"),
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
        const logContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## ModMail Conversation Closed\n` +
                `-# This support conversation has been successfully closed.\n\n` +
                `### Conversation Details\n` +
                `**User**\n<@${session.userId}>\n\n` +
                `**Category**\n${session.category}\n\n` +
                `**Conversation ID**\n\`${session.id}\`\n\n` +
                `**Channel**\n<#${ticketChannel.id}>\n\n` +
                `### Staff Information\n` +
                `**Claimed By**\n${
                  session.claimedBy ? `<@${session.claimedBy}>` : "No one"
                }\n\n` +
                `**Closed By**\n<@${message.author.id}>\n\n` +
                `### Timeline\n` +
                `**Created**\n<t:${Math.floor(session.createdAt.getTime() / 1000)}:F>\n\n` +
                `**Closed**\n<t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
                `-# User ID: ${session.userId}`,
            ),
          )
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `-# ModMail Audit Log • Conversation ${session.id}`,
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
          [
            "## Your Support Conversation Has Been Closed",
            "Our Management Support team has closed your support conversation.",
            "",
            "If you require further assistance, you are welcome to open a new support conversation at any time.",
            "",
            "-# Thank you for contacting Management Support.",
          ].join("\n"),
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

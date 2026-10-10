import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Client,
  Colors,
  ContainerBuilder,
  EmbedBuilder,
  Events,
  FileUploadBuilder,
  GatewayIntentBits,
  LabelBuilder,
  MediaGalleryBuilder,
  MessageFlags,
  ModalBuilder,
  Partials,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  ThumbnailBuilder,
} from "discord.js";

import { config } from "../config";
import { CommandHandler } from "./CommandHandler";
import { Logger } from "../util/Logger";
import { getRobloxUser } from "../util/RobloxValidation";
import VerificationRequest from "../schemas/VerificationRequest";
import Manager from "../schemas/Manager";
import { ROLE_IDS } from "../util/RolesValidation";
import { handleSimulationRoom } from "../systems/SimulationRoom";
import { TrainingSystem } from "../systems/TrainingSystem";
import Suggestion from "../schemas/Suggestion";
import SOTMRequest from "../schemas/SOTMRequest";

export class DiscordBot {
  public readonly client: Client;
  public readonly commandHandler: CommandHandler;
  public readonly logger: Logger;

  constructor() {
    this.client = new Client({
      partials: [
        Partials.Message, // for message
        Partials.Channel, // for text channel
        Partials.GuildMember, // for guild member
        Partials.Reaction, // for message reaction
        Partials.GuildScheduledEvent, // for guild events
        Partials.User, // for discord user
        Partials.ThreadMember, // for thread member
      ],
      intents: [
        GatewayIntentBits.Guilds, // for guild related things
        GatewayIntentBits.GuildMembers, // for guild members related things
        GatewayIntentBits.GuildIntegrations, // for discord Integrations
        GatewayIntentBits.GuildWebhooks, // for discord webhooks
        GatewayIntentBits.GuildInvites, // for guild invite managing
        GatewayIntentBits.GuildVoiceStates, // for voice related things
        GatewayIntentBits.GuildPresences, // for user presence things
        GatewayIntentBits.GuildMessages, // for guild messages things
        GatewayIntentBits.GuildMessageReactions, // for message reactions things
        GatewayIntentBits.GuildMessageTyping, // for message typing things
        GatewayIntentBits.DirectMessages, // for dm messages
        GatewayIntentBits.DirectMessageReactions, // for dm message reaction
        GatewayIntentBits.DirectMessageTyping, // for dm message typinh
        GatewayIntentBits.MessageContent, // enable if you need message content things
        GatewayIntentBits.GuildModeration, // for moderation logs
        GatewayIntentBits.AutoModerationConfiguration,
        GatewayIntentBits.AutoModerationExecution,
      ],
    });

    this.logger = new Logger(this.client, config.logsChannelId);

    this.commandHandler = new CommandHandler(this.client, this.logger);

    this.registerEvents();
  }

  public async start(): Promise<void> {
    try {
      await this.commandHandler.loadCommands();

      await this.logger.info("Starting Bot", "Loading Discord bot...");

      await this.client.login(config.discordToken);

      await this.commandHandler.registerCommands();

      await this.logger.success(
        "Startup Complete",
        "Bot started successfully and commands were registered.",
      );
    } catch (error) {
      console.error("[Discord] Failed to start bot:", error);

      await this.logger.fatal("Bot Startup Failed", error);

      process.exit(1);
    }
  }

  private registerEvents(): void {
    this.client.once(Events.ClientReady, async (client) => {
      this.logger.setReady();

      console.log(`[Discord] Logged in as ${client.user.tag}.`);

      await this.logger.success(
        "Bot Ready",
        `Bot is now online as **${client.user.tag}**`,
        {
          userId: client.user.id,
          guilds: client.guilds.cache.size,
        },
      );
    });

    this.client.on(Events.MessageCreate, async (message) => {
      try {
        await TrainingSystem.handleMessage(message);
      } catch (error) {
        console.error("[TrainingSystem] Error:", error);
      }
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      await this.logger.interaction(
        "Interaction Received",
        `Received interaction of type \`${interaction.type}\`.`,
        {
          interactionId: interaction.id,
          type: interaction.type,
          userId: interaction.user.id,
          username: interaction.user.tag,
          guildId: interaction.guildId,
          channelId: interaction.channelId,
        },
      );
    });

    this.client.on(Events.Error, async (error) => {
      console.error("[Discord] Client error:", error);

      await this.logger.error("Discord Client Error", error);
    });

    this.client.on(Events.Warn, async (message) => {
      console.warn("[Discord] Warning:", message);

      await this.logger.warn("Discord.js Warning", message);
    });

    this.client.on(Events.ShardError, async (error, shardId) => {
      console.error(`[Discord] Shard ${shardId} error:`, error);

      await this.logger.error(
        "Shard Error",
        error,
        `Discord shard **${shardId}** encountered an error.`,
        {
          shardId,
        },
      );
    });

    this.client.on(Events.ShardDisconnect, async (event, shardId) => {
      await this.logger.warn(
        "Shard Disconnected",
        `Shard **${shardId}** disconnected.`,
        {
          shardId,
          code: event.code,
          reason: event.reason,
        },
      );
    });

    this.client.on(Events.ShardReconnecting, async (shardId) => {
      await this.logger.info(
        "Shard Reconnecting",
        `Shard **${shardId}** is reconnecting.`,
        {
          shardId,
        },
      );
    });

    this.client.on(Events.ShardReady, async (shardId, unavailableGuilds) => {
      await this.logger.success(
        "Shard Ready",
        `Shard **${shardId}** is ready.`,
        {
          shardId,
          unavailableGuilds: unavailableGuilds?.size ?? 0,
        },
      );
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) {
        return;
      }

      console.log(`[Discord] Received /${interaction.commandName}`);

      await this.commandHandler.handleInteraction(interaction);
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (interaction.isButton()) {
        await handleSimulationRoom(interaction);
      }
    });

    /**
     *
     * Here are all the interactions for the systems
     */
    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (interaction.isButton() && interaction.customId === "verify_button") {
        const modal = new ModalBuilder()
          .setTitle("Verification Request")
          .setCustomId(`verify_modal`);

        const roblox = new LabelBuilder()
          .setLabel("Roblox Username")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId("roblox_username")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder("Your roblox username"),
          );

        const discord = new LabelBuilder()
          .setLabel("Discord Username")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId("discord_username")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder("Your discord username"),
          );

        const invited = new LabelBuilder()
          .setLabel("Who invited you")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId("invited")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder("Who invited you to the server"),
          );

        const proof = new LabelBuilder()
          .setLabel("Proof of invitation")
          .setFileUploadComponent(
            new FileUploadBuilder().setCustomId("proof").setRequired(true),
          );

        modal.addLabelComponents(roblox, discord, invited, proof);

        await interaction.showModal(modal);
      }

      if (
        interaction.isModalSubmit() &&
        interaction.customId === "verify_modal"
      ) {
        await interaction.deferReply({ flags: 64 });

        try {
          const userId = interaction.user.id;

          const robloxUsername = interaction.fields
            .getTextInputValue("roblox_username")
            .trim();

          const discordUsername = interaction.fields
            .getTextInputValue("discord_username")
            .trim();

          const invitedBy = interaction.fields
            .getTextInputValue("invited")
            .trim();

          const proof = interaction.fields.getUploadedFiles("proof");

          if (!proof) return;

          const channelId = "1523378855937839236";
          const channel = interaction.guild?.channels.cache.get(channelId);

          if (!channel || !channel.isSendable()) {
            return await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setDescription(
                    "The verification channel could not be found. Please contact an administrator.",
                  )
                  .setColor(Colors.Red),
              ],
            });
          }

          // This can take time, but the interaction has already been acknowledged.
          const robloxUser = await getRobloxUser(robloxUsername);

          if (!robloxUser.exists) {
            return await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setDescription(
                    "This Roblox user does not exist. Please provide a valid Roblox username.",
                  )
                  .setColor(Colors.Red),
              ],
            });
          }

          if (!robloxUser.group.inGroup) {
            return await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setDescription(
                    "This Roblox user is not a member of our Roblox group.",
                  )
                  .setColor(Colors.Red),
              ],
            });
          }

          if (
            !robloxUser.id ||
            !robloxUser.username ||
            robloxUser.group.rankId === null ||
            robloxUser.group.rankName === null
          ) {
            return await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setDescription(
                    "We couldn't retrieve your Roblox group information. Please make sure you are in the group and try again.",
                  )
                  .setColor(Colors.Red),
              ],
            });
          }

          if (interaction.user.username !== discordUsername) {
            return await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setDescription(
                    "Please make sure the Discord username matches your actual username.",
                  )
                  .setColor(Colors.Red),
              ],
            });
          }

          // Prevent multiple pending requests from the same user.
          const existingRequest = await VerificationRequest.findOne({
            discordId: userId,
            status: "pending",
          });

          if (existingRequest) {
            return await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setDescription(
                    "You already have a pending verification request.",
                  )
                  .setColor(Colors.Red),
              ],
            });
          }

          const verificationRequest = await VerificationRequest.create({
            discordId: userId,
            discordUsername,

            robloxId: robloxUser.id,
            robloxUsername: robloxUser.username,
            robloxAvatar: robloxUser.avatar,

            groupRankId: robloxUser.group.rankId,
            groupRankName: robloxUser.group.rankName,

            invitedBy,

            status: "pending",
          });

          const container = new ContainerBuilder()
            .setAccentColor(Colors.LightGrey)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `## New Verification Request

A new verification request has been made and it's pending review. Please review the request and take appropriate action.

**Request Information:**
> - Roblox Username: ${robloxUsername}
> - Discord Username: ${discordUsername}
> - Rank in Group: ${robloxUser.group.rankName}
> - Who invited you: ${invitedBy}
> - Proof`,
              ),
            );

          if (proof.size > 0) {
            const proofFile = new MediaGalleryBuilder().addItems(
              [...proof.values()].map((file) => ({
                media: {
                  url: file.url,
                },
              })),
            );

            container.addMediaGalleryComponents(proofFile);
          }

          container
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `-# Request made by <@${userId}>`,
              ),
            );

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setLabel("Approve verification request")
              .setCustomId("approve_verify")
              .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
              .setLabel("Deny verification request")
              .setCustomId("deny_verify")
              .setStyle(ButtonStyle.Danger),
          );

          container.addActionRowComponents(row);

          const verificationMessage = await channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
          });

          verificationRequest.messageId = verificationMessage.id;
          verificationRequest.channelId = channel.id;

          await verificationRequest.save();

          return await interaction.editReply({
            content:
              "Your verification request has been submitted successfully. Please wait patiently while Management Leadership reviews your request. You will be notified once a decision has been made.",
          });
        } catch (error) {
          console.error("[Verification] Submit error:", error);

          if (interaction.deferred || interaction.replied) {
            return await interaction
              .editReply({
                embeds: [
                  new EmbedBuilder()
                    .setDescription(
                      "An unexpected error occurred while submitting your verification request. Please try again later.",
                    )
                    .setColor(Colors.Red),
                ],
              })
              .catch(() => {});
          }
        }
      }

      if (interaction.isButton() && interaction.customId === "approve_verify") {
        await interaction.deferReply({ flags: 64 });

        try {
          const request = await VerificationRequest.findOneAndUpdate(
            {
              messageId: interaction.message.id,
              status: "pending",
            },
            {
              $set: {
                status: "processing",
                approvedBy: interaction.user.id,
                approvedAt: new Date(),
              },
            },
            {
              returnDocument: "after",
            },
          );

          const userId = request?.discordId ?? "";

          if (!request) {
            return await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setDescription(
                    "This verification request no longer exists or has already been processed.",
                  )
                  .setColor("Red"),
              ],
            });
          }

          const guild = interaction.guild;
          if (!guild) {
            return await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setDescription(
                    "This action can only be used inside a server.",
                  )
                  .setColor("Red"),
              ],
            });
          }

          const member = await guild.members.fetch(userId).catch(() => null);

          if (!member) {
            return await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setDescription("The user could not be found in this server.")
                  .setColor("Red"),
              ],
            });
          }

          /**
           * Prevent duplicate Manager accounts
           */

          const existingManager = await Manager.findOne({
            discordId: userId,
          });

          if (existingManager) {
            return await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setDescription("This user already has a Manager profile.")
                  .setColor("Red"),
              ],
            });
          }

          /**
           * Create Manager profile
           */

          await Manager.create({
            discordId: userId,
            discordUsername: request.discordUsername,

            robloxId: request.robloxId,
            robloxUsername: request.robloxUsername,
            robloxAvatar: request.robloxAvatar,

            groupRankId: request.groupRankId,
            groupRankName: request.groupRankName,

            shifts: 0,
            tickets: 0,
            sotm: 0,
            loa: 0,
            ra: 0,
          });

          /**
           * Add the main Management roles
           */

          const removedRole = guild.roles.cache.get(ROLE_IDS.NOT_VERIFIED);
          const verifiedRole = guild.roles.cache.get(ROLE_IDS.VERIFIED);
          const stage1 = guild.roles.cache.get(ROLE_IDS.STAGE_1);
          const pass = guild.roles.cache.get(ROLE_IDS.PASS);

          if (removedRole) {
            await member.roles.remove(removedRole);
          }

          if (verifiedRole) {
            await member.roles.add(verifiedRole);
          }

          if (stage1) {
            await member.roles.add(stage1);
          }

          if (pass) {
            await member.roles.add(pass);
          }

          /**
           * Add role corresponding to Roblox group rank
           */

          const rankRoleId =
            request.groupRankId !== null
              ? ROLE_IDS.ROBLOX_RANKS[request.groupRankId]
              : undefined;

          if (rankRoleId) {
            const rankRole = guild.roles.cache.get(rankRoleId);

            if (rankRole) {
              await member.roles.add(rankRole);
            }
          }

          /**
           * Change nickname to Roblox username
           */

          await member.setNickname(request.robloxUsername).catch(() => null);

          /**
           * Update verification request
           */

          request.status = "approved";
          request.approvedBy = interaction.user.id;
          request.approvedAt = new Date();

          await request.save();

          /**
           * Get original verification message
           */

          const channel = guild.channels.cache.get(request.channelId!);

          if (channel?.isTextBased()) {
            const message = await channel.messages
              .fetch(request.messageId!)
              .catch(() => null);

            if (message) {
              /*
               * Rebuild the container without the buttons
               */

              const approvedContainer = new ContainerBuilder();

              approvedContainer.setAccentColor(Colors.Green);

              approvedContainer.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `## New Verification Request\nA new verification request has been made and it's pending review. Please review the request and take appropriate action.\n\n**Request Information:**\n> - Roblox Username: ${request.robloxUsername}\n> - Discord Username: ${request.discordUsername}\n> - Rank in Group: ${request.groupRankName}\n> - Who invited you: ${request.invitedBy}\n> - Proof`,
                ),
              );

              approvedContainer.addSeparatorComponents(new SeparatorBuilder());

              approvedContainer.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `-# Request made by <@${request.discordId}>\n-# Request approved by <@${interaction.user.id}>`,
                ),
              );

              await message.edit({
                components: [approvedContainer],
                flags: MessageFlags.IsComponentsV2,
              });
            }
          }

          /**
           * DM the user
           */

          await member
            .send({
              embeds: [
                new EmbedBuilder()
                  .setColor(Colors.DarkGreen)
                  .setTitle("Verification Request Approved")
                  .setDescription(
                    `Your verification request has been approved.\n\n` +
                      `> - You have been added to Management and assigned the appropriate roles based on your Roblox group rank.`,
                  )
                  .setTimestamp(),
              ],
            })
            .catch(() => null);

          /*
           * Respond to the button interaction
           */

          return await interaction.editReply({
            content: "Verification request approved successfully.",
          });
        } catch (error) {
          console.error("[Verification] Approve error:", error);

          return await interaction
            .editReply({
              embeds: [
                new EmbedBuilder()
                  .setDescription(
                    "An unexpected error occurred while approving this verification request.",
                  )
                  .setColor(Colors.Red),
              ],
            })
            .catch(() => {});
        }
      }

      if (interaction.isButton() && interaction.customId === "deny_verify") {
        const modal = new ModalBuilder()
          .setTitle("Deny Verification Request")
          .setCustomId(`deny_verify_modal:${interaction.message.id}`);

        const reason = new LabelBuilder()
          .setLabel("Why did you deny this request?")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId("reason_deny_verify")
              .setStyle(TextInputStyle.Short)
              .setMaxLength(32)
              .setRequired(true),
          );

        modal.addLabelComponents(reason);

        return await interaction.showModal(modal);
      }

      if (
        interaction.isModalSubmit() &&
        interaction.customId.startsWith("deny_verify_modal:")
      ) {
        await interaction.deferReply({ flags: 64 });

        try {
          const userId = interaction.user.id;

          const reasonDeny = interaction.fields
            .getTextInputValue("reason_deny_verify")
            .trim();

          const [, messageId] = interaction.customId.split(":");

          const request = await VerificationRequest.findOne({
            messageId,
            status: "pending",
          });

          if (!request) {
            return await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setDescription(
                    "This verification request no longer exists or has already been processed.",
                  )
                  .setColor(Colors.Red),
              ],
            });
          }

          const guild = interaction.guild;

          if (!guild) {
            return await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setDescription(
                    "This action can only be used inside a server.",
                  )
                  .setColor(Colors.Red),
              ],
            });
          }

          // IMPORTANT:
          // Fetch the person who submitted the verification request,
          // not the person who clicked the deny button.
          const member = await guild.members
            .fetch(request.discordId)
            .catch(() => null);

          if (!member) {
            return await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setDescription("The user could not be found in this server.")
                  .setColor(Colors.Red),
              ],
            });
          }

          request.status = "denied";
          request.deniedBy = userId;
          request.deniedAt = new Date();

          await request.save();

          if (!request.channelId || !request.messageId) {
            return await interaction.reply({
              embeds: [
                new EmbedBuilder()
                  .setDescription(
                    "This verification request is missing its channel or message information.",
                  )
                  .setColor("Red"),
              ],
              flags: 64,
            });
          }

          const channel = guild.channels.cache.get(request.channelId);

          if (channel?.isTextBased()) {
            const message = await channel.messages
              .fetch(request.messageId)
              .catch(() => null);

            if (message) {
              const deniedContainer = new ContainerBuilder()
                .setAccentColor(Colors.Red)
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `## Verification Request

A new verification request has been made and it's pending review. Please review the request and take appropriate action.

**Request Information:**
> - Roblox Username: ${request.robloxUsername}
> - Discord Username: ${request.discordUsername}
> - Rank in Group: ${request.groupRankName}
> - Who invited you: ${request.invitedBy}
> - Proof`,
                  ),
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `-# Request made by <@${request.discordId}>\n-# Request denied by <@${userId}>`,
                  ),
                );

              await message.edit({
                components: [deniedContainer],
                flags: MessageFlags.IsComponentsV2,
              });
            }
          }

          await member
            .send({
              embeds: [
                new EmbedBuilder()
                  .setColor(Colors.DarkRed)
                  .setTitle("Verification Request Denied")
                  .setDescription(
                    `Your verification request has been denied.\n\n` +
                      `**Reason:** ${reasonDeny}\n\n` +
                      `> If you believe this is a mistake, please contact a member of the Management Leadership team.`,
                  )
                  .setTimestamp(),
              ],
            })
            .catch(() => null);

          return await interaction.editReply({
            content: "Verification request denied successfully.",
          });
        } catch (error) {
          console.error("[Verification] Deny error:", error);

          return await interaction
            .editReply({
              embeds: [
                new EmbedBuilder()
                  .setDescription(
                    "An unexpected error occurred while denying this verification request.",
                  )
                  .setColor(Colors.Red),
              ],
            })
            .catch(() => {});
        }
      }

      if (interaction.isButton() && interaction.customId === "exam_start") {
        await interaction.reply({
          content: "https://forms.gle/qRbe6X8JEYykQ2cu9",
          flags: 64,
        });

        const container = new ContainerBuilder()
          .setAccentColor(0x2ecc71)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "## <:freshway:1525789609601007646> Examination Started\n" +
                "A user has started their management examination. The examination is now in progress.",
            ),
          )
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
          )
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `**User**\n${interaction.user}\n\`${interaction.user.id}\``,
                ),
                new TextDisplayBuilder().setContent(
                  `**Started At**\n<t:${Math.floor(Date.now() / 1000)}:F>\n<t:${Math.floor(Date.now() / 1000)}:R>`,
                ),
              )
              .setThumbnailAccessory(
                new ThumbnailBuilder({
                  media: {
                    url: interaction.user.displayAvatarURL({ size: 256 }),
                  },
                }),
              ),
          )
          .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "-# FreshWay Management • Examination System",
            ),
          );

        const channel = interaction.guild?.channels.cache.get(
          "1532374206648680488",
        );
        if (!channel || !channel.isSendable()) return;

        await channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      if (
        interaction.isModalSubmit() &&
        interaction.customId === "suggestion_create_modal"
      ) {
        const title = interaction.fields.getTextInputValue("suggestion_title");

        const description = interaction.fields.getTextInputValue(
          "suggestion_describe",
        );

        const type =
          interaction.fields.getStringSelectValues("suggestion_type")[0];

        const member = interaction.member;

        let authorName = interaction.user.username;
        let authorAvatar = interaction.user.displayAvatarURL({
          extension: "png",
          size: 256,
        });

        if (member && "displayName" in member) {
          authorName = member.displayName;

          const guildMember = member;

          authorAvatar =
            guildMember.displayAvatarURL({
              extension: "png",
              size: 256,
            }) ?? authorAvatar;
        }

        const typeNames: Record<string, string> = {
          server_suggestion: "Server Suggestion",
          feedback: "Feedback",
          bug: "Bug",
          suggestion: "Suggestion",
          rule_change: "Rule Change",
          other: "Other",
        };

        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(description)
          .setAuthor({
            name: `${authorName} • ${typeNames[type] ?? "Other"}`,
            iconURL: authorAvatar,
          })
          .addFields(
            {
              name: "Category",
              value: typeNames[type] ?? "Other",
              inline: true,
            },
            {
              name: "Created By",
              value: `${interaction.user}`,
              inline: true,
            },
          )
          .setFooter({
            text: "Management Suggestions • Vote using the buttons below",
          })
          .setColor("Green")
          .setTimestamp();

        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("suggestion_upvote:TEMP")
            .setLabel("Upvote • 0")
            .setEmoji("👍")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("suggestion_downvote:TEMP")
            .setLabel("Upvote • 0")
            .setEmoji("👎")
            .setStyle(ButtonStyle.Secondary),
        );

        const channel = interaction.guild?.channels.cache.get(
          "1553111228023578644",
        );

        if (!channel || !channel.isTextBased() || !("send" in channel)) {
          return;
        }

        await interaction.deferReply({ flags: 64 });

        const message = await channel.send({
          embeds: [embed],
          components: [buttons],
        });

        const thread = await message.startThread({
          name: `${title}`,
          autoArchiveDuration: 1440,
        });

        const suggestion = await Suggestion.create({
          messageId: message.id,
          channelId: channel.id,
          threadId: thread.id,
          authorId: interaction.user.id,
          authorName,
          authorAvatar,
          title,
          description,
          type,
          upvotes: 0,
          downvotes: 0,
          votes: [],
        });

        const updatedButtons =
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`suggestion_upvote:${suggestion.id}`)
              .setLabel("Upvote • 0")
              .setEmoji("👍")
              .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
              .setCustomId(`suggestion_downvote:${suggestion.id}`)
              .setLabel("Downvote • 0")
              .setEmoji("👎")
              .setStyle(ButtonStyle.Secondary),
          );

        await message.edit({
          components: [updatedButtons],
        });

        await thread.send({
          content: `Discussion thread for **${title}**.\n\nCreated by ${interaction.user}.`,
        });

        await interaction.editReply({
          content: `Your suggestion has been created: ${message.url}`,
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith("suggestion_upvote:")
      ) {
        await handleVote(interaction, "up");
        return;
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith("suggestion_downvote:")
      ) {
        await handleVote(interaction, "down");
        return;
      }

      async function handleVote(
        interaction: ButtonInteraction,
        voteType: "up" | "down",
      ): Promise<void> {
        const suggestionId = interaction.customId.split(":")[1];

        if (!suggestionId) {
          await interaction.reply({
            content: "This suggestion is invalid.",
            ephemeral: true,
          });
          return;
        }

        const suggestion = await Suggestion.findById(suggestionId);

        if (!suggestion) {
          await interaction.reply({
            content: "This suggestion no longer exists.",
            ephemeral: true,
          });
          return;
        }

        const existingVote = suggestion.votes.find(
          (vote) => vote.userId === interaction.user.id,
        );

        let result: "added" | "removed" | "changed";

        /*
         * Same vote button = remove vote
         */
        if (existingVote?.vote === voteType) {
          suggestion.votes = suggestion.votes.filter(
            (vote) => vote.userId !== interaction.user.id,
          );

          if (voteType === "up") {
            suggestion.upvotes = Math.max(0, suggestion.upvotes - 1);
          } else {
            suggestion.downvotes = Math.max(0, suggestion.downvotes - 1);
          }

          result = "removed";
        } else if (existingVote) {
          /*
           * Different vote button = change vote
           */
          if (existingVote.vote === "up") {
            suggestion.upvotes = Math.max(0, suggestion.upvotes - 1);
            suggestion.downvotes += 1;
          } else {
            suggestion.downvotes = Math.max(0, suggestion.downvotes - 1);
            suggestion.upvotes += 1;
          }

          existingVote.vote = voteType;

          result = "changed";
        } else {
          /*
           * No existing vote = add vote
           */
          suggestion.votes.push({
            userId: interaction.user.id,
            vote: voteType,
          });

          if (voteType === "up") {
            suggestion.upvotes += 1;
          } else {
            suggestion.downvotes += 1;
          }

          result = "added";
        }

        await suggestion.save();

        /*
         * Fetch suggestion message.
         */

        const channel = await interaction.client.channels.fetch(
          suggestion.channelId,
        );

        if (!channel || !channel.isTextBased() || !("messages" in channel)) {
          await interaction.reply({
            content: "I couldn't find the suggestion channel.",
            ephemeral: true,
          });
          return;
        }

        const message = await channel.messages.fetch(suggestion.messageId);

        /*
         * Update embed.
         */

        const embed = EmbedBuilder.from(message.embeds[0]);

        /*
         * Update buttons.
         */

        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`suggestion_upvote:${suggestion.id}`)
            .setLabel(`Upvote • ${suggestion.upvotes}`)
            .setEmoji("👍")
            .setStyle(ButtonStyle.Secondary),

          new ButtonBuilder()
            .setCustomId(`suggestion_downvote:${suggestion.id}`)
            .setLabel(`Downvote • ${suggestion.downvotes}`)
            .setEmoji("👎")
            .setStyle(ButtonStyle.Secondary),
        );

        await message.edit({
          embeds: [embed],
          components: [buttons],
        });

        /*
         * Response to voter.
         */

        let response: string;

        if (result === "removed") {
          response = "Your vote has been removed.";
        } else if (result === "changed") {
          response =
            voteType === "up"
              ? "Your vote has been changed to an upvote."
              : "Your vote has been changed to a downvote.";
        } else {
          response =
            voteType === "up"
              ? "You upvoted this suggestion."
              : "You downvoted this suggestion.";
        }

        await interaction.reply({
          content: response,
          ephemeral: true,
        });
      }

      if (
        interaction.isModalSubmit() &&
        interaction.customId === "sotm_modal"
      ) {
        await interaction.deferReply({ flags: 64 });

        const channelId = config.sotmRequestsId;

        const robloxUsername = interaction.fields.getTextInputValue(
          "roblox_username_sotm",
        );

        const discordUserId = interaction.fields
          .getTextInputValue("discord_username_sotm")
          .trim();

        const justification =
          interaction.fields.getTextInputValue("justification_sotm");

        const proof = interaction.fields.getTextInputValue("proof_sotm");

        if (!/^\d{17,20}$/.test(discordUserId)) {
          await interaction.editReply({
            content: "Invalid Discord User ID. Please provide a valid user ID.",
          });
          return;
        }

        const candidate = await this.client.users
          .fetch(discordUserId)
          .catch(() => null);

        if (!candidate) {
          await interaction.editReply({
            content:
              "I couldn't find a Discord account with that ID. Please check the ID and try again.",
          });
          return;
        }

        const discordUsername = candidate.username;
        const candidateDiscordId = candidate.id;

        const channel = await this.client.channels.fetch(channelId);

        if (!channel?.isTextBased() || !("send" in channel)) {
          await interaction.editReply({
            content: "The SOTM request channel could not be found.",
          });
          return;
        }

        const robloxUser = await getRobloxUser(robloxUsername);

        if (!robloxUser.exists) {
          return await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  "This Roblox user does not exist. Please provide a valid Roblox username.",
                )
                .setColor(Colors.Red),
            ],
          });
        }

        if (!robloxUser.group.inGroup) {
          return await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  "This Roblox user is not a member of our Roblox group.",
                )
                .setColor(Colors.Red),
            ],
          });
        }

        if (
          !robloxUser.id ||
          !robloxUser.username ||
          robloxUser.group.rankId === null ||
          robloxUser.group.rankName === null
        ) {
          return await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  "We couldn't retrieve your Roblox group information. Please make sure you are in the group and try again.",
                )
                .setColor(Colors.Red),
            ],
          });
        }

        const request = await SOTMRequest.create({
          robloxUsername,
          discordUsername,
          candidateDiscordId,
          justification,
          proof,
          submittedBy: interaction.user.id,
          submittedByTag: interaction.user.tag,
          guildId: interaction.guildId!,
          channelId: channel.id,
          status: "pending",
        });

        const submittedAt = Math.floor(Date.now() / 1000);

        const container = new ContainerBuilder()
          .setAccentColor(0xb58aff)

          // HEADER
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              [
                "# <:highlight:1530895368324251788> STAFF OF THE MONTH",
                "### Nomination Submission",
                "",
                "A new nomination has entered the review queue.",
                "Review the candidate's contributions and supporting evidence below.",
              ].join("\n"),
            ),
          )

          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))

          // CANDIDATE PROFILE
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              [
                "## CANDIDATE PROFILE",
                "",
                `**Roblox Username**\n> ${robloxUsername} \`${robloxUser.id}\``,
                "",
                `**Discord Username**\n> ${discordUsername} \`${candidateDiscordId}\``,
                "",
                `**Rank In Group**\n> ${robloxUser.group.rankName} \`${robloxUser.group.rankId}\``,
              ].join("\n"),
            ),
          )

          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))

          // JUSTIFICATION
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              ["## NOMINATION JUSTIFICATION", "", justification].join("\n"),
            ),
          )

          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))

          // EVIDENCE
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              [
                "## SUPPORTING EVIDENCE",
                "",
                proof
                  ? `> [View submitted evidence](${proof})`
                  : "> No supporting evidence was provided.",
              ].join("\n"),
            ),
          )

          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))

          // SUBMISSION DETAILS
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              [
                "## SUBMISSION DETAILS",
                "",
                `**Submitted By**\n<@${interaction.user.id}>`,
                `**Submitted At**\n<t:${submittedAt}:F>`,
                `**Request ID**\n\`${request.id}\``,
                "**Status**\n`PENDING REVIEW`",
              ].join("\n"),
            ),
          )

          .addSeparatorComponents(new SeparatorBuilder().setDivider(true))

          // FOOTER
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              [
                "-# MANAGEMENT • STAFF RECOGNITION",
                "-# Please review this nomination before making a decision.",
              ].join("\n"),
            ),
          );

        const message = await channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        });

        const thread = await message.startThread({
          name: `${robloxUsername} // SOTM Nominate`,
          autoArchiveDuration: 1440,
        });

        await thread
          .send("Here you can discuss this SOTM request.")
          .catch(() => {});

        request.messageId = message.id;
        await request.save();

        await interaction.editReply({
          content:
            "Your Staff of the Month request has been submitted successfully.",
        });
      }
    });

    this.client.on(Events.GuildMemberAdd, async (member) => {
      if (!member) return;

      await member.roles.add("1523409115441791006").catch(async () => {
        const container = new ContainerBuilder();

        const text = new TextDisplayBuilder().setContent(
          "We have failed to give you the Verification Required role. Please contact a administrator to give you this role.",
        );

        container.addTextDisplayComponents(text);

        await member.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
      });
    });
  }
}

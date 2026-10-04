import {
  ActionRowBuilder,
  ButtonBuilder,
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
import { WeeklyQuotaSystem } from "../systems/WeeklyQuotaReminder";

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

      const weeklyQuotaSystem = new WeeklyQuotaSystem(client);

      weeklyQuotaSystem.start();

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

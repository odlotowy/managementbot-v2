import {
  ChannelType,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { TrainingSystem } from "../systems/TrainingSystem";

export default {
  data: new SlashCommandBuilder()
    .setName("training")
    .setDescription("Manage Management training sessions.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("start")
        .setDescription("Start a training session.")
        .addUserOption((option) =>
          option
            .setName("trainee")
            .setDescription("The user who will be trained.")
            .setRequired(true),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        flags: 64,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand !== "start") return;

    const trainee = interaction.options.getUser("trainee", true);

    if (trainee.bot) {
      await interaction.reply({
        content: "You cannot start training for a bot.",
        flags: 64,
      });
      return;
    }

    if (trainee.id === interaction.user.id) {
      await interaction.reply({
        content: "You cannot train yourself.",
        flags: 64,
      });
      return;
    }

    if (
      !interaction.channel ||
      interaction.channel.type !== ChannelType.GuildText
    ) {
      await interaction.reply({
        content: "Training must be started in a server text channel.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ flags: 64 });

    try {
      await TrainingSystem.start(
        interaction.channel as TextChannel,
        trainee.id,
        interaction.user.id,
      );

      await interaction.editReply({
        content:
          `Training has been started for ${trainee}.\n` +
          `The first part has been sent in this channel.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred.";

      await interaction.editReply({
        content: `Failed to start training: ${message}`,
      });
    }
  },
};

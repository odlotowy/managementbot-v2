import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  Colors,
  ContainerBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SeparatorBuilder,
  SlashCommandBuilder,
  TextDisplayBuilder,
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("exam-send")
    .setDescription("Sends the exam embed")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      // Respond to Discord immediately
      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });

      if (!interaction.guild) {
        await interaction.editReply(
          "This command can only be used in a server.",
        );
        return;
      }

      if (!interaction.channel || !interaction.channel.isSendable()) {
        await interaction.editReply("I cannot send messages in this channel.");
        return;
      }

      const container = new ContainerBuilder()
        .setAccentColor(Colors.DarkGrey)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## Begin the Examination

Start your Management Examination by clicking the button below.

You will have **60 minutes** to complete the examination. Failure to complete it within the time limit will result in **removal from the MTP**.
`,
          ),
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setLabel("Begin Examination")
              .setCustomId("exam_start")
              .setStyle(ButtonStyle.Primary)
              .setEmoji("<:check:1525789302989258972>"),
          ),
        );

      await interaction.channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });

      await interaction.editReply("Stage 2 message sent successfully!");
    } catch (error) {
      if (interaction.deferred || interaction.replied) {
        await interaction
          .editReply(
            "An error occurred while sending the verification message.",
          )
          .catch(() => {});
      }
    }
  },
};

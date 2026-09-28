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
    .setName("verify")
    .setDescription("Sends the verification message")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

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

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "## Management Server Verification\n" +
            "We're excited to welcome you to the Management Team. To continue with your internship program, you need to verify yourself using the button below.\n\n" +
            "You will need to provide:\n" +
            "- Roblox Username\n" +
            "- Discord Username\n" +
            "- Who invited you to the server\n" +
            "- Proof of invitation",
        ),
      );

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "To begin the verification process, please use the button below.",
        ),
      );

      const separator = new SeparatorBuilder();

      container.addSeparatorComponents(separator);

      const text2 = new TextDisplayBuilder().setContent(
        "-# Your request will be processed by the Management Leadership Team",
      );

      container.addTextDisplayComponents(text2);

      const verifyButton = new ButtonBuilder()
        .setLabel("Begin The Verification Process")
        .setStyle(ButtonStyle.Success)
        .setCustomId(`verify_button`);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        verifyButton,
      );

      container.addActionRowComponents(row);

      container.setAccentColor(Colors.DarkGreen);

      await interaction.channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });

      await interaction.editReply("Verification message sent successfully!");
    } catch (error) {
      console.error("[Verify] Error:", error);

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

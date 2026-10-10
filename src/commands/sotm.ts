import {
  ChatInputCommandInteraction,
  LabelBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("sotm-request")
    .setDescription("Create a new Staff of the Month (SOTM) request"),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const modal = new ModalBuilder()
      .setTitle("Staff of The Month Request")
      .setCustomId("sotm_modal");

    const roblox = new LabelBuilder()
      .setLabel("Roblox Username")
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId("roblox_username_sotm")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Nominate's roblox username"),
      );

    const discord = new LabelBuilder()
      .setLabel("Discord User ID")
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId("discord_username_sotm")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Nominate's discord user ID"),
      );

    const reason = new LabelBuilder()
      .setLabel("Justification")
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId("justification_sotm")
          .setStyle(TextInputStyle.Paragraph)
          .setMinLength(10)
          .setMaxLength(2000),
      );

    const proof = new LabelBuilder()
      .setLabel("Proof")
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId("proof_sotm")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("E.g. Google Drive, Dropbox etc."),
      );

    modal.addLabelComponents(roblox, discord, reason, proof);

    await interaction.showModal(modal);
  },
};

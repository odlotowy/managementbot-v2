import {
  ChatInputCommandInteraction,
  LabelBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Create a new suggesion"),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const modal = new ModalBuilder()
      .setCustomId("suggestion_create_modal")
      .setTitle("Create a Suggestion");

    const title = new LabelBuilder()
      .setLabel("Title")
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId("suggestion_title")
          .setPlaceholder("Title of your suggestion...")
          .setStyle(TextInputStyle.Short)
          .setMinLength(5)
          .setMaxLength(32),
      );

    const desc = new LabelBuilder()
      .setLabel("Description")
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId("suggestion_describe")
          .setPlaceholder("Describe your suggestion...")
          .setStyle(TextInputStyle.Paragraph)
          .setMinLength(32)
          .setMaxLength(2000),
      );

    const type = new LabelBuilder()
      .setLabel("Select Suggestion Type")
      .setStringSelectMenuComponent(
        new StringSelectMenuBuilder()
          .setCustomId("suggestion_type")
          .setPlaceholder("Type of your suggestion")
          .addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel("Server Suggestion")
              .setEmoji("<:globe:1566813240116125826>")
              .setValue("server_suggestion"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Feedback")
              .setEmoji("<:megaphone:1566813247779377152>")
              .setValue("feedback"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Bug")
              .setEmoji("<:cross:1566812455663837265>")
              .setValue("bug"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Suggestion")
              .setEmoji("<:question:1566812566301311156>")
              .setValue("suggestion"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Rule Change")
              .setEmoji("<:icon_rocket:1566813252858548234>")
              .setValue("rule_change"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Other")
              .setEmoji("<:icon_pin:1566813251357118474>")
              .setValue("other"),
          ),
      );

    modal.addLabelComponents(title, desc, type);

    await interaction.showModal(modal);
  },
};

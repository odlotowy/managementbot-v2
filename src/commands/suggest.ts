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
              .setEmoji("<:pencil1:1530895405250908260>")
              .setValue("server_suggestion"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Feedback")
              .setEmoji("<:announcement:1525789206616608839>")
              .setValue("feedback"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Bug")
              .setEmoji("<:cross1:1525789345376768020>")
              .setValue("bug"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Suggestion")
              .setEmoji("<:question1:1525789921749766194>")
              .setValue("suggestion"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Rule Change")
              .setEmoji(":vacancies:1525790005077872650>")
              .setValue("rule_change"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Other")
              .setEmoji("<:discord:1525789419687247922>")
              .setValue("other"),
          ),
      );

    modal.addLabelComponents(title, desc, type);

    await interaction.showModal(modal);
  },
};

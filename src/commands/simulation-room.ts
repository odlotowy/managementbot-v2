import {
  ButtonStyle,
  ChatInputCommandInteraction,
  Colors,
  ContainerBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SeparatorBuilder,
  SlashCommandBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("simulation-room")
    .setDescription("Creates a embed to open a simulation room")
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

      const container = new ContainerBuilder()
        .setAccentColor(Colors.DarkGrey)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## Open a Simulation Room

To proceed to the next stage of the Management Training Program, please open a Simulation Room to begin your practical training.

During this stage, you will participate in a Ticket Training session to demonstrate your understanding of Management procedures and support responsibilities. You will also have the opportunity to discuss and arrange a suitable date and time for your Trial Shift with a member of the Training Coordination Team.

Please ensure you are prepared and ready to participate before opening your Simulation Room.
`,
          ),
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setLabel("Open Simulation Room")
              .setCustomId("simulation_room")
              .setStyle(ButtonStyle.Primary)
              .setEmoji("<:training:1525789986014888036>"),
          ),
        );

      await interaction.channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });

      await interaction.editReply("Simulation room message sent successfully!");
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

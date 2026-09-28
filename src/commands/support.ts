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
    .setName("support")
    .setDescription("Sends the support message")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      // Respond to Discord immediately
      await interaction.deferReply({
        flags: 64,
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

      container.setAccentColor(Colors.DarkGreen);

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## FreshWay Management Department - Support Section\n\n> If you have any questions or issues, please click the 'General Support' button. It will open a support ticket and the management leadership will answer you as soon as possible.\n\n> If you need to go on LOA, please click the 'LOA Request' button and fill out the form. Management Leadership will review it as soon as possible.\n\n> If you need to go on RA, please click the 'RA Request' button and fill out the form. Management Leadership will review it as soon as possible.\n\n> If you think a manager is abusing the rank or not following the rules. Or if the manager's behavior is inappropriate. Feel free to open a 'Manager Report' ticket.`,
        ),
      );

      const separator = new SeparatorBuilder();
      container.addSeparatorComponents(separator);

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `-# Please note that abuse of tickets is subject to punishment.`,
        ),
      );

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("General Support")
          .setStyle(ButtonStyle.Danger)
          .setCustomId("general_support")
          .setEmoji("<:question1:1525789921749766194>"),
        new ButtonBuilder()
          .setLabel("Manager Report")
          .setStyle(ButtonStyle.Primary)
          .setCustomId("manager_report")
          .setEmoji("<:moderation:1525789839415574618>"),
        new ButtonBuilder()
          .setLabel("LOA Request")
          .setStyle(ButtonStyle.Secondary)
          .setCustomId("loa_request")
          .setEmoji("<:vacancies:1525790005077872650>"),
        new ButtonBuilder()
          .setLabel("RA Request")
          .setStyle(ButtonStyle.Secondary)
          .setCustomId("ra_request")
          .setEmoji("<:highlight:1530895368324251788>"),
      );

      container.addActionRowComponents(row);

      await interaction.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });

      await interaction.reply("Verification message sent successfully!");
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

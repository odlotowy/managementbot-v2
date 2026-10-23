import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("warning")
    .setDescription("Issue a warning")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The member to suspend.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the suspension.")
        .setMaxLength(500)
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    const target = interaction.options.getMember("user");
    const user = interaction.options.getUser("user", true);
    const reason =
      interaction.options.getString("reason") ?? "No reason provided.";

    const member =
      target && "roles" in target && "id" in target
        ? target
        : await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      await interaction.editReply(
        "The selected user is not a member of this server.",
      );
      return;
    }

    if (member.id === interaction.user.id) {
      await interaction.editReply("You cannot suspend yourself.");
      return;
    }

    if (member.id === interaction.client.user?.id) {
      await interaction.editReply("You cannot suspend the bot.");
      return;
    }

    if (
      member.roles.highest.position >=
      (await interaction.guild.members.fetchMe()).roles.highest.position
    ) {
      await interaction.editReply(
        "I cannot manage this member because their highest role is equal to or higher than my highest role.",
      );
      return;
    }
  },
};

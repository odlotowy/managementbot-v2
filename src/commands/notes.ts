import {
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextDisplayBuilder,
} from "discord.js";
import StaffNote from "../schemas/StaffNotes.js";

const COLORS = {
  primary: 0x5866f2,
  success: 0x57f287,
  error: 0xed4245,
};

function createPanel(
  title: string,
  description: string,
  color = COLORS.primary,
) {
  return new ContainerBuilder()
    .setAccentColor(color)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${title}\n${description}`),
    );
}

async function replyV2(
  interaction: ChatInputCommandInteraction,
  container: ContainerBuilder,
) {
  const payload = {
    components: [container],
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    allowedMentions: { parse: [] },
  };

  if (interaction.replied || interaction.deferred) {
    return interaction.followUp(payload);
  }

  return interaction.reply(payload);
}

export default {
  data: new SlashCommandBuilder()
    .setName("notes")
    .setDescription("Manage private staff notes.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a note to a staff member.")
        .addUserOption((option) =>
          option
            .setName("member")
            .setDescription("Staff member")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("content")
            .setDescription("Note content")
            .setRequired(true)
            .setMaxLength(2000),
        )
        .addStringOption((option) =>
          option
            .setName("category")
            .setDescription("Note category")
            .setRequired(true)
            .addChoices(
              { name: "General", value: "General" },
              { name: "Performance", value: "Performance" },
              { name: "Behaviour", value: "Behaviour" },
              { name: "Concern", value: "Concern" },
            ),
        ),
    )

    .addSubcommand((subcommand) =>
      subcommand
        .setName("view")
        .setDescription("View a staff member's notes.")
        .addUserOption((option) =>
          option
            .setName("member")
            .setDescription("Staff member")
            .setRequired(true),
        ),
    )

    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete a staff note.")
        .addIntegerOption((option) =>
          option
            .setName("id")
            .setDescription("Note ID")
            .setRequired(true)
            .setMinValue(1),
        ),
    )

    .addSubcommand((subcommand) =>
      subcommand
        .setName("edit")
        .setDescription("Edit a staff note.")
        .addIntegerOption((option) =>
          option
            .setName("id")
            .setDescription("Note ID")
            .setRequired(true)
            .setMinValue(1),
        )
        .addStringOption((option) =>
          option
            .setName("content")
            .setDescription("New note content")
            .setRequired(true)
            .setMaxLength(2000),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (
      !interaction.guild ||
      !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
    ) {
      const panel = createPanel(
        "Access Denied",
        "You don't have permission to manage staff notes.",
        COLORS.error,
      );

      await replyV2(interaction, panel);
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    try {
      // ADD NOTE
      if (subcommand === "add") {
        const member = interaction.options.getUser("member", true);
        const content = interaction.options.getString("content", true);
        const category = interaction.options.getString("category", true) as
          | "General"
          | "Performance"
          | "Behaviour"
          | "Concern";

        const latestNote = await StaffNote.findOne().sort({ noteId: -1 });
        const noteId = (latestNote?.noteId ?? 0) + 1;

        await StaffNote.create({
          noteId,
          userId: member.id,
          authorId: interaction.user.id,
          content,
          category,
        });

        const panel = createPanel(
          "Note Added",
          [
            `Successfully created staff note **#${noteId}**.`,
            "",
            `**Staff Member**`,
            `${member} (\`${member.id}\`)`,
            "",
            `**Category**`,
            `\`${category}\``,
            "",
            `**Added By**`,
            `${interaction.user}`,
          ].join("\n"),
          COLORS.success,
        );

        await replyV2(interaction, panel);
        return;
      }

      // VIEW NOTES
      if (subcommand === "view") {
        const member = interaction.options.getUser("member", true);

        const notes = await StaffNote.find({
          userId: member.id,
        }).sort({ createdAt: -1 });

        if (!notes.length) {
          const panel = createPanel(
            "No Staff Notes",
            `No notes have been recorded for ${member}.`,
          );

          await replyV2(interaction, panel);
          return;
        }

        const displayedNotes = notes.slice(0, 5);

        const description = displayedNotes
          .map((note) => {
            const timestamp = Math.floor(note.createdAt.getTime() / 1000);

            const content =
              note.content.length > 700
                ? `${note.content.slice(0, 697)}...`
                : note.content;

            return [
              `### Note #${note.noteId}`,
              `**Category:** ${note.category}`,
              `**Content:**`,
              content,
              "",
              `**Added by:** <@${note.authorId}>`,
              `**Created:** <t:${timestamp}:f>`,
              `**Updated:** <t:${Math.floor(note.updatedAt.getTime() / 1000)}:R>`,
            ].join("\n");
          })
          .join("\n\n---\n\n");

        const panel = createPanel(
          `Staff Notes — ${member.username}`,
          [
            `**Member:** ${member} (\`${member.id}\`)`,
            `**Total Notes:** ${notes.length}`,
            "",
            "---",
            "",
            description,
            "",
            "---",
            `Showing ${displayedNotes.length} of ${notes.length} notes.`,
          ].join("\n"),
        );

        await replyV2(interaction, panel);
        return;
      }

      // DELETE NOTE
      if (subcommand === "delete") {
        const id = interaction.options.getInteger("id", true);

        const note = await StaffNote.findOneAndDelete({
          noteId: id,
        });

        if (!note) {
          const panel = createPanel(
            "Note Not Found",
            `Staff note **#${id}** does not exist.`,
            COLORS.error,
          );

          await replyV2(interaction, panel);
          return;
        }

        const panel = createPanel(
          "Note Deleted",
          [
            `Staff note **#${id}** has been successfully deleted.`,
            "",
            `**Staff Member:** <@${note.userId}>`,
            `**Category:** \`${note.category}\``,
            `**Deleted By:** ${interaction.user}`,
          ].join("\n"),
          COLORS.success,
        );

        await replyV2(interaction, panel);
        return;
      }

      // EDIT NOTE
      if (subcommand === "edit") {
        const id = interaction.options.getInteger("id", true);
        const content = interaction.options.getString("content", true);

        const note = await StaffNote.findOneAndUpdate(
          { noteId: id },
          {
            $set: {
              content,
            },
          },
          {
            returnDocument: "after",
            runValidators: true,
          },
        );

        if (!note) {
          const panel = createPanel(
            "Note Not Found",
            `Staff note **#${id}** does not exist.`,
            COLORS.error,
          );

          await replyV2(interaction, panel);
          return;
        }

        const panel = createPanel(
          "Note Updated",
          [
            `Staff note **#${id}** has been successfully updated.`,
            "",
            `**Staff Member:** <@${note.userId}>`,
            `**Category:** \`${note.category}\``,
            `**Updated By:** ${interaction.user}`,
            "",
            "**New Content:**",
            note.content,
          ].join("\n"),
          COLORS.success,
        );

        await replyV2(interaction, panel);
        return;
      }
    } catch (error) {
      console.error("[Staff Notes] Error", error);

      const panel = createPanel(
        "Something Went Wrong",
        "An error occurred while processing this staff note. Please try again later or contact bot administrator.",
        COLORS.error,
      );

      await replyV2(interaction, panel);
      return;
    }
  },
};

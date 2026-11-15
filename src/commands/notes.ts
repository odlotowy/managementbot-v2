import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  User,
  ButtonInteraction,
} from "discord.js";

import StaffNote from "../schemas/StaffNotes.js";

const PAGE_SIZE = 2;
const MODAL_TIMEOUT = 5 * 60 * 1000;

const COLORS = {
  default: 0x5865f2,
  success: 0x57f287,
  error: 0xed4245,
};

type NoteCategory = "General" | "Performance" | "Behaviour" | "Concern";

function createContainer(color = COLORS.default) {
  return new ContainerBuilder().setAccentColor(color);
}

function addText(container: ContainerBuilder, content: string) {
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(content),
  );
}

function addSeparator(container: ContainerBuilder) {
  container.addSeparatorComponents(
    new SeparatorBuilder()
      .setDivider(true)
      .setSpacing(SeparatorSpacingSize.Small),
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

function createStatus(
  title: string,
  description: string,
  color = COLORS.default,
) {
  const container = createContainer(color);

  addText(container, `## ${title}`);
  addText(container, description);

  return container;
}

function createNoteModal(customId: string, title: string, content?: string) {
  const modal = new ModalBuilder().setCustomId(customId).setTitle(title);

  const input = new TextInputBuilder()
    .setCustomId("content")
    .setLabel("Note content")
    .setPlaceholder("Write your staff note here...")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(2000);

  if (content) {
    input.setValue(content);
  }

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(input),
  );

  return modal;
}

function createPaginationButtons(page: number, totalPages: number) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("staff_notes_previous")
      .setLabel("Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),

    new ButtonBuilder()
      .setCustomId("staff_notes_page")
      .setLabel(`${page + 1} / ${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),

    new ButtonBuilder()
      .setCustomId("staff_notes_next")
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1),
  );
}

function createNotesPage(
  member: User,
  notes: Awaited<ReturnType<typeof StaffNote.find>>,
  page: number,
) {
  const totalPages = Math.max(1, Math.ceil(notes.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const displayedNotes = notes.slice(start, start + PAGE_SIZE);

  const container = createContainer();

  addText(container, "## Staff Notes");

  addText(
    container,
    [
      `**Member:** ${member} (\`${member.id}\`)`,
      `**Total records:** ${notes.length}`,
    ].join("\n"),
  );

  addSeparator(container);

  for (const note of displayedNotes) {
    const created = Math.floor(note.createdAt.getTime() / 1000);
    const updated = Math.floor(note.updatedAt.getTime() / 1000);

    addText(
      container,
      [
        `### #${note.noteId} · ${note.category}`,
        "",
        note.content,
        "",
        `-# Added by <@${note.authorId}>`,
        `-# Created <t:${created}:R> · Updated <t:${updated}:R>`,
      ].join("\n"),
    );

    addSeparator(container);
  }

  addText(
    container,
    `-# Showing ${start + 1}–${Math.min(start + PAGE_SIZE, notes.length)} of ${notes.length} records`,
  );

  container.addActionRowComponents(createPaginationButtons(page, totalPages));

  return container;
}

export const data = new SlashCommandBuilder()
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
      ),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (
    !interaction.guild ||
    !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
  ) {
    return replyV2(
      interaction,
      createStatus(
        "Access Denied",
        "You don't have permission to manage staff notes.",
        COLORS.error,
      ),
    );
  }

  const subcommand = interaction.options.getSubcommand();

  try {
    // ADD NOTE
    if (subcommand === "add") {
      const member = interaction.options.getUser("member", true);
      const category = interaction.options.getString(
        "category",
        true,
      ) as NoteCategory;

      const modalId = `staff_notes_add_${interaction.id}`;

      await interaction.showModal(createNoteModal(modalId, "Add Staff Note"));

      const submitted = await interaction
        .awaitModalSubmit({
          time: MODAL_TIMEOUT,
          filter: (modal) =>
            modal.customId === modalId && modal.user.id === interaction.user.id,
        })
        .catch(() => null);

      if (!submitted) return;

      const content = submitted.fields.getTextInputValue("content");

      const latestNote = await StaffNote.findOne().sort({ noteId: -1 });

      const noteId = (latestNote?.noteId ?? 0) + 1;

      await StaffNote.create({
        noteId,
        userId: member.id,
        authorId: interaction.user.id,
        content,
        category,
      });

      return submitted.reply({
        components: [
          createStatus(
            "Note Added",
            [
              `Successfully added note **#${noteId}**.`,
              "",
              `**Staff member:** ${member}`,
              `**Category:** ${category}`,
              `**Added by:** ${interaction.user}`,
            ].join("\n"),
            COLORS.success,
          ),
        ],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
      });
    }

    // VIEW NOTES
    if (subcommand === "view") {
      const member = interaction.options.getUser("member", true);

      const notes = await StaffNote.find({
        userId: member.id,
      }).sort({ createdAt: -1 });

      if (!notes.length) {
        return replyV2(
          interaction,
          createStatus(
            "No Staff Notes",
            `No notes have been recorded for ${member}.`,
          ),
        );
      }

      let currentPage = 0;

      await interaction.reply({
        components: [createNotesPage(member, notes, currentPage)],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
      });

      const message = await interaction.fetchReply();

      const collector = message.createMessageComponentCollector({
        time: 120_000,
        filter: (component) => component.user.id === interaction.user.id,
      });

      collector.on("collect", async (component: ButtonInteraction) => {
        if (
          component.customId !== "staff_notes_previous" &&
          component.customId !== "staff_notes_next"
        ) {
          return;
        }

        if (component.customId === "staff_notes_previous") {
          currentPage = Math.max(0, currentPage - 1);
        } else {
          currentPage = Math.min(
            Math.ceil(notes.length / PAGE_SIZE) - 1,
            currentPage + 1,
          );
        }

        await component.update({
          components: [createNotesPage(member, notes, currentPage)],
          allowedMentions: { parse: [] },
        });
      });

      return;
    }

    // DELETE NOTE
    if (subcommand === "delete") {
      const id = interaction.options.getInteger("id", true);

      const note = await StaffNote.findOneAndDelete({
        noteId: id,
      });

      if (!note) {
        return replyV2(
          interaction,
          createStatus(
            "Note Not Found",
            `Staff note **#${id}** does not exist.`,
            COLORS.error,
          ),
        );
      }

      return replyV2(
        interaction,
        createStatus(
          "Note Deleted",
          [
            `Staff note **#${id}** has been deleted.`,
            "",
            `**Staff member:** <@${note.userId}>`,
            `**Category:** ${note.category}`,
            `**Deleted by:** ${interaction.user}`,
          ].join("\n"),
          COLORS.success,
        ),
      );
    }

    // EDIT NOTE
    if (subcommand === "edit") {
      const id = interaction.options.getInteger("id", true);

      const note = await StaffNote.findOne({
        noteId: id,
      });

      if (!note) {
        return replyV2(
          interaction,
          createStatus(
            "Note Not Found",
            `Staff note **#${id}** does not exist.`,
            COLORS.error,
          ),
        );
      }

      const modalId = `staff_notes_edit_${interaction.id}`;

      await interaction.showModal(
        createNoteModal(modalId, `Edit Note #${id}`, note.content),
      );

      const submitted = await interaction
        .awaitModalSubmit({
          time: MODAL_TIMEOUT,
          filter: (modal) =>
            modal.customId === modalId && modal.user.id === interaction.user.id,
        })
        .catch(() => null);

      if (!submitted) return;

      const content = submitted.fields.getTextInputValue("content");

      await StaffNote.updateOne(
        { noteId: id },
        {
          $set: {
            content,
          },
        },
        { runValidators: true },
      );

      return submitted.reply({
        components: [
          createStatus(
            "Note Updated",
            [
              `Staff note **#${id}** has been updated.`,
              "",
              `**Staff member:** <@${note.userId}>`,
              `**Category:** ${note.category}`,
              `**Updated by:** ${interaction.user}`,
            ].join("\n"),
            COLORS.success,
          ),
        ],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
      });
    }
  } catch (error) {
    console.error("[Staff Notes] Error:", error);

    const panel = createStatus(
      "Something Went Wrong",
      "An error occurred while processing this request. Please try again later.",
      COLORS.error,
    );

    if (interaction.replied || interaction.deferred) {
      return interaction.followUp({
        components: [panel],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
      });
    }

    return replyV2(interaction, panel);
  }
}

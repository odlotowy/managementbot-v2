import { Message, TextChannel } from "discord.js";
import Training from "../schemas/Training";

const READY_MESSAGE = "I'm ready.";

interface TrainingPart {
  title: string;
  content: string;
}

const TRAINING_PARTS: TrainingPart[] = [
  {
    title: "Welcome & Management Regulations",
    content: `## Welcome to the Management Training Program!\n\nWe are happy to have you here. In this training, you will learn how our operations work and how to handle situations you may encounter regularly.\n\nAs a member of Management, you are expected to remain professional at all times, as you represent the community.\n\n## Management Regulations\n\n- Use proper grammar at all times.\n- Remain professional.\n- Complete assigned tasks unless you are on an approved LOA.\n- Complete your weekly Management quota.\n- Follow Discord and Roblox Terms of Service.\n- Use common sense.\n\nPlease read these regulations carefully. They apply to all members of Management.`,
  },
  {
    title: "Weekly Quota, Activity Streaks & Activity Strikes",
    content: `# Management Quota\n\nManagement activity is tracked weekly through our activity system. At the end of each week, the FreshWay Management Bot checks whether you have completed your assigned quota.\n\n## Activity Streaks\n\nTo qualify for an activity streak, you must:\n\n- Host or attend at least 2 shifts.\n- Handle at least 1 ticket.\n- Earn a minimum of 3 activity points during the week.\n\n**Important:** Completing at least 2 shifts and handling at least 1 ticket are mandatory. You cannot earn all 3 points from tickets. Failing to meet these requirements will result in an activity strike.\n\n## Activity Strikes\n\nIf you fail to complete any part of your weekly quota, you will receive an activity strike. Reaching 3 activity strikes may result in consequences, including possible removal from the department.\n\nA long activity streak can demonstrate reliability and dedication. Repeated activity strikes may be considered during performance reviews and future promotion decisions.`,
  },
  {
    title: "Rank Structure & Uniform Policy",
    content: `# Rank Structure\n\nMembers can progress through the ranks up to General Manager by demonstrating strong activity, performance, professionalism, and dedication.\n\nManagement Leadership considers each member's overall performance when making promotion decisions.\n\n## Management Rank Structure\n\n- Management Director (Management Leadership)\n- Deputy Management Director (Management Leadership)\n- Arena Manager (Management Leadership)\n- General Manager\n- Senior Store Manager\n- Store Manager\n- Junior Store Manager\n- Intern Store Manager\n\n## Uniform Policy\n\nWhen on duty, all Management team members must wear an appropriate uniform and maintain a professional appearance.\n\nRequirements:\n\n- Keep your avatar and overall appearance professional. Huge accessories are not allowed.\n- Wear the Management lanyard, available in the office area.\n- Wear the VoCoVo headset, available in the office area.\n- Formal accessories are permitted as long as they follow the rules.\n\nIf you have questions about the uniform policy, contact a member of Management Leadership.`,
  },
  {
    title: "SOTM, LOA & Reduced Activity",
    content: `# Staff of the Month (SOTM)\n\nThe SOTM program recognizes individuals who demonstrate dedication, professionalism, and strong activity streaks.\n\n## Nomination Process\n\n- Management members submit requests using \`/sotm-request\`.\n- Nominate eligible members based on their activity and professionalism throughout the month.\n- Self-nominations are not allowed.\n- Nominations must be honest.\n- Members currently on LOA cannot submit a request.\n\n# Leave of Absence (LOA)\n\nIf a circumstance prevents you from carrying out your Management duties, you may submit an LOA request. Failing to notify Leadership may result in disciplinary action.\n\n## LOA Guidelines\n\n- An LOA may last up to one month unless Leadership approves a longer period.\n- You must provide a valid reason, such as medical reasons, vacation, travel, or another circumstance.\n- Submit your request at least one week before your inactivity begins.\n- After your LOA ends, you will have a cooldown equal to the duration of the LOA plus one week.\n- You cannot submit another LOA during the cooldown.\n- You must not perform Management work while on LOA.\n\nTo request an LOA, go to the support section and select "LOA Request." Include a valid reason and provide advance notice.\n\nLeadership reserves the right to deny requests if the reason is not considered valid.\n\n# Reduced Activity (RA)\n\nRA is intended for temporary situations in which you cannot complete your full quota but are still able to help.\n\n## RA Guidelines\n\n- Use RA when you temporarily have limited time to be active.\n- Provide a valid reason, such as final exams, work commitments, or other circumstances.\n- Leadership will determine your tasks while you are on RA.\n- You are still expected to remain somewhat active, respond when possible, and complete assigned responsibilities.\n\nTo request RA, go to the support section and select "RA Request." Include a valid reason and ensure the requested dates do not overlap with an LOA cooldown.`,
  },
  {
    title: "Warning Strikes & Conduct",
    content: `# Strikes\n\nManagers who fail to meet their quota or violate rules and regulations may receive an activity strike or a warning strike, depending on the situation.\n\n## Activity Strikes\n\nActivity strikes are issued when a manager fails to meet the weekly quota:\n\n- **Strike 1:** A reminder that the quota was not completed.\n- **Strike 2:** A final reminder before further action is taken.\n- **Strike 3:** Depending on the situation, this may result in removal from the department.\n\nYou can remove an activity strike by maintaining a continuous activity streak of 4. For each activity strike you have, a continuous streak of 4 is required.\n\n## Warning Strikes\n\nWarning strikes are issued when a department member violates server or in-game policies.\n\nExamples include:\n\n- Abusing power over others.\n- Acting unprofessionally.\n- Failing to follow Management procedures (this does not refer to the weekly quota).\n- Committing serious violations of group or server rules.\n\nLeadership determines how long a warning strike remains active. Depending on the offense and its seriousness, a warning strike may be permanent.`,
  },
  {
    title: "Handling Tickets",
    content: `# Handling Tickets\n\nThe ModMail ticket system allows community members to contact FreshWay staff directly with concerns.\n\nA user sends a DM to the FreshWay Helpline bot and selects the option that best matches their concern. The ticket is then routed to the relevant department and alerts staff so the user can receive assistance.\n\nAll tickets must be handled professionally because you represent the FreshWay community.\n\n## Claiming Tickets\n\nAny eligible Management member may claim a new ticket and handle the discussion. Use the \`-claim\` command.\n\nClaiming a ticket:\n\n- Assigns the ticket to you.\n- Sends a pre-written greeting to the user.\n- Notifies you when the user sends a message.\n\nOnly claim a ticket if you can take responsibility for it and have enough time to assist the user.\n\n## Responding to Users\n\nAfter a user sends a message, respond using:\n\n\`-r {message}\`\n\nExample:\n\n\`-r Hello! I am {name}. How can I assist you today?\`\n\nWhen responding:\n\n- Remain professional throughout the conversation.\n- Reply promptly and within a reasonable time.\n- Make sure all of the user's questions have been answered before closing the ticket.\n\n## Closing Tickets\n\nOnce you have confirmed that the user has no further questions, use \`-resolved\`.\n\nThis:\n\n- Sends a goodbye message.\n- Moves the ticket to the "Resolved" category.\n- Archives the ticket after 1 hour.\n\nNever close a ticket before ensuring that the user's concerns have been addressed.\n\n## Editing or Deleting Messages\n\n- \`-delete\` — Deletes your most recent message.\n- \`-edit\` — Edits your most recent message.\n\nReview your messages before sending them. These commands are available as a way to correct mistakes.`,
  },
  {
    title: "Transferring Tickets",
    content: `# Transferring Tickets\n\nSome tickets concern matters outside Management's responsibilities. In these cases, transfer the ticket to the department that can appropriately handle the user's needs instead of trying to resolve it yourself.\n\n## Public Relations\n\n- Partnership requests.\n- Event inquiries.\n- Collaboration requests.\n\nCommand: \`-move to Public Relations Category\`\n\n## Human Resources\n\n- Rank requests.\n- Staff or supervisor reports.\n- In-game ban or warning appeals.\n\nCommand: \`-move to Human Resources Category\`\n\n## Moderation\n\n- Discord ban appeals.\n- Reports involving Discord users.\n- Server moderation appeals.\n\nCommand: \`-move to Moderation Category\`\n\n## Executive Leadership\n\n- Executive complaints.\n- Department concerns.\n- Issues that no other department can resolve.\n\nCommand: \`-move to Executive Central\`\n\nIf you are unsure which department should receive a ticket, ask a member of Leadership before transferring it.\n\n## Ticket Expectations\n\nWhen handling tickets, you must:\n\n- Treat users professionally.\n- Keep information confidential.\n- Respond promptly.\n- Transfer tickets when necessary.\n- Use commands correctly.`,
  },
  {
    title: "Logging Tickets",
    content: `# Logging Tickets\n\nEvery ticket you handle and complete must be logged for record-keeping and quota tracking. This helps Leadership maintain accurate records and prevents tickets from being missed.\n\nThe last manager assigned to a ticket is responsible for logging it.\n\n## How to Log a Ticket\n\n1. Go to the Management Server.\n2. Use the ticket command.\n3. Complete all required fields.\n4. For proof, provide a link to the ticket transcript. If the ticket was transferred, use the relevant ID where applicable.\n5. Review the information and submit it.\n\n## Important Notes\n\n- Tickets that are not logged will not count toward your quota.\n- Transferring a ticket does not, by itself, mean that you handled it.\n- Make sure all information is accurate before submitting.`,
  },
];

function createPartMessage(
  part: TrainingPart,
  partNumber: number,
  traineeId: string,
): string {
  return (
    `${part.content}\n\n` +
    `---\nRead this section carefully. When you are ready to continue, type: \`${READY_MESSAGE}\``
  );
}

export class TrainingSystem {
  static readonly parts = TRAINING_PARTS;

  static async start(
    channel: TextChannel,
    traineeId: string,
    trainerId: string,
  ): Promise<void> {
    const existing = await Training.findOne({
      guildId: channel.guild.id,
      traineeId,
      status: "active",
    });

    if (existing) {
      throw new Error("This trainee already has an active training session.");
    }

    const training = await Training.create({
      guildId: channel.guild.id,
      channelId: channel.id,
      traineeId,
      trainerId,
      currentPart: 0,
      status: "active",
    });

    try {
      await channel.send({
        content: createPartMessage(TRAINING_PARTS[0], 1, traineeId),
        allowedMentions: {
          users: [traineeId],
        },
      });
    } catch (error) {
      await Training.deleteOne({ _id: training._id });
      throw error;
    }
  }

  static async handleMessage(message: Message): Promise<void> {
    if (!message.guild || message.author.bot) return;
    if (message.content.trim() !== READY_MESSAGE) return;

    const training = await Training.findOne({
      guildId: message.guild.id,
      channelId: message.channelId,
      traineeId: message.author.id,
      status: "active",
    });

    // Ignore messages from everyone except the assigned trainee.
    if (!training) return;

    const currentIndex = training.currentPart;

    if (currentIndex >= TRAINING_PARTS.length) return;

    const isLastPart = currentIndex === TRAINING_PARTS.length - 1;

    // Atomic update prevents duplicate progression if the trainee
    // sends the confirmation more than once at the same time.
    const updated = await Training.findOneAndUpdate(
      {
        _id: training._id,
        currentPart: currentIndex,
        status: "active",
      },
      {
        $inc: { currentPart: 1 },
        ...(isLastPart
          ? {
              $set: {
                status: "completed",
                completedAt: new Date(),
              },
            }
          : {}),
      },
      { new: true },
    );

    if (!updated) return;

    const channel = message.channel;

    if (!channel.isSendable()) return;

    if (isLastPart) {
      const completionMessage =
        `# Training Completed!\n\n` +
        `<@${training.traineeId}> has completed all ` +
        `${TRAINING_PARTS.length} parts of the Management Training Program.\n\n` +
        `**Trainer:** <@${training.trainerId}>\n` +
        `**Status:** Completed`;

      await channel.send({
        content: completionMessage,
        allowedMentions: {
          users: [training.traineeId, training.trainerId],
        },
      });

      return;
    }

    const nextIndex = updated.currentPart;
    const nextPart = TRAINING_PARTS[nextIndex];

    await channel.send({
      content: createPartMessage(nextPart, nextIndex + 1, training.traineeId),
      allowedMentions: {
        users: [training.traineeId],
      },
    });
  }
}

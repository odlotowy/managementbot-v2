export const MODMAIL_CONFIG = {
  guildId: "1523341747722391732",
  categoryId: "1523362586119114886",
  supportRoleId: "1523360343227895952",
  logChannelId: "1553868156651569172",
  prefix: "-",

  categories: {
    Support: {
      description: "General questions and assistance.",
      emoji: "<:question1:1525789921749766194>",
      questions: [
        "Please describe the reason for contacting support.",
        "Could you provide any additional information?",
        "Is there anything else we should know?",
      ],
    },

    Report: {
      description: "Report a user or an incident.",
      emoji: "<:moderation:1525789839415574618>",
      questions: [
        "What is the Roblox username of the user you are reporting?",
        "Please describe what happened.",
        "Do you have any evidence? If so, please provide links.",
      ],
    },

    LOA: {
      description: "Request a Leave of Absence",
      emoji: "<:vacancies:1525790005077872650>",
      questions: [
        "What is your Roblox username?",
        "When will your inactivity notice start?",
        "When will your inactivity notice end?",
        "Please state the reason of your inactivity.",
        "Is there anything else we should know?",
      ],
    },

    RA: {
      description: "Request a Reduced Activity",
      emoji: "<:highlight:1530895368324251788>",
      questions: [
        "What is your Roblox username?",
        "When will your inactivity notice start?",
        "When will your inactivity notice end?",
        "Please state the reason of your inactivity.",
        "Is there anything else we should know?",
      ],
    },
  },
} as const;

export type ModMailCategory = keyof typeof MODMAIL_CONFIG.categories;

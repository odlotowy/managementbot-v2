import { ActivityType, type Client, type PresenceData } from "discord.js";

const statuses: PresenceData[] = [
  {
    activities: [
      {
        name: "custom",
        type: ActivityType.Custom,
        state: "Watching over the department",
      },
    ],
    status: "online",
  },
  {
    activities: [
      {
        name: "custom",
        type: ActivityType.Custom,
        state: "Managing management operations",
      },
    ],
    status: "online",
  },
  {
    activities: [
      {
        name: "custom",
        type: ActivityType.Custom,
        state: "Monitoring staff activity and performance",
      },
    ],
    status: "online",
  },
  {
    activities: [
      {
        name: "custom",
        type: ActivityType.Custom,
        state: "Handling management requests",
      },
    ],
    status: "online",
  },
  {
    activities: [
      {
        name: "custom",
        type: ActivityType.Custom,
        state: "Supporting the leadership team",
      },
    ],
    status: "online",
  },
  {
    activities: [
      {
        name: "custom",
        type: ActivityType.Custom,
        state: "Monitoring incoming support requests",
      },
    ],
    status: "online",
  },
  {
    activities: [
      {
        name: "custom",
        type: ActivityType.Custom,
        state: "All systems operational",
      },
    ],
    status: "online",
  },
];

export class StatusRotator {
  private currentIndex = 0;
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly client: Client) {}

  start(): void {
    if (this.interval || !this.client.isReady()) return;

    this.updateStatus();

    this.interval = setInterval(() => {
      this.updateStatus();
    }, 30_000);
  }

  private updateStatus(): void {
    const user = this.client.user;
    if (!user) return;

    user.setPresence(statuses[this.currentIndex]);
    this.currentIndex = (this.currentIndex + 1) % statuses.length;
  }

  stop(): void {
    if (!this.interval) return;

    clearInterval(this.interval);
    this.interval = null;
  }
}

import { ActivityType, type Client, type PresenceData } from "discord.js";

const statuses: PresenceData[] = [
  {
    activities: [
      { name: "over Management Department", type: ActivityType.Watching },
    ],
    status: "online",
  },
  {
    activities: [
      { name: "management operations", type: ActivityType.Watching },
    ],
    status: "online",
  },
  {
    activities: [
      { name: "staff activity and performance", type: ActivityType.Watching },
    ],
    status: "online",
  },
  {
    activities: [{ name: "management requests", type: ActivityType.Watching }],
    status: "online",
  },
  {
    activities: [{ name: "staff development", type: ActivityType.Watching }],
    status: "online",
  },
  {
    activities: [{ name: "the leadership team", type: ActivityType.Watching }],
    status: "online",
  },
  {
    activities: [{ name: "staff support", type: ActivityType.Listening }],
    status: "online",
  },
  {
    activities: [
      { name: "incoming support requests", type: ActivityType.Watching },
    ],
    status: "online",
  },
  {
    activities: [{ name: "management database", type: ActivityType.Watching }],
    status: "online",
  },
  {
    activities: [
      { name: "all systems operational", type: ActivityType.Playing },
    ],
    status: "online",
  },
];

export class StatusRotator {
  private currentIndex = 0;
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly client: Client) {}

  start(): void {
    if (this.interval) return;

    if (!this.client.isReady()) {
      throw new Error(
        "The bot must be ready before starting the status rotator.",
      );
    }

    this.updateStatus();

    this.interval = setInterval(() => {
      this.updateStatus();
    }, 30_000);
  }

  private updateStatus(): void {
    const status = statuses[this.currentIndex];

    this.client.user?.setPresence(status);

    this.currentIndex = (this.currentIndex + 1) % statuses.length;
  }

  stop(): void {
    if (!this.interval) return;

    clearInterval(this.interval);
    this.interval = null;
  }
}

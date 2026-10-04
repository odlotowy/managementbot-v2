import {
  Client,
  ContainerBuilder,
  MessageFlags,
  SeparatorBuilder,
  TextDisplayBuilder,
} from "discord.js";

import Manager from "../schemas/Manager";

export class WeeklyQuotaSystem {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  public start(): void {
    this.scheduleNext();
  }

  /**
   * Schedules the quota check for every Sunday at 07:00 UTC/GMT.
   */
  private scheduleNext(): void {
    const now = new Date();
    const nextSunday = new Date(now);

    const currentDay = now.getUTCDay();

    // Sunday = 0
    const daysUntilSunday = (7 - currentDay) % 7;

    nextSunday.setUTCDate(now.getUTCDate() + daysUntilSunday);

    nextSunday.setUTCHours(7, 0, 0, 0);

    // If it is already Sunday at or after 07:00 UTC,
    // schedule for the following Sunday.
    if (nextSunday.getTime() <= now.getTime()) {
      nextSunday.setUTCDate(nextSunday.getUTCDate() + 7);
    }

    const delay = nextSunday.getTime() - now.getTime();

    console.log(
      `[WeeklyQuotaSystem] Next quota check: ${nextSunday.toISOString()}`,
    );

    setTimeout(async () => {
      try {
        await this.checkAllManagers();
      } catch (error) {
        console.error("[WeeklyQuotaSystem] Failed to check quotas:", error);
      }

      this.scheduleNext();
    }, delay);
  }

  /**
   * Checks every manager in the database.
   */
  public async checkAllManagers(): Promise<void> {
    console.log("[WeeklyQuotaSystem] Checking manager quotas...");

    const managers = await Manager.find();

    console.log(`[WeeklyQuotaSystem] Found ${managers.length} managers.`);

    for (const manager of managers) {
      await this.sendQuotaDM(manager.discordId, {
        shifts: manager.shifts,
        tickets: manager.tickets,
      });
    }

    console.log("[WeeklyQuotaSystem] Finished checking manager quotas.");
  }

  /**
   * Sends the quota status to one manager.
   */
  private async sendQuotaDM(
    discordId: string,
    quota: {
      shifts: number;
      tickets: number;
    },
  ): Promise<void> {
    try {
      const user = await this.client.users.fetch(discordId);

      const shiftsMet = quota.shifts >= 2;
      const ticketsMet = quota.tickets >= 2;
      const quotaMet = shiftsMet && ticketsMet;

      const shiftsStatus = shiftsMet
        ? "<:check:1525789302989258972>"
        : "<:cross1:1525789345376768020>";
      const ticketsStatus = ticketsMet
        ? "<:check:1525789302989258972>"
        : "<:cross1:1525789345376768020>";
      const overallStatus = quotaMet
        ? "<:check:1525789302989258972>"
        : "<:cross1:1525789345376768020>";

      let statusText: string;

      if (quotaMet) {
        statusText =
          "You have met your weekly quota. No further action is required.";
      } else {
        const missing: string[] = [];

        if (!shiftsMet) {
          missing.push(
            `${2 - quota.shifts} shift${2 - quota.shifts === 1 ? "" : "s"}`,
          );
        }

        if (!ticketsMet) {
          missing.push(
            `${2 - quota.tickets} ticket${2 - quota.tickets === 1 ? "" : "s"}`,
          );
        }

        statusText =
          `You have not met your weekly quota yet. ` +
          `You still need ${missing.join(" and ")}.`;
      }

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "## Weekly Quota Status\n" +
              "Your activity progress for the current week.",
          ),
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "### Activity\n" +
              `${shiftsStatus} **Shifts** — \`${quota.shifts}/2\`\n` +
              `${ticketsStatus} **Tickets** — \`${quota.tickets}/2\``,
          ),
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### ${overallStatus} Overall Status\n` + `${statusText}`,
          ),
        );

      await user.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });

      console.log(`[WeeklyQuotaSystem] Sent quota status to ${user.tag}`);
    } catch (error) {
      console.error(`[WeeklyQuotaSystem] Failed to DM ${discordId}:`, error);
    }
  }

  /**
   * Manually run the quota check.
   * Useful for testing.
   */
  public async sendTest(): Promise<void> {
    await this.checkAllManagers();
  }
}

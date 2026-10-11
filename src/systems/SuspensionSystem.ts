import {
  Client,
  ContainerBuilder,
  MessageFlags,
  SeparatorBuilder,
  TextDisplayBuilder,
} from "discord.js";
import { SuspensionModel } from "../schemas/Suspension";

export class SuspensionSystem {
  private interval: ReturnType<typeof setInterval> | null = null;
  private processing = false;

  constructor(private readonly client: Client) {}

  public start(): void {
    if (this.interval) return;

    // Process expired suspensions immediately and periodically
    void this.processExpired();

    this.interval = setInterval(() => {
      void this.processExpired();
    }, 15_000);
  }

  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async processExpired(): Promise<void> {
    if (this.processing) return;

    this.processing = true;

    try {
      const expired = await SuspensionModel.find({
        active: true,
        expiresAt: { $lte: new Date() },
      }).limit(100);

      for (const suspension of expired) {
        try {
          const guild = await this.client.guilds.fetch(suspension.guildId);

          const member = await guild.members
            .fetch({
              user: suspension.userId,
              force: true,
            })
            .catch(() => null);

          if (!member) {
            // Keep the record active so it can be retried
            // if the member rejoins the guild.
            continue;
          }

          const botMember = await guild.members.fetchMe();

          const restorableRoles = suspension.roleIds.filter((id) => {
            const role = guild.roles.cache.get(id);

            return Boolean(
              role &&
              !role.managed &&
              role.id !== guild.id &&
              role.position < botMember.roles.highest.position,
            );
          });

          const suspensionRoleId = "1553788778802323627";

          if (suspensionRoleId) {
            const suspensionRole = guild.roles.cache.get(suspensionRoleId);

            if (
              suspensionRole &&
              member.roles.cache.has(suspensionRoleId) &&
              suspensionRole.position < botMember.roles.highest.position
            ) {
              await member.roles.remove(suspensionRole, "Suspension expired");
            }
          }

          if (restorableRoles.length > 0) {
            await member.roles.add(
              restorableRoles,
              "Suspension expired: restoring previous roles",
            );
          }

          // Mark completed only after role restoration succeeds.
          // if restoration fails, the next poll retries it.
          suspension.active = false;
          await suspension.save();

          const container = new ContainerBuilder()
            .setAccentColor(0x2ecc71)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "# Suspension Ended\n" +
                  "Your suspension has expired. Your previous " +
                  "roles have been restored where possible.",
              ),
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `**Server:** ${guild.name}\n` +
                  `**Original reason:** ${suspension.reason}\n` +
                  `**Expired:** <t:${Math.floor(
                    suspension.expiresAt.getTime() / 1000,
                  )}:F>\n\n` +
                  "You may now access the server according to " +
                  "your restored roles.",
              ),
            );

          try {
            await member.send({
              components: [container],
              flags: MessageFlags.IsComponentsV2,
            });
          } catch {
            // DMs may be disabled. Role restoration still succeeds.
          }
        } catch (error) {
          console.error(`Failed to expire suspension ${suspension.id}:`, error);
        }
      }
    } catch (error) {
      console.error("Suspension processing failed:", error);
    } finally {
      this.processing = false;
    }
  }
}

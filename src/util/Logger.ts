import { Client, EmbedBuilder, TextChannel } from "discord.js";
import { config } from "../config";

export enum LogLevel {
  INFO = "INFO",
  SUCCESS = "SUCCESS",
  WARN = "WARN",
  ERROR = "ERROR",
  FATAL = "FATAL",
  COMMAND = "COMMAND",
  DATABASE = "DATABASE",
  DISCORD = "DISCORD",
  INTERACTION = "INTERACTION",
  SYSTEM = "SYSTEM",
}

export interface LogOptions {
  level?: LogLevel;
  title?: string;
  description?: string;
  error?: unknown;
  userId?: string;
  username?: string;
  guildId?: string;
  guildName?: string;
  channelId?: string;
  command?: string;
  metadata?: Record<string, unknown>;
}

export class Logger {
  private client: Client;
  private channelId: string;

  private ready = false;
  private pendingLogs: LogOptions[] = [];

  private colors: Record<LogLevel, number> = {
    [LogLevel.INFO]: 0x3498db,
    [LogLevel.SUCCESS]: 0x2ecc71,
    [LogLevel.WARN]: 0xf1c40f,
    [LogLevel.ERROR]: 0xe74c3c,
    [LogLevel.FATAL]: 0x992d22,
    [LogLevel.COMMAND]: 0x9b59b6,
    [LogLevel.DATABASE]: 0x1abc9c,
    [LogLevel.DISCORD]: 0x5865f2,
    [LogLevel.INTERACTION]: 0xe67e22,
    [LogLevel.SYSTEM]: 0x95a5a6,
  };

  constructor(client: Client, channelId: string) {
    this.client = client;
    this.channelId = channelId;
  }

  public setReady(): void {
    this.ready = true;

    const logs = [...this.pendingLogs];
    this.pendingLogs = [];

    for (const log of logs) {
      void this.log(log);
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === "string") {
      return error;
    }

    try {
      return JSON.stringify(error, null, 2);
    } catch (error) {
      return String(error);
    }
  }

  private getStack(error: unknown): string | null {
    if (error instanceof Error && error.stack) {
      return error.stack;
    }

    return null;
  }

  private sanitize(text: string): string {
    return text
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[EMAIL]")
      .replace(
        /(?:mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/gi,
        "mongodb://[USER]:[PASSWORD]@",
      )
      .replace(/token\s*[:=]\s*[^\s]+/gi, "token=[REDACTED]")
      .replace(/password\s*[:=]\s*[^\s]+/gi, "password=[REDACTED]");
  }

  private truncate(text: string, max = 4000): string {
    if (text.length <= max) {
      return text;
    }

    return `${text.slice(0, max - 20)}\n...[truncated]`;
  }

  private formatMetadata(metadata?: Record<string, unknown>): string | null {
    if (!metadata || Object.keys(metadata).length === 0) {
      return null;
    }

    try {
      return this.sanitize(JSON.stringify(metadata, null, 2));
    } catch (error) {
      return "[Unable to serialize metadata]";
    }
  }

  public async log(options: LogOptions): Promise<void> {
    if (!this.ready) {
      this.pendingLogs.push(options);
      return;
    }

    const level = options.level ?? LogLevel.INFO;

    const timestamp = new Date();

    let description = options.description ?? "";

    if (options.error) {
      const errorMessage = this.getErrorMessage(options.error);
      const stack = this.getStack(options.error);

      if (options.error) {
        const errorMessage = this.getErrorMessage(options.error);
        const stack = this.getStack(options.error);

        description += `\n\n**Error:**\n\`\`\`\n${this.truncate(
          this.sanitize(errorMessage),
          1500,
        )}\n\`\`\``;

        if (stack) {
          description += `\n**Stack:**\n\`\`\`js\n${this.truncate(
            this.sanitize(stack),
            2500,
          )}\n\`\`\``;
        }
      }
    }

    const metadata = this.formatMetadata(options.metadata);

    if (metadata) {
      description += `\n\n**Metadata:**\n\`\`\`json\n${this.truncate(
        metadata,
        1500,
      )}\n\`\`\``;
    }

    const embed = new EmbedBuilder()
      .setColor(this.colors[level])
      .setTitle(`${this.getEmoji(level)} ${options.title ?? level}`)
      .setDescription(
        this.truncate(this.sanitize(description || "No description provided.")),
      )
      .addFields({
        name: "Type",
        value: `\`${level}\``,
        inline: true,
      })
      .addFields({
        name: "Time",
        value: `<t:${Math.floor(timestamp.getTime() / 1000)}:F>`,
        inline: true,
      })
      .setTimestamp(timestamp)
      .setFooter({
        text: "Discord Bot Logger",
      });

    if (options.userId || options.username) {
      embed.addFields({
        name: "User",
        value: [
          options.username ? `**Username:** ${options.username}` : null,
          options.userId ? `**ID:** \`${options.userId}\`` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        inline: false,
      });
    }

    if (options.guildId || options.guildName) {
      embed.addFields({
        name: "Guild",
        value: [
          options.guildName ? `**Name:** ${options.guildName}` : null,
          options.guildId ? `**ID:** \`${options.guildId}\`` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        inline: false,
      });
    }

    if (options.channelId) {
      embed.addFields({
        name: "Channel",
        value: `<#${options.channelId}> (\`${options.channelId}\`)`,
        inline: false,
      });
    }

    if (options.command) {
      embed.addFields({
        name: "Command",
        value: `\`${options.command}\``,
        inline: false,
      });
    }

    try {
      const channel = await this.client.channels.fetch(this.channelId);

      if (!channel || !(channel instanceof TextChannel)) {
        console.error(
          `[Logger] Log channel ${this.channelId} is not a text channel.`,
        );
        return;
      }

      await channel.send({
        embeds: [embed],
      });
    } catch (error) {
      console.error("[Logger] Failed to send log to Discord:", error);
    }
  }

  private getEmoji(level: LogLevel): string {
    switch (level) {
      case LogLevel.SUCCESS:
        return "<:check:1525789302989258972>";

      case LogLevel.WARN:
        return "<:warning:1525790024866730054>";

      case LogLevel.ERROR:
        return "<:cross1:1525789345376768020>";

      case LogLevel.FATAL:
        return "<:disconnected:1525789374686429314>";

      case LogLevel.COMMAND:
        return "<:highlight:1530895368324251788>";

      case LogLevel.DATABASE:
        return "<:dot:1530872659171082260>";

      case LogLevel.DISCORD:
        return "<:discord:1525789419687247922>";

      case LogLevel.INTERACTION:
        return "<:link1:1525789807207387226>";

      case LogLevel.SYSTEM:
        return "<:engineering:1525789444190240878>";

      case LogLevel.INFO:
      default:
        return "<:arrow:1530872623217508433>";
    }
  }

  public info(
    title: string,
    description: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.log({
      level: LogLevel.INFO,
      title,
      description,
      metadata,
    });
  }

  public success(
    title: string,
    description: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.log({
      level: LogLevel.SUCCESS,
      title,
      description,
      metadata,
    });
  }

  public warn(
    title: string,
    description: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.log({
      level: LogLevel.WARN,
      title,
      description,
      metadata,
    });
  }

  public error(
    title: string,
    error: unknown,
    description?: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.log({
      level: LogLevel.ERROR,
      title,
      description,
      error,
      metadata,
    });
  }

  public fatal(
    title: string,
    error: unknown,
    description?: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.log({
      level: LogLevel.FATAL,
      title,
      description,
      error,
      metadata,
    });
  }

  public command(
    command: string,
    userId: string,
    username: string,
    guildId?: string,
    guildName?: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.log({
      level: LogLevel.COMMAND,
      title: "Command Executed",
      description: `The command \`${command}\` was executed.`,
      command,
      userId,
      username,
      guildId,
      guildName,
      metadata,
    });
  }

  public database(
    title: string,
    description: string,
    error?: unknown,
    metadata?: Record<string, unknown>,
  ) {
    return this.log({
      level: LogLevel.DATABASE,
      title,
      description,
      error,
      metadata,
    });
  }

  public discord(
    title: string,
    description: string,
    error?: unknown,
    metadata?: Record<string, unknown>,
  ) {
    return this.log({
      level: LogLevel.DISCORD,
      title,
      description,
      error,
      metadata,
    });
  }

  public interaction(
    title: string,
    description: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.log({
      level: LogLevel.INTERACTION,
      title,
      description,
      metadata,
    });
  }
}

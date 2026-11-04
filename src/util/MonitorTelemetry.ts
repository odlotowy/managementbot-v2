type MonitorEvent =
  | {
      type: "command";
      name: string;
      status: "success" | "failure";
      durationMs: number;
    }
  | {
      type: "error";
      source: "command" | "process" | "discord";
      name: string;
      message: string;
      stack?: string;
      commandName?: string;
    }
  | {
      type: "rate_limit";
      route?: string;
      method?: string;
      global?: boolean;
      retryAfterMs?: number;
    };

const heartbeatUrl = process.env.BOT_MONITOR_URL;
const monitorSecret = process.env.BOT_MONITOR_SECRET;

function getTelemetryUrl(): string | null {
  if (!heartbeatUrl) return null;
  if (/\/bot-heartbeat\/?$/.test(heartbeatUrl)) {
    return heartbeatUrl.replace(/\/bot-heartbeat\/?$/, "/bot-telemetry");
  }
  return null;
}

async function send(event: MonitorEvent): Promise<void> {
  const url = getTelemetryUrl();
  if (!url || !monitorSecret) return;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-monitor-secret": monitorSecret,
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn(`[Monitor] Telemetry rejected: HTTP ${response.status}`);
    }
  } catch (error) {
    console.warn("[Monitor] Could not send telemetry:", error);
  }
}

function errorDetails(error: unknown): {
  name: string;
  message: string;
  stack?: string;
} {
  if (error instanceof Error) {
    return {
      name: error.name.slice(0, 120),
      message: error.message.slice(0, 2000),
      stack: error.stack?.slice(0, 12000),
    };
  }

  return {
    name: "UnknownError",
    message: String(error).slice(0, 2000),
  };
}

export const monitorTelemetry = {
  command(
    name: string,
    status: "success" | "failure",
    durationMs: number,
  ): void {
    void send({
      type: "command",
      name: name.slice(0, 100),
      status,
      durationMs: Math.max(0, Math.round(durationMs)),
    });
  },

  error(
    source: "command" | "process" | "discord",
    error: unknown,
    commandName?: string,
  ): void {
    const details = errorDetails(error);
    void send({
      type: "error",
      source,
      ...details,
      ...(commandName ? { commandName: commandName.slice(0, 100) } : {}),
    });
  },

  rateLimit(info: unknown): void {
    const value =
      info && typeof info === "object" ? (info as Record<string, unknown>) : {};
    const route =
      typeof value.route === "string"
        ? value.route
        : typeof value.path === "string"
          ? value.path
          : undefined;
    const method = typeof value.method === "string" ? value.method : undefined;
    const retryAfter =
      typeof value.timeToReset === "number"
        ? value.timeToReset
        : typeof value.retryAfter === "number"
          ? value.retryAfter
          : undefined;

    void send({
      type: "rate_limit",
      route: route?.slice(0, 300),
      method: method?.slice(0, 20),
      global: typeof value.global === "boolean" ? value.global : undefined,
      retryAfterMs:
        retryAfter != null && Number.isFinite(retryAfter)
          ? Math.max(0, Math.round(retryAfter))
          : undefined,
    });
  },
};

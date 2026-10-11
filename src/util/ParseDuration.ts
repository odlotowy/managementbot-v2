export function ParseDuration(input: string): number | null {
  const match = input.trim().match(/^([1-9]\d*)(s|m|h|d)$/i);

  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  const duration = amount * multipliers[unit];

  // Prevent excessively large or unsafe durations.
  const maxDuration = 365 * 24 * 60 * 60 * 1_000;

  if (!Number.isSafeInteger(duration) || duration > maxDuration) return null;

  return duration;
}

export function FormatDuration(milliseconds: number): string {
  const units: [number, string][] = [
    [86_400_000, "d"],
    [3_600_000, "h"],
    [60_000, "m"],
    [1_000, "s"],
  ];

  let remaining = milliseconds;
  const parts: string[] = [];

  for (const [size, label] of units) {
    const amount = Math.floor(remaining / size);

    if (amount > 0) {
      parts.push(`${amount}${label}`);
      remaining %= size;
    }
  }

  return parts.join(" ") || "0s";
}

export function toStartOfUtcDay(input: Date): Date {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

export function addUtcDays(input: Date, days: number): Date {
  const output = new Date(input);
  output.setUTCDate(output.getUTCDate() + days);
  return output;
}

import type { RawEventSeries } from "./tepuiaClient.js";

export type SlotStatus = "available" | "fully_booked" | "unknown";

export interface AvailabilitySession {
  id: number;
  label: string;
  startDateTime: string;
}

export interface AvailabilitySlot {
  seriesId: number;
  title: string;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  status: SlotStatus;
  remaining: number | null;
  sessions: AvailabilitySession[];
}

const DATE_RANGE_RE = /^(\d{2})\/(\d{2})\/(\d{4})-(\d{2})\/(\d{2})\/(\d{4}):/;
const REMAINING_RE = /(\d+)\s*Remaining\s*$/i;
const FULLY_BOOKED_RE = /Fully Booked\s*$/i;

function toIsoDate(dd: string, mm: string, yyyy: string): string {
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateRange(displayText: string): { start: string | null; end: string | null } {
  const match = displayText.match(DATE_RANGE_RE);
  if (!match) return { start: null, end: null };
  const [, d1, m1, y1, d2, m2, y2] = match;
  return { start: toIsoDate(d1, m1, y1), end: toIsoDate(d2, m2, y2) };
}

function parseStatus(displayText: string): { status: SlotStatus; remaining: number | null } {
  const remainingMatch = displayText.match(REMAINING_RE);
  if (remainingMatch) {
    return { status: "available", remaining: Number(remainingMatch[1]) };
  }
  if (FULLY_BOOKED_RE.test(displayText)) {
    return { status: "fully_booked", remaining: 0 };
  }
  return { status: "unknown", remaining: null };
}

export function parseEventSeries(raw: RawEventSeries[]): AvailabilitySlot[] {
  return raw.map((series) => {
    const { start, end } = parseDateRange(series.displayText);
    const { status, remaining } = parseStatus(series.displayText);
    return {
      seriesId: series.id,
      title: series.title,
      dateRangeStart: start,
      dateRangeEnd: end,
      status,
      remaining,
      sessions: series.events.map((event) => ({
        id: event.id,
        label: event.description,
        startDateTime: event.startDateTime,
      })),
    };
  });
}

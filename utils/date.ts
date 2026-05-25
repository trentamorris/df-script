import { isValidFloat } from "./number";

export function normalizeEpochToMs(n: number): number {
    const abs = Math.abs(n);
    if (abs >= 1e12) return n;
    if (abs <= 1e10) return n * 1000;
    return n;
}

export function isValidDateObj(d: Date): boolean {
    return !Number.isNaN(d.getTime());
}

export function isValidDate(v: unknown): v is string | number | bigint | Date {
    if (v == null) return false;
    if (v instanceof Date) return isValidDateObj(v);

    if (typeof v === "number") {
        if (!isValidFloat(v)) return false;
        const ms = normalizeEpochToMs(v);
        return isValidDateObj(new Date(ms));
    }
    if (typeof v === "bigint") {
        const ms = normalizeEpochToMs(Number(v));
        return isValidDateObj(new Date(ms));
    }
    if (typeof v === "string") {
        const s = v.trim();
        if (s === "") return false;
        return isValidDateObj(new Date(s));
    }
    return false;
}

export function toValidDate(input: unknown): Date | null {
    if (input instanceof Date) {
        return isValidDateObj(input) ? input : null;
    }
    if (typeof input === "number") {
        const ms = normalizeEpochToMs(input);
        const d = new Date(ms);
        return isValidDateObj(d) ? d : null;
    }
    if (typeof input === "bigint") {
        const ms = normalizeEpochToMs(Number(input));
        const d = new Date(ms);
        return isValidDateObj(d) ? d : null;
    }
    if (typeof input === "string") {
        const s = input.trim();
        if (s === "") return null;
        const d = new Date(s);
        return isValidDateObj(d) ? d : null;
    }
    return null;
}

export function formatTimestamp({
    timestamp,
    locale = undefined,
    options = {}
}: {
    timestamp: unknown
    locale?: Intl.LocalesArgument
    options?: Intl.DateTimeFormatOptions
}): string | undefined {
    const defaultOptions: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timeZoneName: "long"
    };

    const date = toValidDate(timestamp);
    if (!date) return;

    return new Intl.DateTimeFormat(locale, {
        ...defaultOptions,
        ...options
    }).format(date);
}

export function getUtcOffset(timeZone: string): string {
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
    const tzMs = new Date(now.toLocaleString('en-US', { timeZone })).getTime();
    const offsetMin = Math.round((tzMs - utcMs) / 60_000);
    const sign = offsetMin >= 0 ? "+" : "\u2212";
    const h = Math.floor(Math.abs(offsetMin) / 60);
    const m = Math.abs(offsetMin) % 60;

    return `UTC${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const UTC_INDICATOR_REGEX = /(?:Z|[+-]00:00|[+-]0000|[+-]00)$/i;

export function isUtcString(timestamp: string | null | undefined): boolean {
    if (!timestamp) return false;
    const trimmed = timestamp.trim();
    if (!trimmed) return false;
    return UTC_INDICATOR_REGEX.test(trimmed);
}

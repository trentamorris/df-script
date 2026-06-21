import { isBlankString } from "./string";
import type { TimeUnit } from "../types";
import { isValidDateObj } from "./object";

/**
 * Matches string values beginning with standard hour-and-minute formatting.
 * Examples:
 * - "12:34" (matches "12:34")
 * - "10:37:16.123" (matches "10:37")
 * - "2026-05-25" (does not match)
 */
export const TIME_PREFIX_REGEX = /^\d{2}:\d{2}/;

/**
 * Matches timezone offset indicators at the end of a string.
 * Examples:
 * - "12:34:56Z" (matches "Z")
 * - "12:34:56+02:00" (matches "+02:00")
 * - "12:34:56-0500" (matches "-0500")
 * - "12:34:56-05" (matches "-05")
 * - "12:34:56" (does not match)
 */
export const ZONE_OFFSET_REGEX = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i;

export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;
export const US_PER_MS = 1000;
export const NS_PER_MS = 1_000_000;


export function toEpoch(d: Date, unit: TimeUnit = "ms"): number {
    const ms = d.getTime();
    switch (unit) {
        case "s": return Math.floor(ms / MS_PER_SECOND);
        case "ms": return ms;
        case "us": return ms * US_PER_MS;
        case "ns": return ms * NS_PER_MS;
    }
}

export function getCentury(d: Date): number {
    const y = d.getUTCFullYear();
    return Math.floor((y - 1) / 100) + 1;
}

export function getISOWeek(d: Date): number {
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / MS_PER_DAY) + 1) / 7);
}

export function getMillennium(d: Date): number {
    const y = d.getUTCFullYear();
    return Math.floor((y - 1) / 1000) + 1;
}

export function getMonthOffset(d: Date, monthOffset: number, day: number = 1): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + monthOffset, day, 0, 0, 0, 0));
}

export function getOrdinalDay(d: Date): number {
    const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const diff = d.getTime() - start.getTime();
    return Math.floor(diff / MS_PER_DAY) + 1;
}

export function getQuarter(d: Date): number {
    return Math.floor(d.getUTCMonth() / 3) + 1;
}

export function isLeapYear(yOrDate: number | Date): boolean {
    const y = isValidDateObj(yOrDate) ? yOrDate.getUTCFullYear() : (yOrDate as number);
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}


export function normalizeEpochToMs(n: number): number {
    const abs = Math.abs(n);
    if (abs >= 1e12) return n;
    if (abs <= 1e10) return n * 1000;
    return n;
}

interface DateDirective {
    key: string;
    format: (d: Date, locale?: string) => string;
    parseRegex?: string;
    parseField?: "year" | "month" | "day" | "hour" | "minute" | "second" | "ms";
    parseNormalize?: (valStr: string) => number;
}

const DIRECTIVES: Record<string, DateDirective> = {
    "Y": {
        key: "Y",
        format: (d) => String(d.getUTCFullYear()),
        parseRegex: "\\d{4}",
        parseField: "year"
    },
    "y": {
        key: "y",
        format: (d) => String(d.getUTCFullYear() % 100).padStart(2, "0"),
        parseRegex: "\\d{2}",
        parseField: "year",
        parseNormalize: (s) => {
            const val = parseInt(s, 10);
            return val + (val >= 69 ? 1900 : 2000);
        }
    },
    "m": {
        key: "m",
        format: (d) => String(d.getUTCMonth() + 1).padStart(2, "0"),
        parseRegex: "\\d{1,2}",
        parseField: "month"
    },
    "d": {
        key: "d",
        format: (d) => String(d.getUTCDate()).padStart(2, "0"),
        parseRegex: "\\d{1,2}",
        parseField: "day"
    },
    "e": {
        key: "e",
        format: (d) => String(d.getUTCDate()).padStart(2, " "),
        parseRegex: "\\d{1,2}",
        parseField: "day"
    },
    "H": {
        key: "H",
        format: (d) => String(d.getUTCHours()).padStart(2, "0"),
        parseRegex: "\\d{1,2}",
        parseField: "hour"
    },
    "I": {
        key: "I",
        format: (d) => String(d.getUTCHours() % 12 || 12).padStart(2, "0"),
        parseRegex: "\\d{1,2}",
        parseField: "hour"
    },
    "p": {
        key: "p",
        format: (d) => d.getUTCHours() >= 12 ? "PM" : "AM"
    },
    "M": {
        key: "M",
        format: (d) => String(d.getUTCMinutes()).padStart(2, "0"),
        parseRegex: "\\d{1,2}",
        parseField: "minute"
    },
    "S": {
        key: "S",
        format: (d) => String(d.getUTCSeconds()).padStart(2, "0"),
        parseRegex: "\\d{1,2}",
        parseField: "second"
    },
    "A": {
        key: "A",
        format: (d, locale) => d.toLocaleDateString(locale, { weekday: "long", timeZone: "UTC" })
    },
    "a": {
        key: "a",
        format: (d, locale) => d.toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" })
    },
    "B": {
        key: "B",
        format: (d, locale) => d.toLocaleDateString(locale, { month: "long", timeZone: "UTC" })
    },
    "b": {
        key: "b",
        format: (d, locale) => d.toLocaleDateString(locale, { month: "short", timeZone: "UTC" })
    },
    "h": {
        key: "h",
        format: (d, locale) => d.toLocaleDateString(locale, { month: "short", timeZone: "UTC" })
    },
    "j": {
        key: "j",
        format: (d) => {
            const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            const diff = d.getTime() - start.getTime();
            const dayOfYear = Math.floor(diff / MS_PER_DAY) + 1;
            return String(dayOfYear).padStart(3, "0");
        }
    },
    "u": {
        key: "u",
        format: (d) => String(d.getUTCDay() || 7)
    },
    "w": {
        key: "w",
        format: (d) => String(d.getUTCDay())
    },
    "Z": {
        key: "Z",
        format: () => "UTC"
    },
    "z": {
        key: "z",
        format: () => "+0000"
    },
    "ms": {
        key: "ms",
        format: (d) => String(d.getUTCMilliseconds()).padStart(3, "0"),
        parseRegex: "\\d{1,3}",
        parseField: "ms",
        parseNormalize: (s) => parseInt(s.padEnd(3, "0").slice(0, 3), 10)
    },
    "f": {
        key: "f",
        format: (d) => String(d.getUTCMilliseconds() * 1000).padStart(6, "0"),
        parseRegex: "\\d{1,6}",
        parseField: "ms",
        parseNormalize: (s) => parseInt(s.padEnd(6, "0").slice(0, 3), 10)
    }
};

export function strftime(d: Date, format: string, locale?: string): string {
    const expanded = format
        .replace(/%F/g, "%Y-%m-%d")
        .replace(/%T/g, "%H:%M:%S")
        .replace(/%R/g, "%H:%M")
        .replace(/%D/g, "%m/%d/%y");

    return expanded.replace(/%(ms|f|[YymdeHIpMSaAbBhjuwZz%])/g, (match, key) => {
        if (key === "%") return "%";
        const dir = DIRECTIVES[key];
        return dir ? dir.format(d, locale) : match;
    });
}

export function strptime(str: string, format: string, strict = true): Date | null {
    if (typeof str !== "string" || typeof format !== "string") return null;
    const placeholders: { directive: DateDirective; index: number }[] = [];
    let groupIndex = 1;

    let regexStr = "";
    let i = 0;
    while (i < format.length) {
        const char = format[i];
        if (char === "%") {
            if (i + 1 < format.length) {
                const nextChar = format[i + 1];
                if (nextChar === "%") {
                    regexStr += "%";
                    i += 2;
                } else {
                    let matchedKey: string | null = null;
                    let consumedLength = 0;
                    if (i + 2 < format.length && format.slice(i + 1, i + 3) === "ms") {
                        matchedKey = "ms";
                        consumedLength = 3;
                    } else if (DIRECTIVES[nextChar]?.parseRegex) {
                        matchedKey = nextChar;
                        consumedLength = 2;
                    }

                    if (matchedKey) {
                        const dir = DIRECTIVES[matchedKey];
                        placeholders.push({ directive: dir, index: groupIndex++ });
                        regexStr += `(${dir.parseRegex})`;
                        i += consumedLength;
                    } else {
                        regexStr += char + nextChar;
                        i += 2;
                    }
                }
            } else {
                regexStr += char;
                i++;
            }
        } else {
            if ("\\^$*+?.()|[]{}".indexOf(char) !== -1) {
                regexStr += "\\" + char;
            } else {
                regexStr += char;
            }
            i++;
        }
    }

    const regex = new RegExp("^" + regexStr + "$");
    const match = str.match(regex);
    if (!match) {
        if (strict) return null;
        const parsed = new Date(str);
        return isValidDateObj(parsed) ? parsed : null;
    }

    const parts = {
        year: 1970,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
        ms: 0
    };

    for (const p of placeholders) {
        const valStr = match[p.index];
        const dir = p.directive;
        const parsedVal = dir.parseNormalize ? dir.parseNormalize(valStr) : parseInt(valStr, 10);
        if (dir.parseField) {
            parts[dir.parseField] = parsedVal;
        }
    }

    const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, parts.ms));
    return isValidDateObj(d) ? d : null;
}

export function toValidDate(input: unknown, options?: { dateOnly?: boolean }): Date | null {
    let d: Date | null = null;
    if (isValidDateObj(input)) {
        d = input;
    } else if (typeof input === "number") {
        d = new Date(normalizeEpochToMs(input));
        d = isValidDateObj(d) ? d : null;
    } else if (typeof input === "bigint") {
        d = new Date(normalizeEpochToMs(Number(input)));
        d = isValidDateObj(d) ? d : null;
    } else if (typeof input === "string") {
        if (isBlankString(input)) return null;
        d = new Date(input);
        d = isValidDateObj(d) ? d : null;
    }

    if (d && options?.dateOnly) {
        const copy = new Date(d);
        copy.setUTCHours(0, 0, 0, 0);
        return copy;
    }
    return d;
}

export function toValidTime(val: unknown): string | null {
    if (val == null) return null;
    if (typeof val === "string") {
        const trimmed = val.trim();
        if (TIME_PREFIX_REGEX.test(trimmed)) {
            const d = new Date(`1970-01-01T${trimmed}${ZONE_OFFSET_REGEX.test(trimmed) ? "" : "Z"}`);
            if (isValidDateObj(d)) {
                return d.toISOString().split("T")[1].slice(0, 12);
            }
        }
    }
    const d = toValidDate(val);
    return d ? d.toISOString().split("T")[1].slice(0, 12) : null;
}

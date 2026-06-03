import { isValidNumber } from "./number";
import { isBlankString } from "./string";
import type { TimeUnit } from "../types";

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

/**
 * Matches only UTC offset indicators at the end of a string.
 * Examples:
 * - "12:34:56Z" (matches "Z")
 * - "12:34:56+00:00" (matches "+00:00")
 * - "12:34:56-0000" (matches "-0000")
 * - "12:34:56+02:00" (does not match)
 */
export const UTC_INDICATOR_REGEX = /(?:Z|[+-]00:00|[+-]0000|[+-]00)$/i;

export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;
export const US_PER_MS = 1000;
export const NS_PER_MS = 1_000_000;

export interface UtcOffsetResult {
    timeZoneTime: Date;
    utcTime: Date;
    offset: number;
    formatted: string;
}


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

export function getUtcOffset(timeZone: string): UtcOffsetResult {
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
    const tzTime = new Date(now.toLocaleString('en-US', { timeZone }));
    const tzMs = tzTime.getTime();
    const offsetMin = Math.round((tzMs - utcMs) / 60_000);
    const sign = offsetMin >= 0 ? "+" : "\u2212";
    const h = Math.floor(Math.abs(offsetMin) / 60);
    const m = Math.abs(offsetMin) % 60;

    const formatted = `UTC${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    return {
        timeZoneTime: tzTime,
        utcTime: now,
        offset: offsetMin,
        formatted
    };
}

export function isLeapYear(yOrDate: number | Date): boolean {
    const y = yOrDate instanceof Date ? yOrDate.getUTCFullYear() : yOrDate;
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function isUtcString(timestamp: string | null | undefined): boolean {
    if (!timestamp) return false;
    const trimmed = timestamp.trim();
    if (!trimmed) return false;
    return UTC_INDICATOR_REGEX.test(trimmed);
}

export function isValidDate(v: unknown): v is string | number | bigint | Date {
    if (v == null) return false;
    if (v instanceof Date) return isValidDateObj(v);

    if (typeof v === "number") {
        if (!isValidNumber(v)) return false;
        return isValidDateObj(new Date(normalizeEpochToMs(v)));
    }
    if (typeof v === "bigint") {
        return isValidDateObj(new Date(normalizeEpochToMs(Number(v))));
    }
    if (typeof v === "string") {
        if (isBlankString(v)) return false;
        return isValidDateObj(new Date(v));
    }
    return false;
}

export function isValidDateObj(d: unknown): d is Date {
    return d instanceof Date && !Number.isNaN(d.getTime());
}

export function normalizeEpochToMs(n: number): number {
    const abs = Math.abs(n);
    if (abs >= 1e12) return n;
    if (abs <= 1e10) return n * 1000;
    return n;
}

export const STRFTIME_DIRECTIVES = [
    "%ms", "%f", "%Y", "%y", "%m", "%d", "%e", "%H", "%I", "%p", "%M", "%S", "%A", "%a", "%B", "%b", "%h", "%j", "%u", "%w", "%Z", "%z"
] as const;

export function strftime(d: Date, format: string, locale?: string): string {
    let result = format;

    // 1. Literal %% escaping
    result = result.replace(/%%/g, "\0");

    // 2. High-level shorthand formats
    result = result.replace(/%F/g, "%Y-%m-%d");
    result = result.replace(/%T/g, "%H:%M:%S");
    result = result.replace(/%R/g, "%H:%M");
    result = result.replace(/%D/g, "%m/%d/%y");

    // 3. Directives replacements with lazy getters
    const replacements: Record<string, string> = {
        get "%Y"() { return String(d.getUTCFullYear()); },
        get "%y"() { return String(d.getUTCFullYear() % 100).padStart(2, "0"); },
        get "%m"() { return String(d.getUTCMonth() + 1).padStart(2, "0"); },
        get "%d"() { return String(d.getUTCDate()).padStart(2, "0"); },
        get "%e"() { return String(d.getUTCDate()).padStart(2, " "); },
        get "%H"() { return String(d.getUTCHours()).padStart(2, "0"); },
        get "%I"() { return String(d.getUTCHours() % 12 || 12).padStart(2, "0"); },
        get "%p"() { return d.getUTCHours() >= 12 ? "PM" : "AM"; },
        get "%M"() { return String(d.getUTCMinutes()).padStart(2, "0"); },
        get "%S"() { return String(d.getUTCSeconds()).padStart(2, "0"); },
        get "%A"() { return d.toLocaleDateString(locale, { weekday: "long", timeZone: "UTC" }); },
        get "%a"() { return d.toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" }); },
        get "%B"() { return d.toLocaleDateString(locale, { month: "long", timeZone: "UTC" }); },
        get "%b"() { return d.toLocaleDateString(locale, { month: "short", timeZone: "UTC" }); },
        get "%h"() { return d.toLocaleDateString(locale, { month: "short", timeZone: "UTC" }); },
        get "%j"() {
            const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            const diff = d.getTime() - start.getTime();
            const dayOfYear = Math.floor(diff / MS_PER_DAY) + 1;
            return String(dayOfYear).padStart(3, "0");
        },
        get "%u"() { return String(d.getUTCDay() || 7); },
        get "%w"() { return String(d.getUTCDay()); },
        get "%Z"() { return "UTC"; },
        get "%z"() { return "+0000"; },
        get "%ms"() { return String(d.getUTCMilliseconds()).padStart(3, "0"); },
        get "%f"() { return String(d.getUTCMilliseconds() * 1000).padStart(6, "0"); }
    };

    for (const directive of STRFTIME_DIRECTIVES) {
        if (result.includes(directive)) {
            result = result.replaceAll(directive, replacements[directive]);
        }
    }

    // 4. Restore literal percent symbols
    return result.replace(/\0/g, "%");
}

export function strptime(str: string, format: string, strict = true): Date | null {
    if (typeof str !== "string" || typeof format !== "string") return null;
    const placeholders: { name: string; index: number }[] = [];
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
                } else if (format.slice(i, i + 3) === "%ms") {
                    placeholders.push({ name: "ms", index: groupIndex++ });
                    regexStr += "(\\d{1,3})";
                    i += 3;
                } else {
                    switch (nextChar) {
                        case "Y":
                            placeholders.push({ name: "year", index: groupIndex++ });
                            regexStr += "(\\d{4})";
                            break;
                        case "y":
                            placeholders.push({ name: "year_short", index: groupIndex++ });
                            regexStr += "(\\d{2})";
                            break;
                        case "m":
                            placeholders.push({ name: "month", index: groupIndex++ });
                            regexStr += "(\\d{1,2})";
                            break;
                        case "d":
                        case "e":
                            placeholders.push({ name: "day", index: groupIndex++ });
                            regexStr += "(\\d{1,2})";
                            break;
                        case "H":
                        case "I":
                            placeholders.push({ name: "hour", index: groupIndex++ });
                            regexStr += "(\\d{1,2})";
                            break;
                        case "M":
                            placeholders.push({ name: "minute", index: groupIndex++ });
                            regexStr += "(\\d{1,2})";
                            break;
                        case "S":
                            placeholders.push({ name: "second", index: groupIndex++ });
                            regexStr += "(\\d{1,2})";
                            break;
                        case "f":
                            placeholders.push({ name: "fractional", index: groupIndex++ });
                            regexStr += "(\\d{1,6})";
                            break;
                        default:
                            regexStr += char + nextChar;
                    }
                    i += 2;
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

    let year = 1970;
    let month = 1;
    let day = 1;
    let hour = 0;
    let minute = 0;
    let second = 0;
    let ms = 0;

    for (const p of placeholders) {
        const valStr = match[p.index];
        const val = parseInt(valStr, 10);
        switch (p.name) {
            case "year":
                year = val;
                break;
            case "year_short":
                year = val + (val >= 69 ? 1900 : 2000);
                break;
            case "month":
                month = val;
                break;
            case "day":
                day = val;
                break;
            case "hour":
                hour = val;
                break;
            case "minute":
                minute = val;
                break;
            case "second":
                second = val;
                break;
            case "ms":
                ms = parseInt(valStr.padEnd(3, "0").slice(0, 3), 10);
                break;
            case "fractional":
                ms = parseInt(valStr.padEnd(6, "0").slice(0, 3), 10);
                break;
        }
    }

    const d = new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms));
    return isValidDateObj(d) ? d : null;
}

export function toValidDate(input: unknown): Date | null {
    if (input instanceof Date) {
        return isValidDateObj(input) ? input : null;
    }
    if (typeof input === "number") {
        const d = new Date(normalizeEpochToMs(input));
        return isValidDateObj(d) ? d : null;
    }
    if (typeof input === "bigint") {
        const d = new Date(normalizeEpochToMs(Number(input)));
        return isValidDateObj(d) ? d : null;
    }
    if (typeof input === "string") {
        if (isBlankString(input)) return null;
        const d = new Date(input);
        return isValidDateObj(d) ? d : null;
    }
    return null;
}

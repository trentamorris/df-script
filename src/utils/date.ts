import { isBlankString, escapeRegExp } from "./string";
import type { TimeUnit } from "../types";
import { isValidDateObj, unboxPrimitiveObj } from "./object";
import { isValidNumber } from "./number";
import { MS_PER_SECOND, MS_PER_DAY, US_PER_MS_BI, NS_PER_MS_BI } from "../constants";

/**
 * Matches string values beginning with standard hour-and-minute formatting.
 * Examples:
 * - "12:34" (matches "12:34")
 * - "10:37:16.123" (matches "10:37")
 * - "2026-05-25" (does not match)
 * */
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
 * Matches strict ISO 8601 date-only format (YYYY-MM-DD).
 * Examples:
 * - "2026-05-25" (matches)
 * - "2026-05-25T10:37:16Z" (does not match)
 */
export const ISO_DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const dtfCache = new Map<string, Intl.DateTimeFormat>();
function _getCachedDtf(timeZone: string): Intl.DateTimeFormat {
    let dtf = dtfCache.get(timeZone);
    if (!dtf) {
        dtf = new Intl.DateTimeFormat("en-US", {
            timeZone,
            hourCycle: "h23",
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit",
            fractionalSecondDigits: 3
        });
        dtfCache.set(timeZone, dtf);
    }
    return dtf;
}

const tzNameDtfCache = new Map<string, Intl.DateTimeFormat>();
function _getCachedTimeZoneNameDtf(locale: string, timeZone: string): Intl.DateTimeFormat {
    const key = `${locale}_${timeZone}`;
    let dtf = tzNameDtfCache.get(key);
    if (!dtf) {
        dtf = new Intl.DateTimeFormat(locale, { timeZoneName: "short", timeZone });
        tzNameDtfCache.set(key, dtf);
    }
    return dtf;
}

const tzValidityCache = new Map<string, boolean>();
function _isValidTimeZone(tz: string): boolean {
    let valid = tzValidityCache.get(tz);
    if (valid === undefined) {
        try {
            Intl.DateTimeFormat(undefined, { timeZone: tz });
            valid = true;
        } catch {
            valid = false;
        }
        tzValidityCache.set(tz, valid);
    }
    return valid;
}

function _resolveTimeZone(tz?: string): string {
    const resolved = !tz || tz === "local" ? Intl.DateTimeFormat().resolvedOptions().timeZone : tz;
    return _isValidTimeZone(resolved) ? resolved : "UTC";
}

function _createUTCDate(
    year: number,
    monthZeroIndexed = 0,
    day = 1,
    hour = 0,
    minute = 0,
    second = 0,
    ms = 0
): Date {
    const d = new Date(0);
    d.setUTCFullYear(year, monthZeroIndexed, day);
    d.setUTCHours(hour, minute, second, ms);
    return d;
}

function _getUTCTimestamp(
    year: number,
    monthZeroIndexed = 0,
    day = 1,
    hour = 0,
    minute = 0,
    second = 0,
    ms = 0
): number {
    if (year >= 100 || year < 0) {
        return Date.UTC(year, monthZeroIndexed, day, hour, minute, second, ms);
    }
    const d = new Date(0);
    d.setUTCFullYear(year, monthZeroIndexed, day);
    d.setUTCHours(hour, minute, second, ms);
    return d.getTime();
}

function _getDayOfWeek(y: number, m: number, d: number): number {
    const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
    let year = y;
    if (m < 3) year -= 1;
    return (year + Math.floor(year/4) - Math.floor(year/100) + Math.floor(year/400) + t[m-1] + d) % 7;
}

interface DateTimeParts {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    ms: number;
    dayOfWeek: number;
}

function _getDateTimeParts(d: Date, timeZone?: string): DateTimeParts {
    const tz = _resolveTimeZone(timeZone);

    if (tz.toUpperCase() === "UTC") {
        return {
            year: d.getUTCFullYear(),
            month: d.getUTCMonth() + 1,
            day: d.getUTCDate(),
            hour: d.getUTCHours(),
            minute: d.getUTCMinutes(),
            second: d.getUTCSeconds(),
            ms: d.getUTCMilliseconds(),
            dayOfWeek: d.getUTCDay()
        };
    }

    const dtf = _getCachedDtf(tz);
    const parts = dtf.formatToParts(d);

    let yearStr = "0";
    let monthStr = "0";
    let dayStr = "0";
    let hourStr = "0";
    let minuteStr = "0";
    let secondStr = "0";
    let msStr = "0";

    for (let i = 0, len = parts.length; i < len; i++) {
        const part = parts[i];
        switch (part.type) {
            case "year": yearStr = part.value; break;
            case "month": monthStr = part.value; break;
            case "day": dayStr = part.value; break;
            case "hour": hourStr = part.value; break;
            case "minute": minuteStr = part.value; break;
            case "second": secondStr = part.value; break;
            case "fractionalSecond": msStr = part.value; break;
        }
    }

    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    const dayOfWeek = _getDayOfWeek(year, month, day);

    return {
        year,
        month,
        day,
        hour: parseInt(hourStr, 10),
        minute: parseInt(minuteStr, 10),
        second: parseInt(secondStr, 10),
        ms: parseInt(msStr, 10),
        dayOfWeek
    };
}

function _getTimeZoneOffsetMinutes(d: Date, tz: string): number {
    if (tz.toUpperCase() === "UTC") return 0;

    const utcParts = _getDateTimeParts(d, "UTC");
    const targetParts = _getDateTimeParts(d, tz);

    const utcDate = _getUTCTimestamp(utcParts.year, utcParts.month - 1, utcParts.day, utcParts.hour, utcParts.minute, utcParts.second, utcParts.ms);
    const targetDate = _getUTCTimestamp(targetParts.year, targetParts.month - 1, targetParts.day, targetParts.hour, targetParts.minute, targetParts.second, targetParts.ms);

    return Math.round((targetDate - utcDate) / 60000);
}

function _getTimeZoneOffsetString(d: Date, timeZone?: string): string {
    const tz = _resolveTimeZone(timeZone);
    const offsetMin = _getTimeZoneOffsetMinutes(d, tz);
    const sign = offsetMin >= 0 ? "+" : "-";
    const absMin = Math.abs(offsetMin);
    const hours = String(Math.floor(absMin / 60)).padStart(2, "0");
    const mins = String(absMin % 60).padStart(2, "0");

    return `${sign}${hours}${mins}`;
}


export function toValidDate(input: unknown, options?: { dateOnly?: boolean }): Date | null {
    const cleanInput = unboxPrimitiveObj(input);
    if (cleanInput == null) return null;

    let d: Date | null = null;
    if (isValidDateObj(cleanInput)) {
        d = cleanInput;
    } else if (typeof cleanInput === "number" || typeof cleanInput === "bigint") {
        d = new Date(normalizeEpochToMs(cleanInput));
    } else if (typeof cleanInput === "string") {
        if (isBlankString(cleanInput)) return null;
        d = new Date(cleanInput);
    }

    if (!d || !isValidDateObj(d)) return null;

    if (options?.dateOnly) {
        const isString = typeof cleanInput === "string";
        const isISODateOnly = isString && ISO_DATE_ONLY_REGEX.test(cleanInput);
        const tz = (isString && !isISODateOnly && !ZONE_OFFSET_REGEX.test(cleanInput)) ? "local" : "UTC";
        const parts = _getDateTimeParts(d, tz);
        return _createUTCDate(parts.year, parts.month - 1, parts.day);
    }

    return d;
}

export function toValidTime(val: unknown): string | null {
    const cleanVal = unboxPrimitiveObj(val);
    if (cleanVal == null) return null;

    let d: Date | null = null;
    if (typeof cleanVal === "string") {
        const trimmed = cleanVal.trim();
        if (TIME_PREFIX_REGEX.test(trimmed)) {
            const hasZone = ZONE_OFFSET_REGEX.test(trimmed);
            d = toValidDate(`1970-01-01T${trimmed}${hasZone ? "" : "Z"}`);
        }
    }

    const dateObj = d || toValidDate(cleanVal);
    if (!dateObj) return null;

    return strftime(dateObj, "%H:%M:%S.%ms");
}


export function toEpoch(d: Date, unit: TimeUnit = "ms"): number | bigint {
    const ms = d.getTime();
    switch (unit) {
        case "s": return Math.floor(ms / MS_PER_SECOND);
        case "ms": return ms;
        case "us": return BigInt(ms) * US_PER_MS_BI;
        case "ns": return BigInt(ms) * NS_PER_MS_BI;
    }
}
export function normalizeEpochToMs(n: number | bigint): number {
    if (typeof n === "bigint") {
        const abs = n < 0n ? -n : n;
        if (abs <= 30_000_000_000n) return Number(n) * 1000;
        if (abs <= 30_000_000_000_000n) return Number(n);
        if (abs <= 30_000_000_000_000_000n) return Number(n / US_PER_MS_BI);
        return Number(n / NS_PER_MS_BI);
    }

    const abs = Math.abs(n);
    if (abs <= 3e10) return n * 1000;
    if (abs <= 3e13) return n;
    if (abs <= 3e16) return Math.floor(n / 1000);
    return Math.floor(n / 1_000_000);
}

export function getCentury(d: Date): number | null {
    if (!isValidDateObj(d)) return null;
    const y = d.getUTCFullYear();
    return Math.floor((y - 1) / 100) + 1;
}

export function getISOWeek(d: Date): number | null {
    if (!isValidDateObj(d)) return null;
    const date = _createUTCDate(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = _createUTCDate(date.getUTCFullYear(), 0, 1);
    const dayDiff = Math.round((date.getTime() - yearStart.getTime()) / MS_PER_DAY);
    return Math.floor(dayDiff / 7) + 1;
}

export function getMillennium(d: Date): number | null {
    if (!isValidDateObj(d)) return null;
    const y = d.getUTCFullYear();
    return Math.floor((y - 1) / 1000) + 1;
}

export function getMonthOffset(d: Date, monthOffset: number, day: number = 1): Date | null {
    if (!isValidDateObj(d)) return null;
    return _createUTCDate(d.getUTCFullYear(), d.getUTCMonth() + monthOffset, day);
}

export function getOrdinalDay(d: Date): number | null {
    if (!isValidDateObj(d)) return null;
    const utcDate = _getUTCTimestamp(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const start = _getUTCTimestamp(d.getUTCFullYear(), 0, 1);
    return Math.floor((utcDate - start) / MS_PER_DAY) + 1;
}

export function getQuarter(d: Date): number | null {
    if (!isValidDateObj(d)) return null;
    return Math.floor(d.getUTCMonth() / 3) + 1;
}

export function isLeapYear(yOrDate: number | Date): boolean {
    let y: number;
    if (isValidDateObj(yOrDate)) {
        y = yOrDate.getUTCFullYear();
    } else if (isValidNumber(yOrDate)) {
        y = yOrDate;
    } else {
        return false;
    }
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

interface DateDirective {
    key: string;
    format: (d: Date, locale: string, timeZone: string, parts: DateTimeParts) => string;
    parseRegex?: string;
    parseField?: "year" | "month" | "day" | "hour" | "minute" | "second" | "ms" | "ampm" | "offset";
    parseNormalize?: (valStr: string) => number | string;
}

const DIRECTIVES: Record<string, DateDirective> = {
    "Y": {
        key: "Y",
        format: (_d, _locale, _tz, parts) => {
            const y = parts.year;
            return y >= 0 ? String(y).padStart(4, "0") : "-" + String(Math.abs(y)).padStart(4, "0");
        },
        parseRegex: "\\d{4}",
        parseField: "year"
    },
    "y": {
        key: "y",
        format: (_d, _locale, _tz, parts) => String(Math.abs(parts.year) % 100).padStart(2, "0"),
        parseRegex: "\\d{2}",
        parseField: "year",
        parseNormalize: (s) => {
            const val = parseInt(s, 10);
            return val + (val >= 69 ? 1900 : 2000);
        }
    },
    "m": { key: "m", format: (_d, _locale, _tz, parts) => String(parts.month).padStart(2, "0"), parseRegex: "\\d{2}", parseField: "month" },
    "d": { key: "d", format: (_d, _locale, _tz, parts) => String(parts.day).padStart(2, "0"), parseRegex: "\\d{2}", parseField: "day" },
    "e": { key: "e", format: (_d, _locale, _tz, parts) => String(parts.day).padStart(2, " "), parseRegex: "\\s?\\d{1,2}", parseField: "day" },
    "H": { key: "H", format: (_d, _locale, _tz, parts) => String(parts.hour).padStart(2, "0"), parseRegex: "\\d{2}", parseField: "hour" },
    "I": { key: "I", format: (_d, _locale, _tz, parts) => String(parts.hour % 12 || 12).padStart(2, "0"), parseRegex: "\\d{2}", parseField: "hour" },
    "p": {
        key: "p",
        format: (_d, _locale, _tz, parts) => parts.hour >= 12 ? "PM" : "AM",
        parseRegex: "AM|PM|am|pm",
        parseField: "ampm",
        parseNormalize: (s) => s.toUpperCase()
    },
    "M": { key: "M", format: (_d, _locale, _tz, parts) => String(parts.minute).padStart(2, "0"), parseRegex: "\\d{2}", parseField: "minute" },
    "S": { key: "S", format: (_d, _locale, _tz, parts) => String(parts.second).padStart(2, "0"), parseRegex: "\\d{2}", parseField: "second" },
    "A": { key: "A", format: (d, locale, tz) => d.toLocaleDateString(locale, { weekday: "long", timeZone: _resolveTimeZone(tz) }) },
    "a": { key: "a", format: (d, locale, tz) => d.toLocaleDateString(locale, { weekday: "short", timeZone: _resolveTimeZone(tz) }) },
    "B": { key: "B", format: (d, locale, tz) => d.toLocaleDateString(locale, { month: "long", timeZone: _resolveTimeZone(tz) }) },
    "b": { key: "b", format: (d, locale, tz) => d.toLocaleDateString(locale, { month: "short", timeZone: _resolveTimeZone(tz) }) },
    "h": { key: "h", format: (d, locale, tz) => d.toLocaleDateString(locale, { month: "short", timeZone: _resolveTimeZone(tz) }) },
    "j": {
        key: "j",
        format: (_d, _locale, _tz, parts) => String(getOrdinalDay(_createUTCDate(parts.year, parts.month - 1, parts.day)) ?? 1).padStart(3, "0"),
        parseRegex: "\\d{3}",
        parseField: "day",
        parseNormalize: (s) => parseInt(s, 10)
    },
    "u": { key: "u", format: (_d, _locale, _tz, parts) => String(parts.dayOfWeek || 7) },
    "w": { key: "w", format: (_d, _locale, _tz, parts) => String(parts.dayOfWeek) },
    "Z": {
        key: "Z",
        format: (d, locale, tz) => {
            const resolvedZone = _resolveTimeZone(tz);
            if (resolvedZone.toUpperCase() === "UTC") return "UTC";
            const parts = _getCachedTimeZoneNameDtf(locale, resolvedZone).formatToParts(d);
            for (let i = 0, len = parts.length; i < len; i++) {
                if (parts[i].type === "timeZoneName") {
                    return parts[i].value;
                }
            }
            return "UTC";
        }
    },
    "z": {
        key: "z",
        format: (d, _locale, tz) => _getTimeZoneOffsetString(d, tz),
        parseRegex: "[+-]\\d{2}(?::?\\d{2})?",
        parseField: "offset",
        parseNormalize: (s) => s.replace(":", "")
    },
    "ms": {
        key: "ms",
        format: (_d, _locale, _tz, parts) => String(parts.ms).padStart(3, "0"),
        parseRegex: "\\d{3}",
        parseField: "ms",
        parseNormalize: (s) => parseInt(s, 10)
    },
    "f": {
        key: "f",
        format: (_d, _locale, _tz, parts) => String(parts.ms).padStart(3, "0").padEnd(6, "0"),
        parseRegex: "\\d{1,9}",
        parseField: "ms",
        parseNormalize: (s) => parseInt(s.padEnd(6, "0").slice(0, 3), 10)
    }
};

const DIRECTIVE_KEYS = Object.keys(DIRECTIVES).concat("%").sort((a, b) => b.length - a.length);
export const FORMAT_REGEX = new RegExp("%(" + DIRECTIVE_KEYS.join("|") + ")", "g");

const SHORTHANDS: Record<string, string> = {
    "%F": "%Y-%m-%d",
    "%T": "%H:%M:%S",
    "%R": "%H:%M",
    "%D": "%m/%d/%y"
};

export function expandFormatShorthands(format: string): string {
    return format.replace(/%[FTRD]/g, (m) => SHORTHANDS[m] || m);
}

function _applyOffsetMinutes(d: Date, offsetMinutes: number): Date {
    return new Date(d.getTime() - (offsetMinutes * 60 * 1000));
}

function _parseOffsetMinutes(offsetStr: string): number {
    const sign = offsetStr[0] === "+" ? 1 : -1;
    const hours = parseInt(offsetStr.slice(1, 3), 10) || 0;
    const mins = parseInt(offsetStr.slice(3, 5), 10) || 0;
    return sign * (hours * 60 + mins);
}


export function strftime(d: Date, format: string, locale?: string, timeZone = "UTC"): string {
    if (!isValidDateObj(d) || typeof format !== "string") return "";

    const activeLocale = (locale && locale.trim()) || Intl.DateTimeFormat().resolvedOptions().locale || "en-US";
    const expanded = expandFormatShorthands(format);

    let parts: DateTimeParts | null = null;
    const getParts = (): DateTimeParts => (parts ??= _getDateTimeParts(d, timeZone));

    return expanded.replace(FORMAT_REGEX, (match, key) => {
        if (key === "%") return "%";
        const dir = DIRECTIVES[key];
        return dir ? dir.format(d, activeLocale, timeZone, getParts()) : match;
    });
}
export function strptime(str: string, format: string, strict = true, defaultTimeZone = "UTC"): Date | null {
    if (typeof str !== "string" || typeof format !== "string") return null;

    const expanded = expandFormatShorthands(format);
    const placeholders: DateDirective[] = [];

    let regexStr = "";
    let lastIndex = 0;

    FORMAT_REGEX.lastIndex = 0;
    let match;
    while ((match = FORMAT_REGEX.exec(expanded)) !== null) {
        const literalPart = expanded.slice(lastIndex, match.index);
        regexStr += escapeRegExp(literalPart);

        const key = match[1];
        if (key === "%") {
            regexStr += "\\%";
        } else {
            const dir = DIRECTIVES[key];
            if (dir && dir.parseRegex) {
                placeholders.push(dir);
                regexStr += `(${dir.parseRegex})`;
            } else {
                regexStr += escapeRegExp(match[0]);
            }
        }
        lastIndex = FORMAT_REGEX.lastIndex;
    }
    regexStr += escapeRegExp(expanded.slice(lastIndex));

    const regex = new RegExp("^\\s*" + regexStr + "\\s*$");
    const strMatch = str.match(regex);
    if (!strMatch) {
        if (strict) return null;
        return toValidDate(str);
    }

    const parts = {
        year: 1970,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
        ms: 0,
        offset: null as string | null
    };
    let ampm: string | null = null;
    let hasOrdinalDay = false;

    for (let i = 0; i < placeholders.length; i++) {
        const valStr = strMatch[i + 1];
        const dir = placeholders[i];
        const parsedVal = dir.parseNormalize ? dir.parseNormalize(valStr) : parseInt(valStr, 10);

        if (dir.key === "j") {
            hasOrdinalDay = true;
        }

        if (dir.parseField === "ampm") {
            ampm = parsedVal as string;
        } else if (dir.parseField === "offset") {
            parts.offset = parsedVal as string;
        } else if (dir.parseField) {
            parts[dir.parseField] = parsedVal as number;
        }
    }

    if (ampm) {
        if (ampm === "PM" && parts.hour < 12) parts.hour += 12;
        if (ampm === "AM" && parts.hour === 12) parts.hour = 0;
    }

    if (hasOrdinalDay) {
        const limit = isLeapYear(parts.year) ? 366 : 365;
        if (parts.day < 1 || parts.day > limit) {
            return null;
        }
        const baseDate = _createUTCDate(parts.year, 0, 1);
        baseDate.setUTCDate(parts.day);
        parts.month = baseDate.getUTCMonth() + 1;
        parts.day = baseDate.getUTCDate();
    }

    let d = _createUTCDate(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, parts.ms);
    if (!isValidDateObj(d)) return null;

    if (d.getUTCFullYear() !== parts.year ||
        d.getUTCMonth() + 1 !== parts.month ||
        d.getUTCDate() !== parts.day ||
        d.getUTCHours() !== parts.hour ||
        d.getUTCMinutes() !== parts.minute ||
        d.getUTCSeconds() !== parts.second ||
        d.getUTCMilliseconds() !== parts.ms) {
        return null;
    }

    if (parts.offset) {
        d = _applyOffsetMinutes(d, _parseOffsetMinutes(parts.offset));
    } else if (defaultTimeZone.toUpperCase() !== "UTC") {
        const tz = _resolveTimeZone(defaultTimeZone);

        const offsetMinutes1 = _getTimeZoneOffsetMinutes(d, tz);
        d = _applyOffsetMinutes(d, offsetMinutes1);

        const offsetMinutes2 = _getTimeZoneOffsetMinutes(d, tz);
        if (offsetMinutes2 !== offsetMinutes1) {
            d = _applyOffsetMinutes(d, offsetMinutes2 - offsetMinutes1);
        }
    }

    return isValidDateObj(d) ? d : null;
}



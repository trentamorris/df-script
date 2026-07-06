import { isBlankString, escapeRegExp } from "./string";
import type { TimeUnit, StrptimeOptions, StrftimeOptions, IsBusinessDayOptions, BusinessDayOffsetOptions, DateDiffUnit, DateDiffOptions, UtcOffsetOptions, UtcOffsetFormat } from "../types";
import { ComputeError } from "../exceptions";
import { isValidDateObj, unboxPrimitiveObj } from "./object";
import { isValidNumber, isValidInt } from "./number";
import { MS_PER_SECOND, MS_PER_MINUTE, MS_PER_HOUR, MS_PER_DAY, US_PER_MS_BI, NS_PER_MS_BI } from "../constants";

export const TIME_PREFIX_REGEX = /^\d{2}:\d{2}/;
export const ZONE_OFFSET_REGEX = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i;
export const ISO_DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const dtfCache = new Map<string, Intl.DateTimeFormat>();
function _getCachedDtf(timeZone: string): Intl.DateTimeFormat {
    let dtf = dtfCache.get(timeZone);
    if (!dtf) {
        dtf = new Intl.DateTimeFormat("en-US", {
            timeZone,
            hourCycle: "h23",
            weekday: "short",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
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


function _getDayOfWeek(y: number, m: number, d: number): number {
    const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
    let year = y;
    if (m < 3) year -= 1;
    return (year + Math.floor(year / 4) - Math.floor(year / 100) + Math.floor(year / 400) + t[m - 1] + d) % 7;
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

    let hour = parseInt(hourStr, 10);
    if (hour === 24) hour = 0;

    const ms = Math.round(parseFloat("0." + msStr) * 1000) || 0;

    const dayOfWeek = _getDayOfWeek(year, month, day);

    return {
        year,
        month,
        day,
        hour,
        minute: parseInt(minuteStr, 10),
        second: parseInt(secondStr, 10),
        ms,
        dayOfWeek
    };
}

function _getTimeZoneOffsetMinutes(d: Date, tz: string, targetParts?: DateTimeParts): number {
    if (tz.toUpperCase() === "UTC") return 0;

    const utcParts = _getDateTimeParts(d, "UTC");
    const resolvedTargetParts = targetParts || _getDateTimeParts(d, tz);

    const utcDate = _createUTCDate(utcParts.year, utcParts.month - 1, utcParts.day, utcParts.hour, utcParts.minute, utcParts.second, utcParts.ms).getTime();
    const targetDate = _createUTCDate(resolvedTargetParts.year, resolvedTargetParts.month - 1, resolvedTargetParts.day, resolvedTargetParts.hour, resolvedTargetParts.minute, resolvedTargetParts.second, resolvedTargetParts.ms).getTime();

    return Math.round((targetDate - utcDate) / MS_PER_MINUTE);
}

function _formatOffsetMinutes(offsetMin: number, format: Extract<UtcOffsetFormat, "iso" | "basic">): string {
    const sign = offsetMin >= 0 ? "+" : "-";
    const absMin = Math.abs(offsetMin);
    const hours = String(Math.floor(absMin / 60)).padStart(2, "0");
    const mins = String(absMin % 60).padStart(2, "0");
    return format === "iso" ? `${sign}${hours}:${mins}` : `${sign}${hours}${mins}`;
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

    return strftime(dateObj, { format: "%H:%M:%S.%ms" });
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

export function getISO(
    d: Date,
    options: { field: "week" | "year" } = { field: "week" }
): number | null {
    if (!isValidDateObj(d)) return null;
    const date = _createUTCDate(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);

    if (options.field === "year") {
        return date.getUTCFullYear();
    }
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

function _getMonthDiff(d1: Date, d2: Date): number {
    const y1 = d1.getUTCFullYear();
    const y2 = d2.getUTCFullYear();
    const m1 = d1.getUTCMonth();
    const m2 = d2.getUTCMonth();
    const baseMonths = (y2 - y1) * 12 + (m2 - m1);

    const day1 = d1.getUTCDate();
    const day2 = d2.getUTCDate();
    const ms1 = d1.getTime() - _createUTCDate(y1, m1, day1).getTime();
    const ms2 = d2.getTime() - _createUTCDate(y2, m2, day2).getTime();

    const dayDiff = (day2 - day1) + (ms2 - ms1) / MS_PER_DAY;
    if (dayDiff === 0) return baseMonths;

    let daysInMonth = 30;
    if (dayDiff > 0) {
        daysInMonth = _createUTCDate(y1, m1 + 1, 0).getUTCDate();
    } else {
        daysInMonth = _createUTCDate(y2, m2, 0).getUTCDate();
    }
    return baseMonths + dayDiff / daysInMonth;
}

export function dateDiff(
    d1: Date,
    d2: Date,
    unit: DateDiffUnit,
    { roundMode = "exact" }: DateDiffOptions = {}
): number | null {
    if (!isValidDateObj(d1) || !isValidDateObj(d2)) return null;

    let val: number;
    const diffMs = d2.getTime() - d1.getTime();

    switch (unit) {
        case "ms": case "milliseconds": val = diffMs; break;
        case "s": case "seconds": val = diffMs / MS_PER_SECOND; break;
        case "m": case "minutes": val = diffMs / MS_PER_MINUTE; break;
        case "h": case "hours": val = diffMs / MS_PER_HOUR; break;
        case "d": case "days": val = diffMs / MS_PER_DAY; break;
        case "w": case "weeks": val = diffMs / (7 * MS_PER_DAY); break;
        case "mo": case "months": val = _getMonthDiff(d1, d2); break;
        case "q": case "quarters": val = _getMonthDiff(d1, d2) / 3; break;
        case "y": case "years": val = _getMonthDiff(d1, d2) / 12; break;
        default: return null;
    }
    switch (roundMode) {
        case "floor": return Math.floor(val);
        case "ceil": return Math.ceil(val);
        case "round": return Math.round(val);
        case "trunc": return Math.trunc(val);
        case "exact":
        default: return val;
    }
}

export function getOrdinalDay(d: Date): number | null {
    if (!isValidDateObj(d)) return null;
    const utcDate = _createUTCDate(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).getTime();
    const start = _createUTCDate(d.getUTCFullYear(), 0, 1).getTime();
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
        parseRegex: "[+-]?\\d{4,}",
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
        format: (d, _locale, tz) => getTimeZoneOffset(d, tz, { format: "basic" }) as string,
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

function _expandFormatShorthands(format: string): string {
    return format.replace(/%[FTRD]/g, (m) => SHORTHANDS[m] || m);
}

function _applyOffsetMinutes(d: Date, offsetMinutes: number): Date {
    return new Date(d.getTime() - (offsetMinutes * 60 * 1000));
}

function _parseOffsetMinutes(offsetStr: string): number {
    const clean = offsetStr.replace(":", "");
    const sign = clean[0] === "+" ? 1 : -1;
    const hours = parseInt(clean.slice(1, 3), 10) || 0;
    const mins = parseInt(clean.slice(3, 5), 10) || 0;
    return sign * (hours * 60 + mins);
}


export function strftime(
    d: Date,
    {
        format,
        locale,
        timeZone = "UTC"
    }: StrftimeOptions
): string {
    if (!isValidDateObj(d) || typeof format !== "string") return "";

    const activeLocale = (locale && locale.trim()) || Intl.DateTimeFormat().resolvedOptions().locale || "en-US";
    const expanded = _expandFormatShorthands(format);

    let parts: DateTimeParts | null = null;
    const getParts = (): DateTimeParts => (parts ??= _getDateTimeParts(d, timeZone));

    return expanded.replace(FORMAT_REGEX, (match, key) => {
        if (key === "%") return "%";
        const dir = DIRECTIVES[key];
        return dir ? dir.format(d, activeLocale, timeZone, getParts()) : match;
    });
}

export function strptime(
    str: string,
    {
        format,
        strict = true,
        defaultTimeZone = "UTC"
    }: StrptimeOptions
): Date | null {
    if (typeof str !== "string" || typeof format !== "string") return null;

    const expanded = _expandFormatShorthands(format);
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

export function offsetDay(
    d: Date,
    n: number | any,
    {
        excludeWeekdays = [],
        holidays = [],
        roll
    }: BusinessDayOffsetOptions = {}
): Date {
    if (!isValidInt(n)) {
        throw new ComputeError(`The offset parameter 'n' must be a whole integer. Received: ${n}`);
    }

    const activeDaysPerWeek = 7 - excludeWeekdays.length;
    if (activeDaysPerWeek <= 0) {
        throw new ComputeError("All weekdays are excluded; cannot offset.");
    }

    const holidayTimestamps = new Set<number>();
    if (holidays instanceof Set) {
        for (const ts of holidays) {
            const hd = new Date(ts);
            if (excludeWeekdays.includes(hd.getUTCDay())) continue;
            holidayTimestamps.add(ts);
        }
    } else if (Array.isArray(holidays)) {
        for (let i = 0; i < holidays.length; i++) {
            const hd = toValidDate(holidays[i]);
            if (!hd) continue;
            if (excludeWeekdays.includes(hd.getUTCDay())) continue;

            const hdUTC = _createUTCDate(hd.getUTCFullYear(), hd.getUTCMonth(), hd.getUTCDate());
            holidayTimestamps.add(hdUTC.getTime());
        }
    }

    const isExcluded = (date: Date): boolean => {
        if (excludeWeekdays.includes(date.getUTCDay())) return true;
        return holidayTimestamps.has(date.getTime());
    };

    let currentDate = _createUTCDate(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    if (roll && isExcluded(currentDate)) {
        if (roll === "raise") {
            throw new ComputeError("Start date falls on an excluded day or holiday.");
        }
        const rollDir = roll === "forward" ? 1 : -1;
        while (isExcluded(currentDate)) {
            currentDate.setUTCDate(currentDate.getUTCDate() + rollDir);
        }
    }

    if (n === 0) return currentDate;

    const stepDir = n > 0 ? 1 : -1;
    let businessDaysCount = 0;
    const targetOffset = Math.abs(n);

    while (businessDaysCount < targetOffset) {
        currentDate.setUTCDate(currentDate.getUTCDate() + stepDir);
        if (!isExcluded(currentDate)) {
            businessDaysCount++;
        }
    }

    return currentDate;
}

export function getTimeZoneOffset(
    d: Date,
    timeZone?: string,
    options?: UtcOffsetOptions
): number | string {
    const tz = _resolveTimeZone(timeZone);
    const type = options?.type ?? "total";

    let offsetMinutes: number;

    if (type === "total") {
        offsetMinutes = _getTimeZoneOffsetMinutes(d, tz);
    } else {
        const localParts = _getDateTimeParts(d, tz);
        const year = localParts.year;

        const janOffset = _getTimeZoneOffsetMinutes(_createUTCDate(year, 0, 1), tz);
        const julOffset = _getTimeZoneOffsetMinutes(_createUTCDate(year, 6, 1), tz);
        const baseOffset = Math.min(janOffset, julOffset);

        if (type === "daylightSavingTime") {
            const totalOffsetMinutes = _getTimeZoneOffsetMinutes(d, tz, localParts);
            offsetMinutes = totalOffsetMinutes - baseOffset;
        } else {
            offsetMinutes = baseOffset;
        }
    }

    const fmt = options?.format ?? "milliseconds";
    switch (fmt) {
        case "minutes": return offsetMinutes;
        case "hours": return offsetMinutes / 60;
        case "iso": return _formatOffsetMinutes(offsetMinutes, "iso");
        case "basic": return _formatOffsetMinutes(offsetMinutes, "basic");
        case "milliseconds":
        default:
            return offsetMinutes * MS_PER_MINUTE;
    }
}

export function isBusinessDay(
    d: Date,
    options: IsBusinessDayOptions = {}
): boolean | null {
    if (!isValidDateObj(d)) return null;
    const excludeWeekdays = options.excludeWeekdays ?? [0, 6];
    const day = d.getUTCDay();
    if (excludeWeekdays.includes(day)) return false;

    const holidays = options.holidays;
    if (holidays) {
        if (holidays instanceof Set) {
            const dUTC = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
            if (holidays.has(dUTC)) return false;
        } else if (Array.isArray(holidays) && holidays.length > 0) {
            const holidayTimestamps = new Set<number>();
            for (let i = 0; i < holidays.length; i++) {
                const hd = toValidDate(holidays[i]);
                if (hd) {
                    holidayTimestamps.add(Date.UTC(hd.getUTCFullYear(), hd.getUTCMonth(), hd.getUTCDate()));
                }
            }
            const dUTC = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
            if (holidayTimestamps.has(dUTC)) return false;
        }
    }

    return true;
}
/** @internalfile */
import { escapeRegExp } from "./string";
import type { TimeUnit, StrptimeOptions, StrftimeOptions, IsBusinessDayOptions, DayOffsetOptions, UtcOffsetOptions, ReplaceDateOptions, DateTimeParts } from "../types";
import { ComputeError } from "../exceptions";
import { isValidDateObj, unboxPrimitiveObj } from "./object";
import { isValidInt } from "./number";
import { MS_PER_SECOND, MS_PER_MINUTE, MS_PER_DAY, US_PER_MS, NS_PER_MS, US_PER_MS_BI, NS_PER_MS_BI } from "../constants";

const _TIME_PREFIX_REGEX = /^\d{2}:\d{2}/;
const _ZONE_OFFSET_REGEX = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i;

const _dtfCache = new Map<string, Intl.DateTimeFormat>();
function _getCachedDtf(timeZone: string): Intl.DateTimeFormat {
    let dtf = _dtfCache.get(timeZone);
    if (!dtf) {
        dtf = new Intl.DateTimeFormat("en-US", {
            timeZone,
            hourCycle: "h23",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            fractionalSecondDigits: 3
        });
        _dtfCache.set(timeZone, dtf);
    }
    return dtf;
}

const _tzNameDtfCache = new Map<string, Intl.DateTimeFormat>();
function _getCachedTimeZoneNameDtf(locale: string, timeZone: string): Intl.DateTimeFormat {
    const key = `${locale}_${timeZone}`;
    let dtf = _tzNameDtfCache.get(key);
    if (!dtf) {
        dtf = new Intl.DateTimeFormat(locale, { timeZoneName: "short", timeZone });
        _tzNameDtfCache.set(key, dtf);
    }
    return dtf;
}

const _tzValidityCache = new Map<string, boolean>();
function _isValidTimeZone(tz: string): boolean {
    let valid = _tzValidityCache.get(tz);
    if (valid === undefined) {
        try {
            Intl.DateTimeFormat(undefined, { timeZone: tz });
            valid = true;
        } catch {
            valid = false;
        }
        _tzValidityCache.set(tz, valid);
    }
    return valid;
}

function _resolveTimeZone(tz?: string): string {
    const resolved = !tz || tz === "local" ? Intl.DateTimeFormat().resolvedOptions().timeZone : tz;
    return _isValidTimeZone(resolved) ? resolved : "UTC";
}

export function createUTCDate(
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
            dayOfWeek: d.getUTCDay(),
            timeZone: "UTC"
        };
    }

    const dtf = _getCachedDtf(tz);
    const parts = dtf.formatToParts(d);

    const values: Record<string, string> = {
        year: "0",
        month: "0",
        day: "0",
        hour: "0",
        minute: "0",
        second: "0",
        fractionalSecond: "0"
    };

    for (let i = 0, len = parts.length; i < len; i++) {
        const part = parts[i];
        if (part.type in values) {
            values[part.type] = part.value;
        }
    }

    const year = parseInt(values.year, 10);
    const month = parseInt(values.month, 10);
    const day = parseInt(values.day, 10);
    let hour = parseInt(values.hour, 10);
    if (hour === 24) hour = 0;

    const ms = Math.round(parseFloat("0." + values.fractionalSecond) * 1000) || 0;
    const dayOfWeek = createUTCDate(year, month - 1, day).getUTCDay();

    return {
        year,
        month,
        day,
        hour,
        minute: parseInt(values.minute, 10),
        second: parseInt(values.second, 10),
        ms,
        dayOfWeek,
        timeZone: tz
    };
}

function _getTimeZoneOffsetMinutes(d: Date, resolvedTz: string): number {
    if (resolvedTz.toUpperCase() === "UTC") return 0;
    const target = _getDateTimeParts(d, resolvedTz);
    const targetMs = createUTCDate(target.year, target.month - 1, target.day, target.hour, target.minute, target.second, target.ms).getTime();
    return Math.round((targetMs - d.getTime()) / MS_PER_MINUTE);
}

export function toValidDate(input: unknown, options?: { dateOnly?: boolean }): Date | null {
    const cleanInput = unboxPrimitiveObj(input);
    if (cleanInput == null) return null;

    let d: Date | null = null;
    if (isValidDateObj(cleanInput)) {
        d = cleanInput;
    } else if (typeof cleanInput === "number" || typeof cleanInput === "bigint") {
        d = new Date(_normalizeEpochToMs(cleanInput));
    } else if (typeof cleanInput === "string") {
        const s = cleanInput.trim();
        if (s.length === 0) return null;
        d = new Date(s);
    }

    if (!d || !isValidDateObj(d)) return null;

    if (options?.dateOnly) {
        return createUTCDate(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }

    return d;
}

export function toValidTime(val: unknown): string | null {
    const cleanVal = unboxPrimitiveObj(val);
    if (cleanVal == null) return null;

    let d: Date | null = null;
    if (typeof cleanVal === "string") {
        const trimmed = cleanVal.trim();
        if (_TIME_PREFIX_REGEX.test(trimmed)) {
            const hasZone = _ZONE_OFFSET_REGEX.test(trimmed);
            d = toValidDate(`1970-01-01T${trimmed}${hasZone ? "" : "Z"}`);
        }
    }

    const dateObj = d ?? toValidDate(cleanVal);
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
function _normalizeEpochToMs(n: number | bigint): number {
    if (typeof n === "bigint") {
        const abs = n < 0n ? -n : n;
        if (abs <= 30_000_000_000n) return Number(n) * MS_PER_SECOND;
        if (abs <= 100_000_000_000_000n) return Number(n);
        if (abs <= 100_000_000_000_000_000n) return Number(n / US_PER_MS_BI);
        return Number(n / NS_PER_MS_BI);
    }

    const abs = Math.abs(n);
    if (abs <= 3e10) return n * MS_PER_SECOND;
    if (abs <= 1e14) return n;
    if (abs <= 1e17) return Math.floor(n / US_PER_MS);
    return Math.floor(n / NS_PER_MS);
}

function _getOrdinalDay(d: Date): number | null {
    if (!isValidDateObj(d)) return null;
    const start = createUTCDate(d.getUTCFullYear(), 0, 1).getTime();
    return Math.floor((d.getTime() - start) / MS_PER_DAY) + 1;
}

function _getISO(y: number, m: number, d: number, field: "week" | "year" = "week"): number | null {
    const date = createUTCDate(y, m - 1, d);
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    if (field === "year") return date.getUTCFullYear();
    const ordinal = _getOrdinalDay(date);
    return ordinal != null ? Math.floor((ordinal - 1) / 7) + 1 : null;
}

interface DateDirective {
    _format: (d: Date, locale: string, timeZone: string, parts: DateTimeParts) => string;
    _parseRegex?: string;
    _parseField?: "year" | "month" | "day" | "hour" | "minute" | "second" | "ms" | "ampm" | "offset";
    _parseNormalize?: (valStr: string) => number | string;
}

const _normalizeSubsecond = (s: string): number => parseInt(s.padEnd(3, "0").slice(0, 3), 10);
const _pad2 = (n: number): string => String(n).padStart(2, "0");

const _D2_PATTERN = "\\d{2}";
const _YEAR_PATTERN = "[+-]?\\d{4,}";

const _DIRECTIVES: Record<string, DateDirective> = {
    "Y": {
        _format: (_d, _locale, _tz, parts) => {
            const y = parts.year;
            return y >= 0 ? String(y).padStart(4, "0") : "-" + String(Math.abs(y)).padStart(4, "0");
        },
        _parseRegex: _YEAR_PATTERN,
        _parseField: "year"
    },
    "y": {
        _format: (_d, _locale, _tz, parts) => _pad2(Math.abs(parts.year) % 100),
        _parseRegex: _D2_PATTERN,
        _parseField: "year",
        _parseNormalize: (s) => {
            const val = parseInt(s, 10);
            return val + (val >= 69 ? 1900 : 2000);
        }
    },
    "m": { _format: (_d, _locale, _tz, parts) => _pad2(parts.month), _parseRegex: _D2_PATTERN, _parseField: "month" },
    "d": { _format: (_d, _locale, _tz, parts) => _pad2(parts.day), _parseRegex: _D2_PATTERN, _parseField: "day" },
    "e": { _format: (_d, _locale, _tz, parts) => String(parts.day).padStart(2, " "), _parseRegex: "\\s?\\d{1,2}", _parseField: "day" },
    "H": { _format: (_d, _locale, _tz, parts) => _pad2(parts.hour), _parseRegex: _D2_PATTERN, _parseField: "hour" },
    "I": { _format: (_d, _locale, _tz, parts) => _pad2(parts.hour % 12 || 12), _parseRegex: _D2_PATTERN, _parseField: "hour" },
    "p": {
        _format: (_d, _locale, _tz, parts) => parts.hour >= 12 ? "PM" : "AM",
        _parseRegex: "AM|PM|am|pm",
        _parseField: "ampm",
        _parseNormalize: (s) => s.toUpperCase()
    },
    "M": { _format: (_d, _locale, _tz, parts) => _pad2(parts.minute), _parseRegex: _D2_PATTERN, _parseField: "minute" },
    "S": { _format: (_d, _locale, _tz, parts) => _pad2(parts.second), _parseRegex: _D2_PATTERN, _parseField: "second" },
    "A": { _format: (d, locale, tz) => d.toLocaleDateString(locale, { weekday: "long", timeZone: tz }) },
    "a": { _format: (d, locale, tz) => d.toLocaleDateString(locale, { weekday: "short", timeZone: tz }) },
    "B": { _format: (d, locale, tz) => d.toLocaleDateString(locale, { month: "long", timeZone: tz }) },
    "b": { _format: (d, locale, tz) => d.toLocaleDateString(locale, { month: "short", timeZone: tz }) },
    "j": {
        _format: (_d, _locale, _tz, parts) => String(_getOrdinalDay(createUTCDate(parts.year, parts.month - 1, parts.day)) ?? 1).padStart(3, "0"),
        _parseRegex: "\\d{3}",
        _parseField: "day",
        _parseNormalize: (s) => parseInt(s, 10)
    },
    "u": { _format: (_d, _locale, _tz, parts) => String(parts.dayOfWeek || 7) },
    "w": { _format: (_d, _locale, _tz, parts) => String(parts.dayOfWeek) },
    "V": {
        _format: (_d, _locale, _tz, parts) => _pad2(_getISO(parts.year, parts.month, parts.day, "week") ?? 1),
        _parseRegex: _D2_PATTERN,
        _parseNormalize: (s) => parseInt(s, 10)
    },
    "G": {
        _format: (_d, _locale, _tz, parts) => String(_getISO(parts.year, parts.month, parts.day, "year") ?? parts.year).padStart(4, "0"),
        _parseRegex: _YEAR_PATTERN,
        _parseNormalize: (s) => parseInt(s, 10)
    },
    "Z": {
        _format: (d, locale, tz) => {
            if (tz.toUpperCase() === "UTC") return "UTC";
            const parts = _getCachedTimeZoneNameDtf(locale, tz).formatToParts(d);
            for (let i = 0, len = parts.length; i < len; i++) {
                if (parts[i].type === "timeZoneName") {
                    return parts[i].value;
                }
            }
            return "UTC";
        }
    },
    "z": {
        _format: (d, _locale, tz) => getTimeZoneOffset(d, tz, { format: "basic" }) as string,
        _parseRegex: `[+-]${_D2_PATTERN}(?::?${_D2_PATTERN})?`,
        _parseField: "offset",
        _parseNormalize: (s) => s.replace(":", "")
    },
    "ms": {
        _format: (_d, _locale, _tz, parts) => String(parts.ms).padStart(3, "0"),
        _parseRegex: "\\d{1,3}",
        _parseField: "ms",
        _parseNormalize: _normalizeSubsecond
    },
    "f": {
        _format: (_d, _locale, _tz, parts) => String(parts.ms).padStart(3, "0").padEnd(6, "0"),
        _parseRegex: "\\d{1,9}",
        _parseField: "ms",
        _parseNormalize: _normalizeSubsecond
    }
};

const _DIRECTIVE_KEYS = Object.keys(_DIRECTIVES).concat("%").sort((a, b) => b.length - a.length);
const _FORMAT_REGEX = new RegExp("%(" + _DIRECTIVE_KEYS.join("|") + ")", "g");

const _SHORTHANDS: Record<string, string> = {
    "%F": "%Y-%m-%d",
    "%T": "%H:%M:%S",
    "%R": "%H:%M",
    "%D": "%m/%d/%y",
    "%h": "%b"
};

function _expandFormatShorthands(format: string): string {
    return format.replace(/%[FTRDh]/g, (m) => _SHORTHANDS[m] || m);
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

    const resolvedTz = _resolveTimeZone(timeZone);
    const activeLocale = (locale && locale.trim()) || Intl.DateTimeFormat().resolvedOptions().locale || "en-US";
    const expanded = _expandFormatShorthands(format);

    let parts: DateTimeParts | null = null;
    const getParts = (): DateTimeParts => (parts ??= _getDateTimeParts(d, resolvedTz));

    return expanded.replace(_FORMAT_REGEX, (match, key) => {
        if (key === "%") return "%";
        const dir = _DIRECTIVES[key];
        return dir ? dir._format(d, activeLocale, resolvedTz, getParts()) : match;
    });
}

function _parseOffsetMinutes(offsetStr: string): number {
    const clean = offsetStr.replace(":", "");
    const sign = clean[0] === "+" ? 1 : -1;
    const hours = parseInt(clean.slice(1, 3), 10) || 0;
    const mins = parseInt(clean.slice(3, 5), 10) || 0;
    return sign * (hours * 60 + mins);
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

    let lastIndex = 0;
    let regexStr = "";
    expanded.replace(_FORMAT_REGEX, (match, key, offset) => {
        regexStr += escapeRegExp(expanded.slice(lastIndex, offset));
        lastIndex = offset + match.length;

        if (key === "%") {
            regexStr += "%";
            return match;
        }

        const dir = _DIRECTIVES[key];
        if (dir?._parseRegex) {
            placeholders.push(dir);
            regexStr += `(${dir._parseRegex})`;
        } else {
            regexStr += escapeRegExp(match);
        }
        return match;
    });
    regexStr += escapeRegExp(expanded.slice(lastIndex));

    const strMatch = str.match(new RegExp(`^\\s*${regexStr}\\s*$`));
    if (!strMatch) {
        return strict ? null : toValidDate(str);
    }

    const parts = { year: 1970, month: 1, day: 1, hour: 0, minute: 0, second: 0, ms: 0, offset: null as string | null };
    let ampm: string | null = null;
    let hasOrdinalDay = false;

    for (let i = 0, len = placeholders.length; i < len; i++) {
        const valStr = strMatch[i + 1];
        const dir = placeholders[i];
        const parsedVal = dir._parseNormalize ? dir._parseNormalize(valStr) : parseInt(valStr, 10);

        if (dir === _DIRECTIVES.j) hasOrdinalDay = true;
        if (dir._parseField === "ampm") ampm = parsedVal as string;
        else if (dir._parseField === "offset") parts.offset = parsedVal as string;
        else if (dir._parseField) parts[dir._parseField] = parsedVal as number;
    }

    if (ampm === "PM" && parts.hour < 12) parts.hour += 12;
    if (ampm === "AM" && parts.hour === 12) parts.hour = 0;

    if (hasOrdinalDay) {
        if (parts.day < 1) return null;
        const baseDate = createUTCDate(parts.year, 0, parts.day);
        if (baseDate.getUTCFullYear() !== parts.year) return null;
        parts.month = baseDate.getUTCMonth() + 1;
        parts.day = baseDate.getUTCDate();
    }

    let d = createUTCDate(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, parts.ms);
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
        d = new Date(d.getTime() - _parseOffsetMinutes(parts.offset) * MS_PER_MINUTE);
    } else if (defaultTimeZone.toUpperCase() !== "UTC") {
        const tz = _resolveTimeZone(defaultTimeZone);
        d = new Date(d.getTime() - _getTimeZoneOffsetMinutes(d, tz) * MS_PER_MINUTE);
    }

    return isValidDateObj(d) ? d : null;
}

function _resolveHolidaySet(
    holidays?: Set<number> | unknown[],
    excludeWeekdays: number[] = []
): Set<number> {
    const holidayTimestamps = new Set<number>();
    if (!holidays) return holidayTimestamps;

    const hasExcluded = excludeWeekdays.length > 0;
    for (const item of holidays) {
        const hd = toValidDate(item, { dateOnly: true });
        if (!hd || (hasExcluded && excludeWeekdays.includes(hd.getUTCDay()))) continue;
        holidayTimestamps.add(hd.getTime());
    }
    return holidayTimestamps;
}

function _isDateExcluded(d: Date, excludeWeekdays: number[], holidayTimestamps: Set<number>): boolean {
    return (excludeWeekdays.length > 0 && excludeWeekdays.includes(d.getUTCDay())) || holidayTimestamps.has(d.getTime());
}

export function offsetDay(
    d: Date,
    n: number | any,
    {
        excludeWeekdays = [],
        holidays = [],
        roll
    }: DayOffsetOptions = {}
): number {
    if (!isValidInt(n)) throw new ComputeError(`The offset parameter 'n' must be a whole integer. Received: ${n}`);

    const holidayTimestamps = _resolveHolidaySet(holidays, excludeWeekdays);
    if (excludeWeekdays.length === 0 && holidayTimestamps.size === 0 && !roll) {
        return n;
    }

    if (7 - excludeWeekdays.length <= 0) throw new ComputeError("All weekdays are excluded; cannot offset.");

    const initialDate = createUTCDate(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const currentDate = new Date(initialDate.getTime());

    if (roll && _isDateExcluded(currentDate, excludeWeekdays, holidayTimestamps)) {
        if (roll === "raise") throw new ComputeError("Start date falls on an excluded day or holiday.");
        const rollDir = roll === "forward" ? 1 : -1;
        while (_isDateExcluded(currentDate, excludeWeekdays, holidayTimestamps)) {
            currentDate.setUTCDate(currentDate.getUTCDate() + rollDir);
        }
    }

    if (n !== 0) {
        const stepDir = n > 0 ? 1 : -1;
        const targetOffset = Math.abs(n);
        let count = 0;

        while (count < targetOffset) {
            currentDate.setUTCDate(currentDate.getUTCDate() + stepDir);
            if (!_isDateExcluded(currentDate, excludeWeekdays, holidayTimestamps)) {
                count++;
            }
        }
    }

    return Math.round((currentDate.getTime() - initialDate.getTime()) / MS_PER_DAY);
}

export function isBusinessDay(
    d: Date,
    options: IsBusinessDayOptions = {}
): boolean | null {
    if (!isValidDateObj(d)) return null;
    const excludeWeekdays = options.excludeWeekdays ?? [0, 6];
    const holidayTimestamps = _resolveHolidaySet(options.holidays, excludeWeekdays);
    const dUTC = createUTCDate(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    return !_isDateExcluded(dUTC, excludeWeekdays, holidayTimestamps);
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

        const janOffset = _getTimeZoneOffsetMinutes(createUTCDate(year, 0, 1), tz);
        const julOffset = _getTimeZoneOffsetMinutes(createUTCDate(year, 6, 1), tz);
        const baseOffset = Math.min(janOffset, julOffset);

        offsetMinutes = type === "daylightSavingTime"
            ? _getTimeZoneOffsetMinutes(d, tz) - baseOffset
            : baseOffset;
    }

    const fmt = options?.format ?? "milliseconds";
    if (fmt === "minutes") return offsetMinutes;
    if (fmt === "hours") return offsetMinutes / 60;
    if (fmt === "milliseconds") return offsetMinutes * MS_PER_MINUTE;

    const sign = offsetMinutes >= 0 ? "+" : "-";
    const absMin = Math.abs(offsetMinutes);
    const hours = _pad2(Math.floor(absMin / 60));
    const mins = _pad2(absMin % 60);
    return fmt === "iso" ? `${sign}${hours}:${mins}` : `${sign}${hours}${mins}`;
}

function _resolveOffset(val: number | undefined, fallback: number, capacity: number, isOneIndexed = false): number {
    const raw = val ?? fallback;
    return raw < 0 ? capacity + (isOneIndexed ? 1 : 0) + raw : raw;
}
export function replaceDateComponents(
    d: Date,
    opts: ReplaceDateOptions = {}
): Date {
    const p = _getDateTimeParts(d, opts?.timeZone ?? undefined);
    const year = opts?.year ?? p.year;
    const month = _resolveOffset(opts?.month, p.month, 12, true) - 1;
    const daysInMonth = createUTCDate(year, month + 1, 0).getUTCDate();
    const day = _resolveOffset(opts?.day, p.day, daysInMonth, true);
    const hour = _resolveOffset(opts?.hour, p.hour, 24);
    const minute = _resolveOffset(opts?.minute, p.minute, 60);
    const second = _resolveOffset(opts?.second, p.second, 60);
    const ms = _resolveOffset(opts?.ms, p.ms, 1000);

    return createUTCDate(year, month, day, hour, minute, second, ms);
}
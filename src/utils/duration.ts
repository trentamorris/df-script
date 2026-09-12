/** @internalfile */
import { isValidNumber, toValidNumber } from "./number";
import { stripChars, findRegex } from "./string";
import { unboxPrimitiveObj } from "./object";
import { createUTCDate, toValidDate } from "./date";
import {
    MS_PER_NANOSECOND,
    MS_PER_MICROSECOND,
    MS_PER_MILLISECOND,
    MS_PER_SECOND,
    MS_PER_MINUTE,
    MS_PER_HOUR,
    MS_PER_DAY,
    MS_PER_WEEK,
    US_PER_MS,
    NS_PER_MS
} from "../constants";
import type { DurationInterval, ParseDurationStringOptions, ToDurationOptions } from "../types";

const _CALENDAR_DURATION_UNITS: Readonly<Record<string, { kind: "month" | "day"; factor: number }>> = Object.freeze({
    M: { kind: "month", factor: 1 },
    mo: { kind: "month", factor: 1 },
    month: { kind: "month", factor: 1 },
    months: { kind: "month", factor: 1 },
    q: { kind: "month", factor: 3 },
    quarter: { kind: "month", factor: 3 },
    quarters: { kind: "month", factor: 3 },
    y: { kind: "month", factor: 12 },
    yr: { kind: "month", factor: 12 },
    year: { kind: "month", factor: 12 },
    years: { kind: "month", factor: 12 },
    d: { kind: "day", factor: 1 },
    day: { kind: "day", factor: 1 },
    days: { kind: "day", factor: 1 },
    w: { kind: "day", factor: 7 },
    week: { kind: "day", factor: 7 },
    weeks: { kind: "day", factor: 7 }
});

export const FIXED_DURATION_UNITS: Readonly<Record<string, number>> = Object.freeze({
    ns: MS_PER_NANOSECOND,
    nanosecond: MS_PER_NANOSECOND,
    nanoseconds: MS_PER_NANOSECOND,
    us: MS_PER_MICROSECOND,
    "µs": MS_PER_MICROSECOND, // U+00B5 (Micro sign)
    "μs": MS_PER_MICROSECOND, // U+03BC (Greek small letter mu)
    microsecond: MS_PER_MICROSECOND,
    microseconds: MS_PER_MICROSECOND,
    ms: MS_PER_MILLISECOND,
    millisecond: MS_PER_MILLISECOND,
    milliseconds: MS_PER_MILLISECOND,
    s: MS_PER_SECOND,
    sec: MS_PER_SECOND,
    second: MS_PER_SECOND,
    seconds: MS_PER_SECOND,
    m: MS_PER_MINUTE,
    min: MS_PER_MINUTE,
    minute: MS_PER_MINUTE,
    minutes: MS_PER_MINUTE,
    h: MS_PER_HOUR,
    hr: MS_PER_HOUR,
    hour: MS_PER_HOUR,
    hours: MS_PER_HOUR,
    d: MS_PER_DAY,
    day: MS_PER_DAY,
    days: MS_PER_DAY,
    w: MS_PER_WEEK,
    week: MS_PER_WEEK,
    weeks: MS_PER_WEEK,
    i: 1
});

const DURATION_SEGMENT_REGEX = /(?:^|\s*,\s*|\s+)((?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?)\s*([a-zA-Zµμ]+)?/gy;
const INVALID_SYNTAX_REGEX = /^,|,[\s]*,|,$|(?<![eE])[+-]|[a-zA-Zµμ]\./;

export function scaleDurationMs(ms: number, timeUnit: "ms" | "us" | "ns" | string): number {
    if (!isValidNumber(ms)) return NaN;
    const u = (timeUnit ?? "").toLowerCase();
    if (u === "us" || u === "µs" || u === "μs") return (ms * US_PER_MS) || 0;
    if (u === "ns") return (ms * NS_PER_MS) || 0;
    if (u === "ms") return ms || 0;
    return NaN;
}

export function parseDurationInterval(str: string): DurationInterval {
    const trimmed = stripChars(str);
    if (!trimmed) throw new Error(`Invalid duration string: "${str}"`);

    const hasSign = trimmed.startsWith("-") || trimmed.startsWith("+");
    const sign = trimmed.startsWith("-") ? -1 : 1;
    const body = hasSign ? stripChars(trimmed.slice(1)) ?? "" : trimmed;
    if (!body || findRegex(body, INVALID_SYNTAX_REGEX) !== null) {
        throw new Error(`Cannot parse duration string: "${str}"`);
    }

    DURATION_SEGMENT_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    let months = 0;
    let days = 0;
    let totalMs = 0;
    let indexUnits = 0;
    let hasCalendar = false;
    let hasIndex = false;
    let hasTemporal = false;
    let matchCount = 0;
    let hasUnitless = false;
    let lastIndex = 0;

    while ((match = DURATION_SEGMENT_REGEX.exec(body)) !== null) {
        matchCount++;
        const numStr = match[1];
        const unitRaw = match[2];
        if (!unitRaw) hasUnitless = true;

        const val = parseFloat(numStr) * sign;
        const normUnit = unitRaw !== undefined ? unitRaw : "ms";
        const lowerUnit = normUnit.toLowerCase();

        lastIndex = DURATION_SEGMENT_REGEX.lastIndex;

        if (normUnit === "i") {
            hasIndex = true;
            indexUnits += val;
            continue;
        }

        const cal = _CALENDAR_DURATION_UNITS[normUnit] ?? _CALENDAR_DURATION_UNITS[lowerUnit];
        if (cal) {
            hasCalendar = true;
            hasTemporal = true;
            if (cal.kind === "month") months += val * cal.factor;
            else days += val * cal.factor;
            continue;
        }

        const factor = FIXED_DURATION_UNITS[normUnit] ?? FIXED_DURATION_UNITS[lowerUnit];
        if (factor === undefined) throw new Error(`Unknown duration unit: "${unitRaw}" in "${str}"`);
        hasTemporal = true;
        totalMs += val * factor;
    }

    if (matchCount === 0 || lastIndex !== body.length || (hasUnitless && matchCount > 1)) {
        throw new Error(`Cannot parse duration string: "${str}"`);
    }

    if (hasIndex && hasTemporal) {
        throw new Error(`Cannot combine index unit 'i' with temporal duration units in "${str}"`);
    }

    return {
        months,
        days,
        ms: totalMs,
        indexUnits,
        isCalendar: hasCalendar,
        isIndex: hasIndex
    };
}

export function addCalendarDuration(d: unknown, interval: DurationInterval | string, step = 1): Date {
    const valid = toValidDate(d);
    if (!valid) throw new Error(`Invalid date provided to addCalendarDuration: ${d}`);

    const parsed: DurationInterval = typeof interval === "string" ? parseDurationInterval(interval) : interval;
    const res = new Date(valid.getTime());
    const totalMonths = parsed.months * step;
    if (totalMonths !== 0) {
        const currentYear = res.getUTCFullYear();
        const currentMonth = res.getUTCMonth();
        const currentDay = res.getUTCDate();
        const targetTotalMonths = currentYear * 12 + currentMonth + totalMonths;
        const targetYear = Math.floor(targetTotalMonths / 12);
        const targetMonth = ((targetTotalMonths % 12) + 12) % 12;
        const maxDays = createUTCDate(targetYear, targetMonth + 1, 0).getUTCDate();
        res.setUTCFullYear(targetYear, targetMonth, Math.min(currentDay, maxDays));
    }
    const totalDays = parsed.days * step;
    if (totalDays !== 0) {
        res.setUTCDate(res.getUTCDate() + totalDays);
    }
    const totalMs = parsed.ms * step;
    if (totalMs !== 0) {
        res.setTime(res.getTime() + totalMs);
    }
    return res;
}

export function parseDurationString(str: string, options: ParseDurationStringOptions = {}): number {
    const toUnit = options.to ?? "ms";
    const toFactor = FIXED_DURATION_UNITS[toUnit] ?? FIXED_DURATION_UNITS[toUnit.toLowerCase()];
    if (toFactor === undefined) {
        throw new Error(`Unknown target duration unit: "${toUnit}"`);
    }

    const interval = parseDurationInterval(str);
    if (interval.isCalendar && interval.months !== 0) {
        throw new Error(`Cannot convert calendar duration without anchor date: "${str}"`);
    }

    const total = interval.isIndex ? interval.indexUnits : (interval.ms + (interval.days * MS_PER_DAY));
    const out = total / toFactor;
    return Object.is(out, -0) ? 0 : out;
}

export function toDuration(v?: unknown, options: ToDurationOptions = {}): number {
    const { to = "ms", fallback } = options;
    if (v == null) return fallback !== undefined ? fallback : NaN;
    const val = unboxPrimitiveObj(v);
    if (typeof val === "boolean") return NaN;

    if (typeof val === "string") {
        try {
            const parsed = parseDurationString(val, { to });
            return isValidNumber(parsed) ? parsed : NaN;
        } catch {
            return NaN;
        }
    }

    const num = toValidNumber(val);
    if (num === null) return NaN;

    const toFactor = FIXED_DURATION_UNITS[to] ?? FIXED_DURATION_UNITS[to.toLowerCase()];
    if (toFactor === undefined) throw new Error(`Unknown target duration unit: "${to}"`);

    const converted = num / toFactor;
    return Object.is(converted, -0) ? 0 : converted;
}
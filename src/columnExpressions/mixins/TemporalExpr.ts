import type { TimeUnit, StrftimeOptions, BusinessDayOffsetOptions, UtcOffsetOptions } from "../../types";
import { ExprBase, derive } from "../ExprBase";
import { kleeneUnary, kleeneBinary } from "../utils";
import {
    toValidDate,
    toEpoch,
    strftime,
    getISOWeek,
    getOrdinalDay,
    getQuarter,
    isLeapYear,
    getMonthOffset,
    getCentury,
    getMillennium,
    offsetDay,
    getTimeZoneOffset
} from "../../utils";
import {
    MS_PER_SECOND,
    MS_PER_MINUTE,
    MS_PER_HOUR,
    MS_PER_DAY,
    US_PER_MS,
    NS_PER_MS
} from "../../constants";

export class DateTimeExprNamespace {
    constructor(public expr: any) { }

    _deriveDate(fn: (d: Date) => any) {
        return derive(this.expr, kleeneUnary((v) => {
            const d = toValidDate(v);
            return d ? fn(d) : null;
        }));
    }

    _deriveDuration(fn: (v: number) => number) {
        return derive(this.expr, kleeneUnary((v) => {
            return typeof v === "number" ? fn(v) : null;
        }));
    }

    century() {
        return this._deriveDate(getCentury);
    }

    date() {
        return this._deriveDate((d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())));
    }

    day() {
        return this._deriveDate((d) => d.getUTCDate());
    }

    days_in_month() {
        return this._deriveDate((d) => {
            const end = getMonthOffset(d, 1, 0);
            return end ? end.getUTCDate() : null;
        });
    }

    epoch(unit: TimeUnit = "ms") {
        return this._deriveDate((d) => toEpoch(d, unit));
    }

    hour() {
        return this._deriveDate((d) => d.getUTCHours());
    }

    is_leap_year() {
        return this._deriveDate(isLeapYear);
    }

    microsecond() {
        return this._deriveDate((d) => d.getUTCMilliseconds() * US_PER_MS);
    }

    millennium() {
        return this._deriveDate(getMillennium);
    }

    millisecond() {
        return this._deriveDate((d) => d.getUTCMilliseconds());
    }

    minute() {
        return this._deriveDate((d) => d.getUTCMinutes());
    }

    month() {
        return this._deriveDate((d) => d.getUTCMonth() + 1);
    }

    month_end() {
        return this._deriveDate((d) => getMonthOffset(d, 1, 0));
    }

    month_start() {
        return this._deriveDate((d) => getMonthOffset(d, 0, 1));
    }

    nanosecond() {
        return this._deriveDate((d) => d.getUTCMilliseconds() * NS_PER_MS);
    }

    offset_day(n: number | any, options: BusinessDayOffsetOptions = {}) {
        return derive(this.expr, kleeneBinary(this.expr, n, (v, nVal) => {
            const d = toValidDate(v);
            return d ? offsetDay(d, nVal, options) : null;
        }));
    }

    offset_business_day(n: number | any, { excludeWeekdays = [0, 6], ...options }: BusinessDayOffsetOptions = {}) {
        const fullOptions = { excludeWeekdays, ...options };
        return derive(this.expr, kleeneBinary(this.expr, n, (v, nVal) => {
            const d = toValidDate(v);
            return d ? offsetDay(d, nVal, fullOptions) : null;
        }));
    }

    ordinal_day() {
        return this._deriveDate(getOrdinalDay);
    }

    quarter() {
        return this._deriveDate(getQuarter);
    }

    second() {
        return this._deriveDate((d) => d.getUTCSeconds());
    }

    strftime(options: StrftimeOptions) {
        return this._deriveDate((d) => strftime(d, options));
    }

    time() {
        return this._deriveDate((d) => d.toISOString().split("T")[1].slice(0, 12));
    }

    timestamp(unit: TimeUnit = "ms") {
        return this.epoch(unit);
    }

    to_string(options: StrftimeOptions) {
        return this.strftime(options);
    }

    total_days() {
        return this._deriveDuration((v) => v / MS_PER_DAY);
    }

    total_hours() {
        return this._deriveDuration((v) => v / MS_PER_HOUR);
    }

    total_microseconds() {
        return this._deriveDuration((v) => v * US_PER_MS);
    }

    total_milliseconds() {
        return this._deriveDuration((v) => v);
    }

    total_minutes() {
        return this._deriveDuration((v) => v / MS_PER_MINUTE);
    }

    total_nanoseconds() {
        return this._deriveDuration((v) => v * NS_PER_MS);
    }

    total_seconds() {
        return this._deriveDuration((v) => v / MS_PER_SECOND);
    }

    week() {
        return this._deriveDate(getISOWeek);
    }

    weekday() {
        return this._deriveDate((d) => d.getUTCDay() || 7);
    }

    utc_offset(timeZone?: string, options: UtcOffsetOptions = {}) {
        return derive(this.expr, kleeneUnary((v) => {
            const d = toValidDate(v);
            return d ? getTimeZoneOffset(d, timeZone, options) : null;
        }));
    }

    year() {
        return this._deriveDate((d) => d.getUTCFullYear());
    }
}

export class TemporalExpr extends ExprBase {
    get dt() {
        return new DateTimeExprNamespace(this);
    }
}

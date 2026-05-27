import type { ExprConstructor, TimeUnit } from "../../types";
import { kleene, derive } from "../ExprBase";
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
    MS_PER_SECOND,
    MS_PER_MINUTE,
    MS_PER_HOUR,
    MS_PER_DAY,
    US_PER_MS,
    NS_PER_MS
} from "../../utils";

export class DateTimeExprNamespace {
    constructor(public expr: any) {}

    _deriveDate(fn: (d: Date) => any) {
        return derive(this.expr, (vArray) => {
            const height = vArray.length;
            const result = new Array(height);
            for (let i = 0; i < height; i++) {
                const v = vArray[i];
                const d = toValidDate(v);
                result[i] = d ? fn(d) : null;
            }
            return result;
        });
    }

    _deriveDuration(fn: (v: number) => number) {
        return derive(this.expr, (vArray) => {
            const height = vArray.length;
            const result = new Array(height);
            for (let i = 0; i < height; i++) {
                const v = vArray[i];
                result[i] = typeof v === "number" ? fn(v) : null;
            }
            return result;
        });
    }

    century() {
        return this._deriveDate(getCentury);
    }

    date() {
        return this._deriveDate((d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())));
    }

    datetime() {
        return this._deriveDate((d) => d);
    }

    day() {
        return this._deriveDate((d) => d.getUTCDate());
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

    ordinal_day() {
        return this._deriveDate(getOrdinalDay);
    }

    quarter() {
        return this._deriveDate(getQuarter);
    }

    second() {
        return this._deriveDate((d) => d.getUTCSeconds());
    }

    strftime(format: string, locale?: string) {
        return this._deriveDate((d) => strftime(d, format, locale));
    }

    time() {
        return this._deriveDate((d) => d.toISOString().split("T")[1].slice(0, 12));
    }

    timestamp(unit: TimeUnit = "ms") {
        return this.epoch(unit);
    }

    to_string(format: string, locale?: string) {
        return this.strftime(format, locale);
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

    year() {
        return this._deriveDate((d) => d.getUTCFullYear());
    }
}

export const TemporalExpr = <TBase extends ExprConstructor>(Base: TBase) => {
    return class extends Base {
        get dt() {
            return new DateTimeExprNamespace(this);
        }
    };
};

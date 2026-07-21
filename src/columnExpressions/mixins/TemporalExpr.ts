import type { TimeUnit, StrftimeOptions, IsBusinessDayOptions, BusinessDayOffsetOptions, UtcOffsetOptions } from "../../types";
import { ExprBase, derive } from "../ExprBase";
import { kleeneUnary, kleeneBinary } from "../utils";
import {
    toValidDate,
    toEpoch,
    strftime,
    getOrdinalDay,
    getQuarter,
    isLeapYear,
    getMonthOffset,
    getCentury,
    getMillennium,
    offsetDay,
    getTimeZoneOffset,
    isBusinessDay,
    getISO
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

    /**
     * Extracts century index of a Datetime value.
     * @since v1.7.0
     */
    century() {
        return this._deriveDate(getCentury);
    }

    /**
     * Extracts Date object component from Datetime.
     * @since v1.6.0
     */
    date() {
        return this._deriveDate((d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())));
    }

    /**
     * Extracts the calendar day component (1-31) from a Datetime column.
     * @since v1.5.0
     */
    day() {
        return this._deriveDate((d) => d.getUTCDate());
    }

    /**
     * Extracts number of days in the month.
     * @since v1.6.0
     */
    days_in_month() {
        return this._deriveDate((d) => {
            const end = getMonthOffset(d, 1, 0);
            return end ? end.getUTCDate() : null;
        });
    }

    /**
     * Returns epoch duration timestamp offset.
     * @since v1.6.0
     */
    epoch(unit: TimeUnit = "ms") {
        return this._deriveDate((d) => toEpoch(d, unit));
    }

    /**
     * Extracts the hour component (0-23) from a Datetime column.
     * @since v1.7.0
     */
    hour() {
        return this._deriveDate((d) => d.getUTCHours());
    }

    /**
     * Boolean check: Returns true if target falls on a business day.
     * @since v1.7.0
     */
    is_business_day(options: IsBusinessDayOptions = {}) {
        return this._deriveDate((d) => isBusinessDay(d, options));
    }

    /**
     * Checks if year is a leap year.
     * @since v1.6.0
     */
    is_leap_year() {
        return this._deriveDate(isLeapYear);
    }

    /**
     * Extracts ISO week index.
     * @since v1.6.0
     */
    iso_week() {
        return this._deriveDate((d) => getISO(d, { field: "week" }));
    }

    /**
     * Extracts ISO calendar year.
     * @since v1.6.0
     */
    iso_year() {
        return this._deriveDate((d) => getISO(d, { field: "year" }));
    }

    /**
     * Extracts microseconds component.
     * @since v1.7.0
     */
    microsecond() {
        return this._deriveDate((d) => d.getUTCMilliseconds() * US_PER_MS);
    }

    /**
     * Extracts millennium component index.
     * @since v1.7.0
     */
    millennium() {
        return this._deriveDate(getMillennium);
    }

    /**
     * Extracts milliseconds component.
     * @since v1.6.0
     */
    millisecond() {
        return this._deriveDate((d) => d.getUTCMilliseconds());
    }

    /**
     * Extracts the minute component (0-59) from a Datetime column.
     * @since v1.7.0
     */
    minute() {
        return this._deriveDate((d) => d.getUTCMinutes());
    }

    /**
     * Extracts the calendar month component (1-12) from a Datetime column.
     * @since v1.5.0
     */
    month() {
        return this._deriveDate((d) => d.getUTCMonth() + 1);
    }

    /**
     * Returns date representing end of the month.
     * @since v1.7.0
     */
    month_end() {
        return this._deriveDate((d) => getMonthOffset(d, 1, 0));
    }

    /**
     * Returns date representing start of the month.
     * @since v1.7.0
     */
    month_start() {
        return this._deriveDate((d) => getMonthOffset(d, 0, 1));
    }

    /**
     * Extracts nanoseconds component.
     * @since v1.7.0
     */
    nanosecond() {
        return this._deriveDate((d) => d.getUTCMilliseconds() * NS_PER_MS);
    }

    /**
     * Offsets date by N business days.
     * @since v1.7.0
     */
    offset_business_day(n: number | any, { excludeWeekdays = [0, 6], ...options }: BusinessDayOffsetOptions = {}) {
        const fullOptions = { excludeWeekdays, ...options };
        return derive(this.expr, kleeneBinary(this.expr, n, (v, nVal) => {
            const d = toValidDate(v);
            return d ? offsetDay(d, nVal, fullOptions) : null;
        }));
    }

    /**
     * Offsets date by N calendar days.
     * @since v1.7.0
     */
    offset_day(n: number | any, options: BusinessDayOffsetOptions = {}) {
        return derive(this.expr, kleeneBinary(this.expr, n, (v, nVal) => {
            const d = toValidDate(v);
            return d ? offsetDay(d, nVal, options) : null;
        }));
    }

    /**
     * Returns day of the year (1-366).
     * @since v1.6.0
     */
    ordinal_day() {
        return this._deriveDate(getOrdinalDay);
    }

    /**
     * Returns quarter of the year (1-4).
     * @since v1.6.0
     */
    quarter() {
        return this._deriveDate(getQuarter);
    }

    /**
     * Extracts seconds component (0-59).
     * @since v1.6.0
     */
    second() {
        return this._deriveDate((d) => d.getUTCSeconds());
    }

    /**
     * Formats dates to custom strings.
     * @since v1.6.0
     */
    strftime(options: StrftimeOptions) {
        return this._deriveDate((d) => strftime(d, options));
    }

    /**
     * Extracts time component index.
     * @since v1.6.0
     */
    time() {
        return this._deriveDate((d) => d.toISOString().split("T")[1].slice(0, 12));
    }

    /**
     * Returns numeric timestamp relative to Epoch.
     * @since v1.6.0
     */
    timestamp(unit: TimeUnit = "ms") {
        return this.epoch(unit);
    }

    /**
     * Formats dates to custom strings.
     * @since v1.6.0
     */
    to_string(options: StrftimeOptions) {
        return this.strftime(options);
    }

    /**
     * Converts Duration to integer day count.
     * @since v1.6.0
     */
    total_days() {
        return this._deriveDuration((v) => v / MS_PER_DAY);
    }

    /**
     * Converts Duration to floating point hours.
     * @since v1.6.0
     */
    total_hours() {
        return this._deriveDuration((v) => v / MS_PER_HOUR);
    }

    /**
     * Converts Duration to microsecond count.
     * @since v1.7.0
     */
    total_microseconds() {
        return this._deriveDuration((v) => v * US_PER_MS);
    }

    /**
     * Converts Duration to millisecond count.
     * @since v1.6.0
     */
    total_milliseconds() {
        return this._deriveDuration((v) => v);
    }

    /**
     * Converts Duration to floating point minutes.
     * @since v1.6.0
     */
    total_minutes() {
        return this._deriveDuration((v) => v / MS_PER_MINUTE);
    }

    /**
     * Converts Duration to nanosecond count.
     * @since v1.7.0
     */
    total_nanoseconds() {
        return this._deriveDuration((v) => v * NS_PER_MS);
    }

    /**
     * Converts Duration to floating point seconds.
     * @since v1.6.0
     */
    total_seconds() {
        return this._deriveDuration((v) => v / MS_PER_SECOND);
    }

    /**
     * Returns the offset of local timezone relative to UTC.
     * @since v1.7.0
     */
    utc_offset(timeZone?: string, options: UtcOffsetOptions = {}) {
        return derive(this.expr, kleeneUnary((v) => {
            const d = toValidDate(v);
            return d ? getTimeZoneOffset(d, timeZone, options) : null;
        }));
    }

    /**
     * Extracts ISO week index.
     * @since v1.6.0
     */
    week() {
        return this.iso_week();
    }

    /**
     * Extracts weekday component (1=Monday, 7=Sunday).
     * @since v1.6.0
     */
    weekday() {
        return this._deriveDate((d) => d.getUTCDay() || 7);
    }

    /**
     * Extracts the year component from a Datetime column.
     * @since v1.5.0
     */
    year() {
        return this._deriveDate((d) => d.getUTCFullYear());
    }
}

export class TemporalExpr extends ExprBase {
    get dt() {
        return new DateTimeExprNamespace(this);
    }
}

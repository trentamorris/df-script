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
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ d: ["2026-05-20"] })
     * >>> df.with_columns($df.col("d").dt.century().alias("century"))
     * shape: (1, 2)
     * ┌────────────┬─────────┐
     * │ d          │ century │
     * ├────────────┼─────────┤
     * │ 2026-05-20 │ 21      │
     * └────────────┴─────────┘
     */
    century() {
        return this._deriveDate(getCentury);
    }

    /**
     * Extracts Date object component from Datetime.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ ts: ["2026-05-20T10:30:00Z"] })
     * >>> df.with_columns($df.col("ts").dt.date().alias("date_only"))
     * shape: (1, 2)
     * ┌──────────────────────┬──────────────────────────┐
     * │ ts                   │ date_only                │
     * ├──────────────────────┼──────────────────────────┤
     * │ 2026-05-20T10:30:00Z │ 2026-05-20T00:00:00.000Z │
     * └──────────────────────┴──────────────────────────┘
     */
    date() {
        return this._deriveDate((d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())));
    }

    /**
     * Extracts the calendar day component (1-31) from a Datetime column.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ d: ["2026-05-20"] })
     * >>> df.with_columns($df.col("d").dt.day().alias("day"))
     * shape: (1, 2)
     * ┌────────────┬─────┐
     * │ d          │ day │
     * ├────────────┼─────┤
     * │ 2026-05-20 │ 20  │
     * └────────────┴─────┘
     */
    day() {
        return this._deriveDate((d) => d.getUTCDate());
    }

    /**
     * Extracts number of days in the month.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ d: ["2024-02-15"] })
     * >>> df.with_columns($df.col("d").dt.days_in_month().alias("dim"))
     * shape: (1, 2)
     * ┌────────────┬─────┐
     * │ d          │ dim │
     * ├────────────┼─────┤
     * │ 2024-02-15 │ 29  │
     * └────────────┴─────┘
     */
    days_in_month() {
        return this._deriveDate((d) => {
            const end = getMonthOffset(d, 1, 0);
            return end ? end.getUTCDate() : null;
        });
    }

    /**
     * Returns epoch duration timestamp offset.
     * @param unit Time resolution unit ("ms", "us", "ns", "s").
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ d: ["2026-01-01T00:00:00Z"] })
     * >>> df.with_columns($df.col("d").dt.epoch("s").alias("epoch_s"))
     * shape: (1, 2)
     * ┌──────────────────────┬────────────┐
     * │ d                    │ epoch_s    │
     * ├──────────────────────┼────────────┤
     * │ 2026-01-01T00:00:00Z │ 1767225600 │
     * └──────────────────────┴────────────┘
     */
    epoch(unit: TimeUnit = "ms") {
        return this._deriveDate((d) => toEpoch(d, unit));
    }

    /**
     * Extracts the hour component (0-23) from a Datetime column.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ ts: ["2026-05-20T14:30:00Z"] })
     * >>> df.with_columns($df.col("ts").dt.hour().alias("hr"))
     * shape: (1, 2)
     * ┌──────────────────────┬────┐
     * │ ts                   │ hr │
     * ├──────────────────────┼────┤
     * │ 2026-05-20T14:30:00Z │ 14 │
     * └──────────────────────┴────┘
     */
    hour() {
        return this._deriveDate((d) => d.getUTCHours());
    }

    /**
     * Boolean check: Returns true if target falls on a business day.
     * @param options Config options including custom weekend or holiday definitions.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ d: ["2026-05-18"] })
     * >>> df.with_columns($df.col("d").dt.is_business_day().alias("is_bday"))
     * shape: (1, 2)
     * ┌────────────┬─────────┐
     * │ d          │ is_bday │
     * ├────────────┼─────────┤
     * │ 2026-05-18 │ true    │
     * └────────────┴─────────┘
     */
    is_business_day(options: IsBusinessDayOptions = {}) {
        return this._deriveDate((d) => isBusinessDay(d, options));
    }

    /**
     * Checks if year is a leap year.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ d: ["2024-01-01", "2026-01-01"] })
     * >>> df.with_columns($df.col("d").dt.is_leap_year().alias("leap"))
     * shape: (2, 2)
     * ┌────────────┬───────┐
     * │ d          │ leap  │
     * ├────────────┼───────┤
     * │ 2024-01-01 │ true  │
     * │ 2026-01-01 │ false │
     * └────────────┴───────┘
     */
    is_leap_year() {
        return this._deriveDate(isLeapYear);
    }

    /**
     * Extracts ISO week index.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ d: ["2026-05-20"] })
     * >>> df.with_columns($df.col("d").dt.iso_week().alias("week"))
     * shape: (1, 2)
     * ┌────────────┬──────┐
     * │ d          │ week │
     * ├────────────┼──────┤
     * │ 2026-05-20 │ 21   │
     * └────────────┴──────┘
     */
    iso_week() {
        return this._deriveDate((d) => getISO(d, { field: "week" }));
    }

    /**
     * Extracts ISO calendar year.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ d: ["2026-05-20"] })
     * >>> df.with_columns($df.col("d").dt.iso_year().alias("iso_yr"))
     * shape: (1, 2)
     * ┌────────────┬────────┐
     * │ d          │ iso_yr │
     * ├────────────┼────────┤
     * │ 2026-05-20 │ 2026   │
     * └────────────┴────────┘
     */
    iso_year() {
        return this._deriveDate((d) => getISO(d, { field: "year" }));
    }

    /**
     * Extracts microseconds component.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ ts: ["2026-05-20T10:00:00.123Z"] })
     * >>> df.with_columns($df.col("ts").dt.microsecond().alias("us"))
     * shape: (1, 2)
     * ┌──────────────────────────┬────────┐
     * │ ts                       │ us     │
     * ├──────────────────────────┼────────┤
     * │ 2026-05-20T10:00:00.123Z │ 123000 │
     * └──────────────────────────┴────────┘
     */
    microsecond() {
        return this._deriveDate((d) => d.getUTCMilliseconds() * US_PER_MS);
    }

    /**
     * Extracts millennium component index.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ d: ["2026-05-20"] })
     * >>> df.with_columns($df.col("d").dt.millennium().alias("mil"))
     * shape: (1, 2)
     * ┌────────────┬─────┐
     * │ d          │ mil │
     * ├────────────┼─────┤
     * │ 2026-05-20 │ 3   │
     * └────────────┴─────┘
     */
    millennium() {
        return this._deriveDate(getMillennium);
    }

    /**
     * Extracts milliseconds component.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ ts: ["2026-05-20T10:00:00.456Z"] })
     * >>> df.with_columns($df.col("ts").dt.millisecond().alias("ms"))
     * shape: (1, 2)
     * ┌──────────────────────────┬─────┐
     * │ ts                       │ ms  │
     * ├──────────────────────────┼─────┤
     * │ 2026-05-20T10:00:00.456Z │ 456 │
     * └──────────────────────────┴─────┘
     */
    millisecond() {
        return this._deriveDate((d) => d.getUTCMilliseconds());
    }

    /**
     * Extracts the minute component (0-59) from a Datetime column.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ ts: ["2026-05-20T10:45:00Z"] })
     * >>> df.with_columns($df.col("ts").dt.minute().alias("min"))
     * shape: (1, 2)
     * ┌──────────────────────┬─────┐
     * │ ts                   │ min │
     * ├──────────────────────┼─────┤
     * │ 2026-05-20T10:45:00Z │ 45  │
     * └──────────────────────┴─────┘
     */
    minute() {
        return this._deriveDate((d) => d.getUTCMinutes());
    }

    /**
     * Extracts the calendar month component (1-12) from a Datetime column.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ d: ["2026-05-20"] })
     * >>> df.with_columns($df.col("d").dt.month().alias("m"))
     * shape: (1, 2)
     * ┌────────────┬───┐
     * │ d          │ m │
     * ├────────────┼───┤
     * │ 2026-05-20 │ 5 │
     * └────────────┴───┘
     */
    month() {
        return this._deriveDate((d) => d.getUTCMonth() + 1);
    }

    /**
     * Returns date representing end of the month.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ d: ["2026-05-20"] })
     * >>> df.with_columns($df.col("d").dt.month_end().alias("m_end"))
     * shape: (1, 2)
     * ┌────────────┬──────────────────────────┐
     * │ d          │ m_end                    │
     * ├────────────┼──────────────────────────┤
     * │ 2026-05-20 │ 2026-05-31T00:00:00.000Z │
     * └────────────┴──────────────────────────┘
     */
    month_end() {
        return this._deriveDate((d) => getMonthOffset(d, 1, 0));
    }

    /**
     * Returns date representing start of the month.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ d: ["2026-05-20"] })
     * >>> df.with_columns($df.col("d").dt.month_start().alias("m_start"))
     * shape: (1, 2)
     * ┌────────────┬──────────────────────────┐
     * │ d          │ m_start                  │
     * ├────────────┼──────────────────────────┤
     * │ 2026-05-20 │ 2026-05-01T00:00:00.000Z │
     * └────────────┴──────────────────────────┘
     */
    month_start() {
        return this._deriveDate((d) => getMonthOffset(d, 0, 1));
    }

    /**
     * Extracts nanoseconds component.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ ts: ["2026-05-20T10:00:00.001Z"] })
     * >>> df.with_columns($df.col("ts").dt.nanosecond().alias("ns"))
     * shape: (1, 2)
     * ┌──────────────────────────┬─────────┐
     * │ ts                       │ ns      │
     * ├──────────────────────────┼─────────┤
     * │ 2026-05-20T10:00:00.001Z │ 1000000 │
     * └──────────────────────────┴─────────┘
     */
    nanosecond() {
        return this._deriveDate((d) => d.getUTCMilliseconds() * NS_PER_MS);
    }

    /**
     * Offsets date by N business days.
     * @param n Number of business days to offset.
     * @param options Business day rules and holidays options.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ d: ["2026-05-15"] })
     * >>> df.with_columns($df.col("d").dt.offset_business_day(2).alias("next_bday"))
     * shape: (1, 2)
     * ┌────────────┬──────────────────────────┐
     * │ d          │ next_bday                │
     * ├────────────┼──────────────────────────┤
     * │ 2026-05-15 │ 2026-05-19T00:00:00.000Z │
     * └────────────┴──────────────────────────┘
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
     * @param n Number of calendar days to offset.
     * @param options Offset options.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ d: ["2026-05-20"] })
     * >>> df.with_columns($df.col("d").dt.offset_day(5).alias("later"))
     * shape: (1, 2)
     * ┌────────────┬──────────────────────────┐
     * │ d          │ later                    │
     * ├────────────┼──────────────────────────┤
     * │ 2026-05-20 │ 2026-05-25T00:00:00.000Z │
     * └────────────┴──────────────────────────┘
     */
    offset_day(n: number | any, options: BusinessDayOffsetOptions = {}) {
        return derive(this.expr, kleeneBinary(this.expr, n, (v, nVal) => {
            const d = toValidDate(v);
            return d ? offsetDay(d, nVal, options) : null;
        }));
    }

    /**
     * Returns day of the year (1-366).
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ d: ["2026-02-01"] })
     * >>> df.with_columns($df.col("d").dt.ordinal_day().alias("doy"))
     * shape: (1, 2)
     * ┌────────────┬─────┐
     * │ d          │ doy │
     * ├────────────┼─────┤
     * │ 2026-02-01 │ 32  │
     * └────────────┴─────┘
     */
    ordinal_day() {
        return this._deriveDate(getOrdinalDay);
    }

    /**
     * Returns quarter of the year (1-4).
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ d: ["2026-05-20"] })
     * >>> df.with_columns($df.col("d").dt.quarter().alias("qtr"))
     * shape: (1, 2)
     * ┌────────────┬─────┐
     * │ d          │ qtr │
     * ├────────────┼─────┤
     * │ 2026-05-20 │ 2   │
     * └────────────┴─────┘
     */
    quarter() {
        return this._deriveDate(getQuarter);
    }

    /**
     * Extracts seconds component (0-59).
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ ts: ["2026-05-20T10:00:45Z"] })
     * >>> df.with_columns($df.col("ts").dt.second().alias("sec"))
     * shape: (1, 2)
     * ┌──────────────────────┬─────┐
     * │ ts                   │ sec │
     * ├──────────────────────┼─────┤
     * │ 2026-05-20T10:00:45Z │ 45  │
     * └──────────────────────┴─────┘
     */
    second() {
        return this._deriveDate((d) => d.getUTCSeconds());
    }

    /**
     * Formats dates to custom strings using strftime format tokens.
     * @param options Formatting pattern configuration.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ d: ["2026-05-20"] })
     * >>> df.with_columns($df.col("d").dt.strftime("%Y/%m/%d").alias("formatted"))
     * shape: (1, 2)
     * ┌────────────┬────────────┐
     * │ d          │ formatted  │
     * ├────────────┼────────────┤
     * │ 2026-05-20 │ 2026/05/20 │
     * └────────────┴────────────┘
     */
    strftime(options: StrftimeOptions) {
        return this._deriveDate((d) => strftime(d, options));
    }

    /**
     * Extracts time component string ("HH:MM:SS.mmm").
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ ts: ["2026-05-20T10:30:00Z"] })
     * >>> df.with_columns($df.col("ts").dt.time().alias("time"))
     * shape: (1, 2)
     * ┌──────────────────────┬──────────────┐
     * │ ts                   │ time         │
     * ├──────────────────────┼──────────────┤
     * │ 2026-05-20T10:30:00Z │ 10:30:00.000 │
     * └──────────────────────┴──────────────┘
     */
    time() {
        return this._deriveDate((d) => d.toISOString().split("T")[1].slice(0, 12));
    }

    /**
     * Returns numeric timestamp relative to Epoch. Alias for epoch.
     * @param unit Time unit resolution.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ d: ["2026-01-01T00:00:00Z"] })
     * >>> df.with_columns($df.col("d").dt.timestamp("s").alias("ts"))
     * shape: (1, 2)
     * ┌──────────────────────┬────────────┐
     * │ d                    │ ts         │
     * ├──────────────────────┼────────────┤
     * │ 2026-01-01T00:00:00Z │ 1767225600 │
     * └──────────────────────┴────────────┘
     */
    timestamp(unit: TimeUnit = "ms") {
        return this.epoch(unit);
    }

    /**
     * Formats dates to custom strings. Alias for strftime.
     * @param options Formatting configuration.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ d: ["2026-05-20"] })
     * >>> df.with_columns($df.col("d").dt.to_string("%Y-%m-%d").alias("str"))
     * shape: (1, 2)
     * ┌────────────┬────────────┐
     * │ d          │ str        │
     * ├────────────┼────────────┤
     * │ 2026-05-20 │ 2026-05-20 │
     * └────────────┴────────────┘
     */
    to_string(options: StrftimeOptions) {
        return this.strftime(options);
    }

    /**
     * Converts Duration to integer day count.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ dur: [86400000] })
     * >>> df.with_columns($df.col("dur").dt.total_days().alias("days"))
     * shape: (1, 2)
     * ┌──────────┬──────┐
     * │ dur      │ days │
     * ├──────────┼──────┤
     * │ 86400000 │ 1    │
     * └──────────┴──────┘
     */
    total_days() {
        return this._deriveDuration((v) => v / MS_PER_DAY);
    }

    /**
     * Converts Duration to floating point hours.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ dur: [3600000] })
     * >>> df.with_columns($df.col("dur").dt.total_hours().alias("hrs"))
     * shape: (1, 2)
     * ┌─────────┬─────┐
     * │ dur     │ hrs │
     * ├─────────┼─────┤
     * │ 3600000 │ 1   │
     * └─────────┴─────┘
     */
    total_hours() {
        return this._deriveDuration((v) => v / MS_PER_HOUR);
    }

    /**
     * Converts Duration to microsecond count.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ dur: [10] })
     * >>> df.with_columns($df.col("dur").dt.total_microseconds().alias("us"))
     * shape: (1, 2)
     * ┌─────┬───────┐
     * │ dur │ us    │
     * ├─────┼───────┤
     * │ 10  │ 10000 │
     * └─────┴───────┘
     */
    total_microseconds() {
        return this._deriveDuration((v) => v * US_PER_MS);
    }

    /**
     * Converts Duration to millisecond count.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ dur: [500] })
     * >>> df.with_columns($df.col("dur").dt.total_milliseconds().alias("ms"))
     * shape: (1, 2)
     * ┌─────┬─────┐
     * │ dur │ ms  │
     * ├─────┼─────┤
     * │ 500 │ 500 │
     * └─────┴─────┘
     */
    total_milliseconds() {
        return this._deriveDuration((v) => v);
    }

    /**
     * Converts Duration to floating point minutes.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ dur: [60000] })
     * >>> df.with_columns($df.col("dur").dt.total_minutes().alias("mins"))
     * shape: (1, 2)
     * ┌───────┬──────┐
     * │ dur   │ mins │
     * ├───────┼──────┤
     * │ 60000 │ 1    │
     * └───────┴──────┘
     */
    total_minutes() {
        return this._deriveDuration((v) => v / MS_PER_MINUTE);
    }

    /**
     * Converts Duration to nanosecond count.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ dur: [1] })
     * >>> df.with_columns($df.col("dur").dt.total_nanoseconds().alias("ns"))
     * shape: (1, 2)
     * ┌─────┬─────────┐
     * │ dur │ ns      │
     * ├─────┼─────────┤
     * │ 1   │ 1000000 │
     * └─────┴─────────┘
     */
    total_nanoseconds() {
        return this._deriveDuration((v) => v * NS_PER_MS);
    }

    /**
     * Converts Duration to floating point seconds.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ dur: [1000] })
     * >>> df.with_columns($df.col("dur").dt.total_seconds().alias("secs"))
     * shape: (1, 2)
     * ┌──────┬──────┐
     * │ dur  │ secs │
     * ├──────┼──────┤
     * │ 1000 │ 1    │
     * └──────┴──────┘
     */
    total_seconds() {
        return this._deriveDuration((v) => v / MS_PER_SECOND);
    }

    /**
     * Returns the offset of local timezone relative to UTC in minutes.
     * @param timeZone Target timezone string identifier.
     * @param options Utc offset calculation options.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ d: ["2026-05-20"] })
     * >>> df.with_columns($df.col("d").dt.utc_offset("UTC").alias("offset"))
     * shape: (1, 2)
     * ┌────────────┬────────┐
     * │ d          │ offset │
     * ├────────────┼────────┤
     * │ 2026-05-20 │ 0      │
     * └────────────┴────────┘
     */
    utc_offset(timeZone?: string, options: UtcOffsetOptions = {}) {
        return derive(this.expr, kleeneUnary((v) => {
            const d = toValidDate(v);
            return d ? getTimeZoneOffset(d, timeZone, options) : null;
        }));
    }

    /**
     * Extracts ISO week index. Alias for iso_week.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ d: ["2026-05-20"] })
     * >>> df.with_columns($df.col("d").dt.week().alias("week"))
     * shape: (1, 2)
     * ┌────────────┬──────┐
     * │ d          │ week │
     * ├────────────┼──────┤
     * │ 2026-05-20 │ 21   │
     * └────────────┴──────┘
     */
    week() {
        return this.iso_week();
    }

    /**
     * Extracts weekday component (1=Monday, 7=Sunday).
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ d: ["2026-05-18"] })
     * >>> df.with_columns($df.col("d").dt.weekday().alias("wd"))
     * shape: (1, 2)
     * ┌────────────┬────┐
     * │ d          │ wd │
     * ├────────────┼────┤
     * │ 2026-05-18 │ 1  │
     * └────────────┴────┘
     */
    weekday() {
        return this._deriveDate((d) => d.getUTCDay() || 7);
    }

    /**
     * Extracts the year component from a Datetime column.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ d: ["2026-05-20"] })
     * >>> df.with_columns($df.col("d").dt.year().alias("yr"))
     * shape: (1, 2)
     * ┌────────────┬──────┐
     * │ d          │ yr   │
     * ├────────────┼──────┤
     * │ 2026-05-20 │ 2026 │
     * └────────────┴──────┘
     */
    year() {
        return this._deriveDate((d) => d.getUTCFullYear());
    }
}

export class TemporalExpr extends ExprBase {
    /**
     * Datetime namespace accessor for date, time, and duration operations.
     * @returns DateTimeExprNamespace
     * @example
     * >>> df.select($df.col("date").dt.year())
     */
    get dt() {
        return new DateTimeExprNamespace(this);
    }
}

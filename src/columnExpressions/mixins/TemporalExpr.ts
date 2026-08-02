import type { TimeUnit, DatetimeTimeUnit, StrftimeOptions, IsBusinessDayOptions, DayOffsetOptions, UtcOffsetOptions, ReplaceDateOptions } from "../../types";
import { DatetimeType } from "../../datatypes/types";
import { InvalidArgumentError } from "../../exceptions";
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
    getISO,
    replaceDateComponents,
    _createUTCDate,
    _getDateTimeParts,
    _getTimeZoneOffsetMinutes
} from "../../utils";
import {
    MS_PER_SECOND,
    MS_PER_MINUTE,
    MS_PER_HOUR,
    MS_PER_DAY,
    US_PER_MS,
    NS_PER_MS
} from "../../constants";

/**
 * @namespace $df.col.dt
 * @category ColumnExpression
 * @syntax $df.col(<column_name>).dt.{symbol}(...)
 *
 * **Implementation Notes**
 *
 * _TimeUnit_: `Date` objects are always millisecond-based, so `timeUnit` is schema
 * metadata only. Sub-millisecond precision (`us`, `ns`) cannot be stored; methods such
 * as `microsecond()` and `nanosecond()` always scale from milliseconds. Migrating to
 * raw `BigInt` arrays would be required for true sub-ms storage.
 *
 * _Timezone enforcement_: `convert_time_zone` can only validate that the column is
 * timezone-aware when `_castType` is explicitly set within the expression chain
 * (e.g. after `cast_time_unit`). Enforcement against a column whose type is unknown
 * at expression-build time requires schema-level checks in DataFrame operations.
 */
export class DateTimeExprNamespace {
    constructor(public expr: any) { }

    /** Returns the column's schema timezone from a prior convert_time_zone call, or null. */
    _colTz(): string | null {
        const ct = this.expr._castType;
        return (ct instanceof DatetimeType) ? ct.timeZone : null;
    }

    /** Returns the column's schema time unit from a prior cast_time_unit call, or null. */
    _colTu(): DatetimeTimeUnit | null {
        const ct = this.expr._castType;
        return (ct instanceof DatetimeType) ? ct.timeUnit : null;
    }

    _deriveDate(fn: (d: Date) => any) {
        return derive(this.expr, kleeneUnary((v) => {
            const d = toValidDate(v);
            return d ? fn(d) : null;
        }));
    }


    /**
     * Casts the schema time unit of a Datetime column (`"ms"`, `"us"`, `"ns"`).
     * This is a metadata-only operation — underlying millisecond Date timestamps are preserved.
     * @param unit Target time unit: `"ms"` (milliseconds), `"us"` (microseconds), or `"ns"` (nanoseconds).
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ ts: ["2026-05-20T10:00:00.123Z"] })
     * >>> df.with_columns($df.col("ts").dt.cast_time_unit("us").alias("ts_us"))
     * shape: (1, 2)
     * ┌──────────────────────────┬──────────────────────────┐
     * │ ts                       │ ts_us                    │
     * ├──────────────────────────┼──────────────────────────┤
     * │ 2026-05-20T10:00:00.123Z │ 2026-05-20T10:00:00.123Z │
     * └──────────────────────────┴──────────────────────────┘
     */
    cast_time_unit(unit: DatetimeTimeUnit) {
        return this.expr.cast(new DatetimeType(unit, this._colTz()));
    }

    /**
     * Extracts the 1-indexed century component (e.g. 21 for 2026) from a Datetime column.
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
     * Converts a Datetime column to a different IANA timezone.
     * Preserves the exact UTC epoch instant while changing the timezone label, affecting
     * how local wall-clock component extractors (`hour()`, `day()`, etc.) and `strftime` interpret values.
     * Requires the column to already be timezone-aware; use `replace({ timeZone })`
     * to assign a timezone to a naive column first.
     * @param timeZone Target IANA timezone identifier (e.g. `"UTC"`, `"America/New_York"`, `"Europe/London"`).
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ ts: ["2026-06-01T00:00:00.000Z"] })
     * >>> df.with_columns($df.col("ts").dt.convert_time_zone("America/New_York").alias("ts_ny"))
     * shape: (1, 2)
     * ┌──────────────────────────┬───────────────────────────────┐
     * │ ts                       │ ts_ny                         │
     * ├──────────────────────────┼───────────────────────────────┤
     * │ 2026-06-01T00:00:00.000Z │ 2026-05-31 20:00:00.000 EDT   │
     * └──────────────────────────┴───────────────────────────────┘
     */
    convert_time_zone(timeZone: string) {
        const colTz = this._colTz();
        if (this.expr._castType instanceof DatetimeType && colTz === null) {
            throw new InvalidArgumentError(
                `convert_time_zone() requires a timezone-aware Datetime column. ` +
                `Use .dt.replace({ timeZone: "..." }) to assign a timezone first.`
            );
        }
        return this.expr.cast(new DatetimeType(this._colTu() ?? "ms", timeZone));
    }

    /**
     * Extracts the Date object component from a Datetime column, truncating time to 00:00:00.000 UTC.
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
     * @param timeZone Optional IANA timezone identifier. Defaults to the column timezone or UTC.
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
    day(timeZone?: string) {
        const tz = timeZone || this._colTz() || "UTC";
        return this._deriveDate((d) => _getDateTimeParts(d, tz).day);
    }

    /**
     * Extracts the total number of days in the month (28-31) for each Datetime value.
     * @param timeZone Optional IANA timezone identifier. Defaults to the column timezone or UTC.
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
    days_in_month(timeZone?: string) {
        const tz = timeZone || this._colTz() || "UTC";
        return this._deriveDate((d) => {
            const p = _getDateTimeParts(d, tz);
            const end = getMonthOffset(_createUTCDate(p.year, p.month - 1, 1), 1, 0);
            return end ? end.getUTCDate() : null;
        });
    }

    /**
     * Returns the epoch duration timestamp offset in the specified time resolution unit.
     * @param unit Time resolution unit (`"ms"`, `"us"`, `"ns"`, `"s"`). Defaults to `"ms"`.
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
     * Extracts the local hour component (0-23) from a Datetime column.
     * @param timeZone Optional IANA timezone identifier. Defaults to the column timezone or UTC.
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
    hour(timeZone?: string) {
        const tz = timeZone || this._colTz() || "UTC";
        return this._deriveDate((d) => _getDateTimeParts(d, tz).hour);
    }

    /**
     * Evaluates whether each Datetime value falls on a business day.
     * Supports custom weekend day definitions and holiday arrays or timestamp sets.
     * @param options Business day rules and custom holiday configuration options.
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
     * Checks if the calendar year of a Datetime value is a leap year (366 days).
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
     * Extracts the ISO 8601 week number (1-53) from a Datetime column.
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
     * Extracts the ISO 8601 week-numbering year from a Datetime column.
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
     * Extracts the microsecond component (0-999,000) scaled from Datetime millisecond precision.
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
        return this.millisecond().mul(US_PER_MS);
    }

    /**
     * Extracts the 1-indexed millennium component index (e.g. 3 for the year 2026) from a Datetime column.
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
     * Extracts the millisecond component (0-999) from a Datetime column.
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
     * @param timeZone Optional IANA timezone identifier. Defaults to the column timezone or UTC.
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
    minute(timeZone?: string) {
        const tz = timeZone || this._colTz() || "UTC";
        return this._deriveDate((d) => _getDateTimeParts(d, tz).minute);
    }

    /**
     * Extracts the calendar month component (1-12) from a Datetime column.
     * @param timeZone Optional IANA timezone identifier. Defaults to the column timezone or UTC.
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
    month(timeZone?: string) {
        const tz = timeZone || this._colTz() || "UTC";
        return this._deriveDate((d) => _getDateTimeParts(d, tz).month);
    }

    /**
     * Returns a Datetime column shifted to the last calendar day of the month at 00:00:00.000 UTC.
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
     * Returns a Datetime column shifted to the first calendar day of the month at 00:00:00.000 UTC.
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
     * Extracts the nanosecond component (0-999,000,000) scaled from Datetime millisecond precision.
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
        return this.millisecond().mul(NS_PER_MS);
    }

    /**
     * Offsets a Datetime column by N calendar days (numeric constant, column reference, or expression).
     * Reuses $df.duration({ days: n }) and expression addition math under the hood.
     * @param n Number of calendar days to offset (positive or negative).
     * @param options Day offset configuration options.
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
    offset_day(n: number | any, options: DayOffsetOptions = {}) {
        const hasExclusionOptions = options?.excludeWeekdays?.length || options?.holidays || options?.roll;
        const normalizedDays = hasExclusionOptions
            ? derive(this.expr, kleeneBinary(this.expr, n, (v, nVal) => {
                const d = toValidDate(v);
                return d ? offsetDay(d, nVal, options) : null;
            }))
            : n;
        const { duration: createDuration } = require("../functions/duration");
        return this.expr.add(createDuration({ days: normalizedDays }));
    }

    /**
     * Extracts the day of the year (1-366) from a Datetime column.
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
     * Extracts the calendar quarter of the year (1-4) from a Datetime column.
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
     * Replaces specific date and time components (`year`, `month`, `day`, `hour`, `minute`, `second`, `ms`, `timeZone`) of a Datetime column.
     * Unspecified components are preserved from the original value.
     * When `timeZone` is provided in options, components are interpreted in that timezone.
     * Note: `month` is 1-indexed (1 = January, 12 = December); `day` is 1-indexed (1-31).
     * @param options Object specifying which components to replace.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ ts: ["2026-05-20T14:30:00Z"] })
     * >>> df.with_columns($df.col("ts").dt.replace({ year: 2030, month: 1, day: 1 }).alias("replaced"))
     * shape: (1, 2)
     * ┌──────────────────────┬──────────────────────────┐
     * │ ts                   │ replaced                 │
     * ├──────────────────────┼──────────────────────────┤
     * │ 2026-05-20T14:30:00Z │ 2030-01-01T14:30:00.000Z │
     * └──────────────────────┴──────────────────────────┘
     */
    replace(options: ReplaceDateOptions) {
        return derive(this.expr, kleeneUnary((v) => {
            const d = toValidDate(v);
            return d ? replaceDateComponents(d, options) : null;
        }));
    }

    /**
     * Extracts the second component (0-59) from a Datetime column.
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
     * Formats Datetime values into custom formatted strings using strftime directive pattern tokens.
     * Automatically applies the column's assigned timezone unless explicitly overridden in options.
     * @param options Formatting pattern string (e.g. `"%Y-%m-%d %H:%M:%S"`) or configuration object.
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
        const colTz = this._colTz();
        const resolvedOptions = (colTz && !options.timeZone)
            ? { ...options, timeZone: colTz }
            : options;
        return this._deriveDate((d) => strftime(d, resolvedOptions));
    }

    /**
     * Extracts the time component formatted string (`"HH:MM:SS.mmm"`) from a Datetime column.
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
     * Converts a Duration value (in milliseconds) to total days count.
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
        return this.expr.div(MS_PER_DAY);
    }

    /**
     * Converts a Duration value (in milliseconds) to total hours count.
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
        return this.expr.div(MS_PER_HOUR);
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
        return this.expr.mul(US_PER_MS);
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
        return this.expr;
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
        return this.expr.div(MS_PER_MINUTE);
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
        return this.expr.mul(NS_PER_MS);
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
        return this.expr.div(MS_PER_SECOND);
    }

    /**
     * Returns the UTC offset of a timezone for a given Datetime value.
     * Supports returning the total offset, the standard (base) offset, or just the
     * daylight saving time component, in multiple output formats.
     * @param timeZone Optional IANA timezone identifier. Defaults to the system local timezone.
     * @param options Output configuration: `type` selects which offset component to return
     *   (`"total"` | `"standardTime"` | `"daylightSavingTime"`), and `format` controls the
     *   output unit (`"milliseconds"` | `"minutes"` | `"hours"` | `"iso"` | `"basic"`).
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
     * @param timeZone Optional IANA timezone identifier. Defaults to UTC.
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
    weekday(timeZone?: string) {
        const tz = timeZone || this._colTz() || "UTC";
        return this._deriveDate((d) => _getDateTimeParts(d, tz).dayOfWeek || 7);
    }

    /**
     * Extracts the year component from a Datetime column.
     * @param timeZone Optional IANA timezone identifier. Defaults to UTC.
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
    year(timeZone?: string) {
        const tz = timeZone || this._colTz() || "UTC";
        return this._deriveDate((d) => _getDateTimeParts(d, tz).year);
    }
}

export class TemporalExpr extends ExprBase {
    /**
     * Datetime namespace accessor for date, time, and duration operations.
     * @namespace $df.col
     * @category ColumnExpression
     * @syntax $df.col(<column_name>).dt
     * @returns DateTimeExprNamespace
     * @example
     * >>> df.select($df.col("date").dt.year())
     */
    get dt() {
        return new DateTimeExprNamespace(this);
    }
}

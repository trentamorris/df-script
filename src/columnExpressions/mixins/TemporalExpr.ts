import type { TimeUnit, DatetimeTimeUnit, StrftimeOptions, IsBusinessDayOptions, DayOffsetOptions, UtcOffsetOptions, ReplaceDateOptions } from "../../types";
import { DatetimeType, Int32, BooleanDataType } from "../../datatypes/types";
import { InvalidArgumentError } from "../../exceptions";
import { ExprBase } from "../ExprBase";
import {
    toValidDate,
    toEpoch,
    strftime,
    offsetDay,
    getTimeZoneOffset,
    isBusinessDay,
    replaceDateComponents
} from "../../utils";
import {
    MS_PER_SECOND,
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
 * _Timezone enforcement_: `convertTimeZone` can only validate that the column is
 * timezone-aware when `_castType` is explicitly set within the expression chain
 * (e.g. after `castTimeUnit`). Enforcement against a column whose type is unknown
 * at expression-build time requires schema-level checks in DataFrame operations.
 */
export class DateTimeExprNamespace {
    constructor(public _expr: any) { }

    /** Returns the column's schema timezone from a prior convertTimeZone call, or null. */
    _colTz(): string | null {
        const ct = this._expr._castType;
        return (ct instanceof DatetimeType) ? ct.timeZone : null;
    }

    /** Returns the column's schema time unit from a prior castTimeUnit call, or null. */
    _colTu(): DatetimeTimeUnit | null {
        const ct = this._expr._castType;
        return (ct instanceof DatetimeType) ? ct.timeUnit : null;
    }

    _deriveDate(fn: (d: Date) => any) {
        return this._expr._deriveUnary((v: any) => {
            const d = toValidDate(v);
            return d ? fn(d) : null;
        });
    }


    /**
     * Casts the schema time unit of a Datetime column (`"ms"`, `"us"`, `"ns"`).
     * This is a metadata-only operation — underlying millisecond Date timestamps are preserved.
     * @param unit Target time unit: `"ms"` (milliseconds), `"us"` (microseconds), or `"ns"` (nanoseconds).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("ts").dt.castTimeUnit("us").alias("ts_us"))
     * shape: (1, 2)
     * ┌──────────────────────────┬──────────────────────────┐
     * │ ts                       │ ts_us                    │
     * ├──────────────────────────┼──────────────────────────┤
     * │ 2026-05-20T10:00:00.123Z │ 2026-05-20T10:00:00.123Z │
     * └──────────────────────────┴──────────────────────────┘
     */
    castTimeUnit(unit: DatetimeTimeUnit) {
        return this._expr.cast(new DatetimeType(unit, this._colTz()));
    }

    /**
     * Extracts the 1-indexed century component (e.g. 21 for 2026) from a Datetime column.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("d").dt.century().alias("century"))
     * shape: (1, 2)
     * ┌────────────┬─────────┐
     * │ d          │ century │
     * ├────────────┼─────────┤
     * │ 2026-05-20 │ 21      │
     * └────────────┴─────────┘
     */
    century(timeZone?: string) {
        return this.year(timeZone).sub(1).floordiv(100).add(1);
    }

    /**
     * Converts a Datetime column to a different IANA timezone.
     * Preserves the exact UTC epoch instant while changing the timezone label, affecting
     * how local wall-clock component extractors (`hour()`, `day()`, etc.) and `strftime` interpret values.
     * Requires the column to already be timezone-aware; use `replace({ timeZone })`
     * to assign a timezone to a naive column first.
     * @note [Timezone Compatibility]: Converting across named timezones relies on native `Intl.DateTimeFormat`
     * IANA database resolution. Unrecognized timezones safely fallback to `"UTC"`.
     * @param timeZone Target IANA timezone identifier (e.g. `"UTC"`, `"America/New_York"`, `"Europe/London"`).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("ts").dt.replace({ timeZone: "UTC" }).dt.convertTimeZone("America/New_York").alias("ts_ny"))
     * shape: (1, 2)
     * ┌──────────────────────────┬───────────────────────────────┐
     * │ ts                       │ ts_ny                         │
     * ├──────────────────────────┼───────────────────────────────┤
     * │ 2026-05-20T10:00:00.123Z │ 2026-05-20 06:00:00.123 EDT   │
     * └──────────────────────────┴───────────────────────────────┘
     */
    convertTimeZone(timeZone: string) {
        const colTz = this._colTz();
        if (this._expr._castType instanceof DatetimeType && colTz === null) {
            throw new InvalidArgumentError(
                `convertTimeZone() requires a timezone-aware Datetime column. ` +
                `Use .dt.replace({ timeZone: "..." }) to assign a timezone first.`
            );
        }
        return this._expr.cast(new DatetimeType(this._colTu() ?? "ms", timeZone));
    }

    /**
     * Extracts the Date object component from a Datetime column, truncating time to 00:00:00.000 UTC.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("ts").dt.date().alias("date_only"))
     * shape: (1, 2)
     * ┌──────────────────────────┬──────────────────────────┐
     * │ ts                       │ date_only                │
     * ├──────────────────────────┼──────────────────────────┤
     * │ 2026-05-20T10:00:00.123Z │ 2026-05-20T00:00:00.000Z │
     * └──────────────────────────┴──────────────────────────┘
     */
    date() {
        return this.replace({ hour: 0, minute: 0, second: 0, ms: 0 });
    }

    /**
     * Extracts the calendar day component (1-31) from a Datetime column.
     * @param timeZone Optional IANA timezone identifier. Defaults to the column timezone or UTC.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("d").dt.day().alias("day"))
     * shape: (1, 2)
     * ┌────────────┬─────┐
     * │ d          │ day │
     * ├────────────┼─────┤
     * │ 2026-05-20 │ 20  │
     * └────────────┴─────┘
     */
    day(timeZone?: string) {
        return this.strftime({ format: "%d", timeZone }).cast(Int32);
    }

    /**
     * Extracts the total number of days in the month (28-31) for each Datetime value.
     * @param timeZone Optional IANA timezone identifier. Defaults to the column timezone or UTC.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("d").dt.daysInMonth().alias("dim"))
     * shape: (1, 2)
     * ┌────────────┬─────┐
     * │ d          │ dim │
     * ├────────────┼─────┤
     * │ 2026-05-20 │ 31  │
     * └────────────┴─────┘
     */
    daysInMonth(timeZone?: string) {
        return this.monthEnd().dt.day(timeZone);
    }

    /**
     * Returns the epoch duration timestamp offset in the specified time resolution unit.
     * @param unit Time resolution unit (`"ms"`, `"us"`, `"ns"`, `"s"`). Defaults to `"ms"`.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("d").dt.epoch("s").alias("epoch_s"))
     * shape: (1, 2)
     * ┌────────────┬────────────┐
     * │ d          │ epoch_s    │
     * ├────────────┼────────────┤
     * │ 2026-05-20 │ 1779235200 │
     * └────────────┴────────────┘
     */
    epoch(unit: TimeUnit = "ms") {
        return this._deriveDate((d) => toEpoch(d, unit));
    }

    /**
     * Extracts the local hour component (0-23) from a Datetime column.
     * @param timeZone Optional IANA timezone identifier. Defaults to the column timezone or UTC.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("ts").dt.hour().alias("hr"))
     * shape: (1, 2)
     * ┌──────────────────────────┬────┐
     * │ ts                       │ hr │
     * ├──────────────────────────┼────┤
     * │ 2026-05-20T10:00:00.123Z │ 10 │
     * └──────────────────────────┴────┘
     */
    hour(timeZone?: string) {
        return this.strftime({ format: "%H", timeZone }).cast(Int32);
    }

    /**
     * Evaluates whether each Datetime value falls on a business day.
     * Supports custom weekend day definitions and holiday arrays or timestamp sets.
     * @param options Business day rules and custom holiday configuration options.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("d").dt.isBusinessDay().alias("is_bday"))
     * shape: (1, 2)
     * ┌────────────┬─────────┐
     * │ d          │ is_bday │
     * ├────────────┼─────────┤
     * │ 2026-05-20 │ true    │
     * └────────────┴─────────┘
     */
    isBusinessDay(options: IsBusinessDayOptions = {}) {
        return this._deriveDate((d) => isBusinessDay(d, options));
    }

    /**
     * Checks if the calendar year of a Datetime value is a leap year (366 days).
     * @param timeZone Optional IANA timezone identifier. Defaults to the column timezone or UTC.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("d").dt.isLeapYear().alias("leap"))
     * shape: (1, 2)
     * ┌────────────┬───────┐
     * │ d          │ leap  │
     * ├────────────┼───────┤
     * │ 2026-05-20 │ false │
     * └────────────┴───────┘
     */
    isLeapYear(timeZone?: string) {
        const y = this.year(timeZone);
        return y.mod(4).eq(0).and(y.mod(100).ne(0)).or(y.mod(400).eq(0)).cast(BooleanDataType);
    }


    /**
     * Extracts the ISO 8601 week-numbering year from a Datetime column.
     * @param timeZone Optional IANA timezone identifier. Defaults to the column timezone or UTC.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("d").dt.isoYear().alias("iso_yr"))
     * shape: (1, 2)
     * ┌────────────┬────────┐
     * │ d          │ iso_yr │
     * ├────────────┼────────┤
     * │ 2026-05-20 │ 2026   │
     * └────────────┴────────┘
     */
    isoYear(timeZone?: string) {
        return this.strftime({ format: "%G", timeZone }).cast(Int32);
    }

    /**
     * Extracts the microsecond component (0-999,000) scaled from Datetime millisecond precision.
     * @param timeZone Optional IANA timezone identifier. Defaults to the column timezone or UTC.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("ts").dt.microsecond().alias("us"))
     * shape: (1, 2)
     * ┌──────────────────────────┬────────┐
     * │ ts                       │ us     │
     * ├──────────────────────────┼────────┤
     * │ 2026-05-20T10:00:00.123Z │ 123000 │
     * └──────────────────────────┴────────┘
     */
    microsecond(timeZone?: string) {
        return this.strftime({ format: "%f", timeZone }).cast(Int32);
    }

    /**
     * Extracts the 1-indexed millennium component index (e.g. 3 for the year 2026) from a Datetime column.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("d").dt.millennium().alias("mil"))
     * shape: (1, 2)
     * ┌────────────┬─────┐
     * │ d          │ mil │
     * ├────────────┼─────┤
     * │ 2026-05-20 │ 3   │
     * └────────────┴─────┘
     */
    millennium(timeZone?: string) {
        return this.year(timeZone).sub(1).floordiv(1000).add(1);
    }

    /**
     * Extracts the millisecond component (0-999) from a Datetime column.
     * @param timeZone Optional IANA timezone identifier. Defaults to the column timezone or UTC.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("ts").dt.millisecond().alias("ms"))
     * shape: (1, 2)
     * ┌──────────────────────────┬─────┐
     * │ ts                       │ ms  │
     * ├──────────────────────────┼─────┤
     * │ 2026-05-20T10:00:00.123Z │ 123 │
     * └──────────────────────────┴─────┘
     */
    millisecond(timeZone?: string) {
        return this.strftime({ format: "%ms", timeZone }).cast(Int32);
    }

    /**
     * Extracts the minute component (0-59) from a Datetime column.
     * @param timeZone Optional IANA timezone identifier. Defaults to the column timezone or UTC.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("ts").dt.minute().alias("min"))
     * shape: (1, 2)
     * ┌──────────────────────────┬─────┐
     * │ ts                       │ min │
     * ├──────────────────────────┼─────┤
     * │ 2026-05-20T10:00:00.123Z │ 0   │
     * └──────────────────────────┴─────┘
     */
    minute(timeZone?: string) {
        return this.strftime({ format: "%M", timeZone }).cast(Int32);
    }

    /**
     * Extracts the calendar month component (1-12) from a Datetime column.
     * @param timeZone Optional IANA timezone identifier. Defaults to the column timezone or UTC.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("d").dt.month().alias("m"))
     * shape: (1, 2)
     * ┌────────────┬───┐
     * │ d          │ m │
     * ├────────────┼───┤
     * │ 2026-05-20 │ 5 │
     * └────────────┴───┘
     */
    month(timeZone?: string) {
        return this.strftime({ format: "%m", timeZone }).cast(Int32);
    }

    /**
     * Returns a Datetime column shifted to the last calendar day of the month at 00:00:00.000 UTC.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("d").dt.monthEnd().alias("m_end"))
     * shape: (1, 2)
     * ┌────────────┬──────────────────────────┐
     * │ d          │ m_end                    │
     * ├────────────┼──────────────────────────┤
     * │ 2026-05-20 │ 2026-05-31T00:00:00.000Z │
     * └────────────┴──────────────────────────┘
     */
    monthEnd() {
        return this.replace({ day: -1, hour: 0, minute: 0, second: 0, ms: 0 });
    }

    /**
     * Returns a Datetime column shifted to the first calendar day of the month at 00:00:00.000 UTC.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("d").dt.monthStart().alias("m_start"))
     * shape: (1, 2)
     * ┌────────────┬──────────────────────────┐
     * │ d          │ m_start                  │
     * ├────────────┼──────────────────────────┤
     * │ 2026-05-20 │ 2026-05-01T00:00:00.000Z │
     * └────────────┴──────────────────────────┘
     */
    monthStart() {
        return this.replace({ day: 1, hour: 0, minute: 0, second: 0, ms: 0 });
    }

    /**
     * Extracts the nanosecond component (0-999,000,000) scaled from Datetime millisecond precision.
     * @param timeZone Optional IANA timezone identifier. Defaults to the column timezone or UTC.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("ts").dt.nanosecond().alias("ns"))
     * shape: (1, 2)
     * ┌──────────────────────────┬───────────┐
     * │ ts                       │ ns        │
     * ├──────────────────────────┼───────────┤
     * │ 2026-05-20T10:00:00.123Z │ 123000000 │
     * └──────────────────────────┴───────────┘
     */
    nanosecond(timeZone?: string) {
        return this.microsecond(timeZone).mul(1000);
    }

    /**
     * Offsets a Datetime column by N calendar days (numeric constant, column reference, or expression).
     * Reuses $df.duration({ days: n }) and expression addition math under the hood.
     * @param n Number of calendar days to offset (positive or negative).
     * @param options Day offset configuration options.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("d").dt.offsetDay(5).alias("later"))
     * shape: (1, 2)
     * ┌────────────┬──────────────────────────┐
     * │ d          │ later                    │
     * ├────────────┼──────────────────────────┤
     * │ 2026-05-20 │ 2026-05-25T00:00:00.000Z │
     * └────────────┴──────────────────────────┘
     */
    offsetDay(n: number | any, options: DayOffsetOptions = {}) {
        const hasExclusionOptions = options?.excludeWeekdays?.length || options?.holidays || options?.roll;
        const normalizedDays = hasExclusionOptions
            ? this._expr._deriveBinary(n, (v: any, nVal: any) => {
                const d = toValidDate(v);
                return d ? offsetDay(d, nVal, options) : null;
            })
            : n;
        const { duration: createDuration } = require("../functions/duration");
        return this._expr.add(createDuration({ days: normalizedDays }));
    }

    /**
     * Extracts the day of the year (1-366) from a Datetime column.
     * @param timeZone Optional IANA timezone identifier. Defaults to the column timezone or UTC.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("d").dt.ordinalDay().alias("doy"))
     * shape: (1, 2)
     * ┌────────────┬─────┐
     * │ d          │ doy │
     * ├────────────┼─────┤
     * │ 2026-05-20 │ 140 │
     * └────────────┴─────┘
     */
    ordinalDay(timeZone?: string) {
        return this.strftime({ format: "%j", timeZone }).cast(Int32);
    }

    /**
     * Extracts the calendar quarter of the year (1-4) from a Datetime column.
     * @param timeZone Optional IANA timezone identifier. Defaults to UTC.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("d").dt.quarter().alias("qtr"))
     * shape: (1, 2)
     * ┌────────────┬─────┐
     * │ d          │ qtr │
     * ├────────────┼─────┤
     * │ 2026-05-20 │ 2   │
     * └────────────┴─────┘
     */
    quarter(timeZone?: string) {
        return this.month(timeZone).div(3).ceil();
    }

    /**
     * Replaces specific date and time components (`year`, `month`, `day`, `hour`, `minute`, `second`, `ms`, `timeZone`) of a Datetime column.
     * Unspecified components are preserved from the original value.
     * When `timeZone` is provided in options, components are interpreted in that timezone.
     * Note: `month` is 1-indexed (1 = January, 12 = December); `day` is 1-indexed (1-31).
     * @param options Object specifying which components to replace.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("ts").dt.replace({ year: 2030, month: 1, day: 1 }).alias("replaced"))
     * shape: (1, 2)
     * ┌──────────────────────────┬──────────────────────────┐
     * │ ts                       │ replaced                 │
     * ├──────────────────────────┼──────────────────────────┤
     * │ 2026-05-20T10:00:00.123Z │ 2030-01-01T10:00:00.123Z │
     * └──────────────────────────┴──────────────────────────┘
     */
    replace(options: ReplaceDateOptions) {
        return this._deriveDate((d) => replaceDateComponents(d, options));
    }

    /**
     * Extracts the second component (0-59) from a Datetime column.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("ts").dt.second().alias("sec"))
     * shape: (1, 2)
     * ┌──────────────────────────┬─────┐
     * │ ts                       │ sec │
     * ├──────────────────────────┼─────┤
     * │ 2026-05-20T10:00:00.123Z │ 0   │
     * └──────────────────────────┴─────┘
     */
    second() {
        return this.strftime({ format: "%S", timeZone: "UTC" }).cast(Int32);
    }

    /**
     * Formats Datetime values into custom formatted strings using strftime directive pattern tokens.
     * Automatically applies the column's assigned timezone unless explicitly overridden in options.
     * @note [Timezone Compatibility]: Timezone-aware formatting relies on native `Intl.DateTimeFormat`
     * timezone resolution. If an invalid or unsupported IANA timezone is provided, formatting safely defaults to `"UTC"`.
     * @param options Formatting pattern string (e.g. `"%Y-%m-%d %H:%M:%S"`) or configuration object.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("d").dt.strftime("%Y/%m/%d").alias("formatted"))
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
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("ts").dt.time().alias("time"))
     * shape: (1, 2)
     * ┌──────────────────────────┬──────────────┐
     * │ ts                       │ time         │
     * ├──────────────────────────┼──────────────┤
     * │ 2026-05-20T10:00:00.123Z │ 10:00:00.123 │
     * └──────────────────────────┴──────────────┘
     */
    time() {
        return this.strftime({ format: "%H:%M:%S.%ms", timeZone: "UTC" });
    }

    /**
     * Returns numeric timestamp relative to Epoch. Alias for epoch.
     * @param unit Time unit resolution.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("d").dt.timestamp("s").alias("ts"))
     * shape: (1, 2)
     * ┌────────────┬────────────┐
     * │ d          │ ts         │
     * ├────────────┼────────────┤
     * │ 2026-05-20 │ 1779235200 │
     * └────────────┴────────────┘
     */
    timestamp(unit: TimeUnit = "ms") {
        return this.epoch(unit);
    }


    /**
     * Converts a Duration value (in milliseconds) to total days count.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.duration({ days: $df.col("add") }).dt.totalDays().alias("days"))
     * shape: (2, 3)
     * ┌────────────┬─────┬──────┐
     * │ dt         │ add │ days │
     * ├────────────┼─────┼──────┤
     * │ 2026-01-01 │ 1   │ 1    │
     * │ 2026-01-01 │ 2   │ 2    │
     * └────────────┴─────┴──────┘
     */
    totalDays() {
        return this.totalHours().div(24);
    }

    /**
     * Converts a Duration value (in milliseconds) to total hours count.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.duration({ days: $df.col("add") }).dt.totalHours().alias("hrs"))
     * shape: (2, 3)
     * ┌────────────┬─────┬─────┐
     * │ dt         │ add │ hrs │
     * ├────────────┼─────┼─────┤
     * │ 2026-01-01 │ 1   │ 24  │
     * │ 2026-01-01 │ 2   │ 48  │
     * └────────────┴─────┴─────┘
     */
    totalHours() {
        return this.totalMinutes().div(60);
    }

    /**
     * Converts Duration to microsecond count.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.duration({ days: $df.col("add") }).dt.totalMicroseconds().alias("us"))
     * shape: (2, 3)
     * ┌────────────┬─────┬──────────────┐
     * │ dt         │ add │ us           │
     * ├────────────┼─────┼──────────────┤
     * │ 2026-01-01 │ 1   │ 86400000000  │
     * │ 2026-01-01 │ 2   │ 172800000000 │
     * └────────────┴─────┴──────────────┘
     */
    totalMicroseconds() {
        return this.totalMilliseconds().mul(US_PER_MS);
    }

    /**
     * Converts Duration to millisecond count.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.duration({ days: $df.col("add") }).dt.totalMilliseconds().alias("ms"))
     * shape: (2, 3)
     * ┌────────────┬─────┬───────────┐
     * │ dt         │ add │ ms        │
     * ├────────────┼─────┼───────────┤
     * │ 2026-01-01 │ 1   │ 86400000  │
     * │ 2026-01-01 │ 2   │ 172800000 │
     * └────────────┴─────┴───────────┘
     */
    totalMilliseconds() {
        return this._expr;
    }

    /**
     * Converts Duration to floating point minutes.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.duration({ days: $df.col("add") }).dt.totalMinutes().alias("mins"))
     * shape: (2, 3)
     * ┌────────────┬─────┬──────┐
     * │ dt         │ add │ mins │
     * ├────────────┼─────┼──────┤
     * │ 2026-01-01 │ 1   │ 1440 │
     * │ 2026-01-01 │ 2   │ 2880 │
     * └────────────┴─────┴──────┘
     */
    totalMinutes() {
        return this.totalSeconds().div(60);
    }

    /**
     * Converts Duration to nanosecond count.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.duration({ days: $df.col("add") }).dt.totalNanoseconds().alias("ns"))
     * shape: (2, 3)
     * ┌────────────┬─────┬─────────────────┐
     * │ dt         │ add │ ns              │
     * ├────────────┼─────┼─────────────────┤
     * │ 2026-01-01 │ 1   │ 86400000000000  │
     * │ 2026-01-01 │ 2   │ 172800000000000 │
     * └────────────┴─────┴─────────────────┘
     */
    totalNanoseconds() {
        return this.totalMilliseconds().mul(NS_PER_MS);
    }

    /**
     * Converts Duration to floating point seconds.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.duration({ days: $df.col("add") }).dt.totalSeconds().alias("secs"))
     * shape: (2, 3)
     * ┌────────────┬─────┬────────┐
     * │ dt         │ add │ secs   │
     * ├────────────┼─────┼────────┤
     * │ 2026-01-01 │ 1   │ 86400  │
     * │ 2026-01-01 │ 2   │ 172800 │
     * └────────────┴─────┴────────┘
     */
    totalSeconds() {
        return this.totalMilliseconds().div(MS_PER_SECOND);
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
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("d").dt.utcOffset("UTC").alias("offset"))
     * shape: (1, 2)
     * ┌────────────┬────────┐
     * │ d          │ offset │
     * ├────────────┼────────┤
     * │ 2026-05-20 │ 0      │
     * └────────────┴────────┘
     */
    utcOffset(timeZone?: string, options: UtcOffsetOptions = {}) {
        return this._deriveDate((d) => getTimeZoneOffset(d, timeZone, options));
    }

    /**
     * Extracts the ISO 8601 week number (1-53) from a Datetime column.
     * @param timeZone Optional IANA timezone identifier. Defaults to the column timezone or UTC.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("d").dt.week().alias("week"))
     * shape: (1, 2)
     * ┌────────────┬──────┐
     * │ d          │ week │
     * ├────────────┼──────┤
     * │ 2026-05-20 │ 21   │
     * └────────────┴──────┘
     */
    week(timeZone?: string) {
        return this.strftime({ format: "%V", timeZone }).cast(Int32);
    }

    /**
     * Extracts weekday component (1=Monday, 7=Sunday).
     * @param timeZone Optional IANA timezone identifier. Defaults to UTC.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("d").dt.weekday().alias("wd"))
     * shape: (1, 2)
     * ┌────────────┬────┐
     * │ d          │ wd │
     * ├────────────┼────┤
     * │ 2026-05-20 │ 3  │
     * └────────────┴────┘
     */
    weekday(timeZone?: string) {
        return this.strftime({ format: "%u", timeZone }).cast(Int32);
    }

    /**
     * Extracts the year component from a Datetime column.
     * @param timeZone Optional IANA timezone identifier. Defaults to UTC.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("d").dt.year().alias("yr"))
     * shape: (1, 2)
     * ┌────────────┬──────┐
     * │ d          │ yr   │
     * ├────────────┼──────┤
     * │ 2026-05-20 │ 2026 │
     * └────────────┴──────┘
     */
    year(timeZone?: string) {
        return this.strftime({ format: "%Y", timeZone }).cast(Int32);
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
     * <!-- doc:base_temporal_single -->
     * >>> df.select($df.col("date").dt.year())
     * shape: (1, 1)
     * ┌──────┐
     * │ year │
     * ├──────┤
     * │ 2026 │
     * └──────┘
     */
    get dt() {
        return new DateTimeExprNamespace(this);
    }
}

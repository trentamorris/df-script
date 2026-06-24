declare const process: any;
import { $df } from "../../src/index";
import { MS_PER_MINUTE, MS_PER_HOUR, MS_PER_DAY } from "../../src/constants";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION DT NAMESPACE TESTS...");
console.log("=========================================");

const data = [
    {
        date_str: "2024-02-29", // Leap year
        datetime_str: "2026-05-25T10:37:16.123Z",
        time_str: "14:30:15.500",
        duration_ms: 123456789
    },
    {
        date_str: "2023-03-15", // Non-leap year
        datetime_str: "2026-12-31T23:59:59.999Z",
        time_str: "00:00:00.000",
        duration_ms: 3600000 // 1 hour
    }
];

const schema = {
    date_str: $df.DataType.Date,
    datetime_str: $df.DataType.Datetime,
    time_str: $df.DataType.Time,
    duration_ms: $df.DataType.Duration
};

try {
    const df = $df.data(data, schema);

    const projected = df.select([
        // Date component checks
        $df.col("date_str").dt.year().alias("year"),
        $df.col("date_str").dt.month().alias("month"),
        $df.col("date_str").dt.day().alias("day"),
        $df.col("date_str").dt.days_in_month().alias("days_in_month"),
        $df.col("date_str").dt.weekday().alias("weekday"),
        $df.col("date_str").dt.is_leap_year().alias("is_leap"),
        $df.col("date_str").dt.ordinal_day().alias("ordinal"),
        $df.col("date_str").dt.quarter().alias("quarter"),

        // Time component checks on datetime
        $df.col("datetime_str").dt.hour().alias("hour"),
        $df.col("datetime_str").dt.minute().alias("minute"),
        $df.col("datetime_str").dt.second().alias("second"),
        $df.col("datetime_str").dt.millisecond().alias("ms"),
        $df.col("datetime_str").dt.microsecond().alias("us"),
        $df.col("datetime_str").dt.nanosecond().alias("ns"),

        // Date truncation and string formatting checks
        $df.col("datetime_str").dt.date().alias("truncated_date"),
        $df.col("datetime_str").dt.time().alias("time_str_extracted"),

        // Epoch check
        $df.col("datetime_str").dt.epoch("s").alias("epoch_s"),
        $df.col("datetime_str").dt.epoch("ms").alias("epoch_ms"),
        $df.col("datetime_str").dt.timestamp().alias("timestamp_alias"),
        $df.col("datetime_str").dt.timestamp("us").alias("timestamp_us"),

        // Duration checks
        $df.col("duration_ms").dt.total_milliseconds().alias("dur_ms"),
        $df.col("duration_ms").dt.total_microseconds().alias("dur_us"),
        $df.col("duration_ms").dt.total_nanoseconds().alias("dur_ns"),
        $df.col("duration_ms").dt.total_seconds().alias("dur_s"),
        $df.col("duration_ms").dt.total_minutes().alias("dur_m"),
        $df.col("duration_ms").dt.total_hours().alias("dur_h"),
        $df.col("duration_ms").dt.total_days().alias("dur_d"),

        // New Polars operations
        $df.col("date_str").dt.week().alias("week"),
        $df.col("date_str").dt.century().alias("century"),
        $df.col("date_str").dt.millennium().alias("millennium"),
        $df.col("date_str").dt.month_start().alias("m_start"),
        $df.col("date_str").dt.month_end().alias("m_end"),
        $df.col("datetime_str").dt.strftime({ format: "%Y/%m/%d %H:%M:%S.%ms" }).alias("formatted_str"),
        $df.col("datetime_str").dt.strftime({ format: "%F %T %% %A %B %j %I:%M %p", locale: "en-US" }).alias("formatted_shorthands"),
        $df.col("datetime_str").dt.strftime({ format: "%A %B", locale: "fr-FR" }).alias("formatted_fr"),
        $df.col("datetime_str").dt.strftime({ format: "%A %B", locale: "de-DE" }).alias("formatted_de"),
        $df.col("datetime_str").dt.to_string({ format: "%Y-%m-%d" }).alias("to_str_formatted")
    ]).to_dicts() as any[];

    console.log("Coerced Expr.dt results:");
    console.dir(projected, { depth: null });

    // Assert Row 0
    const r0 = projected[0];
    if (r0.year !== 2024) throw new Error(`Expected r0.year to be 2024, got ${r0.year}`);
    if (r0.month !== 2) throw new Error(`Expected r0.month to be 2, got ${r0.month}`);
    if (r0.day !== 29) throw new Error(`Expected r0.day to be 29, got ${r0.day}`);
    if (r0.days_in_month !== 29) throw new Error(`Expected r0.days_in_month to be 29, got ${r0.days_in_month}`);
    if (r0.weekday !== 4) throw new Error(`Expected r0.weekday to be 4 (Thursday), got ${r0.weekday}`);
    if (r0.is_leap !== true) throw new Error(`Expected r0.is_leap to be true, got ${r0.is_leap}`);
    if (r0.ordinal !== 60) throw new Error(`Expected r0.ordinal to be 60, got ${r0.ordinal}`);
    if (r0.quarter !== 1) throw new Error(`Expected r0.quarter to be 1, got ${r0.quarter}`);

    if (r0.hour !== 10) throw new Error(`Expected r0.hour to be 10, got ${r0.hour}`);
    if (r0.minute !== 37) throw new Error(`Expected r0.minute to be 37, got ${r0.minute}`);
    if (r0.second !== 16) throw new Error(`Expected r0.second to be 16, got ${r0.second}`);
    if (r0.ms !== 123) throw new Error(`Expected r0.ms to be 123, got ${r0.ms}`);
    if (r0.us !== 123000) throw new Error(`Expected r0.us to be 123000, got ${r0.us}`);
    if (r0.ns !== 123000000) throw new Error(`Expected r0.ns to be 123000000, got ${r0.ns}`);

    if (!(r0.truncated_date instanceof Date) || r0.truncated_date.getUTCHours() !== 0) {
        throw new Error(`Expected r0.truncated_date to be midnight UTC, got ${r0.truncated_date}`);
    }
    if (r0.time_str_extracted !== "10:37:16.123") {
        throw new Error(`Expected r0.time_str_extracted to be "10:37:16.123", got ${r0.time_str_extracted}`);
    }

    const t0 = new Date("2026-05-25T10:37:16.123Z").getTime();
    if (r0.epoch_s !== Math.floor(t0 / 1000)) throw new Error(`Expected r0.epoch_s to be ${Math.floor(t0 / 1000)}, got ${r0.epoch_s}`);
    if (r0.epoch_ms !== t0) throw new Error(`Expected r0.epoch_ms to be ${t0}, got ${r0.epoch_ms}`);
    if (r0.timestamp_alias !== t0) throw new Error(`Expected r0.timestamp_alias to be ${t0}, got ${r0.timestamp_alias}`);
    if (r0.timestamp_us !== BigInt(t0) * 1000n) throw new Error(`Expected r0.timestamp_us to be ${BigInt(t0) * 1000n}, got ${r0.timestamp_us}`);

    if (r0.dur_ms !== 123456789) throw new Error(`Expected r0.dur_ms to be 123456789, got ${r0.dur_ms}`);
    if (r0.dur_us !== 123456789000) throw new Error(`Expected r0.dur_us to be 123456789000, got ${r0.dur_us}`);
    if (r0.dur_ns !== 123456789000000) throw new Error(`Expected r0.dur_ns to be 123456789000000, got ${r0.dur_ns}`);
    if (r0.dur_s !== 123456.789) throw new Error(`Expected r0.dur_s to be 123456.789, got ${r0.dur_s}`);
    if (Math.abs(r0.dur_m - 123456789 / MS_PER_MINUTE) > 1e-6) throw new Error(`Expected r0.dur_m to match, got ${r0.dur_m}`);
    if (Math.abs(r0.dur_h - 123456789 / MS_PER_HOUR) > 1e-6) throw new Error(`Expected r0.dur_h to match, got ${r0.dur_h}`);
    if (Math.abs(r0.dur_d - 123456789 / MS_PER_DAY) > 1e-6) throw new Error(`Expected r0.dur_d to match, got ${r0.dur_d}`);

    // Assert New Operations for Row 0
    if (r0.week !== 9) throw new Error(`Expected r0.week to be 9, got ${r0.week}`);
    if (r0.century !== 21) throw new Error(`Expected r0.century to be 21, got ${r0.century}`);
    if (r0.millennium !== 3) throw new Error(`Expected r0.millennium to be 3, got ${r0.millennium}`);
    if (r0.m_start.toISOString() !== "2024-02-01T00:00:00.000Z") throw new Error(`Expected r0.m_start to be "2024-02-01T00:00:00.000Z", got ${r0.m_start.toISOString()}`);
    if (r0.m_end.toISOString() !== "2024-02-29T00:00:00.000Z") throw new Error(`Expected r0.m_end to be "2024-02-29T00:00:00.000Z", got ${r0.m_end.toISOString()}`);
    if (r0.formatted_str !== "2026/05/25 10:37:16.123") throw new Error(`Expected r0.formatted_str to be "2026/05/25 10:37:16.123", got ${r0.formatted_str}`);
    if (r0.formatted_shorthands !== "2026-05-25 10:37:16 % Monday May 145 10:37 AM") throw new Error(`Expected r0.formatted_shorthands to be "2026-05-25 10:37:16 % Monday May 145 10:37 AM", got ${r0.formatted_shorthands}`);
    if (r0.formatted_fr !== "lundi mai") throw new Error(`Expected r0.formatted_fr to be "lundi mai", got ${r0.formatted_fr}`);
    if (r0.formatted_de !== "Montag Mai") throw new Error(`Expected r0.formatted_de to be "Montag Mai", got ${r0.formatted_de}`);
    if (r0.to_str_formatted !== "2026-05-25") throw new Error(`Expected r0.to_str_formatted to be "2026-05-25", got ${r0.to_str_formatted}`);

    // Assert Row 1
    const r1 = projected[1];
    if (r1.year !== 2023) throw new Error(`Expected r1.year to be 2023, got ${r1.year}`);
    if (r1.days_in_month !== 31) throw new Error(`Expected r1.days_in_month to be 31, got ${r1.days_in_month}`);
    if (r1.is_leap !== false) throw new Error(`Expected r1.is_leap to be false, got ${r1.is_leap}`);
    if (r1.ordinal !== 74) throw new Error(`Expected r1.ordinal to be 74, got ${r1.ordinal}`); // 31 (Jan) + 28 (Feb) + 15 (Mar) = 74
    if (r1.dur_h !== 1.0) throw new Error(`Expected r1.dur_h to be 1.0, got ${r1.dur_h}`);
    if (r1.dur_us !== 3600000000) throw new Error(`Expected r1.dur_us to be 3600000000, got ${r1.dur_us}`);
    if (r1.dur_ns !== 3600000000000) throw new Error(`Expected r1.dur_ns to be 3600000000000, got ${r1.dur_ns}`);

    // Assert New Operations for Row 1
    if (r1.week !== 11) throw new Error(`Expected r1.week to be 11, got ${r1.week}`);
    if (r1.century !== 21) throw new Error(`Expected r1.century to be 21, got ${r1.century}`);
    if (r1.millennium !== 3) throw new Error(`Expected r1.millennium to be 3, got ${r1.millennium}`);
    if (r1.m_start.toISOString() !== "2023-03-01T00:00:00.000Z") throw new Error(`Expected r1.m_start to be "2023-03-01T00:00:00.000Z", got ${r1.m_start.toISOString()}`);
    if (r1.m_end.toISOString() !== "2023-03-31T00:00:00.000Z") throw new Error(`Expected r1.m_end to be "2023-03-31T00:00:00.000Z", got ${r1.m_end.toISOString()}`);
    if (r1.formatted_str !== "2026/12/31 23:59:59.999") throw new Error(`Expected r1.formatted_str to be "2026/12/31 23:59:59.999", got ${r1.formatted_str}`);
    if (r1.formatted_shorthands !== "2026-12-31 23:59:59 % Thursday December 365 11:59 PM") throw new Error(`Expected r1.formatted_shorthands to be "2026-12-31 23:59:59 % Thursday December 365 11:59 PM", got ${r1.formatted_shorthands}`);
    if (r1.formatted_fr !== "jeudi décembre") throw new Error(`Expected r1.formatted_fr to be "jeudi décembre", got ${r1.formatted_fr}`);
    if (r1.formatted_de !== "Donnerstag Dezember") throw new Error(`Expected r1.formatted_de to be "Donnerstag Dezember", got ${r1.formatted_de}`);
    if (r1.to_str_formatted !== "2026-12-31") throw new Error(`Expected r1.to_str_formatted to be "2026-12-31", got ${r1.to_str_formatted}`);

    // Test offset_business_day
    console.log("Testing Expr.dt.offset_business_day...");

    const bizData = [
        { date: "2026-05-21", offset: 3 }, // Thursday
        { date: "2026-05-22", offset: 1 }, // Friday
    ];
    const bizSchema = {
        date: $df.DataType.Date,
        offset: $df.DataType.Int32
    };
    const dfBiz = $df.data(bizData, bizSchema);
    const dfWeekend = $df.data([{ date: "2026-05-23", offset: 0 }], bizSchema);

    // Test 1: Basic addition and column-based offset
    const projectedBiz1 = dfBiz.select([
        $df.col("date").dt.offset_business_day(3, {}).alias("add_scalar"),
        $df.col("date").dt.offset_business_day($df.col("offset")).alias("add_col"),
        $df.col("date").dt.offset_business_day($df.lit(3)).alias("add_lit")
    ]).to_dicts() as any[];

    // Thursday + 3 biz days = Tuesday 26th
    const rBiz0 = projectedBiz1[0];
    if (rBiz0.add_scalar.getUTCDate() !== 26) {
        throw new Error(`Expected Thursday + 3 biz days to be Tuesday 26th, got ${rBiz0.add_scalar.toISOString()}`);
    }
    if (rBiz0.add_col.getUTCDate() !== 26) {
        throw new Error(`Expected Thursday + col(3) biz days to be Tuesday 26th, got ${rBiz0.add_col.toISOString()}`);
    }
    if (rBiz0.add_lit.getUTCDate() !== 26) {
        throw new Error(`Expected Thursday + lit(3) biz days to be Tuesday 26th, got ${rBiz0.add_lit.toISOString()}`);
    }

    // Friday + 1 biz day = Monday 25th
    const rBiz1 = projectedBiz1[1];
    if (rBiz1.add_scalar.getUTCDate() !== 27) { // Friday + 3 biz days = Wednesday 27th
        throw new Error(`Expected Friday + 3 biz days to be Wednesday 27th, got ${rBiz1.add_scalar.toISOString()}`);
    }
    if (rBiz1.add_col.getUTCDate() !== 25) { // Friday + 1 biz day = Monday 25th
        throw new Error(`Expected Friday + col(1) biz day to be Monday 25th, got ${rBiz1.add_col.toISOString()}`);
    }
    if (rBiz1.add_lit.getUTCDate() !== 27) { // Friday + lit(3) biz days = Wednesday 27th
        throw new Error(`Expected Friday + lit(3) biz days to be Wednesday 27th, got ${rBiz1.add_lit.toISOString()}`);
    }

    // Test 2: Saturday 23rd + 1 business day should skip weekend and yield Monday 25th
    const projectedWeekend = dfWeekend.select([
        $df.col("date").dt.offset_business_day(1).alias("add_one")
    ]).to_dicts() as any[];
    if (projectedWeekend[0].add_one.getUTCDate() !== 25) {
        throw new Error(`Expected Saturday + 1 business day to yield Monday 25th, got ${projectedWeekend[0].add_one.toISOString()}`);
    }

    // Test 3: Holidays
    // Thursday + 3 biz days with Friday 22nd as holiday.
    // Friday is skipped -> Monday is +1, Tuesday is +2, Wednesday is +3 (2026-05-27)
    const projectedHolidays = dfBiz.filter($df.col("offset").eq(3)).select([
        $df.col("date").dt.offset_business_day(3, { holidays: ["2026-05-22"] }).alias("with_holiday")
    ]).to_dicts() as any[];
    if (projectedHolidays[0].with_holiday.getUTCDate() !== 27) {
        throw new Error(`Expected Thursday + 3 biz days with Friday holiday to be Wednesday 27th, got ${projectedHolidays[0].with_holiday.toISOString()}`);
    }

    console.log("Expr.dt.offset_business_day tests passed!");

    console.log("\n🎉 ALL Expr.dt COLUMN EXPRESSION TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("\n❌ Expr.dt COLUMN EXPRESSION TESTS FAILED:", err);
    process.exit(1);
}

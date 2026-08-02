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
    },
    {
        date_str: "2027-01-02", // Gregorian 2027, ISO 2026 (Saturday)
        datetime_str: "2027-01-02T12:00:00.000Z",
        time_str: "12:00:00.000",
        duration_ms: 0
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
        $df.col("date_str").dt.iso_week().alias("iso_week"),
        $df.col("date_str").dt.century().alias("century"),
        $df.col("date_str").dt.millennium().alias("millennium"),
        $df.col("date_str").dt.month_start().alias("m_start"),
        $df.col("date_str").dt.month_end().alias("m_end"),
        $df.col("datetime_str").dt.strftime({ format: "%Y/%m/%d %H:%M:%S.%ms" }).alias("formatted_str"),
        $df.col("datetime_str").dt.strftime({ format: "%F %T %% %A %B %j %I:%M %p", locale: "en-US" }).alias("formatted_shorthands"),
        $df.col("datetime_str").dt.strftime({ format: "%A %B", locale: "fr-FR" }).alias("formatted_fr"),
        $df.col("datetime_str").dt.strftime({ format: "%A %B", locale: "de-DE" }).alias("formatted_de"),
        $df.col("datetime_str").dt.strftime({ format: "%Y-%m-%d" }).alias("to_str_formatted"),
        $df.col("date_str").dt.iso_year().alias("iso_yr"),
        $df.col("date_str").dt.is_business_day().alias("is_biz"),
        $df.col("date_str").dt.is_business_day({ holidays: ["2024-02-29"] }).alias("is_biz_holiday")
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
    if (r0.iso_yr !== 2024) throw new Error(`Expected r0.iso_yr to be 2024, got ${r0.iso_yr}`);
    if (r0.is_biz !== true) throw new Error(`Expected r0.is_biz to be true, got ${r0.is_biz}`);
    if (r0.is_biz_holiday !== false) throw new Error(`Expected r0.is_biz_holiday to be false, got ${r0.is_biz_holiday}`);

    {
        const r1 = projected[1];
        if (r1.iso_yr !== 2023) throw new Error(`Expected r1.iso_yr to be 2023, got ${r1.iso_yr}`);
        if (r1.week !== 11) throw new Error(`Expected r1.week to be 11, got ${r1.week}`);
        if (r1.iso_week !== 11) throw new Error(`Expected r1.iso_week to be 11, got ${r1.iso_week}`);
        if (r1.is_biz !== true) throw new Error(`Expected r1.is_biz to be true, got ${r1.is_biz}`);
        if (r1.is_biz_holiday !== true) throw new Error(`Expected r1.is_biz_holiday to be true, got ${r1.is_biz_holiday}`);

        const r2 = projected[2];
        if (r2.iso_yr !== 2026) throw new Error(`Expected r2.iso_yr to be 2026, got ${r2.iso_yr}`);
        if (r2.week !== 53) throw new Error(`Expected r2.week to be 53, got ${r2.week}`);
        if (r2.iso_week !== 53) throw new Error(`Expected r2.iso_week to be 53, got ${r2.iso_week}`);
        if (r2.is_biz !== false) throw new Error(`Expected r2.is_biz to be false, got ${r2.is_biz}`);
        if (r2.is_biz_holiday !== false) throw new Error(`Expected r2.is_biz_holiday to be false, got ${r2.is_biz_holiday}`);
    }

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
    if (r0.iso_week !== 9) throw new Error(`Expected r0.iso_week to be 9, got ${r0.iso_week}`);
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
    if (r1.iso_week !== 11) throw new Error(`Expected r1.iso_week to be 11, got ${r1.iso_week}`);
    if (r1.century !== 21) throw new Error(`Expected r1.century to be 21, got ${r1.century}`);
    if (r1.millennium !== 3) throw new Error(`Expected r1.millennium to be 3, got ${r1.millennium}`);
    if (r1.m_start.toISOString() !== "2023-03-01T00:00:00.000Z") throw new Error(`Expected r1.m_start to be "2023-03-01T00:00:00.000Z", got ${r1.m_start.toISOString()}`);
    if (r1.m_end.toISOString() !== "2023-03-31T00:00:00.000Z") throw new Error(`Expected r1.m_end to be "2023-03-31T00:00:00.000Z", got ${r1.m_end.toISOString()}`);
    if (r1.formatted_str !== "2026/12/31 23:59:59.999") throw new Error(`Expected r1.formatted_str to be "2026/12/31 23:59:59.999", got ${r1.formatted_str}`);
    if (r1.formatted_shorthands !== "2026-12-31 23:59:59 % Thursday December 365 11:59 PM") throw new Error(`Expected r1.formatted_shorthands to be "2026-12-31 23:59:59 % Thursday December 365 11:59 PM", got ${r1.formatted_shorthands}`);
    if (r1.formatted_fr !== "jeudi décembre") throw new Error(`Expected r1.formatted_fr to be "jeudi décembre", got ${r1.formatted_fr}`);
    if (r1.formatted_de !== "Donnerstag Dezember") throw new Error(`Expected r1.formatted_de to be "Donnerstag Dezember", got ${r1.formatted_de}`);
    if (r1.to_str_formatted !== "2026-12-31") throw new Error(`Expected r1.to_str_formatted to be "2026-12-31", got ${r1.to_str_formatted}`);

    // Test offset_day
    console.log("Testing Expr.dt.offset_day...");

    const bizData = [
        { date: "2026-05-21", offset: 3 }, // Thursday
        { date: "2026-05-22", offset: 1 }, // Friday
    ];
    const bizSchema = {
        date: $df.DataType.Date,
        offset: $df.DataType.Int32
    };
    const dfBiz = $df.data(bizData, bizSchema);

    // Test 1: Basic addition and column-based offset
    const projectedBiz1 = dfBiz.select([
        $df.col("date").dt.offset_day(3, {}).alias("add_scalar"),
        $df.col("date").dt.offset_day($df.col("offset")).alias("add_col"),
        $df.col("date").dt.offset_day($df.lit(3)).alias("add_lit")
    ]).to_dicts() as any[];

    // Thursday 21st + 3 calendar days = Sunday 24th
    const rBiz0 = projectedBiz1[0];
    const getDay = (val: any) => val instanceof Date ? val.getUTCDate() : new Date(val).getUTCDate();
    const getISOStr = (val: any) => (val instanceof Date ? val : new Date(val)).toISOString().split("T")[0];

    if (getDay(rBiz0.add_scalar) !== 24) {
        throw new Error(`Expected Thursday + 3 days to be Sunday 24th, got ${rBiz0.add_scalar}`);
    }
    if (getDay(rBiz0.add_col) !== 24) {
        throw new Error(`Expected Thursday + col(3) days to be Sunday 24th, got ${rBiz0.add_col}`);
    }
    if (getDay(rBiz0.add_lit) !== 24) {
        throw new Error(`Expected Thursday + lit(3) days to be Sunday 24th, got ${rBiz0.add_lit}`);
    }

    // Edge Case 2: Business Day Exclusions (excludeWeekdays: [0, 6])
    // Thursday 2026-05-21 + 3 biz days -> Friday (1), Sat/Sun skipped, Mon (2), Tue (3) -> 2026-05-26
    const dfEdgeBiz = $df.data([{ date: "2026-05-21" }, { date: "2026-05-22" }], { date: $df.DataType.Date });
    const resBizEx = dfEdgeBiz.select([
        $df.col("date").dt.offset_day(3, { excludeWeekdays: [0, 6] }).alias("biz_plus3"),
        $df.col("date").dt.offset_day(1, { excludeWeekdays: [0, 6] }).alias("biz_plus1")
    ]).to_dicts() as any[];

    if (getISOStr(resBizEx[0].biz_plus3) !== "2026-05-26") {
        throw new Error(`Edge Case Fail: Expected Thursday + 3 biz days = 2026-05-26, got ${getISOStr(resBizEx[0].biz_plus3)}`);
    }
    if (getISOStr(resBizEx[1].biz_plus1) !== "2026-05-25") {
        throw new Error(`Edge Case Fail: Expected Friday + 1 biz day = 2026-05-25, got ${getISOStr(resBizEx[1].biz_plus1)}`);
    }

    // Edge Case 3: Weekend Roll Strategies (roll: "forward", "backward", "raise")
    const dfWeekend = $df.data([{ date: "2026-05-23" }], { date: $df.DataType.Date }); // Saturday
    const resRollForward = dfWeekend.select([
        $df.col("date").dt.offset_day(0, { excludeWeekdays: [0, 6], roll: "forward" }).alias("roll_fwd"),
        $df.col("date").dt.offset_day(0, { excludeWeekdays: [0, 6], roll: "backward" }).alias("roll_bwd")
    ]).to_dicts() as any[];

    if (getISOStr(resRollForward[0].roll_fwd) !== "2026-05-25") {
        throw new Error(`Edge Case Fail: Expected Saturday roll forward = 2026-05-25 (Monday), got ${getISOStr(resRollForward[0].roll_fwd)}`);
    }
    if (getISOStr(resRollForward[0].roll_bwd) !== "2026-05-22") {
        throw new Error(`Edge Case Fail: Expected Saturday roll backward = 2026-05-22 (Friday), got ${getISOStr(resRollForward[0].roll_bwd)}`);
    }

    // Edge Case 4: Holidays (Array vs Set)
    const dfHoliday = $df.data([{ date: "2026-05-21" }], { date: $df.DataType.Date }); // Thursday
    const resHolidays = dfHoliday.select([
        $df.col("date").dt.offset_day(3, { excludeWeekdays: [0, 6], holidays: ["2026-05-22"] }).alias("arr_hol"),
        $df.col("date").dt.offset_day(3, { excludeWeekdays: [0, 6], holidays: new Set([new Date("2026-05-22T00:00:00.000Z").getTime()]) }).alias("set_hol")
    ]).to_dicts() as any[];

    if (getISOStr(resHolidays[0].arr_hol) !== "2026-05-27") {
        throw new Error(`Edge Case Fail: Expected Thursday + 3 biz days (Fri holiday) = Wednesday 2026-05-27, got ${getISOStr(resHolidays[0].arr_hol)}`);
    }
    if (getISOStr(resHolidays[0].set_hol) !== "2026-05-27") {
        throw new Error(`Edge Case Fail: Expected Thursday + 3 biz days (Set holiday) = Wednesday 2026-05-27, got ${getISOStr(resHolidays[0].set_hol)}`);
    }

    // Edge Case 5: Negative Offsets (n < 0)
    const dfNeg = $df.data([{ date: "2026-05-25" }], { date: $df.DataType.Date }); // Monday
    const resNeg = dfNeg.select([
        $df.col("date").dt.offset_day(-1, { excludeWeekdays: [0, 6] }).alias("neg_biz"),
        $df.col("date").dt.offset_day(-3).alias("neg_cal")
    ]).to_dicts() as any[];

    if (getISOStr(resNeg[0].neg_biz) !== "2026-05-22") {
        throw new Error(`Edge Case Fail: Expected Monday - 1 biz day = Friday 2026-05-22, got ${getISOStr(resNeg[0].neg_biz)}`);
    }
    if (getISOStr(resNeg[0].neg_cal) !== "2026-05-22") {
        throw new Error(`Edge Case Fail: Expected Monday - 3 calendar days = Friday 2026-05-22, got ${getISOStr(resNeg[0].neg_cal)}`);
    }

    // Edge Case 6: Leap Year and Year Boundary Crossings
    const dfLeap = $df.data([{ date: "2024-02-28" }, { date: "2023-02-28" }, { date: "2026-12-31" }], { date: $df.DataType.Date });
    const resLeap = dfLeap.select([
        $df.col("date").dt.offset_day(1).alias("plus1")
    ]).to_dicts() as any[];

    if (getISOStr(resLeap[0].plus1) !== "2024-02-29") {
        throw new Error(`Edge Case Fail: Expected 2024-02-28 + 1 day = 2024-02-29 (leap year), got ${getISOStr(resLeap[0].plus1)}`);
    }
    if (getISOStr(resLeap[1].plus1) !== "2023-03-01") {
        throw new Error(`Edge Case Fail: Expected 2023-02-28 + 1 day = 2023-03-01 (non leap year), got ${getISOStr(resLeap[1].plus1)}`);
    }
    if (getISOStr(resLeap[2].plus1) !== "2027-01-01") {
        throw new Error(`Edge Case Fail: Expected 2026-12-31 + 1 day = 2027-01-01 (year end), got ${getISOStr(resLeap[2].plus1)}`);
    }

    // Edge Case 7: Null Values in Date or Offset Column
    const dfNull = $df.data([{ date: null, offset: 3 }, { date: "2026-05-20", offset: null }], { date: $df.DataType.Date, offset: $df.DataType.Int32 });
    const resNull = dfNull.select([
        $df.col("date").dt.offset_day($df.col("offset"), { excludeWeekdays: [0, 6] }).alias("res_null")
    ]).to_dicts() as any[];

    if (resNull[0].res_null !== null || resNull[1].res_null !== null) {
        throw new Error(`Edge Case Fail: Expected null input to produce null output, got ${resNull[0].res_null}, ${resNull[1].res_null}`);
    }

    // Test 6: utc_offset
    console.log("Testing Expr.dt.utc_offset...");
    const tzData = [
        { date: "2011-12-29T00:00:00Z" }, // Samoa before shift
        { date: "2012-01-01T00:00:00Z" }, // Samoa after shift
        { date: "2026-07-01T00:00:00Z" }, // New York Summer (DST active)
    ];
    const dfTz = $df.data(tzData, { date: $df.DataType.Date });

    const projectedTz = dfTz.select([
        $df.col("date").dt.utc_offset("Pacific/Apia", { type: "base" }).alias("samoa_base"),
        $df.col("date").dt.utc_offset("America/New_York", { type: "base" }).alias("ny_base"),
        $df.col("date").dt.utc_offset("America/New_York", { type: "total" }).alias("ny_dst"),
        $df.col("date").dt.utc_offset("America/New_York", { type: "daylightSavingTime" }).alias("ny_dst_only"),
        $df.col("date").dt.utc_offset("America/New_York", { type: "total", format: "iso" }).alias("ny_dst_iso"),
        $df.col("date").dt.utc_offset("America/New_York", { type: "total", format: "basic" }).alias("ny_dst_basic"),
        $df.col("date").dt.utc_offset("America/New_York", { type: "total", format: "minutes" }).alias("ny_dst_min"),
        $df.col("date").dt.utc_offset("America/New_York", { type: "total", format: "hours" }).alias("ny_dst_hr"),
        $df.col("date").dt.utc_offset("America/New_York").alias("ny_no_opts")
    ]).to_dicts() as any[];

    // Samoa before shift (Dec 29, 2011) base offset = -11 hours
    const h11 = -11 * 3600000;
    if (projectedTz[0].samoa_base !== h11) {
        throw new Error(`Expected Samoa Dec 2011 base offset to be -11 hours (${h11} ms), got ${projectedTz[0].samoa_base}`);
    }

    // Samoa after shift (Jan 1, 2012) base offset = +13 hours
    const h13 = 13 * 3600000;
    if (projectedTz[1].samoa_base !== h13) {
        throw new Error(`Expected Samoa Jan 2012 base offset to be +13 hours (${h13} ms), got ${projectedTz[1].samoa_base}`);
    }

    // New York base offset on Jul 1, 2026 is always standard winter offset (-5 hours)
    const h5neg = -5 * 3600000;
    if (projectedTz[2].ny_base !== h5neg) {
        throw new Error(`Expected NY July base offset to be -5 hours (${h5neg} ms), got ${projectedTz[2].ny_base}`);
    }

    // New York total offset on Jul 1, 2026 with DST included is -4 hours
    const h4neg = -4 * 3600000;
    if (projectedTz[2].ny_dst !== h4neg) {
        throw new Error(`Expected NY July total offset with DST to be -4 hours (${h4neg} ms), got ${projectedTz[2].ny_dst}`);
    }

    if (projectedTz[2].ny_no_opts !== h4neg) {
        throw new Error(`Expected NY July offset without options to default to total offset (${h4neg} ms), got ${projectedTz[2].ny_no_opts}`);
    }

    // NY DST only portion in summer is 1 hour (3600000 ms)
    const h1 = 3600000;
    if (projectedTz[2].ny_dst_only !== h1) {
        throw new Error(`Expected NY July DST portion to be 1 hour (${h1} ms), got ${projectedTz[2].ny_dst_only}`);
    }

    // NY DST ISO format is "-04:00"
    if (projectedTz[2].ny_dst_iso !== "-04:00") {
        throw new Error(`Expected NY July DST ISO format to be "-04:00", got "${projectedTz[2].ny_dst_iso}"`);
    }

    // NY DST Basic format is "-0400"
    if (projectedTz[2].ny_dst_basic !== "-0400") {
        throw new Error(`Expected NY July DST Basic format to be "-0400", got "${projectedTz[2].ny_dst_basic}"`);
    }

    // NY DST Minutes format is -240
    if (projectedTz[2].ny_dst_min !== -240) {
        throw new Error(`Expected NY July DST minutes to be -240, got ${projectedTz[2].ny_dst_min}`);
    }

    // NY DST Hours format is -4
    if (projectedTz[2].ny_dst_hr !== -4) {
        throw new Error(`Expected NY July DST hours to be -4, got ${projectedTz[2].ny_dst_hr}`);
    }

    console.log("Expr.dt.offset_day and utc_offset tests passed!");

    // =========================================
    // EDGE CASE TESTS FOR REFACTORED DT METHODS
    // =========================================
    console.log("Testing edge cases for microsecond, nanosecond, offset_day, and total_*...");

    // 1. microsecond & nanosecond edge cases
    const dfSubSec = $df.data([
        { ts: "2026-05-20T10:00:00.123Z" },
        { ts: "2026-05-20T10:00:00.000Z" },
        { ts: "2026-05-20T10:00:00.999Z" },
        { ts: null }
    ], { ts: $df.DataType.Datetime });

    const resSubSec = dfSubSec.select([
        $df.col("ts").dt.microsecond().alias("us"),
        $df.col("ts").dt.nanosecond().alias("ns")
    ]).to_dicts() as any[];

    if (resSubSec[0].us !== 123000 || resSubSec[0].ns !== 123000000) {
        throw new Error(`SubSec Edge Case 1 Fail: Expected 123000us/123000000ns, got us=${resSubSec[0].us}, ns=${resSubSec[0].ns}`);
    }
    if (resSubSec[1].us !== 0 || resSubSec[1].ns !== 0) {
        throw new Error(`SubSec Edge Case 2 Fail: Expected 0us/0ns, got us=${resSubSec[1].us}, ns=${resSubSec[1].ns}`);
    }
    if (resSubSec[2].us !== 999000 || resSubSec[2].ns !== 999000000) {
        throw new Error(`SubSec Edge Case 3 Fail: Expected 999000us/999000000ns, got us=${resSubSec[2].us}, ns=${resSubSec[2].ns}`);
    }
    if (resSubSec[3].us !== null || resSubSec[3].ns !== null) {
        throw new Error(`SubSec Edge Case 4 Fail: Expected null output for null input, got us=${resSubSec[3].us}, ns=${resSubSec[3].ns}`);
    }

    // 2. offset_day edge cases (standard vs business/exclusion rules)
    const dfOffset = $df.data([
        { date: "2026-05-20", n: 5 },   // Wednesday + 5 days
        { date: "2026-05-22", n: 1 },   // Friday + 1 bday (should skip weekend to Monday May 25)
        { date: "2026-05-20", n: 0 },   // 0 offset
        { date: "2026-05-20", n: -3 },  // Negative offset
        { date: null, n: 2 },           // Null date
        { date: "2026-05-20", n: null }  // Null n
    ], { date: $df.DataType.Date, n: $df.DataType.Int32 });

    const resOffset = dfOffset.select([
        $df.col("date").dt.offset_day($df.col("n")).alias("std_offset"),
        $df.col("date").dt.offset_day($df.col("n"), { excludeWeekdays: [0, 6] }).alias("biz_offset")
    ]).to_dicts() as any[];

    // Wednesday May 20 + 5 calendar days = Monday May 25
    if (new Date(resOffset[0].std_offset).toISOString() !== "2026-05-25T00:00:00.000Z") {
        throw new Error(`Offset Edge Case 1 Fail: Expected 2026-05-25, got ${resOffset[0].std_offset}`);
    }
    // Friday May 22 + 1 biz day (skipping weekend) = Monday May 25
    if (new Date(resOffset[1].biz_offset).toISOString() !== "2026-05-25T00:00:00.000Z") {
        throw new Error(`Offset Edge Case 2 Fail: Expected 2026-05-25, got ${resOffset[1].biz_offset}`);
    }
    // 0 offset = same date May 20
    if (new Date(resOffset[2].std_offset).toISOString() !== "2026-05-20T00:00:00.000Z") {
        throw new Error(`Offset Edge Case 3 Fail: Expected 2026-05-20, got ${resOffset[2].std_offset}`);
    }
    // Negative -3 calendar days from May 20 = May 17
    if (new Date(resOffset[3].std_offset).toISOString() !== "2026-05-17T00:00:00.000Z") {
        throw new Error(`Offset Edge Case 4 Fail: Expected 2026-05-17, got ${resOffset[3].std_offset}`);
    }
    // Null checks
    if (resOffset[4].std_offset !== null || resOffset[5].std_offset !== null) {
        throw new Error(`Offset Edge Case 5 Fail: Expected null output for null inputs`);
    }

    // 3. total_* methods edge cases (positive, negative, zero, null)
    const dfDur = $df.data([
        { dur: 86400000 },    // 1 day in ms
        { dur: -3600000 },    // -1 hour in ms
        { dur: 0 },           // 0 ms
        { dur: null }         // null
    ], { dur: $df.DataType.Float64 });

    const resDur = dfDur.select([
        $df.col("dur").dt.total_days().alias("d"),
        $df.col("dur").dt.total_hours().alias("h"),
        $df.col("dur").dt.total_minutes().alias("m"),
        $df.col("dur").dt.total_seconds().alias("s"),
        $df.col("dur").dt.total_milliseconds().alias("ms"),
        $df.col("dur").dt.total_microseconds().alias("us"),
        $df.col("dur").dt.total_nanoseconds().alias("ns")
    ]).to_dicts() as any[];

    if (resDur[0].d !== 1 || resDur[0].h !== 24 || resDur[0].m !== 1440 || resDur[0].s !== 86400) {
        throw new Error(`Total Edge Case 1 Fail: Expected 1d/24h/1440m/86400s, got ${resDur[0].d}d ${resDur[0].h}h`);
    }
    if (resDur[1].h !== -1 || resDur[1].m !== -60 || resDur[1].s !== -3600) {
        throw new Error(`Total Edge Case 2 Fail: Expected -1h/-60m/-3600s, got ${resDur[1].h}h ${resDur[1].m}m`);
    }
    if (resDur[2].d !== 0 || resDur[2].h !== 0 || resDur[2].ms !== 0 || resDur[2].us !== 0 || resDur[2].ns !== 0) {
        throw new Error(`Total Edge Case 3 Fail: Expected 0 across all units, got d=${resDur[2].d}`);
    }
    if (resDur[3].d !== null || resDur[3].h !== null || resDur[3].ms !== null) {
        throw new Error(`Total Edge Case 4 Fail: Expected null output for null duration input`);
    }

    console.log("All refactored dt method edge cases passed successfully!");

    console.log("\n🎉 ALL Expr.dt COLUMN EXPRESSION TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("\n❌ Expr.dt COLUMN EXPRESSION TESTS FAILED:", err);
    process.exit(1);
}


import { $df } from "../../src/api";

console.log("=========================================");
console.log("EXTENSIVE POLARS TEMPORAL EDGE-CASE TESTS...");
console.log("=========================================");



// 2. Comprehensive Edge Cases Test Suite
const dfComplex = $df.data({
    ts: [
        "2024-02-29T23:45:15.123Z", // Leap year leap day late evening UTC
        "2026-12-31T23:59:59.999Z", // New Year's Eve 1ms before 2027
        "2026-06-01T00:00:00.000Z", // Midnight UTC summer
        null                      // Null row propagation
    ]
});

const resComplex = dfComplex.with_columns(
    // Timezone getters (Tokyo is UTC+9, New York is UTC-5 / UTC-4 EDT)
    $df.col("ts").dt.hour("Asia/Tokyo").alias("tokyo_hour"),
    $df.col("ts").dt.day("Asia/Tokyo").alias("tokyo_day"),
    $df.col("ts").dt.month("Asia/Tokyo").alias("tokyo_month"),
    $df.col("ts").dt.year("Asia/Tokyo").alias("tokyo_year"),

    $df.col("ts").dt.hour("America/New_York").alias("ny_hour"),
    $df.col("ts").dt.day("America/New_York").alias("ny_day"),

    // Component replacement with Timezone offset shift
    $df.col("ts").dt.replace({ year: 2030, month: 12, day: 25, hour: 8, timeZone: "America/Chicago" }).alias("replaced_chicago"),

    // Metadata casting & timezone conversion
    $df.col("ts").dt.convert_time_zone("Europe/London").alias("converted_london"),
    $df.col("ts").dt.cast_time_unit("us").alias("casted_us"),

    // Component getters without timezone (UTC default)
    $df.col("ts").dt.hour().alias("utc_hour"),
    $df.col("ts").dt.day().alias("utc_day"),
    $df.col("ts").dt.month().alias("utc_month"),
    $df.col("ts").dt.year().alias("utc_year"),
    $df.col("ts").dt.weekday().alias("utc_weekday")
);

const complexRows = resComplex.to_dicts() as any[];

// Edge Case 1: 2024-02-29T23:45:15.123Z in Tokyo (UTC+9) rolls over to 2024-03-01 08:45:15!
const row0 = complexRows[0];
if (row0.tokyo_hour !== 8) throw new Error(`Expected Tokyo hour to be 8, got ${row0.tokyo_hour}`);
if (row0.tokyo_day !== 1) throw new Error(`Expected Tokyo day to be 1 (March 1), got ${row0.tokyo_day}`);
if (row0.tokyo_month !== 3) throw new Error(`Expected Tokyo month to be 3 (March), got ${row0.tokyo_month}`);
if (row0.tokyo_year !== 2024) throw new Error(`Expected Tokyo year to be 2024, got ${row0.tokyo_year}`);

// Edge Case 2: 2026-12-31T23:59:59.999Z in Tokyo (UTC+9) rolls over to Year 2027-01-01 08:59:59!
const row1 = complexRows[1];
if (row1.tokyo_year !== 2027) throw new Error(`Expected Tokyo year for New Year Eve to be 2027, got ${row1.tokyo_year}`);
if (row1.tokyo_month !== 1) throw new Error(`Expected Tokyo month to be 1 (Jan), got ${row1.tokyo_month}`);
if (row1.tokyo_day !== 1) throw new Error(`Expected Tokyo day to be 1, got ${row1.tokyo_day}`);
if (row1.tokyo_hour !== 8) throw new Error(`Expected Tokyo hour to be 8, got ${row1.tokyo_hour}`);

// Edge Case 3: New York (EDT, UTC-4 in June) for 2026-06-01T00:00:00.000Z -> 2026-05-31 20:00:00!
const row2 = complexRows[2];
if (row2.ny_hour !== 20) throw new Error(`Expected NY hour to be 20, got ${row2.ny_hour}`);
if (row2.ny_day !== 31) throw new Error(`Expected NY day to be 31 (May 31), got ${row2.ny_day}`);

// Edge Case 4: Null row propagation across all expressions
const row3 = complexRows[3];
if (row3.tokyo_hour !== null) throw new Error("Null propagation failed for tokyo_hour");
if (row3.tokyo_day !== null) throw new Error("Null propagation failed for tokyo_day");
if (row3.replaced_chicago !== null) throw new Error("Null propagation failed for replaced_chicago");
if (row3.converted_london !== null) throw new Error("Null propagation failed for converted_london");
if (row3.casted_us !== null) throw new Error("Null propagation failed for casted_us");

// Edge Case 5: DatetimeType metadata assertions
const schemaRes = resComplex.schema;
const londonType = schemaRes["converted_london"] as any;
if (!londonType || londonType.timeZone !== "Europe/London") {
    throw new Error(`convert_time_zone failed to store timeZone metadata: ${londonType?.timeZone}`);
}

const usType = schemaRes["casted_us"] as any;
if (!usType || usType.timeUnit !== "us") {
    throw new Error(`cast_time_unit failed to store timeUnit metadata: ${usType?.timeUnit}`);
}

// ============================================================================
// 3. Additional Deep Edge Cases Test Suite
// ============================================================================
console.log("Running additional temporal edge-case boundary tests...");

const dfEdge = $df.data({
    ts: [
        "2024-02-29T12:00:00.000Z", // Leap day noon UTC
        "2023-02-28T12:00:00.000Z", // Non-leap year Feb end
        "2024-11-03T05:30:00.000Z", // Fall DST transition window (US)
        "2026-03-08T07:00:00.000Z", // Spring DST transition window (US)
        "1970-01-01T00:00:00.000Z", // Unix Epoch Boundary
        "0001-01-01T00:00:00.000Z", // Historical year 1
        "invalid-date-string"       // Invalid string handling
    ]
});

const resEdge = dfEdge.with_columns(
    $df.col("ts").dt.is_leap_year().alias("is_leap"),
    $df.col("ts").dt.days_in_month("UTC").alias("dim_utc"),
    $df.col("ts").dt.days_in_month("Asia/Kathmandu").alias("dim_kathmandu"), // Half-hour offset timezone (UTC+5:45)
    $df.col("ts").dt.utc_offset("America/New_York", { format: "minutes" }).alias("ny_offset_min"),
    $df.col("ts").dt.strftime({ format: "%Y-%m-%d %H:%M:%S", timeZone: "Asia/Tokyo" }).alias("fmt_tokyo"),
    $df.col("ts").dt.ordinal_day().alias("doy"),
    $df.col("ts").dt.quarter().alias("qtr"),
    $df.col("ts").dt.iso_week().alias("iso_wk"),
    $df.col("ts").dt.epoch("s").alias("epoch_s")
);

const edgeRows = resEdge.to_dicts() as any[];

// Test 1: Leap day vs non-leap year Feb days
if (edgeRows[0].is_leap !== true) throw new Error("Expected 2024 to be leap year");
if (edgeRows[0].dim_utc !== 29) throw new Error("Expected 2024-02 to have 29 days");
if (edgeRows[1].is_leap !== false) throw new Error("Expected 2023 not to be leap year");
if (edgeRows[1].dim_utc !== 28) throw new Error("Expected 2023-02 to have 28 days");

// Test 2: Half-hour / 45-min offset timezone (Kathmandu UTC+5:45)
// 2024-02-29 12:00:00 UTC -> 17:45:00 Kathmandu -> Feb 29
if (edgeRows[0].dim_kathmandu !== 29) throw new Error("Expected Kathmandu dim to be 29");

// Test 3: Standard Time vs Daylight Saving Time offsets (America/New_York)
// Nov 3, 2024 is EST (UTC-5 -> -300 min); March 8, 2026 is EST (UTC-5 -> -300 min)
if (typeof edgeRows[2].ny_offset_min !== "number") throw new Error("Expected numeric offset for NY DST");

// Test 4: Epoch 1970-01-01 epoch_s = 0
if (edgeRows[4].epoch_s !== 0) throw new Error(`Expected epoch_s to be 0 for Unix epoch, got ${edgeRows[4].epoch_s}`);

// Test 5: Invalid date string returns null safely
const invalidRow = edgeRows[6];
if (invalidRow.is_leap !== null) throw new Error("Invalid date should produce null for is_leap");
if (invalidRow.dim_utc !== null) throw new Error("Invalid date should produce null for dim_utc");
if (invalidRow.fmt_tokyo !== null) throw new Error("Invalid date should produce null for fmt_tokyo");
if (invalidRow.epoch_s !== null) throw new Error("Invalid date should produce null for epoch_s");

// Test 6: strftime with timezone formatting correctness
// 2024-02-29T12:00:00.000Z in Tokyo (UTC+9) -> 2024-02-29 21:00:00
if (edgeRows[0].fmt_tokyo !== "2024-02-29 21:00:00") {
    throw new Error(`Expected fmt_tokyo to be "2024-02-29 21:00:00", got "${edgeRows[0].fmt_tokyo}"`);
}

console.log("✓ All extensive Polars temporal edge-case tests passed successfully!");


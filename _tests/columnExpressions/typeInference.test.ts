declare const process: any;
import { $df } from "../../src/index";
import { DatetimeType, DurationType, BooleanType, DecimalType } from "../../src/datatypes/types";

console.log("=========================================");
console.log("STARTING POST-OPERATION TYPE INFERENCE TESTS...");
console.log("=========================================");

try {
    const df = $df.data({
        start_dt: ["2026-01-01T00:00:00.000Z", "2026-05-01T12:00:00.000Z"],
        end_dt: ["2026-01-02T00:00:00.000Z", "2026-05-02T12:00:00.000Z"],
        start_d: ["2026-01-01", "2026-05-01"],
        end_d: ["2026-01-03", "2026-05-03"],
        offset_ms: [3600000, 7200000]
    }, {
        start_dt: new DatetimeType("ms"),
        end_dt: new DatetimeType("ms"),
        start_d: $df.Date,
        end_d: $df.Date,
        offset_ms: new DurationType("ms")
    });

    // 1. Datetime - Datetime => Duration
    const diffDf = df.withColumns(
        $df.col("end_dt").sub($df.col("start_dt")).alias("dt_diff")
    );
    const dtDiffSchema = diffDf.schema["dt_diff"];
    if (!(dtDiffSchema instanceof DurationType)) {
        throw new Error(`Expected dt_diff to be DurationType, got ${(dtDiffSchema as any)?.name}`);
    }
    const dtDiffRows = diffDf.toDicts() as any[];
    if (dtDiffRows[0].dt_diff !== 86400000 || dtDiffRows[1].dt_diff !== 86400000) {
        throw new Error(`Unexpected dt_diff values: ${JSON.stringify(dtDiffRows)}`);
    }

    // 2. Date - Date => Duration
    const dateDiffDf = df.withColumns(
        $df.col("end_d").sub($df.col("start_d")).alias("date_diff")
    );
    const dateDiffSchema = dateDiffDf.schema["date_diff"];
    if (!(dateDiffSchema instanceof DurationType)) {
        throw new Error(`Expected date_diff to be DurationType, got ${(dateDiffSchema as any)?.name}`);
    }
    const dateDiffRows = dateDiffDf.toDicts() as any[];
    if (dateDiffRows[0].date_diff !== 172800000 || dateDiffRows[1].date_diff !== 172800000) {
        throw new Error(`Unexpected date_diff values: ${JSON.stringify(dateDiffRows)}`);
    }

    // 3. Datetime + Duration => Datetime
    const addDurDf = df.withColumns(
        $df.col("start_dt").add($df.col("offset_ms")).alias("shifted_dt")
    );
    const shiftedSchema = addDurDf.schema["shifted_dt"];
    if (!(shiftedSchema instanceof DatetimeType)) {
        throw new Error(`Expected shifted_dt to be DatetimeType, got ${(shiftedSchema as any)?.name}`);
    }
    const shiftedRows = addDurDf.toDicts() as any[];
    if ((shiftedRows[0].shifted_dt as Date).toISOString() !== "2026-01-01T01:00:00.000Z") {
        throw new Error(`Unexpected shifted_dt value: ${(shiftedRows[0].shifted_dt as Date).toISOString()}`);
    }

    // 4. Datetime - Duration => Datetime
    const subDurDf = df.withColumns(
        $df.col("start_dt").sub($df.col("offset_ms")).alias("sub_dt")
    );
    const subDtSchema = subDurDf.schema["sub_dt"];
    if (!(subDtSchema instanceof DatetimeType)) {
        throw new Error(`Expected sub_dt to be DatetimeType, got ${(subDtSchema as any)?.name}`);
    }

    // 5. Duration + Duration => Duration
    const durAddDf = df.withColumns(
        $df.col("offset_ms").add($df.duration({ hours: 2 })).alias("total_dur")
    );
    const totalDurSchema = durAddDf.schema["total_dur"];
    if (!(totalDurSchema instanceof DurationType)) {
        throw new Error(`Expected total_dur to be DurationType, got ${(totalDurSchema as any)?.name}`);
    }
    const durRows = durAddDf.toDicts() as any[];
    if (durRows[0].total_dur !== 3600000 + 7200000) {
        throw new Error(`Unexpected total_dur value: ${durRows[0].total_dur}`);
    }

    // 6. Duration * Number => Duration
    const durMulDf = df.withColumns(
        $df.col("offset_ms").mul(3).alias("tripled_dur")
    );
    const tripledDurSchema = durMulDf.schema["tripled_dur"];
    if (!(tripledDurSchema instanceof DurationType)) {
        throw new Error(`Expected tripled_dur to be DurationType, got ${(tripledDurSchema as any)?.name}`);
    }
    const tripledRows = durMulDf.toDicts() as any[];
    if (tripledRows[0].tripled_dur !== 10800000) {
        throw new Error(`Unexpected tripled_dur value: ${tripledRows[0].tripled_dur}`);
    }

    // 7. Comparison operators => Boolean
    const compDf = df.withColumns(
        $df.col("start_dt").lt($df.col("end_dt")).alias("is_earlier"),
        $df.col("offset_ms").gt(5000000).alias("is_long_offset")
    );
    if (!(compDf.schema["is_earlier"] instanceof BooleanType) && compDf.schema["is_earlier"].name !== "Boolean") {
        throw new Error(`Expected is_earlier to be Boolean, got ${compDf.schema["is_earlier"].name}`);
    }
    if (!(compDf.schema["is_long_offset"] instanceof BooleanType) && compDf.schema["is_long_offset"].name !== "Boolean") {
        throw new Error(`Expected is_long_offset to be Boolean, got ${compDf.schema["is_long_offset"].name}`);
    }

    // 8. Complex Window Expressions (.over())
    const windowDf = $df.data({
        dept: ["eng", "eng", "hr", "hr"],
        start_dt: [
            new Date("2026-01-01T00:00:00.000Z"),
            new Date("2026-01-02T00:00:00.000Z"),
            new Date("2026-01-01T00:00:00.000Z"),
            new Date("2026-01-03T00:00:00.000Z")
        ],
        end_dt: [
            new Date("2026-01-05T00:00:00.000Z"),
            new Date("2026-01-06T00:00:00.000Z"),
            new Date("2026-01-04T00:00:00.000Z"),
            new Date("2026-01-07T00:00:00.000Z")
        ],
        shift_dur: [3600000, 7200000, 1800000, 3600000]
    }, {
        dept: $df.Utf8,
        start_dt: new DatetimeType("ms"),
        end_dt: new DatetimeType("ms"),
        shift_dur: new DurationType("ms")
    });

    const windowRes = windowDf.withColumns(
        // Windowed temporal difference: (end_dt - start_dt).over("dept") => Duration
        $df.col("end_dt").sub($df.col("start_dt")).over("dept").alias("windowed_diff"),
        // Windowed shifted date: (start_dt + shift_dur).over("dept") => Datetime
        $df.col("start_dt").add($df.col("shift_dur")).over("dept").alias("windowed_shifted"),
        // Windowed row_number: row_number().over("dept") => Int32/Float64
        $df.col("start_dt").rowNumber().over("dept").alias("rn"),
        // Windowed comparison: (start_dt < end_dt).over("dept") => Boolean
        $df.col("start_dt").lt($df.col("end_dt")).over("dept").alias("is_valid_range")
    );

    if (!(windowRes.schema["windowed_diff"] instanceof DurationType)) {
        throw new Error(`Expected windowed_diff to be DurationType, got ${(windowRes.schema["windowed_diff"] as any)?.name}`);
    }
    if (!(windowRes.schema["windowed_shifted"] instanceof DatetimeType)) {
        throw new Error(`Expected windowed_shifted to be DatetimeType, got ${(windowRes.schema["windowed_shifted"] as any)?.name}`);
    }
    if (windowRes.schema["is_valid_range"].name !== "Boolean" && !(windowRes.schema["is_valid_range"] instanceof BooleanType)) {
        throw new Error(`Expected is_valid_range to be Boolean, got ${(windowRes.schema["is_valid_range"] as any)?.name}`);
    }

    // 9. Grouped Aggregations (groupBy.agg) with Type Deduction
    const groupDf = windowDf.groupBy("dept").agg(
        // Duration max/min/sum inside groupBy
        $df.col("shift_dur").max().alias("max_shift"),
        $df.col("shift_dur").min().alias("min_shift"),
        // Datetime max inside groupBy
        $df.col("start_dt").max().alias("latest_start"),
        // Comparison aggregation inside groupBy (all truthy -> Boolean)
        $df.col("dept").eq("eng").all().alias("all_eng")
    );

    if (!(groupDf.schema["max_shift"] instanceof DurationType)) {
        throw new Error(`Expected max_shift to be DurationType, got ${(groupDf.schema["max_shift"] as any)?.name}`);
    }
    if (!(groupDf.schema["min_shift"] instanceof DurationType)) {
        throw new Error(`Expected min_shift to be DurationType, got ${(groupDf.schema["min_shift"] as any)?.name}`);
    }
    if (!(groupDf.schema["latest_start"] instanceof DatetimeType)) {
        throw new Error(`Expected latest_start to be DatetimeType, got ${(groupDf.schema["latest_start"] as any)?.name}`);
    }
    if (groupDf.schema["all_eng"].name !== "Boolean" && !(groupDf.schema["all_eng"] instanceof BooleanType)) {
        throw new Error(`Expected all_eng to be Boolean, got ${(groupDf.schema["all_eng"] as any)?.name}`);
    }

    // 10. Chained Complex Operations: (end_dt - start_dt) + Duration => Duration
    const chainedDf = windowDf.withColumns(
        $df.col("end_dt").sub($df.col("start_dt")).add($df.duration({ hours: 1 })).alias("extended_diff")
    );
    if (!(chainedDf.schema["extended_diff"] instanceof DurationType)) {
        throw new Error(`Expected extended_diff to be DurationType, got ${(chainedDf.schema["extended_diff"] as any)?.name}`);
    }

    // 11. when().then().otherwise() Conditional Branching
    const conditionalDf = windowDf.withColumns(
        // Conditional yielding Duration
        $df.when($df.col("dept").eq("eng"))
            .then($df.col("end_dt").sub($df.col("start_dt")))
            .otherwise($df.duration({ hours: 24 }))
            .alias("conditional_duration"),
        // Conditional yielding Datetime
        $df.when($df.col("dept").eq("hr"))
            .then($df.col("start_dt").add($df.col("shift_dur")))
            .otherwise(new Date("2026-01-01T00:00:00.000Z"))
            .alias("conditional_datetime"),
        // Conditional comparison check yielding Boolean
        $df.when($df.col("shift_dur").gt(3600000))
            .then(true)
            .otherwise(false)
            .alias("is_long_shift")
    );

    if (!(conditionalDf.schema["conditional_duration"] instanceof DurationType)) {
        throw new Error(`Expected conditional_duration to be DurationType, got ${(conditionalDf.schema["conditional_duration"] as any)?.name}`);
    }
    if (!(conditionalDf.schema["conditional_datetime"] instanceof DatetimeType)) {
        throw new Error(`Expected conditional_datetime to be DatetimeType, got ${(conditionalDf.schema["conditional_datetime"] as any)?.name}`);
    }
    if (conditionalDf.schema["is_long_shift"].name !== "Boolean" && !(conditionalDf.schema["is_long_shift"] instanceof BooleanType)) {
        throw new Error(`Expected is_long_shift to be Boolean, got ${(conditionalDf.schema["is_long_shift"] as any)?.name}`);
    }

    // 12. Complex Multi-Stage Select & Chained Arithmetic
    const complexSelectDf = windowDf.select(
        // Duration scaling and windowing
        $df.col("shift_dur").mul(2).over("dept").alias("doubled_shift"),
        // Datetime difference scaled by float
        $df.col("end_dt").sub($df.col("start_dt")).div(2).alias("half_duration"),
        // Multi-level temporal expression in select
        $df.col("start_dt").add($df.col("end_dt").sub($df.col("start_dt"))).alias("reconstructed_end"),
        // Chained comparison inside select
        $df.col("shift_dur").mul(2).gt($df.duration({ hours: 3 })).alias("shift_gt_3h")
    );

    if (!(complexSelectDf.schema["doubled_shift"] instanceof DurationType)) {
        throw new Error(`Expected doubled_shift to be DurationType, got ${(complexSelectDf.schema["doubled_shift"] as any)?.name}`);
    }
    if (!(complexSelectDf.schema["half_duration"] instanceof DurationType)) {
        throw new Error(`Expected half_duration to be DurationType, got ${(complexSelectDf.schema["half_duration"] as any)?.name}`);
    }
    if (!(complexSelectDf.schema["reconstructed_end"] instanceof DatetimeType)) {
        throw new Error(`Expected reconstructed_end to be DatetimeType, got ${(complexSelectDf.schema["reconstructed_end"] as any)?.name}`);
    }
    if (complexSelectDf.schema["shift_gt_3h"].name !== "Boolean" && !(complexSelectDf.schema["shift_gt_3h"] instanceof BooleanType)) {
        throw new Error(`Expected shift_gt_3h to be Boolean, got ${(complexSelectDf.schema["shift_gt_3h"] as any)?.name}`);
    }

    // 13. GroupBy Aggregation Combined with Post-Aggregation Calculations
    const postAggDf = windowDf.groupBy("dept").agg(
        $df.col("start_dt").min().alias("earliest_start"),
        $df.col("end_dt").max().alias("latest_end"),
        $df.col("shift_dur").sum().alias("total_shift_dur")
    ).withColumns(
        $df.col("latest_end").sub($df.col("earliest_start")).alias("span_duration"),
        $df.col("earliest_start").add($df.col("total_shift_dur")).alias("projected_completion")
    );

    if (!(postAggDf.schema["earliest_start"] instanceof DatetimeType)) {
        throw new Error(`Expected earliest_start to be DatetimeType, got ${(postAggDf.schema["earliest_start"] as any)?.name}`);
    }
    if (!(postAggDf.schema["latest_end"] instanceof DatetimeType)) {
        throw new Error(`Expected latest_end to be DatetimeType, got ${(postAggDf.schema["latest_end"] as any)?.name}`);
    }
    if (!(postAggDf.schema["total_shift_dur"] instanceof DurationType)) {
        throw new Error(`Expected total_shift_dur to be DurationType, got ${(postAggDf.schema["total_shift_dur"] as any)?.name}`);
    }
    if (!(postAggDf.schema["span_duration"] instanceof DurationType)) {
        throw new Error(`Expected span_duration to be DurationType, got ${(postAggDf.schema["span_duration"] as any)?.name}`);
    }
    if (!(postAggDf.schema["projected_completion"] instanceof DatetimeType)) {
        throw new Error(`Expected projected_completion to be DatetimeType, got ${(postAggDf.schema["projected_completion"] as any)?.name}`);
    }

    // 14. Multi-Branch when().then().when().then().otherwise()
    const multiBranchDf = windowDf.withColumns(
        $df.when($df.col("dept").eq("eng"))
            .then($df.col("end_dt").sub($df.col("start_dt")))
            .when($df.col("dept").eq("hr"))
            .then($df.col("shift_dur").mul(2))
            .otherwise($df.duration({ hours: 10 }))
            .alias("multi_branch_duration")
    );

    if (!(multiBranchDf.schema["multi_branch_duration"] instanceof DurationType)) {
        throw new Error(`Expected multi_branch_duration to be DurationType, got ${(multiBranchDf.schema["multi_branch_duration"] as any)?.name}`);
    }

    // 15. Nested Arithmetic & Window Aggregation Expressions inside select()
    const nestedWindowDf = windowDf.select(
        // (end_dt - start_dt).max().over("dept") => Duration
        $df.col("end_dt").sub($df.col("start_dt")).max().over("dept").alias("max_dept_diff"),
        // (start_dt + shift_dur).min().over("dept") => Datetime
        $df.col("start_dt").add($df.col("shift_dur")).min().over("dept").alias("earliest_dept_shift"),
        // ((end_dt - start_dt) > Duration).over("dept") => Boolean
        $df.col("end_dt").sub($df.col("start_dt")).gt($df.duration({ hours: 48 })).over("dept").alias("is_dept_long")
    );

    if (!(nestedWindowDf.schema["max_dept_diff"] instanceof DurationType)) {
        throw new Error(`Expected max_dept_diff to be DurationType, got ${(nestedWindowDf.schema["max_dept_diff"] as any)?.name}`);
    }
    if (!(nestedWindowDf.schema["earliest_dept_shift"] instanceof DatetimeType)) {
        throw new Error(`Expected earliest_dept_shift to be DatetimeType, got ${(nestedWindowDf.schema["earliest_dept_shift"] as any)?.name}`);
    }
    if (nestedWindowDf.schema["is_dept_long"].name !== "Boolean" && !(nestedWindowDf.schema["is_dept_long"] instanceof BooleanType)) {
        throw new Error(`Expected is_dept_long to be Boolean, got ${(nestedWindowDf.schema["is_dept_long"] as any)?.name}`);
    }

    // 16. Numeric Promotions: Int + Float => Float64, Int64 + Int => Int64
    const numericDf = $df.data({
        int_val: [10, 20],
        float_val: [1.5, 2.5],
        big_val: [100n, 200n]
    }, {
        int_val: $df.Int32,
        float_val: $df.Float64,
        big_val: $df.Int64
    });

    const numericRes = numericDf.withColumns(
        // Int + Float => Float64
        $df.col("int_val").add($df.col("float_val")).alias("sum_float"),
        // Int64 + Int64 => Int64
        $df.col("big_val").add(10n).alias("big_add"),
        // Statistical mean on Int32 => Float64
        $df.col("int_val").mean().alias("mean_int")
    );

    if (numericRes.schema["sum_float"].name !== "Float64") {
        throw new Error(`Expected sum_float to be Float64, got ${numericRes.schema["sum_float"].name}`);
    }
    if (numericRes.schema["big_add"].name !== "Int64") {
        throw new Error(`Expected big_add to be Int64, got ${numericRes.schema["big_add"].name}`);
    }
    if (numericRes.schema["mean_int"].name !== "Float64") {
        throw new Error(`Expected mean_int to be Float64, got ${numericRes.schema["mean_int"].name}`);
    }

    // 17. Struct Subfield Access
    const structDf = $df.data({
        user: [
            { name: "Alice", age: 30 },
            { name: "Bob", age: 25 }
        ]
    }, {
        user: $df.Struct({
            name: $df.Utf8,
            age: $df.Int32
        })
    });

    const structRes = structDf.withColumns(
        $df.col("user").struct.field("name").alias("user_name"),
        $df.col("user").struct.field("age").alias("user_age")
    );

    if (structRes.schema["user_name"].name !== "Utf8") {
        throw new Error(`Expected user_name to be Utf8, got ${structRes.schema["user_name"].name}`);
    }
    if (structRes.schema["user_age"].name !== "Int32") {
        throw new Error(`Expected user_age to be Int32, got ${structRes.schema["user_age"].name}`);
    }

    // 18. Array Implode & Extraction
    const arrayDf = $df.data({
        grp: ["A", "A", "B", "B"],
        val: [10, 20, 30, 40]
    }, {
        grp: $df.Utf8,
        val: $df.Int32
    });

    const arrayGrouped = arrayDf.groupBy("grp").agg(
        $df.col("val").implode().alias("val_list")
    );

    if (arrayGrouped.schema["val_list"].name !== "Array") {
        throw new Error(`Expected val_list to be Array, got ${arrayGrouped.schema["val_list"].name}`);
    }
    if ((arrayGrouped.schema["val_list"] as any).innerType.name !== "Int32") {
        throw new Error(`Expected val_list innerType to be Int32, got ${(arrayGrouped.schema["val_list"] as any).innerType.name}`);
    }

    // 19. Time Arithmetic & Differences: Time - Time => Duration, Time +/- Duration => Time
    const timeDf = $df.data({
        start_t: ["08:30:00.000", "12:00:00.000"],
        end_t: ["09:00:00.000", "13:30:00.000"],
        shift_dur: [1800000, 3600000]
    }, {
        start_t: $df.Time,
        end_t: $df.Time,
        shift_dur: new DurationType("ms")
    });

    const timeRes = timeDf.withColumns(
        $df.col("end_t").sub($df.col("start_t")).alias("t_diff"),
        $df.col("start_t").add($df.col("shift_dur")).alias("t_offset")
    );

    if (!(timeRes.schema["t_diff"] instanceof DurationType)) {
        throw new Error(`Expected t_diff to be DurationType, got ${(timeRes.schema["t_diff"] as any)?.name}`);
    }

    // 20. Decimal & Float32 Arithmetic
    const decDf = $df.data({
        dec_val: [10.5, 20.25],
        f32_val: [1.2, 2.4]
    }, {
        dec_val: $df.Decimal(10, 2),
        f32_val: $df.Float32
    });

    const decRes = decDf.withColumns(
        $df.col("dec_val").add($df.col("f32_val")).alias("dec_f32_sum"),
        $df.col("dec_val").mul(2).alias("dec_scaled")
    );

    if (decRes.schema["dec_f32_sum"].name !== "Float64") {
        throw new Error(`Expected dec_f32_sum to be Float64, got ${decRes.schema["dec_f32_sum"].name}`);
    }

    // 21. Binary and Utf8 Concatenation
    const strDf = $df.data({
        first_name: ["John", "Jane"],
        last_name: ["Doe", "Smith"],
        bin_data: [new Uint8Array([1, 2]), new Uint8Array([3, 4])]
    }, {
        first_name: $df.Utf8,
        last_name: $df.Utf8,
        bin_data: $df.Binary
    });

    const strRes = strDf.withColumns(
        $df.col("first_name").str.concat(" ").str.concat($df.col("last_name")).alias("full_name"),
        $df.col("first_name").str.slice(0, 2).alias("initials")
    );

    if (strRes.schema["full_name"].name !== "Utf8") {
        throw new Error(`Expected full_name to be Utf8, got ${strRes.schema["full_name"].name}`);
    }
    if (strRes.schema["initials"].name !== "Utf8") {
        throw new Error(`Expected initials to be Utf8, got ${strRes.schema["initials"].name}`);
    }

    // 22. Unsigned Integers & String Length Count
    const uintDf = $df.data({
        u8: [255, 128],
        u16: [65535, 32768],
        u32: [1000000, 2000000],
        u64: [10000000000n, 20000000000n]
    }, {
        u8: $df.UInt8,
        u16: $df.UInt16,
        u32: $df.UInt32,
        u64: $df.UInt64
    });

    const uintRes = uintDf.withColumns(
        $df.col("u8").add($df.col("u16")).alias("u_sum"),
        $df.col("u64").add(100n).alias("u64_add")
    );

    if (uintRes.schema["u64_add"].name !== "Int64") {
        throw new Error(`Expected u64_add to be Int64, got ${uintRes.schema["u64_add"].name}`);
    }

    // 23. Nested Arrays & Unnesting / Extraction
    const nestedArrDf = $df.data({
        matrix: [
            [[1, 2], [3, 4]],
            [[5, 6], [7, 8]]
        ]
    }, {
        matrix: $df.Array($df.Array($df.Int32))
    });

    const nestedArrRes = nestedArrDf.withColumns(
        $df.col("matrix").arr.get(0).alias("first_row"),
        $df.col("matrix").arr.first().alias("first_row_fn")
    );

    if (nestedArrRes.schema["first_row"].name !== "Array") {
        throw new Error(`Expected first_row to be Array, got ${nestedArrRes.schema["first_row"].name}`);
    }
    if ((nestedArrRes.schema["first_row"] as any).innerType.name !== "Int32") {
        throw new Error(`Expected innerType of first_row to be Int32, got ${(nestedArrRes.schema["first_row"] as any).innerType.name}`);
    }

    // 24. Nulls & Missing Value Propagation
    const nullDf = $df.data({
        val: [null, 42],
        fallback: [100, 200]
    }, {
        val: $df.Int32,
        fallback: $df.Int32
    });

    const nullRes = nullDf.withColumns(
        $df.col("val").fillNull({ value: $df.col("fallback") }).alias("filled")
    );

    if (nullRes.schema["filled"].name !== "Int32") {
        throw new Error(`Expected filled to be Int32, got ${nullRes.schema["filled"].name}`);
    }

    // 25. Complete Integer Promotion Rank Hierarchy (Int8 -> Int16 -> Int32 and Int64)
    const intRankDf = $df.data({
        i8: [10, 20],
        i16: [1000, 2000],
        i32: [100000, 200000],
        i64: [10000000000n, 20000000000n]
    }, {
        i8: $df.Int8,
        i16: $df.Int16,
        i32: $df.Int32,
        i64: $df.Int64
    });

    const intRankRes = intRankDf.withColumns(
        $df.col("i8").add($df.col("i16")).alias("promoted_16"),
        $df.col("i16").add($df.col("i32")).alias("promoted_32"),
        $df.col("i64").add(5000000000n).alias("promoted_64"),
        $df.col("i8").add($df.col("i8")).alias("same_8")
    );

    if (intRankRes.schema["promoted_16"].name !== "Int16") {
        throw new Error(`Expected promoted_16 to be Int16, got ${intRankRes.schema["promoted_16"].name}`);
    }
    if (intRankRes.schema["promoted_32"].name !== "Int32") {
        throw new Error(`Expected promoted_32 to be Int32, got ${intRankRes.schema["promoted_32"].name}`);
    }
    if (intRankRes.schema["promoted_64"].name !== "Int64") {
        throw new Error(`Expected promoted_64 to be Int64, got ${intRankRes.schema["promoted_64"].name}`);
    }
    if (intRankRes.schema["same_8"].name !== "Int8") {
        throw new Error(`Expected same_8 to be Int8, got ${intRankRes.schema["same_8"].name}`);
    }

    // 26. Complete Unsigned Integer Hierarchy (UInt8 -> UInt16 -> UInt32 and UInt64)
    const uintRankDf = $df.data({
        u8: [10, 20],
        u16: [1000, 2000],
        u32: [100000, 200000],
        u64: [10000000000n, 20000000000n]
    }, {
        u8: $df.UInt8,
        u16: $df.UInt16,
        u32: $df.UInt32,
        u64: $df.UInt64
    });

    const uintRankRes = uintRankDf.withColumns(
        $df.col("u8").add($df.col("u16")).alias("u_promoted_16"),
        $df.col("u16").add($df.col("u32")).alias("u_promoted_32"),
        $df.col("u64").add(5000000000n).alias("u_promoted_64")
    );

    if (uintRankRes.schema["u_promoted_16"].name !== "Int16") {
        throw new Error(`Expected u_promoted_16 to be Int16, got ${uintRankRes.schema["u_promoted_16"].name}`);
    }
    if (uintRankRes.schema["u_promoted_32"].name !== "Int32") {
        throw new Error(`Expected u_promoted_32 to be Int32, got ${uintRankRes.schema["u_promoted_32"].name}`);
    }
    if (uintRankRes.schema["u_promoted_64"].name !== "Int64") {
        throw new Error(`Expected u_promoted_64 to be Int64, got ${uintRankRes.schema["u_promoted_64"].name}`);
    }

    // 27. Float32 vs Float32 and Float32 vs Float64
    const floatDf = $df.data({
        f32_a: [1.5, 2.5],
        f32_b: [3.5, 4.5],
        f64: [10.25, 20.75]
    }, {
        f32_a: $df.Float32,
        f32_b: $df.Float32,
        f64: $df.Float64
    });

    const floatRes = floatDf.withColumns(
        $df.col("f32_a").add($df.col("f32_b")).alias("sum_f32"),
        $df.col("f32_a").add($df.col("f64")).alias("sum_f64")
    );

    if (floatRes.schema["sum_f32"].name !== "Float32") {
        throw new Error(`Expected sum_f32 to be Float32, got ${floatRes.schema["sum_f32"].name}`);
    }
    if (floatRes.schema["sum_f64"].name !== "Float64") {
        throw new Error(`Expected sum_f64 to be Float64, got ${floatRes.schema["sum_f64"].name}`);
    }

    // 28. ObjectType and Generic Objects
    const objDf = $df.data({
        raw_obj: [{ foo: "bar" }, { foo: "baz" }]
    }, {
        raw_obj: $df.Object
    });

    const objRes = objDf.withColumns(
        $df.col("raw_obj").alias("obj_copy")
    );

    if (objRes.schema["obj_copy"].name !== "Object") {
        throw new Error(`Expected obj_copy to be Object, got ${objRes.schema["obj_copy"].name}`);
    }

    // 29. Exhaustive NumericArg Combinations (BigInt, String Literal, Column Name, Number)
    const numericArgDf = $df.data({
        i64_col: [1000000000n, 2000000000n],
        i32_col: [10, 20],
        str_col: ["Hello", "World"],
        other_num: [5, 15]
    }, {
        i64_col: $df.Int64,
        i32_col: $df.Int32,
        str_col: $df.Utf8,
        other_num: $df.Int32
    });

    const numericArgRes = numericArgDf.withColumns(
        // BigInt literal to Int64 column
        $df.col("i64_col").add(5000000000n).alias("bigint_lit_add"),
        $df.col("i64_col").sub(500000000n).alias("bigint_lit_sub"),
        $df.col("i64_col").mul(2n).alias("bigint_lit_mul"),
        $df.col("i64_col").div(2n).alias("bigint_lit_div"),
        // String concatenation via .str.concat
        $df.col("str_col").str.concat("!").alias("str_lit_add"),
        // Explicit Column Expression
        $df.col("i32_col").add($df.col("other_num")).alias("col_expr_add"),
        $df.col("i32_col").mul($df.col("other_num")).alias("col_expr_mul")
    );

    if (numericArgRes.schema["bigint_lit_add"].name !== "Int64") {
        throw new Error(`Expected bigint_lit_add to be Int64, got ${numericArgRes.schema["bigint_lit_add"].name}`);
    }
    if (numericArgRes.schema["bigint_lit_sub"].name !== "Int64") {
        throw new Error(`Expected bigint_lit_sub to be Int64, got ${numericArgRes.schema["bigint_lit_sub"].name}`);
    }
    if (numericArgRes.schema["bigint_lit_mul"].name !== "Int64") {
        throw new Error(`Expected bigint_lit_mul to be Int64, got ${numericArgRes.schema["bigint_lit_mul"].name}`);
    }
    if (numericArgRes.schema["bigint_lit_div"].name !== "Int64") {
        throw new Error(`Expected bigint_lit_div to be Int64, got ${numericArgRes.schema["bigint_lit_div"].name}`);
    }
    if (numericArgRes.schema["str_lit_add"].name !== "Utf8") {
        throw new Error(`Expected str_lit_add to be Utf8, got ${numericArgRes.schema["str_lit_add"].name}`);
    }
    if (numericArgRes.schema["col_expr_add"].name !== "Int32") {
        throw new Error(`Expected col_expr_add to be Int32, got ${numericArgRes.schema["col_expr_add"].name}`);
    }
    if (numericArgRes.schema["col_expr_mul"].name !== "Int32") {
        throw new Error(`Expected col_expr_mul to be Int32, got ${numericArgRes.schema["col_expr_mul"].name}`);
    }

    const numericArgRows = numericArgRes.toDicts() as any[];
    if (numericArgRows[0].bigint_lit_add !== 6000000000n) throw new Error("bigint_lit_add value mismatch");
    if (numericArgRows[0].str_lit_add !== "Hello!") throw new Error("str_lit_add value mismatch");
    if (numericArgRows[0].col_expr_add !== 15) throw new Error("col_expr_add value mismatch");
    if (numericArgRows[0].col_expr_mul !== 50) throw new Error("col_expr_mul value mismatch");

    // 30. Time - Time => Duration ("ms") Schema Type Deduction
    const edgeTimeDf = $df.data({
        start_t: ["08:30:00.000", "09:00:00.000"],
        end_t: ["10:30:00.000", "17:00:00.000"]
    }, {
        start_t: $df.Time,
        end_t: $df.Time
    });

    const edgeTimeRes = edgeTimeDf.withColumns(
        $df.col("end_t").sub($df.col("start_t")).alias("time_diff")
    );

    if (!(edgeTimeRes.schema["time_diff"] instanceof DurationType)) {
        throw new Error(`Expected time_diff to be DurationType, got ${(edgeTimeRes.schema["time_diff"] as any)?.name}`);
    }

    // 31. Duration division by Numeric (Duration / number => Duration)
    const durDivDf = df.withColumns(
        $df.col("offset_ms").div(2).alias("halved_dur")
    );
    if (!(durDivDf.schema["halved_dur"] instanceof DurationType)) {
        throw new Error(`Expected halved_dur to be DurationType, got ${(durDivDf.schema["halved_dur"] as any)?.name}`);
    }
    const durDivRows = durDivDf.toDicts() as any[];
    if (durDivRows[0].halved_dur !== 1800000 || durDivRows[1].halved_dur !== 3600000) {
        throw new Error(`Unexpected halved_dur values: ${JSON.stringify(durDivRows)}`);
    }

    // 32. Mixed Signed and Unsigned Integers (Int8 + UInt16 => Int16, Int16 + UInt32 => Int32)
    const mixedSignDf = $df.data({
        i8_val: [10, -20],
        u16_val: [500, 1000],
        u32_val: [100000, 200000]
    }, {
        i8_val: $df.Int8,
        u16_val: $df.UInt16,
        u32_val: $df.UInt32
    });

    const mixedSignRes = mixedSignDf.withColumns(
        $df.col("i8_val").add($df.col("u16_val")).alias("mixed_16"),
        $df.col("i8_val").add($df.col("u32_val")).alias("mixed_32")
    );

    if (mixedSignRes.schema["mixed_16"].name !== "Int16") {
        throw new Error(`Expected mixed_16 to be Int16, got ${mixedSignRes.schema["mixed_16"].name}`);
    }
    if (mixedSignRes.schema["mixed_32"].name !== "Int32") {
        throw new Error(`Expected mixed_32 to be Int32, got ${mixedSignRes.schema["mixed_32"].name}`);
    }

    // 33. Decimal mixed with Float and Integers
    const edgeDecimalDf = $df.data({
        dec_col: ["123.45", "678.90"],
        i32_col: [10, 20],
        f64_col: [1.5, 2.5]
    }, {
        dec_col: $df.Decimal(10, 2),
        i32_col: $df.Int32,
        f64_col: $df.Float64
    });

    const edgeDecimalRes = edgeDecimalDf.withColumns(
        $df.col("dec_col").add($df.col("i32_col")).alias("dec_plus_int"),
        $df.col("dec_col").add($df.col("f64_col")).alias("dec_plus_float")
    );

    if (!(edgeDecimalRes.schema["dec_plus_int"] instanceof DecimalType)) {
        throw new Error(`Expected dec_plus_int to be DecimalType, got ${edgeDecimalRes.schema["dec_plus_int"].name}`);
    }
    if (edgeDecimalRes.schema["dec_plus_float"].name !== "Float64") {
        throw new Error(`Expected dec_plus_float to be Float64, got ${edgeDecimalRes.schema["dec_plus_float"].name}`);
    }

    // 34. Binary DataType operations & Column Pass-Through
    const edgeBinDf = $df.data({
        raw_bin: [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])]
    }, {
        raw_bin: $df.Binary
    });

    const edgeBinRes = edgeBinDf.withColumns(
        $df.col("raw_bin").alias("bin_copy")
    );

    if (edgeBinRes.schema["bin_copy"].name !== "Binary") {
        throw new Error(`Expected bin_copy to be Binary, got ${edgeBinRes.schema["bin_copy"].name}`);
    }

    // 35. Deeply Nested Expression Trees with Mixed Temporal & Literal Arithmetic
    const deepExprDf = df.withColumns(
        // (start_dt + (offset_ms * 2)) - (start_dt - offset_ms) => Duration
        $df.col("start_dt").add($df.col("offset_ms").mul(2)).sub(
            $df.col("start_dt").sub($df.col("offset_ms"))
        ).alias("net_duration_diff")
    );

    if (!(deepExprDf.schema["net_duration_diff"] instanceof DurationType)) {
        throw new Error(`Expected net_duration_diff to be DurationType, got ${(deepExprDf.schema["net_duration_diff"] as any)?.name}`);
    }
    const deepRows = deepExprDf.toDicts() as any[];
    // offset_ms * 2 - (-offset_ms) = 3 * offset_ms = 3 * 3600000 = 10800000
    if (deepRows[0].net_duration_diff !== 10800000) {
        throw new Error(`Unexpected net_duration_diff: ${deepRows[0].net_duration_diff}`);
    }

    // 36. Boxed Primitive Wrapper Objects (Object(100), Object("foo"), Object(true), Object(500n))
    const boxedDf = $df.data({
        num: [10, 20],
        i64_col: [1000000000n, 2000000000n],
        str: ["a", "b"]
    }, {
        num: $df.Int32,
        i64_col: $df.Int64,
        str: $df.Utf8
    });

    const boxedRes = boxedDf.withColumns(
        $df.col("num").add(Object(50) as any).alias("boxed_num_add"),
        $df.col("i64_col").add(Object(5000000000n) as any).alias("boxed_bigint_add"),
        $df.when($df.col("num").gt(15)).then(Object("yes") as any).otherwise(Object("no") as any).alias("boxed_when_str"),
        $df.when($df.col("num").gt(15)).then(Object(true) as any).otherwise(Object(false) as any).alias("boxed_when_bool")
    );

    if (boxedRes.schema["boxed_num_add"].name !== "Int32") {
        throw new Error(`Expected boxed_num_add to be Int32, got ${boxedRes.schema["boxed_num_add"].name}`);
    }
    if (boxedRes.schema["boxed_bigint_add"].name !== "Int64") {
        throw new Error(`Expected boxed_bigint_add to be Int64, got ${boxedRes.schema["boxed_bigint_add"].name}`);
    }
    if (boxedRes.schema["boxed_when_str"].name !== "Utf8") {
        throw new Error(`Expected boxed_when_str to be Utf8, got ${boxedRes.schema["boxed_when_str"].name}`);
    }
    if (boxedRes.schema["boxed_when_bool"].name !== "Boolean") {
        throw new Error(`Expected boxed_when_bool to be Boolean, got ${boxedRes.schema["boxed_when_bool"].name}`);
    }

    // 37. TypedArray Variations in When/Then and Schema Inferences
    const typedArrDf = $df.data({
        cat: ["A", "B"]
    }, {
        cat: $df.Utf8
    });

    const typedArrRes = typedArrDf.withColumns(
        $df.when($df.col("cat").eq("A"))
            .then(new Float64Array([1.1, 2.2]))
            .otherwise(new Float64Array([3.3, 4.4]))
            .alias("f64_arr_col"),
        $df.when($df.col("cat").eq("A"))
            .then(new Int32Array([10, 20]))
            .otherwise(new Int32Array([30, 40]))
            .alias("i32_arr_col"),
        $df.when($df.col("cat").eq("A"))
            .then(new BigInt64Array([1000n, 2000n]))
            .otherwise(new BigInt64Array([3000n, 4000n]))
            .alias("i64_arr_col"),
        $df.when($df.col("cat").eq("A"))
            .then(new Uint8ClampedArray([255, 0]))
            .otherwise(new Uint8ClampedArray([128, 64]))
            .alias("clamped_bin_col")
    );

    if (typedArrRes.schema["f64_arr_col"].name !== "Array" || (typedArrRes.schema["f64_arr_col"] as any).innerType.name !== "Float64") {
        throw new Error(`Expected f64_arr_col to be Array<Float64>, got ${typedArrRes.schema["f64_arr_col"].name}`);
    }
    if (typedArrRes.schema["i32_arr_col"].name !== "Array" || (typedArrRes.schema["i32_arr_col"] as any).innerType.name !== "Int32") {
        throw new Error(`Expected i32_arr_col to be Array<Int32>, got ${typedArrRes.schema["i32_arr_col"].name}`);
    }
    if (typedArrRes.schema["i64_arr_col"].name !== "Array" || (typedArrRes.schema["i64_arr_col"] as any).innerType.name !== "Int64") {
        throw new Error(`Expected i64_arr_col to be Array<Int64>, got ${typedArrRes.schema["i64_arr_col"].name}`);
    }
    if (typedArrRes.schema["clamped_bin_col"].name !== "Binary") {
        throw new Error(`Expected clamped_bin_col to be Binary, got ${typedArrRes.schema["clamped_bin_col"].name}`);
    }

    // 38. Nested Array of Strings vs Nested Array of Booleans vs Empty Arrays
    const arrLitDf = $df.data({
        flag: [true, false]
    }, {
        flag: $df.Boolean
    });

    const arrLitRes = arrLitDf.withColumns(
        $df.when($df.col("flag")).then(["alpha", "beta"]).otherwise(["gamma"]).alias("str_arr"),
        $df.when($df.col("flag")).then([true, false]).otherwise([false]).alias("bool_arr"),
        $df.when($df.col("flag")).then([]).otherwise([]).alias("empty_arr"),
        $df.when($df.col("flag")).then([[1, 2], [3, 4]]).otherwise([[5, 6]]).alias("nested_num_arr")
    );

    if (arrLitRes.schema["str_arr"].name !== "Array" || (arrLitRes.schema["str_arr"] as any).innerType.name !== "Utf8") {
        throw new Error(`Expected str_arr to be Array<Utf8>, got ${arrLitRes.schema["str_arr"].name}`);
    }
    if (arrLitRes.schema["bool_arr"].name !== "Array" || (arrLitRes.schema["bool_arr"] as any).innerType.name !== "Boolean") {
        throw new Error(`Expected bool_arr to be Array<Boolean>, got ${arrLitRes.schema["bool_arr"].name}`);
    }
    if (arrLitRes.schema["empty_arr"].name !== "Array" || (arrLitRes.schema["empty_arr"] as any).innerType.name !== "Utf8") {
        throw new Error(`Expected empty_arr to be Array<Utf8>, got ${arrLitRes.schema["empty_arr"].name}`);
    }
    if (arrLitRes.schema["nested_num_arr"].name !== "Array" || (arrLitRes.schema["nested_num_arr"] as any).innerType.name !== "Array") {
        throw new Error(`Expected nested_num_arr to be Array<Array>, got ${arrLitRes.schema["nested_num_arr"].name}`);
    }

    // 39. Multi-Layer Chained Unsigned and Signed Bitwise Operations
    const bitwiseDf = $df.data({
        u32_val: [1000000, 2000000],
        i8_val: [10, 20]
    }, {
        u32_val: $df.UInt32,
        i8_val: $df.Int8
    });

    const bitwiseRes = bitwiseDf.withColumns(
        $df.col("u32_val").add($df.col("i8_val")).alias("promoted_u32_i8"),
        $df.col("u32_val").mul(2).alias("scaled_u32")
    );

    if (bitwiseRes.schema["promoted_u32_i8"].name !== "Int32") {
        throw new Error(`Expected promoted_u32_i8 to be Int32, got ${bitwiseRes.schema["promoted_u32_i8"].name}`);
    }

    // 40. Decimal Mixed with Duration & Mixed Math Operations
    const decDurDf = $df.data({
        dur_col: [3600000, 7200000],
        dec_col: ["2.50", "4.00"]
    }, {
        dur_col: new DurationType("ms"),
        dec_col: $df.Decimal(10, 2)
    });

    const decDurRes = decDurDf.withColumns(
        $df.col("dur_col").mul($df.col("dec_col")).alias("dur_dec_scaled")
    );

    if (!(decDurRes.schema["dur_dec_scaled"] instanceof DurationType)) {
        throw new Error(`Expected dur_dec_scaled to be DurationType, got ${(decDurRes.schema["dur_dec_scaled"] as any)?.name}`);
    }

    // 41. Struct Access on Window Expressions & Chained Projections
    const complexStructDf = $df.data({
        user_info: [
            { id: 1, profile: { age: 25, score: 99.5 } },
            { id: 2, profile: { age: 30, score: 88.0 } }
        ]
    }, {
        user_info: $df.Struct({
            id: $df.Int32,
            profile: $df.Struct({
                age: $df.Int32,
                score: $df.Float64
            })
        })
    });

    const complexStructRes = complexStructDf.withColumns(
        $df.col("user_info").struct.field("profile").alias("profile_obj")
    ).withColumns(
        $df.col("profile_obj").struct.field("score").alias("sub_score")
    );

    if (complexStructRes.schema["profile_obj"].name !== "Struct") {
        throw new Error(`Expected profile_obj to be Struct, got ${complexStructRes.schema["profile_obj"].name}`);
    }
    if (complexStructRes.schema["sub_score"].name !== "Float64") {
        throw new Error(`Expected sub_score to be Float64, got ${complexStructRes.schema["sub_score"].name}`);
    }

    // 42. Date vs Date Subtraction vs Datetime Subtraction vs Duration Addition
    const mixedTemporalDf = $df.data({
        d1: ["2026-01-01", "2026-02-01"],
        d2: ["2026-01-10", "2026-02-15"],
        dt1: ["2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z"]
    }, {
        d1: $df.Date,
        d2: $df.Date,
        dt1: $df.Datetime
    });

    const mixedTemporalRes = mixedTemporalDf.withColumns(
        $df.col("d2").sub($df.col("d1")).alias("date_span"),
        $df.col("dt1").add($df.col("d2").sub($df.col("d1"))).alias("advanced_dt")
    );

    if (!(mixedTemporalRes.schema["date_span"] instanceof DurationType)) {
        throw new Error(`Expected date_span to be DurationType, got ${(mixedTemporalRes.schema["date_span"] as any)?.name}`);
    }
    if (!(mixedTemporalRes.schema["advanced_dt"] instanceof DatetimeType)) {
        throw new Error(`Expected advanced_dt to be DatetimeType, got ${(mixedTemporalRes.schema["advanced_dt"] as any)?.name}`);
    }

    // 43. Untyped Raw Array Branch Deduction: .then([128, 64]) vs .then([1.28, 6.4]) vs .then([100n, 200n])
    const rawArrDf = $df.data({
        category: ["X", "Y"]
    });

    const rawArrRes = rawArrDf.withColumns(
        // Array of integers => Array<Int32>
        $df.when($df.col("category").eq("X")).then([128, 64]).otherwise([32, 16]).alias("int_arr"),
        // Array of floats => Array<Float64>
        $df.when($df.col("category").eq("X")).then([1.28, 6.4]).otherwise([0.32, 0.16]).alias("float_arr"),
        // Array of BigInts => Array<Int64>
        $df.when($df.col("category").eq("X")).then([1000000000n, 2000000000n]).otherwise([5000000000n]).alias("bigint_arr"),
        // Array of Dates => Array<Datetime>
        $df.when($df.col("category").eq("X")).then([new Date("2026-01-01"), new Date("2026-02-01")]).otherwise([new Date("2026-03-01")]).alias("date_arr"),
        // Array of Uint8Arrays => Array<Binary>
        $df.when($df.col("category").eq("X")).then([new Uint8Array([1, 2])]).otherwise([new Uint8Array([3, 4])]).alias("bin_arr")
    );

    if (rawArrRes.schema["int_arr"].name !== "Array" || (rawArrRes.schema["int_arr"] as any).innerType.name !== "Int32") {
        throw new Error(`Expected int_arr to be Array<Int32>, got ${rawArrRes.schema["int_arr"].name}`);
    }
    if (rawArrRes.schema["float_arr"].name !== "Array" || (rawArrRes.schema["float_arr"] as any).innerType.name !== "Float64") {
        throw new Error(`Expected float_arr to be Array<Float64>, got ${rawArrRes.schema["float_arr"].name}`);
    }
    if (rawArrRes.schema["bigint_arr"].name !== "Array" || (rawArrRes.schema["bigint_arr"] as any).innerType.name !== "Int64") {
        throw new Error(`Expected bigint_arr to be Array<Int64>, got ${rawArrRes.schema["bigint_arr"].name}`);
    }
    const dateArrSchema = rawArrRes.schema["date_arr"] as any;
    if (dateArrSchema.name !== "Array" || !dateArrSchema.innerType || !(dateArrSchema.innerType.name === "Datetime" || dateArrSchema.innerType.name === "Date")) {
        throw new Error(`Expected date_arr to be Array<Datetime|Date>, got Array<${dateArrSchema?.innerType?.name}>`);
    }
    if (rawArrRes.schema["bin_arr"].name !== "Array" || (rawArrRes.schema["bin_arr"] as any).innerType.name !== "Binary") {
        throw new Error(`Expected bin_arr to be Array<Binary>, got ${rawArrRes.schema["bin_arr"].name}`);
    }

    // 44. Deep 3D Nested Array Recursion ([[[1, 2]], [[3, 4]]])
    const deepNestDf = $df.data({
        cond: [true, false]
    });

    const deepNestRes = deepNestDf.withColumns(
        $df.when($df.col("cond")).then([[[1, 2]], [[3, 4]]]).otherwise([]).alias("arr_3d_int"),
        $df.when($df.col("cond")).then([[[1.5, 2.5]], [[3.5, 4.5]]]).otherwise([]).alias("arr_3d_float")
    );

    const arr3dInt = deepNestRes.schema["arr_3d_int"] as any;
    if (arr3dInt.name !== "Array" || arr3dInt.innerType.name !== "Array" || arr3dInt.innerType.innerType.name !== "Array" || arr3dInt.innerType.innerType.innerType.name !== "Int32") {
        throw new Error(`Expected arr_3d_int to be Array<Array<Array<Int32>>>`);
    }

    const arr3dFloat = deepNestRes.schema["arr_3d_float"] as any;
    if (arr3dFloat.name !== "Array" || arr3dFloat.innerType.name !== "Array" || arr3dFloat.innerType.innerType.name !== "Array" || arr3dFloat.innerType.innerType.innerType.name !== "Float64") {
        throw new Error(`Expected arr_3d_float to be Array<Array<Array<Float64>>>`);
    }

    // 45. Mixed Numeric Elements in Array (First Element Inspection vs Fallback)
    const mixedArrDf = $df.data({
        id: [1, 2]
    });

    const mixedArrRes = mixedArrDf.withColumns(
        $df.when($df.col("id").eq(1)).then([10, 20.5]).otherwise([30]).alias("int_leading_arr"),
        $df.when($df.col("id").eq(1)).then([10.5, 20]).otherwise([30.5]).alias("float_leading_arr")
    );

    if (mixedArrRes.schema["int_leading_arr"].name !== "Array" || (mixedArrRes.schema["int_leading_arr"] as any).innerType.name !== "Int32") {
        throw new Error(`Expected int_leading_arr to be Array<Int32>, got ${mixedArrRes.schema["int_leading_arr"].name}`);
    }
    if (mixedArrRes.schema["float_leading_arr"].name !== "Array" || (mixedArrRes.schema["float_leading_arr"] as any).innerType.name !== "Float64") {
        throw new Error(`Expected float_leading_arr to be Array<Float64>, got ${mixedArrRes.schema["float_leading_arr"].name}`);
    }

    // 46. Pure Array and Column Expressions with Automatic Fallback
    const exprArrRes = rawArrDf.withColumns(
        $df.when($df.col("category").eq("X")).then($df.col("category")).otherwise("Z").alias("col_ref_when")
    );

    if (exprArrRes.schema["col_ref_when"].name !== "Utf8") {
        throw new Error(`Expected col_ref_when to be Utf8, got ${exprArrRes.schema["col_ref_when"].name}`);
    }

    // 47. when().then() without .otherwise() (defaults to null, infers from then branch)
    const noOtherwiseDf = rawArrDf.withColumns(
        $df.when($df.col("category").eq("X")).then(100).alias("when_no_otherwise"),
        $df.when($df.col("category").eq("X")).then(new Date("2026-01-01")).alias("when_dt_no_otherwise")
    );

    if (noOtherwiseDf.schema["when_no_otherwise"].name !== "Int32") {
        throw new Error(`Expected when_no_otherwise to be Int32, got ${noOtherwiseDf.schema["when_no_otherwise"].name}`);
    }
    if (!(noOtherwiseDf.schema["when_dt_no_otherwise"] instanceof DatetimeType) && noOtherwiseDf.schema["when_dt_no_otherwise"].name !== "Datetime") {
        throw new Error(`Expected when_dt_no_otherwise to be Datetime, got ${noOtherwiseDf.schema["when_dt_no_otherwise"].name}`);
    }

    // 48. when() with null otherwise: .then(col).otherwise(null)
    const nullOtherwiseDf = rawArrDf.withColumns(
        $df.when($df.col("category").eq("X")).then($df.col("category")).otherwise(null).alias("when_null_other")
    );
    if (nullOtherwiseDf.schema["when_null_other"].name !== "Utf8") {
        throw new Error(`Expected when_null_other to be Utf8, got ${nullOtherwiseDf.schema["when_null_other"].name}`);
    }

    // 49. Nested Struct Field Navigation: struct.field("a").struct.field("b")
    const deepStructDf = $df.data({
        meta: [
            { location: { city: "Austin", zip: 78701 } },
            { location: { city: "Dallas", zip: 75001 } }
        ]
    }, {
        meta: $df.Struct({
            location: $df.Struct({
                city: $df.Utf8,
                zip: $df.Int32
            })
        })
    });

    const deepStructRes = deepStructDf.withColumns(
        $df.col("meta").struct.field("location").struct.field("city").alias("nested_city"),
        $df.col("meta").struct.field("location").struct.field("zip").alias("nested_zip")
    );

    if (deepStructRes.schema["nested_city"].name !== "Utf8") {
        throw new Error(`Expected nested_city to be Utf8, got ${deepStructRes.schema["nested_city"].name}`);
    }
    if (deepStructRes.schema["nested_zip"].name !== "Int32") {
        throw new Error(`Expected nested_zip to be Int32, got ${deepStructRes.schema["nested_zip"].name}`);
    }

    // 50. Struct Field Access from dynamic expression
    const structFieldAliased = structDf.withColumns(
        $df.col("user").struct.field("name").alias("u_name")
    );
    if (structFieldAliased.schema["u_name"].name !== "Utf8") {
        throw new Error(`Expected u_name to be Utf8, got ${structFieldAliased.schema["u_name"].name}`);
    }

    // 51. Decimal and Duration scaling edge cases
    const decimalScaleDf = $df.data({
        dec: ["100.50", "200.75"],
        multiplier: [2, 3]
    }, {
        dec: $df.Decimal(10, 2),
        multiplier: $df.Int32
    });

    const decimalScaleRes = decimalScaleDf.withColumns(
        $df.col("dec").mul($df.col("multiplier")).alias("dec_product"),
        $df.col("dec").div(2).alias("dec_div")
    );

    if (!(decimalScaleRes.schema["dec_product"] instanceof DecimalType)) {
        throw new Error(`Expected dec_product to be DecimalType, got ${decimalScaleRes.schema["dec_product"].name}`);
    }

    // 52. Generic Multi-Branch Expression (_branchOperands) & Nested When/Then
    const nestedWhenDf = rawArrDf.withColumns(
        $df.when($df.col("category").eq("X"))
            .then($df.when($df.col("category").eq("Y")).then(100).otherwise(200))
            .otherwise(300)
            .alias("nested_when_num"),
        $df.when($df.col("category").eq("X"))
            .then($df.when($df.col("category").eq("Y")).then(new Date("2026-01-01")).otherwise(new Date("2026-02-01")))
            .otherwise(new Date("2026-03-01"))
            .alias("nested_when_dt")
    );

    if (nestedWhenDf.schema["nested_when_num"].name !== "Int32") {
        throw new Error(`Expected nested_when_num to be Int32, got ${nestedWhenDf.schema["nested_when_num"].name}`);
    }
    if (!(nestedWhenDf.schema["nested_when_dt"] instanceof DatetimeType) && nestedWhenDf.schema["nested_when_dt"].name !== "Datetime") {
        throw new Error(`Expected nested_when_dt to be Datetime, got ${nestedWhenDf.schema["nested_when_dt"].name}`);
    }

    // 53. Literal expressions inside when/then/otherwise and binary expressions
    const litTestDf = $df.data({ a: [1, 2], b: [10, 20] });
    const litBranchDf = litTestDf.withColumns(
        $df.when($df.col("a").eq(1))
            .then($df.lit(100))
            .otherwise($df.lit(200))
            .alias("lit_when"),
        $df.col("a").add($df.lit(5)).alias("lit_add"),
        $df.when($df.col("a").eq(1))
            .then($df.lit("yes"))
            .otherwise($df.lit("no"))
            .alias("lit_str_when")
    );
    if (litBranchDf.schema["lit_when"].name !== "Int32") {
        throw new Error(`Expected lit_when to be Int32, got ${litBranchDf.schema["lit_when"].name}`);
    }
    if (litBranchDf.schema["lit_add"].name !== "Int32") {
        throw new Error(`Expected lit_add to be Int32, got ${litBranchDf.schema["lit_add"].name}`);
    }
    if (litBranchDf.schema["lit_str_when"].name !== "Utf8") {
        throw new Error(`Expected lit_str_when to be Utf8, got ${litBranchDf.schema["lit_str_when"].name}`);
    }

    // 54. Large integer literal boundary checks (> 2147483647)
    const largeIntDf = litTestDf.withColumns(
        $df.lit(5000000000).alias("large_num"),
        $df.lit(9007199254740991n).alias("large_bigint")
    );
    if (largeIntDf.schema["large_num"].name !== "Int64" && largeIntDf.schema["large_num"].name !== "Float64") {
        throw new Error(`Expected large_num to be Int64 or Float64, got ${largeIntDf.schema["large_num"].name}`);
    }
    if (largeIntDf.schema["large_bigint"].name !== "Int64") {
        throw new Error(`Expected large_bigint to be Int64, got ${largeIntDf.schema["large_bigint"].name}`);
    }

    // 55. Date +/- Duration and Time +/- Duration arithmetic
    const dateDurDf = $df.data({
        d: ["2026-01-01", "2026-06-01"],
        t: ["12:00:00.000", "15:30:00.000"],
        dur: [86400000, 3600000]
    }, {
        d: $df.Date,
        t: $df.Time,
        dur: new DurationType("ms")
    });
    const dateDurRes = dateDurDf.withColumns(
        $df.col("d").add($df.col("dur")).alias("d_plus_dur"),
        $df.col("dur").add($df.col("d")).alias("dur_plus_d"),
        $df.col("t").add($df.col("dur")).alias("t_plus_dur"),
        $df.col("dur").add($df.col("t")).alias("dur_plus_t")
    );
    if (dateDurRes.schema["d_plus_dur"].name !== "Date") {
        throw new Error(`Expected d_plus_dur to be Date, got ${dateDurRes.schema["d_plus_dur"].name}`);
    }
    if (dateDurRes.schema["dur_plus_d"].name !== "Date") {
        throw new Error(`Expected dur_plus_d to be Date, got ${dateDurRes.schema["dur_plus_d"].name}`);
    }
    if (dateDurRes.schema["t_plus_dur"].name !== "Time") {
        throw new Error(`Expected t_plus_dur to be Time, got ${dateDurRes.schema["t_plus_dur"].name}`);
    }
    if (dateDurRes.schema["dur_plus_t"].name !== "Time") {
        throw new Error(`Expected dur_plus_t to be Time, got ${dateDurRes.schema["dur_plus_t"].name}`);
    }

    // 56. Array explode() type deduction resolving innerType
    const arrExplodeDf = $df.data({
        items: [[10, 20], [30, 40]]
    }, {
        items: $df.Array($df.Int32)
    });
    const explodedDf = arrExplodeDf.select(
        $df.col("items").arr.explode().alias("single_item")
    );
    if (explodedDf.schema["single_item"].name !== "Int32") {
        throw new Error(`Expected single_item to be Int32, got ${explodedDf.schema["single_item"].name}`);
    }

    // 57. Schema prototype safety checks
    const protoSafeDf = $df.data({
        a: ["toString", "valueOf", "constructor"]
    });
    const protoSafeRes = protoSafeDf.withColumns(
        $df.col("a").alias("b")
    );
    if (protoSafeRes.schema["b"].name !== "Utf8") {
        throw new Error(`Expected b to be Utf8, got ${protoSafeRes.schema["b"].name}`);
    }

    // 58. Static string concatenation with empty DataFrame
    const emptyStringDf = $df.data({
        s1: [] as string[],
        s2: [] as string[]
    }, {
        s1: $df.Utf8,
        s2: $df.Utf8
    });
    const emptyConcatDf = emptyStringDf.select(
        $df.col("s1").add($df.col("s2")).alias("s_concat")
    );
    if (emptyConcatDf.schema["s_concat"].name !== "Utf8") {
        throw new Error(`Expected s_concat to be Utf8, got ${emptyConcatDf.schema["s_concat"].name}`);
    }

    // 59. Unsigned 32-bit Integer arithmetic (UInt32 + UInt32 => UInt32)
    const u32Df = $df.data({
        u1: [100, 200],
        u2: [300, 400]
    }, {
        u1: $df.UInt32,
        u2: $df.UInt32
    });
    const u32Res = u32Df.withColumns(
        $df.col("u1").add($df.col("u2")).alias("u_sum")
    );
    if (u32Res.schema["u_sum"].name !== "UInt32") {
        throw new Error(`Expected u_sum to be UInt32, got ${u32Res.schema["u_sum"].name}`);
    }

    // 60. Array literal with leading null elements resolving innerType
    const leadingNullArrayDf = $df.data({
        x: [1, 2]
    }).withColumns(
        $df.lit([null, null, 100]).alias("arr_lit")
    );
    const arrLitSchema = leadingNullArrayDf.schema["arr_lit"];
    if (arrLitSchema.name !== "Array" || (arrLitSchema as any).innerType.name !== "Int32") {
        throw new Error(`Expected arr_lit to be Array(Int32), got ${arrLitSchema.name}(${(arrLitSchema as any)?.innerType?.name})`);
    }

    // 61. TypedArray literals in expressions
    const typedArrLiteralDf = $df.data({
        id: [1, 2]
    }).withColumns(
        $df.lit(new Float32Array([1.5, 2.5])).alias("f32_arr_lit"),
        $df.lit(new Uint8Array([1, 2, 3])).alias("u8_bin_lit"),
        $df.lit(new BigInt64Array([10n, 20n])).alias("i64_arr_lit")
    );
    if (typedArrLiteralDf.schema["f32_arr_lit"].name !== "Array" || (typedArrLiteralDf.schema["f32_arr_lit"] as any).innerType.name !== "Float32") {
        throw new Error(`Expected f32_arr_lit to be Array(Float32), got ${typedArrLiteralDf.schema["f32_arr_lit"].name}`);
    }
    if (typedArrLiteralDf.schema["u8_bin_lit"].name !== "Binary") {
        throw new Error(`Expected u8_bin_lit to be Binary, got ${typedArrLiteralDf.schema["u8_bin_lit"].name}`);
    }
    if (typedArrLiteralDf.schema["i64_arr_lit"].name !== "Array" || (typedArrLiteralDf.schema["i64_arr_lit"] as any).innerType.name !== "Int64") {
        throw new Error(`Expected i64_arr_lit to be Array(Int64), got ${typedArrLiteralDf.schema["i64_arr_lit"].name}`);
    }

    // 62. Multi-branch coalesce & when/then starting with literal null
    const branchNullDf = $df.data({
        val: [null, 42]
    }, {
        val: $df.Int32
    }).withColumns(
        $df.when($df.col("val").isNull()).then(null).otherwise($df.lit("fallback")).alias("cond_res"),
        $df.coalesce(null, $df.col("val"), 0).alias("coalesce_res")
    );
    if (branchNullDf.schema["cond_res"].name !== "Utf8") {
        throw new Error(`Expected cond_res to be Utf8, got ${branchNullDf.schema["cond_res"].name}`);
    }
    if (branchNullDf.schema["coalesce_res"].name !== "Int32") {
        throw new Error(`Expected coalesce_res to be Int32, got ${branchNullDf.schema["coalesce_res"].name}`);
    }

    // 63. Struct field access type inference
    const structTypeDf = $df.data({
        user: [
            { name: "Alice", age: 30 },
            { name: "Bob", age: 25 }
        ]
    }, {
        user: $df.Struct({
            name: $df.Utf8,
            age: $df.Int32
        })
    }).select(
        $df.col("user").struct.field("name").alias("user_name"),
        $df.col("user").struct.field("age").alias("user_age")
    );
    if (structTypeDf.schema["user_name"].name !== "Utf8") {
        throw new Error(`Expected user_name to be Utf8, got ${structTypeDf.schema["user_name"].name}`);
    }
    if (structTypeDf.schema["user_age"].name !== "Int32") {
        throw new Error(`Expected user_age to be Int32, got ${structTypeDf.schema["user_age"].name}`);
    }

    // 64. Duration cross-timeUnit arithmetic preservation
    const durUnitDf = $df.data({
        dur_us: [10, 20],
        dur_ms: [1000, 2000]
    }, {
        dur_us: new DurationType("us"),
        dur_ms: new DurationType("ms")
    }).withColumns(
        $df.col("dur_us").sub($df.col("dur_ms")).alias("dur_diff")
    );
    const durDiffSchema = durUnitDf.schema["dur_diff"] as DurationType;
    if (!(durDiffSchema instanceof DurationType) || durDiffSchema.timeUnit !== "us") {
        throw new Error(`Expected dur_diff to be DurationType with unit 'us', got ${durDiffSchema?.timeUnit}`);
    }

    // 65. Primitive boxed Object unwrapping in resolveOperandType
    const boxedObjDf = $df.data({
        n: [1, 2]
    }).withColumns(
        $df.lit(new Number(42) as any).alias("boxed_num"),
        $df.lit(new String("hello") as any).alias("boxed_str"),
        $df.lit(new Boolean(true) as any).alias("boxed_bool")
    );
    if (boxedObjDf.schema["boxed_num"].name !== "Int32") {
        throw new Error(`Expected boxed_num to be Int32, got ${boxedObjDf.schema["boxed_num"].name}`);
    }
    if (boxedObjDf.schema["boxed_str"].name !== "Utf8") {
        throw new Error(`Expected boxed_str to be Utf8, got ${boxedObjDf.schema["boxed_str"].name}`);
    }
    if (boxedObjDf.schema["boxed_bool"].name !== "Boolean") {
        throw new Error(`Expected boxed_bool to be Boolean, got ${boxedObjDf.schema["boxed_bool"].name}`);
    }

    // 66. Temporal Subtractions: Date - Date and Time - Time => DurationType
    const tempSubDf = $df.data({
        d1: ["2026-01-01"],
        d2: ["2026-01-10"],
        t1: ["10:00:00.000"],
        t2: ["12:30:00.000"]
    }, {
        d1: $df.Date,
        d2: $df.Date,
        t1: $df.Time,
        t2: $df.Time
    }).withColumns(
        $df.col("d2").sub($df.col("d1")).alias("date_dur"),
        $df.col("t2").sub($df.col("t1")).alias("time_dur")
    );
    if (!(tempSubDf.schema["date_dur"] instanceof DurationType)) {
        throw new Error(`Expected date_dur to be DurationType, got ${(tempSubDf.schema["date_dur"] as any)?.name}`);
    }
    if (!(tempSubDf.schema["time_dur"] instanceof DurationType)) {
        throw new Error(`Expected time_dur to be DurationType, got ${(tempSubDf.schema["time_dur"] as any)?.name}`);
    }

    // 67. Duration +/- Temporal commutativity: Duration + Date => Date, Duration + Time => Time
    const durCommDf = $df.data({
        d: ["2026-01-01"],
        t: ["10:00:00.000"],
        dur: [1000]
    }, {
        d: $df.Date,
        t: $df.Time,
        dur: new DurationType("ms")
    }).withColumns(
        $df.col("dur").add($df.col("d")).alias("dur_d"),
        $df.col("dur").add($df.col("t")).alias("dur_t")
    );
    if (durCommDf.schema["dur_d"].name !== "Date") {
        throw new Error(`Expected dur_d to be Date, got ${durCommDf.schema["dur_d"].name}`);
    }
    if (durCommDf.schema["dur_t"].name !== "Time") {
        throw new Error(`Expected dur_t to be Time, got ${durCommDf.schema["dur_t"].name}`);
    }

    // 68. Duration * Numeric commutativity: Duration * Float64 => Duration, Float64 * Duration => Duration
    const durNumDf = $df.data({
        dur: [1000],
        factor_f: [2.5],
        factor_i: [3]
    }, {
        dur: new DurationType("ms"),
        factor_f: $df.Float64,
        factor_i: $df.Int32
    }).withColumns(
        $df.col("dur").mul($df.col("factor_f")).alias("dur_f_mul"),
        $df.col("factor_f").mul($df.col("dur")).alias("f_dur_mul"),
        $df.col("dur").mul($df.col("factor_i")).alias("dur_i_mul"),
        $df.col("factor_i").mul($df.col("dur")).alias("i_dur_mul")
    );
    if (!(durNumDf.schema["dur_f_mul"] instanceof DurationType)) {
        throw new Error(`Expected dur_f_mul to be DurationType, got ${(durNumDf.schema["dur_f_mul"] as any)?.name}`);
    }
    if (!(durNumDf.schema["f_dur_mul"] instanceof DurationType)) {
        throw new Error(`Expected f_dur_mul to be DurationType, got ${(durNumDf.schema["f_dur_mul"] as any)?.name}`);
    }
    if (!(durNumDf.schema["dur_i_mul"] instanceof DurationType)) {
        throw new Error(`Expected dur_i_mul to be DurationType, got ${(durNumDf.schema["dur_i_mul"] as any)?.name}`);
    }
    if (!(durNumDf.schema["i_dur_mul"] instanceof DurationType)) {
        throw new Error(`Expected i_dur_mul to be DurationType, got ${(durNumDf.schema["i_dur_mul"] as any)?.name}`);
    }

    // 69. 16-bit Integer Arithmetic Promotions
    const int16Df = $df.data({
        u16: [100],
        u16_b: [200],
        i16: [300],
        i8: [10]
    }, {
        u16: $df.UInt16,
        u16_b: $df.UInt16,
        i16: $df.Int16,
        i8: $df.Int8
    }).withColumns(
        $df.col("u16").add($df.col("u16_b")).alias("u16_sum"),
        $df.col("u16").add($df.col("i16")).alias("mixed_16_sum"),
        $df.col("u16").add($df.col("i8")).alias("u16_i8_sum")
    );
    if (int16Df.schema["u16_sum"].name !== "UInt16") {
        throw new Error(`Expected u16_sum to be UInt16, got ${int16Df.schema["u16_sum"].name}`);
    }
    if (int16Df.schema["mixed_16_sum"].name !== "Int16") {
        throw new Error(`Expected mixed_16_sum to be Int16, got ${int16Df.schema["mixed_16_sum"].name}`);
    }
    if (int16Df.schema["u16_i8_sum"].name !== "Int16") {
        throw new Error(`Expected u16_i8_sum to be Int16, got ${int16Df.schema["u16_i8_sum"].name}`);
    }

    // 70. 8-bit Integer Arithmetic Promotions
    const int8Df = $df.data({
        u8: [10],
        u8_b: [20],
        i8: [30]
    }, {
        u8: $df.UInt8,
        u8_b: $df.UInt8,
        i8: $df.Int8
    }).withColumns(
        $df.col("u8").add($df.col("u8_b")).alias("u8_sum"),
        $df.col("u8").add($df.col("i8")).alias("mixed_8_sum"),
        $df.col("i8").add($df.col("i8")).alias("i8_sum")
    );
    if (int8Df.schema["u8_sum"].name !== "UInt8") {
        throw new Error(`Expected u8_sum to be UInt8, got ${int8Df.schema["u8_sum"].name}`);
    }
    if (int8Df.schema["mixed_8_sum"].name !== "Int8") {
        throw new Error(`Expected mixed_8_sum to be Int8, got ${int8Df.schema["mixed_8_sum"].name}`);
    }
    if (int8Df.schema["i8_sum"].name !== "Int8") {
        throw new Error(`Expected i8_sum to be Int8, got ${int8Df.schema["i8_sum"].name}`);
    }

    // 71. 64-bit Integer arithmetic (UInt64, Int64)
    const int64Df = $df.data({
        u64: [100n],
        i64: [200n]
    }, {
        u64: $df.UInt64,
        i64: $df.Int64
    }).withColumns(
        $df.col("u64").add($df.col("i64")).alias("mixed_64_sum")
    );
    if (int64Df.schema["mixed_64_sum"].name !== "Int64") {
        throw new Error(`Expected mixed_64_sum to be Int64, got ${int64Df.schema["mixed_64_sum"].name}`);
    }

    // 72. Float32 + Decimal => Float64 promotion
    const f32DecDf = $df.data({
        f32: [1.5],
        dec: [10.5]
    }, {
        f32: $df.Float32,
        dec: $df.Decimal(10, 2)
    }).withColumns(
        $df.col("f32").add($df.col("dec")).alias("f32_dec_sum")
    );
    if (f32DecDf.schema["f32_dec_sum"].name !== "Float64") {
        throw new Error(`Expected f32_dec_sum to be Float64, got ${f32DecDf.schema["f32_dec_sum"].name}`);
    }

    // 73. resolveOperandType fallback for non-existent column name string
    const fallbackDf73 = $df.data({ a: [1] }).withColumns(
        $df.lit("unmatched_column_string").alias("lit_str")
    );
    if (fallbackDf73.schema["lit_str"].name !== "Utf8") {
        throw new Error(`Expected lit_str to be Utf8, got ${fallbackDf73.schema["lit_str"].name}`);
    }

    // 74. resolveOperandType with BigUint64Array / Uint16Array typed arrays
    const typedArrDf74 = $df.data({ dummy: [1] }).withColumns(
        $df.lit(new BigUint64Array([10n, 20n])).alias("u64_arr"),
        $df.lit(new Uint16Array([1, 2])).alias("u16_arr")
    );
    if (typedArrDf74.schema["u64_arr"].name !== "Array" || (typedArrDf74.schema["u64_arr"] as any).innerType.name !== "UInt64") {
        throw new Error(`Expected u64_arr to be Array(UInt64), got ${typedArrDf74.schema["u64_arr"].name}`);
    }
    if (typedArrDf74.schema["u16_arr"].name !== "Array" || (typedArrDf74.schema["u16_arr"] as any).innerType.name !== "UInt16") {
        throw new Error(`Expected u16_arr to be Array(UInt16), got ${typedArrDf74.schema["u16_arr"].name}`);
    }

    // 75. resolveOperandType with nested arrays and nulls
    const nestedArrDf75 = $df.data({ dummy: [1] }).withColumns(
        $df.lit([[null, 100], [200]]).alias("nested_arr"),
        $df.lit([null, null]).alias("all_null_arr")
    );
    if (nestedArrDf75.schema["nested_arr"].name !== "Array" || (nestedArrDf75.schema["nested_arr"] as any).innerType.innerType.name !== "Int32") {
        throw new Error(`Expected nested_arr to be Array(Array(Int32)), got ${nestedArrDf75.schema["nested_arr"].name}`);
    }
    if (nestedArrDf75.schema["all_null_arr"].name !== "Array" || (nestedArrDf75.schema["all_null_arr"] as any).innerType.name !== "Utf8") {
        throw new Error(`Expected all_null_arr to be Array(Utf8), got ${nestedArrDf75.schema["all_null_arr"].name}`);
    }

    // 76. resolveOperandType unboxing Boxed Symbol / Object
    const objDf76 = $df.data({ dummy: [1] }).withColumns(
        $df.lit({ key: "val" }).alias("custom_obj")
    );
    if (objDf76.schema["custom_obj"].name !== "Object") {
        throw new Error(`Expected custom_obj to be Object, got ${objDf76.schema["custom_obj"].name}`);
    }

    // 77. Statistical aggregation (mean / std) on integer column promoting to Float64
    const intMeanDf77 = $df.data({ int_vals: [10, 20, 30] }, { int_vals: $df.Int32 }).select([
        $df.col("int_vals").mean().alias("mean_val"),
        $df.col("int_vals").std().alias("std_val")
    ]);
    if (intMeanDf77.schema["mean_val"].name !== "Float64") {
        throw new Error(`Expected mean_val to be Float64, got ${intMeanDf77.schema["mean_val"].name}`);
    }
    if (intMeanDf77.schema["std_val"].name !== "Float64") {
        throw new Error(`Expected std_val to be Float64, got ${intMeanDf77.schema["std_val"].name}`);
    }

    // 78. Statistical aggregation on Float32 column yielding Float32 or Float64
    const f32MeanDf78 = $df.data({ f32_vals: [1.5, 2.5] }, { f32_vals: $df.Float32 }).select([
        $df.col("f32_vals").mean().alias("f32_mean")
    ]);
    if (f32MeanDf78.schema["f32_mean"].name !== "Float64") {
        throw new Error(`Expected f32_mean to be Float64, got ${f32MeanDf78.schema["f32_mean"].name}`);
    }

    // 79. Duration aggregation preserving DurationType
    const durAggDf79 = $df.data({ dur_col: [5000, 10000] }, { dur_col: new DurationType("ms") }).select([
        $df.col("dur_col").min().alias("min_dur"),
        $df.col("dur_col").max().alias("max_dur")
    ]);
    if (!(durAggDf79.schema["min_dur"] instanceof DurationType)) {
        throw new Error(`Expected min_dur to be DurationType, got ${durAggDf79.schema["min_dur"].name}`);
    }
    if (!(durAggDf79.schema["max_dur"] instanceof DurationType)) {
        throw new Error(`Expected max_dur to be DurationType, got ${durAggDf79.schema["max_dur"].name}`);
    }

    // 80. Unnesting / exploding Array of Structs
    const structArrDf80 = $df.data({
        arr_structs: [[{ id: 1, val: "A" }]]
    }, {
        arr_structs: $df.Array($df.Struct({ id: $df.Int32, val: $df.Utf8 }))
    }).explode("arr_structs");
    if (structArrDf80.schema["arr_structs"].name !== "Struct") {
        throw new Error(`Expected exploded arr_structs to be Struct, got ${structArrDf80.schema["arr_structs"].name}`);
    }

    // 81. when().then().otherwise() with mixed numeric branches (Int32 + Float64 -> Float64)
    const mixedBranchDf81 = $df.data({ flag: [true, false] }, { flag: $df.Boolean }).withColumns(
        $df.when($df.col("flag")).then(10).otherwise(2.5).alias("promoted_branch"),
        $df.when($df.col("flag")).then(5).otherwise(100n).alias("promoted_bigint_branch")
    );
    if (mixedBranchDf81.schema["promoted_branch"].name !== "Float64") {
        throw new Error(`Expected promoted_branch to be Float64, got ${mixedBranchDf81.schema["promoted_branch"].name}`);
    }
    if (mixedBranchDf81.schema["promoted_bigint_branch"].name !== "Int64") {
        throw new Error(`Expected promoted_bigint_branch to be Int64, got ${mixedBranchDf81.schema["promoted_bigint_branch"].name}`);
    }

    // 82. Binary arithmetic with identical integer types preserving exact type
    const sameIntDf82 = $df.data({
        u8_a: [10], u8_b: [20],
        u16_a: [100], u16_b: [200],
        u32_a: [1000], u32_b: [2000],
        i16_a: [100], i16_b: [200]
    }, {
        u8_a: $df.UInt8, u8_b: $df.UInt8,
        u16_a: $df.UInt16, u16_b: $df.UInt16,
        u32_a: $df.UInt32, u32_b: $df.UInt32,
        i16_a: $df.Int16, i16_b: $df.Int16
    }).withColumns(
        $df.col("u8_a").add($df.col("u8_b")).alias("sum_u8"),
        $df.col("u16_a").add($df.col("u16_b")).alias("sum_u16"),
        $df.col("u32_a").add($df.col("u32_b")).alias("sum_u32"),
        $df.col("i16_a").add($df.col("i16_b")).alias("sum_i16")
    );
    if (sameIntDf82.schema["sum_u8"].name !== "UInt8") {
        throw new Error(`Expected sum_u8 to be UInt8, got ${sameIntDf82.schema["sum_u8"].name}`);
    }
    if (sameIntDf82.schema["sum_u16"].name !== "UInt16") {
        throw new Error(`Expected sum_u16 to be UInt16, got ${sameIntDf82.schema["sum_u16"].name}`);
    }
    if (sameIntDf82.schema["sum_u32"].name !== "UInt32") {
        throw new Error(`Expected sum_u32 to be UInt32, got ${sameIntDf82.schema["sum_u32"].name}`);
    }
    if (sameIntDf82.schema["sum_i16"].name !== "Int16") {
        throw new Error(`Expected sum_i16 to be Int16, got ${sameIntDf82.schema["sum_i16"].name}`);
    }

    // 83. Multi-branch when-then chain with sequential type widening
    const multiBranchWideningDf83 = $df.data({ step: [1, 2, 3] }, { step: $df.Int32 }).withColumns(
        $df.when($df.col("step").eq(1)).then(1)
            .when($df.col("step").eq(2)).then(2.5)
            .otherwise(10)
            .alias("widened_val")
    );
    if (multiBranchWideningDf83.schema["widened_val"].name !== "Float64") {
        throw new Error(`Expected widened_val to be Float64, got ${multiBranchWideningDf83.schema["widened_val"].name}`);
    }

    // 84. Array literal with distinct types inspected from first non-null element
    const arrLitDf84 = $df.data({ id: [1] }).withColumns(
        $df.lit([20.5, 10, 30]).alias("f64_leading_arr"),
        $df.lit([200n, 10]).alias("i64_leading_arr")
    );
    if (arrLitDf84.schema["f64_leading_arr"].name !== "Array" || (arrLitDf84.schema["f64_leading_arr"] as any).innerType.name !== "Float64") {
        throw new Error(`Expected f64_leading_arr to be Array(Float64), got ${arrLitDf84.schema["f64_leading_arr"].name}`);
    }
    if (arrLitDf84.schema["i64_leading_arr"].name !== "Array" || (arrLitDf84.schema["i64_leading_arr"] as any).innerType.name !== "Int64") {
        throw new Error(`Expected i64_leading_arr to be Array(Int64), got ${arrLitDf84.schema["i64_leading_arr"].name}`);
    }

    // 85. Non-numeric column aggregation (count/len) resolving to Int32
    const nonNumericAggDf85 = $df.data({
        words: ["apple", "banana", "cherry"],
        bools: [true, false, true],
        structs: [{ a: 1 }, { a: 2 }, { a: 3 }]
    }, {
        words: $df.Utf8,
        bools: $df.Boolean,
        structs: $df.Struct({ a: $df.Int32 })
    }).select([
        $df.col("words").count().alias("word_count"),
        $df.col("bools").count().alias("bool_count"),
        $df.col("structs").count().alias("struct_count")
    ]);
    if (nonNumericAggDf85.schema["word_count"].name !== "Int32") {
        throw new Error(`Expected word_count to be Int32, got ${nonNumericAggDf85.schema["word_count"].name}`);
    }
    if (nonNumericAggDf85.schema["bool_count"].name !== "Int32") {
        throw new Error(`Expected bool_count to be Int32, got ${nonNumericAggDf85.schema["bool_count"].name}`);
    }
    if (nonNumericAggDf85.schema["struct_count"].name !== "Int32") {
        throw new Error(`Expected struct_count to be Int32, got ${nonNumericAggDf85.schema["struct_count"].name}`);
    }

    // 86. Array column count aggregation resolving to Int32
    const arrCountDf86 = $df.data({
        items: [[1, 2], [3, 4, 5]]
    }, {
        items: $df.Array($df.Int32)
    }).select([
        $df.col("items").count().alias("arr_count")
    ]);
    if (arrCountDf86.schema["arr_count"].name !== "Int32") {
        throw new Error(`Expected arr_count to be Int32, got ${arrCountDf86.schema["arr_count"].name}`);
    }

    // 87. Edge case: Mixed Integer Width & Signedness Resolution (UInt8 + Int8, UInt16 + Int16, UInt32 + Int32)
    const intEdgeDf87 = $df.data({
        u8: [10],
        i8: [20],
        u16: [1000],
        i16: [2000],
        u32: [50000],
        i32: [60000]
    }, {
        u8: $df.UInt8,
        i8: $df.Int8,
        u16: $df.UInt16,
        i16: $df.Int16,
        u32: $df.UInt32,
        i32: $df.Int32
    }).select([
        $df.col("u8").add($df.col("i8")).alias("mixed8"),
        $df.col("u16").add($df.col("i16")).alias("mixed16"),
        $df.col("u32").add($df.col("i32")).alias("mixed32"),
        $df.col("u8").add($df.col("u8")).alias("same_u8"),
        $df.col("u16").add($df.col("u16")).alias("same_u16"),
        $df.col("u32").add($df.col("u32")).alias("same_u32")
    ]);
    if (intEdgeDf87.schema["mixed8"].name !== "Int8") {
        throw new Error(`Expected mixed8 to be Int8, got ${intEdgeDf87.schema["mixed8"].name}`);
    }
    if (intEdgeDf87.schema["mixed16"].name !== "Int16") {
        throw new Error(`Expected mixed16 to be Int16, got ${intEdgeDf87.schema["mixed16"].name}`);
    }
    if (intEdgeDf87.schema["mixed32"].name !== "Int32") {
        throw new Error(`Expected mixed32 to be Int32, got ${intEdgeDf87.schema["mixed32"].name}`);
    }
    if (intEdgeDf87.schema["same_u8"].name !== "UInt8") {
        throw new Error(`Expected same_u8 to be UInt8, got ${intEdgeDf87.schema["same_u8"].name}`);
    }
    if (intEdgeDf87.schema["same_u16"].name !== "UInt16") {
        throw new Error(`Expected same_u16 to be UInt16, got ${intEdgeDf87.schema["same_u16"].name}`);
    }
    if (intEdgeDf87.schema["same_u32"].name !== "UInt32") {
        throw new Error(`Expected same_u32 to be UInt32, got ${intEdgeDf87.schema["same_u32"].name}`);
    }

    // 88. Edge case: resolveOperandType with nested empty/null array elements fallback to Utf8
    const emptyArrDf88 = $df.data({
        empty_lit: [1]
    }).select([
        $df.lit([]).alias("empty_arr"),
        $df.lit([null, undefined]).alias("null_arr")
    ]);
    if (emptyArrDf88.schema["empty_arr"].name !== "Array" || (emptyArrDf88.schema["empty_arr"] as any).innerType.name !== "Utf8") {
        throw new Error(`Expected empty_arr to default to Array(Utf8), got ${emptyArrDf88.schema["empty_arr"].name}`);
    }
    if (emptyArrDf88.schema["null_arr"].name !== "Array" || (emptyArrDf88.schema["null_arr"] as any).innerType.name !== "Utf8") {
        throw new Error(`Expected null_arr to default to Array(Utf8), got ${emptyArrDf88.schema["null_arr"].name}`);
    }

    // 89. Complex resolveExprOutputType: Nested Struct field access through expressions
    const nestedStructDf89 = $df.data({
        user: [
            { profile: { stats: { score: 99.5, level: 5 } } }
        ]
    }, {
        user: $df.Struct({
            profile: $df.Struct({
                stats: $df.Struct({
                    score: $df.Float64,
                    level: $df.Int32
                })
            })
        })
    }).select([
        $df.col("user").struct.field("profile").struct.field("stats").struct.field("score").alias("score_val"),
        $df.col("user").struct.field("profile").struct.field("stats").struct.field("level").alias("level_val")
    ]);
    if (nestedStructDf89.schema["score_val"].name !== "Float64") {
        throw new Error(`Expected score_val to be Float64, got ${nestedStructDf89.schema["score_val"].name}`);
    }
    if (nestedStructDf89.schema["level_val"].name !== "Int32") {
        throw new Error(`Expected level_val to be Int32, got ${nestedStructDf89.schema["level_val"].name}`);
    }

    // 90. Complex resolveExprOutputType: Multi-branch when/then promotion (Int8 + Int32 + Float32 + Float64)
    const multiBranchDf90 = $df.data({
        cond1: [true, false, false],
        cond2: [false, true, false],
        v_i8: [1, 2, 3],
        v_i32: [100, 200, 300],
        v_f32: [1.5, 2.5, 3.5]
    }, {
        cond1: $df.Boolean,
        cond2: $df.Boolean,
        v_i8: $df.Int8,
        v_i32: $df.Int32,
        v_f32: $df.Float32
    }).select([
        $df.when($df.col("cond1")).then($df.col("v_i8"))
           .when($df.col("cond2")).then($df.col("v_i32"))
           .otherwise($df.col("v_f32"))
           .alias("when_promoted")
    ]);
    if (multiBranchDf90.schema["when_promoted"].name !== "Float64") {
        throw new Error(`Expected when_promoted to be Float64, got ${multiBranchDf90.schema["when_promoted"].name}`);
    }

    // 91. Complex resolveExprOutputType: Array unnesting vs array wrapping on non-array column
    const arrayTransformDf91 = $df.data({
        tags: [["tag1", "tag2"], ["tag3"]],
        score: [10, 20]
    }, {
        tags: $df.Array($df.Utf8),
        score: $df.Int32
    }).select([
        // Array unnesting inner type resolution
        $df.col("tags").arr.explode().alias("unnested_tag"),
        // Wrapping scalar column in array via expression ops
        $df.col("score").implode().alias("imploded_score")
    ]);
    if (arrayTransformDf91.schema["unnested_tag"].name !== "Utf8") {
        throw new Error(`Expected unnested_tag to be Utf8, got ${arrayTransformDf91.schema["unnested_tag"].name}`);
    }
    if (arrayTransformDf91.schema["imploded_score"].name !== "Array" || (arrayTransformDf91.schema["imploded_score"] as any).innerType.name !== "Int32") {
        throw new Error(`Expected imploded_score to be Array(Int32), got ${arrayTransformDf91.schema["imploded_score"].name}`);
    }

    // 92. Complex resolveExprOutputType: Binary operation involving Duration + Datetime and Duration * Duration
    const durExprDf92 = $df.data({
        base_time: ["2026-03-01T12:00:00.000Z"],
        dur_a: [3600000],
        dur_b: [1800000]
    }, {
        base_time: new DatetimeType("ms"),
        dur_a: new DurationType("ms"),
        dur_b: new DurationType("ms")
    }).select([
        $df.col("base_time").add($df.col("dur_a")).alias("time_plus_dur"),
        $df.col("dur_a").sub($df.col("dur_b")).alias("dur_diff")
    ]);
    if (durExprDf92.schema["time_plus_dur"].name !== "Datetime") {
        throw new Error(`Expected time_plus_dur to be Datetime, got ${durExprDf92.schema["time_plus_dur"].name}`);
    }
    if (durExprDf92.schema["dur_diff"].name !== "Duration") {
        throw new Error(`Expected dur_diff to be Duration, got ${durExprDf92.schema["dur_diff"].name}`);
    }

    console.log("✓ All Post-Operation Type Inference tests passed!");
    console.log("🎉 ALL POST-OPERATION TYPE INFERENCE TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("❌ POST-OPERATION TYPE INFERENCE TESTS FAILED:", err);
    process.exit(1);
}






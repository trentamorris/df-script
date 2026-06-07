declare const process: any;
import { $df } from "../../src/index";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION BOOLEAN TESTS...");
console.log("=========================================");

const testData = [
    { id: 1, val: 10.5, name: "apple", flags: [true, false], duplicates: "A" },
    { id: 2, val: Infinity, name: "", flags: [], duplicates: "B" },
    { id: 3, val: -Infinity, name: "banana", flags: [true], duplicates: "A" },
    { id: 4, val: NaN, name: null, flags: null, duplicates: "C" },
    { id: 5, val: null, name: "cherry", flags: [false], duplicates: "B" }
];

try {
    const df = $df.data(testData);

    // 1. Element-wise checks
    const results = df.select([
        $df.col("id").alias("orig_id"),

        // between
        $df.col("id").between(2, 4).alias("id_between_2_4"),
        $df.col("id").between(2, 4, "none").alias("id_between_2_4_none"),

        // is_close
        $df.col("val").is_close(10.500001, { rel_tol: 1e-5 }).alias("val_close"),
        $df.col("val").is_close(11.0).alias("val_not_close"),
        $df.col("val").is_close(NaN, { nans_equal: true }).alias("val_nan_close_eq"),
        $df.col("val").is_close(NaN, { nans_equal: false }).alias("val_nan_close_neq"),
        $df.col("val").is_close(Infinity).alias("val_inf_close"),

        // is_duplicated
        $df.col("duplicates").is_duplicated().alias("dup_mask"),

        // is_unique
        $df.col("duplicates").is_unique().alias("uniq_mask"),

        // is_empty
        $df.col("name").is_empty().alias("name_empty"),
        $df.col("flags").is_empty().alias("flags_empty"),

        // not
        $df.col("id").eq(1).not().alias("not_id_eq_1"),

        // Null and NaN checks
        $df.col("val").is_null().alias("val_null"),
        $df.col("val").is_not_null().alias("val_not_null"),
        $df.col("val").is_nan().alias("val_nan"),
        $df.col("val").is_not_nan().alias("val_not_nan"),
        $df.col("val").is_finite().alias("val_finite"),
        $df.col("val").is_infinite().alias("val_infinite"),

        // is_in / not_in
        $df.col("duplicates").is_in(["A", "C"]).alias("dup_in_AC"),
        $df.col("duplicates").not_in(["A", "C"]).alias("dup_not_in_AC")
    ]).to_dicts() as any[];

    console.log("Element-wise boolean checks results:");
    console.dir(results, { depth: null });

    // Assert id_between_2_4
    if (results[0].id_between_2_4 !== false) throw new Error("id_between_2_4 row 0 failed");
    if (results[1].id_between_2_4 !== true) throw new Error("id_between_2_4 row 1 failed");
    if (results[3].id_between_2_4 !== true) throw new Error("id_between_2_4 row 3 failed");

    // Assert id_between_2_4_none
    if (results[1].id_between_2_4_none !== false) throw new Error("id_between_2_4_none row 1 failed");
    if (results[2].id_between_2_4_none !== true) throw new Error("id_between_2_4_none row 2 failed");

    // Assert is_close
    if (results[0].val_close !== true) throw new Error("val_close row 0 failed");
    if (results[0].val_not_close !== false) throw new Error("val_not_close row 0 failed");
    if (results[1].val_close !== false) throw new Error("val_close row 1 (Infinity) failed");
    if (results[3].val_nan_close_eq !== true) throw new Error("val_nan_close_eq row 3 failed");
    if (results[3].val_nan_close_neq !== false) throw new Error("val_nan_close_neq row 3 failed");
    if (results[0].val_nan_close_eq !== false) throw new Error("val_nan_close_eq row 0 failed");
    if (results[1].val_inf_close !== true) throw new Error("val_inf_close row 1 (Infinity) failed");
    if (results[2].val_inf_close !== false) throw new Error("val_inf_close row 2 (-Infinity) failed");
    if (results[0].val_inf_close !== false) throw new Error("val_inf_close row 0 failed");

    // Assert duplicates vs uniques
    // duplicates column: A, B, A, C, B
    // duplicated values: A and B. Unique value: C.
    const expectedDup = [true, true, true, false, true];
    const expectedUniq = [false, false, false, true, false];
    for (let i = 0; i < 5; i++) {
        if (results[i].dup_mask !== expectedDup[i]) {
            throw new Error(`dup_mask at index ${i} failed: expected ${expectedDup[i]}, got ${results[i].dup_mask}`);
        }
        if (results[i].uniq_mask !== expectedUniq[i]) {
            throw new Error(`uniq_mask at index ${i} failed: expected ${expectedUniq[i]}, got ${results[i].uniq_mask}`);
        }
    }
    console.log("✓ duplicate / unique masks passed");

    // Assert is_empty
    // name column: "apple", "", "banana", null, "cherry"
    if (results[0].name_empty !== false) throw new Error("name_empty row 0 failed");
    if (results[1].name_empty !== true) throw new Error("name_empty row 1 failed");
    if (results[3].name_empty !== null) throw new Error("name_empty row 3 failed");

    // flags column: [true, false], [], [true], null, [false]
    if (results[0].flags_empty !== false) throw new Error("flags_empty row 0 failed");
    if (results[1].flags_empty !== true) throw new Error("flags_empty row 1 failed");
    if (results[3].flags_empty !== null) throw new Error("flags_empty row 3 failed");
    console.log("✓ is_empty checks passed");

    // Assert not
    if (results[0].not_id_eq_1 !== false) throw new Error("not_id_eq_1 row 0 failed");
    if (results[1].not_id_eq_1 !== true) throw new Error("not_id_eq_1 row 1 failed");

    // Assert null/nan checks
    // val column: 10.5, Infinity, -Infinity, NaN, null
    if (results[3].val_null !== false) throw new Error("val_null row 3 failed");
    if (results[4].val_null !== true) throw new Error("val_null row 4 failed");

    if (results[3].val_not_null !== true) throw new Error("val_not_null row 3 failed");
    if (results[4].val_not_null !== false) throw new Error("val_not_null row 4 failed");

    if (results[3].val_nan !== true) throw new Error("val_nan row 3 failed");
    if (results[0].val_nan !== false) throw new Error("val_nan row 0 failed");

    if (results[3].val_not_nan !== false) throw new Error("val_not_nan row 3 failed");
    if (results[0].val_not_nan !== true) throw new Error("val_not_nan row 0 failed");

    if (results[0].val_finite !== true) throw new Error("val_finite row 0 failed");
    if (results[1].val_finite !== false) throw new Error("val_finite row 1 failed");
    if (results[3].val_finite !== false) throw new Error("val_finite row 3 (NaN) failed");

    if (results[0].val_infinite !== false) throw new Error("val_infinite row 0 failed");
    if (results[1].val_infinite !== true) throw new Error("val_infinite row 1 failed");
    if (results[2].val_infinite !== true) throw new Error("val_infinite row 2 failed");
    if (results[3].val_infinite !== false) throw new Error("val_infinite row 3 failed");
    console.log("✓ null/nan/finite/infinite checks passed");

    // Assert is_in / not_in
    if (results[0].dup_in_AC !== true) throw new Error("dup_in_AC row 0 failed");
    if (results[1].dup_in_AC !== false) throw new Error("dup_in_AC row 1 failed");
    if (results[3].dup_in_AC !== true) throw new Error("dup_in_AC row 3 failed");

    if (results[0].dup_not_in_AC !== false) throw new Error("dup_not_in_AC row 0 failed");
    if (results[1].dup_not_in_AC !== true) throw new Error("dup_not_in_AC row 1 failed");
    if (results[3].dup_not_in_AC !== false) throw new Error("dup_not_in_AC row 3 failed");
    console.log("✓ is_in/not_in checks passed");


    // 2. Boolean aggregations
    const aggResults = df.select([
        // all
        $df.col("id").gt(0).all().alias("all_gt_0"),
        $df.col("id").gt(3).all().alias("all_gt_3"),

        // any
        $df.col("id").gt(3).any().alias("any_gt_3"),
        $df.col("id").gt(10).any().alias("any_gt_10"),

        // has_nulls
        $df.col("name").has_nulls().alias("name_has_nulls"),
        $df.col("id").has_nulls().alias("id_has_nulls"),

        // n_unique checks
        $df.col("duplicates").n_unique().eq(3).alias("dup_distinct_3"),
        $df.col("duplicates").n_unique().eq(4).alias("dup_distinct_4")
    ]).to_dicts() as any[];

    console.log("Boolean aggregations results:");
    console.dir(aggResults, { depth: null });

    const agg = aggResults[0];
    if (agg.all_gt_0 !== true) throw new Error("all_gt_0 failed");
    if (agg.all_gt_3 !== false) throw new Error("all_gt_3 failed");

    if (agg.any_gt_3 !== true) throw new Error("any_gt_3 failed");
    if (agg.any_gt_10 !== false) throw new Error("any_gt_10 failed");

    if (agg.name_has_nulls !== true) throw new Error("name_has_nulls failed");
    if (agg.id_has_nulls !== false) throw new Error("id_has_nulls failed");

    if (agg.dup_distinct_3 !== true) throw new Error("dup_distinct_3 failed");
    if (agg.dup_distinct_4 !== false) throw new Error("dup_distinct_4 failed");
    console.log("✓ boolean aggregations passed");

    // 3. Robust/edge-case tests for is_unique, is_duplicated, is_n_distinct, and is_in
    const edgeData = [
        {
            dateVal: new Date("2026-06-01T12:00:00.000Z"),
            binaryVal: new Uint8Array([1, 2, 3]),
            numVal: 1.5,
            nullVal: null,
            listVal: [null, null]
        },
        {
            dateVal: new Date("2026-06-01T12:00:00.000Z"), // Duplicate timestamp
            binaryVal: new Uint8Array([1, 2, 3]), // Duplicate bytes
            numVal: NaN,
            nullVal: null, // Duplicate null
            listVal: [1, null]
        },
        {
            dateVal: new Date("2026-06-02T12:00:00.000Z"), // Unique
            binaryVal: new Uint8Array([4, 5, 6]), // Unique bytes
            numVal: NaN, // Duplicate NaN
            nullVal: 42, // Unique non-null
            listVal: []
        }
    ];

    const edgeDf = $df.data(edgeData);

    const edgeResults = edgeDf.select([
        $df.col("dateVal").is_unique().alias("date_unique"),
        $df.col("dateVal").is_duplicated().alias("date_duplicated"),
        $df.col("binaryVal").is_unique().alias("binary_unique"),
        $df.col("binaryVal").is_duplicated().alias("binary_duplicated"),
        $df.col("numVal").is_unique().alias("num_unique"),
        $df.col("numVal").is_duplicated().alias("num_duplicated"),
        $df.col("nullVal").is_unique().alias("null_unique"),
        $df.col("nullVal").is_duplicated().alias("null_duplicated"),
        $df.col("dateVal").is_in([new Date("2026-06-01T12:00:00.000Z"), new Date("2026-06-03T12:00:00.000Z")]),
        $df.col("binaryVal").is_in([new Uint8Array([1, 2, 3])]),
        $df.col("numVal").is_in([NaN]),
        $df.col("listVal").is_empty().alias("list_empty_default"),
        $df.col("listVal").is_empty({ ignoreNulls: true }).alias("list_empty_ignore_nulls")
    ]).to_dicts() as any[];

    console.log("Edge cases / complex types unique/in/empty checks results:");
    console.dir(edgeResults, { depth: null });

    // dateVal: [date1, date1, date2] -> index 0 and 1 are duplicate, index 2 is unique
    if (edgeResults[0].date_unique !== false) throw new Error("dateVal unique row 0 failed");
    if (edgeResults[1].date_unique !== false) throw new Error("dateVal unique row 1 failed");
    if (edgeResults[2].date_unique !== true) throw new Error("dateVal unique row 2 failed");

    if (edgeResults[0].date_duplicated !== true) throw new Error("dateVal duplicated row 0 failed");
    if (edgeResults[1].date_duplicated !== true) throw new Error("dateVal duplicated row 1 failed");
    if (edgeResults[2].date_duplicated !== false) throw new Error("dateVal duplicated row 2 failed");

    // binaryVal: [[1,2,3], [1,2,3], [4,5,6]] -> index 0 and 1 are duplicate, index 2 is unique
    if (edgeResults[0].binary_unique !== false) throw new Error("binaryVal unique row 0 failed");
    if (edgeResults[1].binary_unique !== false) throw new Error("binaryVal unique row 1 failed");
    if (edgeResults[2].binary_unique !== true) throw new Error("binaryVal unique row 2 failed");

    if (edgeResults[0].binary_duplicated !== true) throw new Error("binaryVal duplicated row 0 failed");
    if (edgeResults[1].binary_duplicated !== true) throw new Error("binaryVal duplicated row 1 failed");
    if (edgeResults[2].binary_duplicated !== false) throw new Error("binaryVal duplicated row 2 failed");

    // numVal: [1.5, NaN, NaN] -> 1.5 is unique, NaNs are duplicates
    if (edgeResults[0].num_unique !== true) throw new Error("numVal unique row 0 failed");
    if (edgeResults[1].num_unique !== false) throw new Error("numVal unique row 1 failed");
    if (edgeResults[2].num_unique !== false) throw new Error("numVal unique row 2 failed");

    if (edgeResults[0].num_duplicated !== false) throw new Error("numVal duplicated row 0 failed");
    if (edgeResults[1].num_duplicated !== true) throw new Error("numVal duplicated row 1 failed");
    if (edgeResults[2].num_duplicated !== true) throw new Error("numVal duplicated row 2 failed");

    // nullVal: [null, null, 42] -> nulls are duplicates, 42 is unique
    if (edgeResults[0].null_unique !== false) throw new Error("nullVal unique row 0 failed");
    if (edgeResults[1].null_unique !== false) throw new Error("nullVal unique row 1 failed");
    if (edgeResults[2].null_unique !== true) throw new Error("nullVal unique row 2 failed");

    if (edgeResults[0].null_duplicated !== true) throw new Error("nullVal duplicated row 0 failed");
    if (edgeResults[1].null_duplicated !== true) throw new Error("nullVal duplicated row 1 failed");
    if (edgeResults[2].null_duplicated !== false) throw new Error("nullVal duplicated row 2 failed");

    // is_in comparisons
    if (edgeResults[0].dateVal !== true) throw new Error("dateVal in failed for index 0");
    if (edgeResults[2].dateVal !== false) throw new Error("dateVal in failed for index 2");
    if (edgeResults[0].binaryVal !== true) throw new Error("binaryVal in failed for index 0");
    if (edgeResults[2].binaryVal !== false) throw new Error("binaryVal in failed for index 2");
    if (edgeResults[0].numVal !== false) throw new Error("nan_in failed for index 0");
    if (edgeResults[1].numVal !== true) throw new Error("nan_in failed for index 1");

    // is_empty with ignoreNulls comparisons
    // listVal: [[null, null], [1, null], []]
    if (edgeResults[0].list_empty_default !== false) throw new Error("list_empty_default index 0 failed");
    if (edgeResults[1].list_empty_default !== false) throw new Error("list_empty_default index 1 failed");
    if (edgeResults[2].list_empty_default !== true) throw new Error("list_empty_default index 2 failed");

    if (edgeResults[0].list_empty_ignore_nulls !== true) throw new Error("list_empty_ignore_nulls index 0 failed");
    if (edgeResults[1].list_empty_ignore_nulls !== false) throw new Error("list_empty_ignore_nulls index 1 failed");
    if (edgeResults[2].list_empty_ignore_nulls !== true) throw new Error("list_empty_ignore_nulls index 2 failed");
    // n_unique checks (default is standard reference checks)
    const distinctResults = edgeDf.select([
        $df.col("dateVal").n_unique().alias("date_distinct_default"),
        $df.col("binaryVal").n_unique().alias("binary_distinct_default"),
        $df.col("numVal").n_unique().alias("num_distinct_default"),
        $df.col("nullVal").n_unique().alias("null_distinct_default"),

        // n_unique in strict mode (robust value checks)
        $df.col("dateVal").n_unique({ strict: true }).eq(2).alias("date_distinct_strict"),
        $df.col("binaryVal").n_unique({ strict: true }).eq(2).alias("binary_distinct_strict")
    ]).to_dicts() as any[];

    // In default mode, unique Date instances and TypedArray instances are counted separately (identity checks)
    if (distinctResults[0].date_distinct_default !== 3) throw new Error("dateVal distinct count failed");
    if (distinctResults[0].binary_distinct_default !== 3) throw new Error("binaryVal distinct count failed");
    if (distinctResults[0].num_distinct_default !== 2) throw new Error("numVal distinct count failed");
    if (distinctResults[0].null_distinct_default !== 2) throw new Error("nullVal distinct count failed");

    // In strict mode, they are strictly compared by value/type (using keySelector)
    if (distinctResults[0].date_distinct_strict !== true) throw new Error("dateVal strict distinct count failed");
    if (distinctResults[0].binary_distinct_strict !== true) throw new Error("binaryVal strict distinct count failed");

    console.log("✓ edge cases / complex types checks passed");

    console.log("\n🎉 ALL Expr.boolean COLUMN EXPRESSION TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("\n❌ Expr.boolean COLUMN EXPRESSION TESTS FAILED:", err);
    process.exit(1);
}

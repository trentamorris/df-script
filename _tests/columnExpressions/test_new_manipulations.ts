declare const process: any;
import { $tbl } from "../../src/index";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION NEW MANIPULATIONS TESTS...");
console.log("=========================================");

const data = [
    {
        id: 1,
        val: 10,
        other_val: 5,
        null_val: null,
        bool_val: true,
        str_val: "apple apple banana apple",
        list_val: [true, false, true, null],
        numeric_list: [1, 2, 3, 4, 5],
        regex_str: "$apple$ (banana) +cherry*? #&~"
    },
    {
        id: 2,
        val: null,
        other_val: 20,
        null_val: null,
        bool_val: false,
        str_val: "cherry",
        list_val: [false, false],
        numeric_list: [10, 20, 30],
        regex_str: "plain"
    }
];

try {
    const df = $tbl.data(data);

    const projected = df.select([
        // 1. fill_null (scalar and expression)
        $tbl.col("val").fill_null(99).alias("val_filled_scalar"),
        $tbl.col("val").fill_null($tbl.col("other_val")).alias("val_filled_expr"),
        $tbl.col("null_val").fill_null("fallback").alias("null_filled"),

        // 2. cast
        $tbl.col("id").cast($tbl.DataType.Utf8).alias("id_cast_str"),
        $tbl.col("str_val").cast($tbl.DataType.Boolean).alias("str_cast_bool"),

        // 3. logical boolean literals
        $tbl.col("bool_val").and(true).alias("bool_and_true"),
        $tbl.col("bool_val").and(false).alias("bool_and_false"),
        $tbl.col("bool_val").or(true).alias("bool_or_true"),
        $tbl.col("bool_val").or(false).alias("bool_or_false"),

        // 4. list any/all/contains/drop_nulls
        $tbl.col("list_val").list.any().alias("list_any"),
        $tbl.col("list_val").list.all().alias("list_all"),
        $tbl.col("list_val").list.contains_any([true, "nonexistent"]).alias("list_contains_any"),
        $tbl.col("list_val").list.contains_all([true, false]).alias("list_contains_all"),
        $tbl.col("list_val").list.drop_nulls().alias("list_dropped_nulls"),

        // 5. string count_matches / extract
        $tbl.col("str_val").str.count_matches("apple").alias("str_matches_str"),
        $tbl.col("str_val").str.count_matches(/apple/g).alias("str_matches_regex"),
        $tbl.col("str_val").str.extract(/(\w+)/).alias("str_extract_default"),
        $tbl.col("str_val").str.extract(/(\w+)\s+(\w+)/, 2).alias("str_extract_group"),
        $tbl.col("regex_str").str.encode_uri_component().alias("str_uri_encoded"),
        $tbl.col("regex_str").str.encode_uri_component().str.decode_uri_component().alias("str_uri_decoded"),
        $tbl.lit("constant_string").alias("lit_str"),
        $tbl.lit(42).alias("lit_num"),
        $tbl.lit([1, 2]).alias("lit_arr"),
        $tbl.coalesce($tbl.col("val"), $tbl.col("other_val")).alias("coalesce_val_other"),
        $tbl.coalesce($tbl.col("val"), 999).alias("coalesce_val_static")
    ]).collect() as any[];

    console.log("New manipulations test results:");
    console.dir(projected, { depth: null });

    const r0 = projected[0];
    const r1 = projected[1];

    // Assert fill_null
    if (r0.val_filled_scalar !== 10) throw new Error("r0.val_filled_scalar failed");
    if (r1.val_filled_scalar !== 99) throw new Error("r1.val_filled_scalar failed");
    if (r0.val_filled_expr !== 10) throw new Error("r0.val_filled_expr failed");
    if (r1.val_filled_expr !== 20) throw new Error("r1.val_filled_expr failed");
    if (r0.null_filled !== "fallback") throw new Error("r0.null_filled failed");

    // Assert coalesce
    if (r0.coalesce_val_other !== 10) throw new Error("r0.coalesce_val_other failed");
    if (r1.coalesce_val_other !== 20) throw new Error("r1.coalesce_val_other failed");
    if (r0.coalesce_val_static !== 10) throw new Error("r0.coalesce_val_static failed");
    if (r1.coalesce_val_static !== 999) throw new Error("r1.coalesce_val_static failed");

    // Assert cast
    if (r0.id_cast_str !== "1") throw new Error("r0.id_cast_str failed");
    if (typeof r0.id_cast_str !== "string") throw new Error("r0.id_cast_str type failed");
    if (r0.str_cast_bool !== true) throw new Error("r0.str_cast_bool failed");

    // Assert logical operations with boolean literals
    if (r0.bool_and_true !== true) throw new Error("r0.bool_and_true failed");
    if (r0.bool_and_false !== false) throw new Error("r0.bool_and_false failed");
    if (r0.bool_or_true !== true) throw new Error("r0.bool_or_true failed");
    if (r0.bool_or_false !== true) throw new Error("r0.bool_or_false failed");
    if (r1.bool_and_true !== false) throw new Error("r1.bool_and_true failed");
    if (r1.bool_or_false !== false) throw new Error("r1.bool_or_false failed");

    // Assert list enhancements
    if (r0.list_any !== true) throw new Error("r0.list_any failed");
    if (r0.list_all !== false) throw new Error("r0.list_all failed");
    if (r1.list_any !== false) throw new Error("r1.list_any failed");
    if (r1.list_all !== false) throw new Error("r1.list_all failed");
    if (r0.list_contains_any !== true) throw new Error("r0.list_contains_any failed");
    if (r0.list_contains_all !== true) throw new Error("r0.list_contains_all failed");
    if (JSON.stringify(r0.list_dropped_nulls) !== JSON.stringify([true, false, true])) {
        throw new Error(`r0.list_dropped_nulls failed: ${JSON.stringify(r0.list_dropped_nulls)}`);
    }

    // Assert string enhancements
    if (r0.str_matches_str !== 3) throw new Error("r0.str_matches_str failed");
    if (r0.str_matches_regex !== 3) throw new Error("r0.str_matches_regex failed");
    if (r0.str_extract_default !== "apple") throw new Error("r0.str_extract_default failed");
    if (r0.str_extract_group !== "apple") throw new Error("r0.str_extract_group failed");
    if (r0.str_uri_encoded !== "%24apple%24%20(banana)%20%2Bcherry*%3F%20%23%26~") throw new Error("r0.str_uri_encoded failed: " + r0.str_uri_encoded);
    if (r0.str_uri_decoded !== "$apple$ (banana) +cherry*? #&~") throw new Error("r0.str_uri_decoded failed: " + r0.str_uri_decoded);
    if (r1.str_uri_encoded !== "plain") throw new Error("r1.str_uri_encoded failed");
    if (r1.str_uri_decoded !== "plain") throw new Error("r1.str_uri_decoded failed");

    // Assert lit projections
    if (r0.lit_str !== "constant_string") throw new Error("r0.lit_str failed");
    if (r0.lit_num !== 42) throw new Error("r0.lit_num failed");
    if (JSON.stringify(r0.lit_arr) !== JSON.stringify([1, 2])) throw new Error("r0.lit_arr failed");
    if (r1.lit_str !== "constant_string") throw new Error("r1.lit_str failed");
    if (r1.lit_num !== 42) throw new Error("r1.lit_num failed");
    if (JSON.stringify(r1.lit_arr) !== JSON.stringify([1, 2])) throw new Error("r1.lit_arr failed");


    // 6. Test Quantile aggregation
    const aggResult = df.select([
        $tbl.col("numeric_list").list.first().quantile(0.5).alias("q_50"),
        $tbl.col("numeric_list").list.first().quantile(0.9).alias("q_90"),
        $tbl.col("numeric_list").list.first().n_unique().alias("n_uniq")
    ]).collect() as any[];

    console.log("Aggregation test results:");
    console.dir(aggResult, { depth: null });
    const agg0 = aggResult[0];

    // Numbers resolved from first elements: [1, 10]
    // Sorted: [1, 10]
    // Quantile 0.5: index = 1 * 0.5 = 0.5 => 1 + 0.5 * 9 = 5.5
    // Quantile 0.9: index = 1 * 0.9 = 0.9 => 1 + 0.9 * 9 = 9.1
    if (agg0.q_50 !== 5.5) throw new Error(`agg0.q_50 failed, got ${agg0.q_50}`);
    if (agg0.q_90 !== 9.1) throw new Error(`agg0.q_90 failed, got ${agg0.q_90}`);
    if (agg0.n_uniq !== 2) throw new Error("agg0.n_uniq failed");
    console.log("\n🎉 ALL Expr NEW MANIPULATIONS TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("\n❌ Expr NEW MANIPULATIONS TESTS FAILED:", err);
    process.exit(1);
}

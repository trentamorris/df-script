import { $df, ShapeError, DataFrame } from "../../src/index";

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
    const df = $df.data(data);

    const projected = df.select([
        // 1. fill_null (scalar and expression)
        $df.col("val").fill_null({ value: 99 }).alias("val_filled_scalar"),
        $df.col("val").fill_null({ value: $df.col("other_val") }).alias("val_filled_expr"),
        $df.col("null_val").fill_null({ value: "fallback" }).alias("null_filled"),

        // 2. cast
        $df.col("id").cast($df.DataType.Utf8).alias("id_cast_str"),
        $df.col("str_val").cast($df.DataType.Boolean).alias("str_cast_bool"),

        // 3. logical boolean literals
        $df.col("bool_val").and(true).alias("bool_and_true"),
        $df.col("bool_val").and(false).alias("bool_and_false"),
        $df.col("bool_val").or(true).alias("bool_or_true"),
        $df.col("bool_val").or(false).alias("bool_or_false"),

        // 4. list any/all/contains/drop_nulls
        $df.col("list_val").arr.any().alias("list_any"),
        $df.col("list_val").arr.all().alias("list_all"),
        $df.col("list_val").arr.contains_any([true, "nonexistent"]).alias("list_contains_any"),
        $df.col("list_val").arr.contains_all([true, false]).alias("list_contains_all"),
        $df.col("list_val").arr.drop_nulls().alias("list_dropped_nulls"),

        // 5. string count_matches / extract
        $df.col("str_val").str.count_matches("apple").alias("str_matches_str"),
        $df.col("str_val").str.count_matches(/apple/g).alias("str_matches_regex"),
        $df.col("str_val").str.extract(/(\w+)/).alias("str_extract_default"),
        $df.col("str_val").str.extract(/(\w+)\s+(\w+)/, 2).alias("str_extract_group"),
        $df.col("regex_str").str.encode_uri_component().alias("str_uri_encoded"),
        $df.col("regex_str").str.encode_uri_component().str.decode_uri_component().alias("str_uri_decoded"),
        $df.lit("constant_string").alias("lit_str"),
        $df.lit(42).alias("lit_num"),
        $df.lit([1, 2]).alias("lit_arr"),
        $df.lit(123.45, { dtype: $df.DataType.Int32, name: "lit_coerced_int" }),
        $df.coalesce($df.col("val"), $df.col("other_val")).alias("coalesce_val_other"),

        $df.coalesce($df.col("val"), 999).alias("coalesce_val_static")
    ]).to_dicts() as any[];

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
    if (r0.lit_coerced_int !== 123) throw new Error("r0.lit_coerced_int failed");
    if (r1.lit_str !== "constant_string") throw new Error("r1.lit_str failed");
    if (r1.lit_num !== 42) throw new Error("r1.lit_num failed");
    if (JSON.stringify(r1.lit_arr) !== JSON.stringify([1, 2])) throw new Error("r1.lit_arr failed");
    if (r1.lit_coerced_int !== 123) throw new Error("r1.lit_coerced_int failed");



    // 6. Test Quantile aggregation
    const aggResult = df.select([
        $df.col("numeric_list").arr.first().quantile(0.5).alias("q_50"),
        $df.col("numeric_list").arr.first().quantile(0.9).alias("q_90"),
        $df.col("numeric_list").arr.first().n_unique().alias("n_uniq"),
        $df.col("id").mode().alias("mode_id"),
        $df.col("id").mode().arr.first().alias("first_mode_id"),
        $df.col("id").mode().arr.last().alias("last_mode_id")
    ]).to_dicts() as any[];

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
    if (JSON.stringify(agg0.mode_id) !== JSON.stringify([1, 2])) throw new Error(`agg0.mode_id failed, got ${JSON.stringify(agg0.mode_id)}`);
    if (agg0.first_mode_id !== 1) throw new Error(`agg0.first_mode_id failed, got ${agg0.first_mode_id}`);
    if (agg0.last_mode_id !== 2) throw new Error(`agg0.last_mode_id failed, got ${agg0.last_mode_id}`);

    // Test fill_nan, drop_nulls, drop_nans, explode, implode
    const structuralData = [
        { group: "A", val: 1.5, list: [1, 2] },
        { group: "A", val: null, list: [] },
        { group: "B", val: null, list: null },
        { group: "B", val: 2.3, list: [3, 4] }
    ];
    const structuralDf = $df.data(structuralData);


    // Test implode aggregation
    const groupedImplode = structuralDf.groupby("group").agg([
        $df.col("val").implode().alias("imploded_vals"),
        $df.implode("val").alias("imploded_fn"),
        $df.implode(["val", "list"])
    ]).to_dicts();

    console.log("Grouped implode results:");
    console.dir(groupedImplode, { depth: null });

    const groupA = groupedImplode.find(r => r.group === "A");
    const groupB = groupedImplode.find(r => r.group === "B");
    if (!groupA || groupA.imploded_vals.length !== 2 || groupA.imploded_vals[0] !== 1.5 || groupA.imploded_vals[1] !== null) {
        throw new Error("group A implode failed");
    }
    if (JSON.stringify(groupA.imploded_fn) !== JSON.stringify(groupA.imploded_vals)) {
        throw new Error("group A implode fn failed");
    }
    if (JSON.stringify(groupA.val) !== JSON.stringify(groupA.imploded_vals)) {
        throw new Error("group A col([...]) implode failed");
    }
    if (JSON.stringify(groupA.list) !== JSON.stringify([[1, 2], []])) {
        throw new Error("group A col([...]) list implode failed: " + JSON.stringify(groupA.list));
    }

    if (!groupB || groupB.imploded_vals.length !== 2 || groupB.imploded_vals[0] !== null || groupB.imploded_vals[1] !== 2.3) {
        throw new Error("group B implode failed");
    }
    if (JSON.stringify(groupB.val) !== JSON.stringify(groupB.imploded_vals)) {
        throw new Error("group B col([...]) implode failed");
    }
    // Test explode DataFrame-level and Expression-level
    const explodableData = [
        { id: 1, list: [10, 20], tag: "A" },
        { id: 2, list: [], tag: "B" },
        { id: 3, list: null, tag: "C" },
        { id: 4, list: [30], tag: "D" }
    ];
    const expDf = $df.data(explodableData);

    // 1. DataFrame.explode
    const exploded = expDf.explode("list").to_dicts();
    console.log("Exploded DataFrame results:");
    console.dir(exploded);
    if (exploded.length !== 5) {
        throw new Error(`Expected exploded height 5, got ${exploded.length}`);
    }
    if (exploded[0].id !== 1 || exploded[0].list !== 10 || exploded[0].tag !== "A") throw new Error("explode row 0 failed");
    if (exploded[1].id !== 1 || exploded[1].list !== 20 || exploded[1].tag !== "A") throw new Error("explode row 1 failed");
    if (exploded[2].id !== 2 || exploded[2].list !== null || exploded[2].tag !== "B") throw new Error("explode row 2 failed");
    if (exploded[3].id !== 3 || exploded[3].list !== null || exploded[3].tag !== "C") throw new Error("explode row 3 failed");
    if (exploded[4].id !== 4 || exploded[4].list !== 30 || exploded[4].tag !== "D") throw new Error("explode row 4 failed");

    // Test DataFrame.explode options
    const explodedNoEmpty = expDf.explode("list", { empty_as_null: false }).to_dicts();
    if (explodedNoEmpty.length !== 4) throw new Error(`Expected explodedNoEmpty length 4, got ${explodedNoEmpty.length}`);
    if (explodedNoEmpty[2].id !== 3 || explodedNoEmpty[2].list !== null) throw new Error("explodedNoEmpty row 2 failed");

    const explodedNoNulls = expDf.explode("list", { keep_nulls: false }).to_dicts();
    if (explodedNoNulls.length !== 4) throw new Error(`Expected explodedNoNulls length 4, got ${explodedNoNulls.length}`);
    if (explodedNoNulls[2].id !== 2 || explodedNoNulls[2].list !== null) throw new Error("explodedNoNulls row 2 failed");

    const explodedNeither = expDf.explode("list", { empty_as_null: false, keep_nulls: false }).to_dicts();
    if (explodedNeither.length !== 3) throw new Error(`Expected explodedNeither length 3, got ${explodedNeither.length}`);
    if (explodedNeither[2].id !== 4 || explodedNeither[2].list !== 30) throw new Error("explodedNeither row 2 failed");

    // Test DataFrame.explode accepting Expressions and lists of names
    const explodedExpr = expDf.explode($df.col("list")).to_dicts();
    if (explodedExpr.length !== 5 || explodedExpr[0].list !== 10) throw new Error("explode with expression failed");

    const explodedList = expDf.explode(["list"]).to_dicts();
    if (explodedList.length !== 5 || explodedList[0].list !== 10) throw new Error("explode with array of strings failed");

    // Test parallel/synchronized explosions of multiple columns using array of strings
    const multiDf = $df.data([
        { id: 1, list1: [10, 20], list2: ["a", "b"] },
        { id: 2, list1: [], list2: [] },
        { id: 3, list1: null, list2: null },
        { id: 4, list1: [30], list2: ["d"] }
    ]);
    const explodedMulti = multiDf.explode(["list1", "list2"]).to_dicts();
    if (explodedMulti.length !== 5) throw new Error(`Expected explodedMulti length 5, got ${explodedMulti.length}`);
    if (explodedMulti[0].list1 !== 10 || explodedMulti[0].list2 !== "a") throw new Error("explodedMulti row 0 failed");
    if (explodedMulti[1].list1 !== 20 || explodedMulti[1].list2 !== "b") throw new Error("explodedMulti row 1 failed");
    if (explodedMulti[2].list1 !== null || explodedMulti[2].list2 !== null) throw new Error("explodedMulti row 2 failed");
    if (explodedMulti[3].list1 !== null || explodedMulti[3].list2 !== null) throw new Error("explodedMulti row 3 failed");
    if (explodedMulti[4].list1 !== 30 || explodedMulti[4].list2 !== "d") throw new Error("explodedMulti row 4 failed");

    // Test ShapeError on mismatched parallel explode heights
    const mismatchMultiDf = $df.data([
        { id: 1, list1: [10, 20], list2: ["a"] }
    ]);
    let threwMismatchedExplode = false;
    try {
        mismatchMultiDf.explode(["list1", "list2"]);
    } catch (e: any) {
        if (e instanceof ShapeError && e.message.includes("Mismatched explode heights")) {
            threwMismatchedExplode = true;
        }
    }
    if (!threwMismatchedExplode) {
        throw new Error("Expected explode to throw ShapeError on mismatched parallel explode heights");
    }

    // Test ShapeError on matching total length but mismatched row-by-row lengths
    const mismatchRowLengthsDf = $df.data([
        { id: 1, list1: [10, 20], list2: ["a"] },
        { id: 2, list1: [30], list2: ["b", "c"] }
    ]);
    let threwMismatchedRowLengths = false;
    try {
        mismatchRowLengthsDf.explode(["list1", "list2"]);
    } catch (e: any) {
        if (e instanceof ShapeError && e.message.includes("mismatched row lengths")) {
            threwMismatchedRowLengths = true;
        }
    }
    if (!threwMismatchedRowLengths) {
        throw new Error("Expected explode to throw ShapeError on mismatched row-by-row lengths");
    }


    // 2. col().arr.explode in select expands columns and repeats values
    const selectExploded = expDf.select([
        $df.col("id"),
        $df.col("list").arr.explode().alias("exploded_val"),
        $df.col("tag")
    ]).to_dicts();
    console.log("selectExploded results:");
    console.dir(selectExploded);
    if (selectExploded.length !== 5) {
        throw new Error(`Expected select exploded height 5, got ${selectExploded.length}`);
    }
    if (selectExploded[0].id !== 1 || selectExploded[0].exploded_val !== 10 || selectExploded[0].tag !== "A") throw new Error("select explode row 0 failed");
    if (selectExploded[1].id !== 1 || selectExploded[1].exploded_val !== 20 || selectExploded[1].tag !== "A") throw new Error("select explode row 1 failed");
    if (selectExploded[2].id !== 2 || selectExploded[2].exploded_val !== null || selectExploded[2].tag !== "B") throw new Error("select explode row 2 failed");
    if (selectExploded[3].id !== 3 || selectExploded[3].exploded_val !== null || selectExploded[3].tag !== "C") throw new Error("select explode row 3 failed");
    if (selectExploded[4].id !== 4 || selectExploded[4].exploded_val !== 30 || selectExploded[4].tag !== "D") throw new Error("select explode row 4 failed");

    // 2b. col().arr.explode in select succeeds if list lengths are all 1 (matching height)
    const matchingDf = $df.data([
        { id: 1, list: [100] },
        { id: 2, list: [200] }
    ]);
    const selectMatching = matchingDf.select([$df.col("id"), $df.col("list").arr.explode().alias("exploded_val")]).to_dicts();
    if (selectMatching.length !== 2) throw new Error("select matching list length failed");
    if (selectMatching[0].exploded_val !== 100 || selectMatching[1].exploded_val !== 200) throw new Error("select matching list values failed");

    // 3. col().arr.explode in with_columns expands columns and repeats existing columns
    const withColsExploded = expDf.with_columns(
        $df.col("list").arr.explode().alias("exploded_val")
    ).to_dicts();
    console.log("withColsExploded results:");
    console.dir(withColsExploded);
    if (withColsExploded.length !== 5) {
        throw new Error(`Expected with_columns exploded height 5, got ${withColsExploded.length}`);
    }
    if (withColsExploded[0].id !== 1 || withColsExploded[0].exploded_val !== 10 || withColsExploded[0].tag !== "A") throw new Error("with_columns explode row 0 failed");
    if (withColsExploded[1].id !== 1 || withColsExploded[1].exploded_val !== 20 || withColsExploded[1].tag !== "A") throw new Error("with_columns explode row 1 failed");
    if (withColsExploded[2].id !== 2 || withColsExploded[2].exploded_val !== null || withColsExploded[2].tag !== "B") throw new Error("with_columns explode row 2 failed");
    if (withColsExploded[3].id !== 3 || withColsExploded[3].exploded_val !== null || withColsExploded[3].tag !== "C") throw new Error("with_columns explode row 3 failed");
    if (withColsExploded[4].id !== 4 || withColsExploded[4].exploded_val !== 30 || withColsExploded[4].tag !== "D") throw new Error("with_columns explode row 4 failed");

    // Test ShapeError on height mismatch in select/with_columns
    const mismatchDf = $df.data([
        { id: 1, val: 10 },
        { id: 2, val: 20 }
    ]);

    // Create an expression that evaluates to an array of different length
    const badExpr = $df.col("val");
    badExpr.evaluate = (_cols, _h) => [1, 2, 3]; // Length 3 instead of 2

    let selectThrew = false;
    try {
        mismatchDf.select(badExpr);
    } catch (e: any) {
        if (e instanceof ShapeError && e.message.includes("Column height mismatch")) {
            selectThrew = true;
        }
    }
    if (!selectThrew) {
        throw new Error("Expected select to throw ShapeError on height mismatch");
    }

    let withColsThrew = false;
    try {
        mismatchDf.with_columns(badExpr);
    } catch (e: any) {
        if (e instanceof ShapeError && e.message.includes("Column height mismatch")) {
            withColsThrew = true;
        }
    }
    if (!withColsThrew) {
        throw new Error("Expected with_columns to throw ShapeError on height mismatch");
    }

    // Test constructor ShapeError
    let constructorThrew = false;
    try {
        new DataFrame({ a: [1, 2], b: [1, 2, 3] });
    } catch (e: any) {
        if ((e instanceof ShapeError || e.name === "ShapeError") && e.message.includes("Column height mismatch")) {
            constructorThrew = true;
        }
    }
    if (!constructorThrew) {
        throw new Error("Expected constructor to throw ShapeError on column length mismatch");
    }

    // Test horizontal concat ShapeError
    let concatThrew = false;
    try {
        const df1 = new DataFrame({ a: [1, 2] });
        const df2 = new DataFrame({ b: [1, 2, 3] });
        df1.hstack(df2);
    } catch (e: any) {
        if ((e instanceof ShapeError || e.name === "ShapeError") && e.message.includes("Row count mismatch")) {
            concatThrew = true;
        }
    }
    if (!concatThrew) {
        throw new Error("Expected horizontal concat/hstack to throw ShapeError on row count mismatch");
    }

    // =========================================
    // STARTING SEQ_RANGE CONSTANT TESTS
    // =========================================
    const testSeqRangeDf = $df.data([
        { id: 1 },
        { id: 2 },
        { id: 3 }
    ]);

    // 1. Omitted n: behave like lit (broadcast to DataFrame height)
    const seqRangeBroadcast = testSeqRangeDf.select([
        $df.seq_range("z", { mode: "constant" }).alias("broadcasted")
    ]).to_dicts();
    if (seqRangeBroadcast.length !== 3) throw new Error("seq_range broadcast length mismatch");
    for (let i = 0; i < 3; i++) {
        if (seqRangeBroadcast[i].broadcasted !== "z") {
            throw new Error(`seq_range broadcast value mismatch at index ${i}`);
        }
    }

    // 1b. Selecting ONLY literal collapses to 1 row (Polars-style)
    const seqRangeLiteralOnly = testSeqRangeDf.select([
        $df.lit("z").alias("broadcasted")
    ]).to_dicts();
    if (seqRangeLiteralOnly.length !== 1) throw new Error("single literal select should collapse to 1 row");
    if (seqRangeLiteralOnly[0].broadcasted !== "z") throw new Error("value mismatch in collapsed select");


    // 2. Exact match: n matches DataFrame height (n = 3)
    const seqRangeExact = testSeqRangeDf.select([
        $df.seq_range("x", { n: 3, mode: "constant" }).alias("exact")
    ]).to_dicts();
    if (seqRangeExact.length !== 3) throw new Error("seq_range exact length mismatch");
    for (let i = 0; i < 3; i++) {
        if (seqRangeExact[i].exact !== "x") {
            throw new Error(`seq_range exact value mismatch at index ${i}`);
        }
    }

    // 3. Strict mode mismatch: n = 5 (larger than df height 3)
    let strictThrewLarger = false;
    try {
        testSeqRangeDf.select([$df.seq_range("y", { n: 5, mode: "constant" })]);
    } catch (e: any) {
        if (e instanceof ShapeError && e.message.includes("Column height mismatch")) {
            strictThrewLarger = true;
        }
    }
    if (!strictThrewLarger) {
        throw new Error("Expected seq_range to throw ShapeError when n > DataFrame height under strict: true");
    }

    // 4. Strict mode mismatch: n = 2 (smaller than df height 3)
    let strictThrewSmaller = false;
    try {
        testSeqRangeDf.select([$df.seq_range("y", { n: 2, mode: "constant" })]);
    } catch (e: any) {
        if (e instanceof ShapeError && e.message.includes("Column height mismatch")) {
            strictThrewSmaller = true;
        }
    }
    if (!strictThrewSmaller) {
        throw new Error("Expected seq_range to throw ShapeError when n < DataFrame height under strict: true");
    }

    // 5. Strict mode with dtype: coerces repeated value
    const seqRangeDtype = testSeqRangeDf.select([
        $df.seq_range(123.45, { n: 3, dtype: $df.DataType.Int32, mode: "constant" }).alias("val")
    ]).to_dicts();
    for (let i = 0; i < 3; i++) {
        if (seqRangeDtype[i].val !== 123) {
            throw new Error(`seq_range dtype coercion failed at index ${i}, expected 123 got ${seqRangeDtype[i].val}`);
        }
    }

    // 6. Strict mode with name: sets output column name
    const seqRangeName = testSeqRangeDf.select([
        $df.seq_range("a", { name: "custom_name", mode: "constant" })
    ]).to_dicts();
    if (seqRangeName[0].custom_name !== "a") {
        throw new Error("seq_range option name failed to rename column");
    }

    // 7. Non-strict mode: omitted n behaves like lit
    const seqRangeNonStrictBroadcast = testSeqRangeDf.select([
        $df.seq_range("z", { strict: false, mode: "constant" }).alias("val")
    ]).to_dicts();
    for (let i = 0; i < 3; i++) {
        if (seqRangeNonStrictBroadcast[i].val !== "z") {
            throw new Error("seq_range non-strict broadcast failed");
        }
    }

    // 8. Non-strict mode: n matches DataFrame height
    const seqRangeNonStrictExact = testSeqRangeDf.select([
        $df.seq_range("x", { n: 3, strict: false, mode: "constant" }).alias("val")
    ]).to_dicts();
    for (let i = 0; i < 3; i++) {
        if (seqRangeNonStrictExact[i].val !== "x") {
            throw new Error("seq_range non-strict exact failed");
        }
    }

    // 9. Non-strict mode: n = 5 (larger) with default options auto-truncates to 3
    const seqRangeNonStrictTruncateDefault = testSeqRangeDf.select([
        $df.seq_range("a", { n: 5, strict: false, mode: "constant" }).alias("val")
    ]).to_dicts();
    if (seqRangeNonStrictTruncateDefault.length !== 3) throw new Error("seq_range non-strict truncate default length failed");
    for (let i = 0; i < 3; i++) {
        if (seqRangeNonStrictTruncateDefault[i].val !== "a") {
            throw new Error("seq_range non-strict truncate default values failed");
        }
    }

    // 10. Non-strict mode: n = 2 (smaller) with default options auto-pads to 3
    const seqRangeNonStrictPadDefault = testSeqRangeDf.select([
        $df.seq_range("b", { n: 2, strict: false, mode: "constant" }).alias("val")
    ]).to_dicts();
    if (seqRangeNonStrictPadDefault[0].val !== "b" || seqRangeNonStrictPadDefault[1].val !== "b" || seqRangeNonStrictPadDefault[2].val !== null) {
        throw new Error("seq_range non-strict pad default failed");
    }

    // 11. Non-strict mode: n = 5 (larger) with truncate: true, pad: false truncates to 3
    const seqRangeNonStrictTruncateExplicit = testSeqRangeDf.select([
        $df.seq_range("c", { n: 5, strict: false, truncate: true, pad: false, mode: "constant" }).alias("val")
    ]).to_dicts();
    for (let i = 0; i < 3; i++) {
        if (seqRangeNonStrictTruncateExplicit[i].val !== "c") {
            throw new Error("seq_range non-strict truncate explicit failed");
        }
    }

    // 12. Non-strict mode: n = 2 (smaller) with truncate: true, pad: false throws ShapeError
    let nonStrictTruncateSmallerThrew = false;
    try {
        testSeqRangeDf.select([$df.seq_range("d", { n: 2, strict: false, truncate: true, pad: false, mode: "constant" })]);
    } catch (e: any) {
        if (e instanceof ShapeError && e.message.includes("Cannot truncate seq_range output")) {
            nonStrictTruncateSmallerThrew = true;
        }
    }
    if (!nonStrictTruncateSmallerThrew) {
        throw new Error("Expected non-strict seq_range to throw when padding is required but not allowed");
    }

    // 13. Non-strict mode: n = 2 (smaller) with pad: true, truncate: false pads to 3
    const seqRangeNonStrictPadExplicit = testSeqRangeDf.select([
        $df.seq_range("e", { n: 2, strict: false, pad: true, truncate: false, mode: "constant" }).alias("val")
    ]).to_dicts();
    if (seqRangeNonStrictPadExplicit[0].val !== "e" || seqRangeNonStrictPadExplicit[1].val !== "e" || seqRangeNonStrictPadExplicit[2].val !== null) {
        throw new Error("seq_range non-strict pad explicit failed");
    }

    // 14. Non-strict mode: n = 5 (larger) with pad: true, truncate: false throws ShapeError
    let nonStrictPadLargerThrew = false;
    try {
        testSeqRangeDf.select([$df.seq_range("f", { n: 5, strict: false, pad: true, truncate: false, mode: "constant" })]);
    } catch (e: any) {
        if (e instanceof ShapeError && e.message.includes("Cannot pad seq_range output")) {
            nonStrictPadLargerThrew = true;
        }
    }
    if (!nonStrictPadLargerThrew) {
        throw new Error("Expected non-strict seq_range to throw when truncation is required but not allowed");
    }

    // 15. Non-strict mode: custom padValue padding
    const seqRangeCustomPadValue = testSeqRangeDf.select([
        $df.seq_range("g", { n: 2, strict: false, padValue: "missing", mode: "constant" }).alias("val")
    ]).to_dicts();
    if (seqRangeCustomPadValue[0].val !== "g" || seqRangeCustomPadValue[1].val !== "g" || seqRangeCustomPadValue[2].val !== "missing") {
        throw new Error("seq_range custom padValue failed");
    }

    // 16. Non-strict mode: custom padValue with dtype coercion
    const seqRangeCustomPadCoerced = testSeqRangeDf.select([
        $df.seq_range(10, { n: 2, strict: false, padValue: 99.9, dtype: $df.DataType.Int32, mode: "constant" }).alias("val")
    ]).to_dicts();
    if (seqRangeCustomPadCoerced[0].val !== 10 || seqRangeCustomPadCoerced[1].val !== 10 || seqRangeCustomPadCoerced[2].val !== 99) {
        throw new Error("seq_range custom padValue coercion failed");
    }

    // 17. startIndex and endIndex under strict: false
    const seqRangeStartEndFit = testSeqRangeDf.select([
        $df.seq_range("z", { strict: false, startIndex: 1, endIndex: 3, mode: "constant" }).alias("val")
    ]).to_dicts();
    if (seqRangeStartEndFit[0].val !== null || seqRangeStartEndFit[1].val !== "z" || seqRangeStartEndFit[2].val !== "z") {
        throw new Error("seq_range startIndex and endIndex fit failed");
    }

    // Negative indices: startIndex: -2, endIndex: -1 -> slice [1, 2) on height 3
    const seqRangeStartEndNeg = testSeqRangeDf.select([
        $df.seq_range("z", { strict: false, startIndex: -2, endIndex: -1, mode: "constant" }).alias("val")
    ]).to_dicts();
    if (seqRangeStartEndNeg[0].val !== null || seqRangeStartEndNeg[1].val !== "z" || seqRangeStartEndNeg[2].val !== null) {
        throw new Error("seq_range negative startIndex and endIndex failed");
    }

    // 18. startIndex and endIndex with padding and truncation
    // startIndex: 1, endIndex: 2 (width 1), n: 2, truncate: true -> fills index 1, index 0 and 2 are null
    const seqRangeStartEndTruncated = testSeqRangeDf.select([
        $df.seq_range("a", { n: 2, strict: false, startIndex: 1, endIndex: 2, truncate: true, mode: "constant" }).alias("val")
    ]).to_dicts();
    if (seqRangeStartEndTruncated[0].val !== null || seqRangeStartEndTruncated[1].val !== "a" || seqRangeStartEndTruncated[2].val !== null) {
        throw new Error("seq_range startIndex and endIndex with truncate failed");
    }

    // startIndex: 1, endIndex: 3 (width 2), n: 1, pad: true, padValue: "x" -> fills index 1 with "b", pads index 0, 2 with "x"
    const seqRangeStartEndPadded = testSeqRangeDf.select([
        $df.seq_range("b", { n: 1, strict: false, startIndex: 1, endIndex: 3, pad: true, padValue: "x", mode: "constant" }).alias("val")
    ]).to_dicts();
    if (seqRangeStartEndPadded[0].val !== "x" || seqRangeStartEndPadded[1].val !== "b" || seqRangeStartEndPadded[2].val !== "x") {
        throw new Error("seq_range startIndex and endIndex with pad failed");
    }



    console.log("\n🎉 ALL Expr NEW MANIPULATIONS TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("\n❌ Expr NEW MANIPULATIONS TESTS FAILED:", err);
    process.exit(1);
}

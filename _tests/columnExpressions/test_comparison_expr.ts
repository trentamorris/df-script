import { $tbl } from "../../src/index";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION COMPARISON TESTS...");
console.log("=========================================");

const data = [
    {
        val: 15,
        lower: 10,
        upper: 20,
        tags: ["a", "b"],
        target: "a",
        null_col: null
    },
    {
        val: 5,
        lower: 10,
        upper: 20,
        tags: ["c"],
        target: "a",
        null_col: null
    },
    {
        val: 20,
        lower: 10,
        upper: 20,
        tags: ["a"],
        target: "x",
        null_col: 100
    }
];

try {
    const df = $tbl.data(data);

    const projected = df.select([
        // between tests
        $tbl.col("val").between($tbl.col("lower"), $tbl.col("upper")).alias("between_default"), // closed = both
        $tbl.col("val").between($tbl.col("lower"), $tbl.col("upper"), "left").alias("between_left"),
        $tbl.col("val").between($tbl.col("lower"), $tbl.col("upper"), "right").alias("between_right"),
        $tbl.col("val").between($tbl.col("lower"), $tbl.col("upper"), "none").alias("between_none"),
        
        // eq_missing and ne_missing tests
        $tbl.col("null_col").eq_missing(null).alias("eq_missing_null"),
        $tbl.col("null_col").eq_missing(100).alias("eq_missing_val"),
        $tbl.col("null_col").ne_missing(null).alias("ne_missing_null"),
        $tbl.col("null_col").ne_missing(100).alias("ne_missing_val"),

        // is_in / not_in dynamic IExpr tests
        $tbl.col("target").is_in($tbl.col("tags")).alias("is_in_expr"),
        $tbl.col("target").not_in($tbl.col("tags")).alias("not_in_expr"),
        $tbl.col("target").is_in(["a", "b"]).alias("is_in_array")
    ]).collect() as any[];

    console.dir(projected, { depth: null });

    // Assert row 0 (val = 15, lower = 10, upper = 20, tags = ["a", "b"], target = "a", null_col = null)
    const r0 = projected[0];
    if (r0.between_default !== true) throw new Error("r0.between_default failed");
    if (r0.between_left !== true) throw new Error("r0.between_left failed");
    if (r0.between_right !== true) throw new Error("r0.between_right failed");
    if (r0.between_none !== true) throw new Error("r0.between_none failed");
    if (r0.eq_missing_null !== true) throw new Error("r0.eq_missing_null failed");
    if (r0.eq_missing_val !== false) throw new Error("r0.eq_missing_val failed");
    if (r0.ne_missing_null !== false) throw new Error("r0.ne_missing_null failed");
    if (r0.ne_missing_val !== true) throw new Error("r0.ne_missing_val failed");
    if (r0.is_in_expr !== true) throw new Error("r0.is_in_expr failed");
    if (r0.not_in_expr !== false) throw new Error("r0.not_in_expr failed");
    if (r0.is_in_array !== true) throw new Error("r0.is_in_array failed");

    // Assert row 1 (val = 5, lower = 10, upper = 20, tags = ["c"], target = "a", null_col = null)
    const r1 = projected[1];
    if (r1.between_default !== false) throw new Error("r1.between_default failed");
    if (r1.eq_missing_null !== true) throw new Error("r1.eq_missing_null failed");
    if (r1.is_in_expr !== false) throw new Error("r1.is_in_expr failed");
    if (r1.not_in_expr !== true) throw new Error("r1.not_in_expr failed");

    // Assert row 2 (val = 20, lower = 10, upper = 20, tags = ["a"], target = "x", null_col = 100)
    const r2 = projected[2];
    if (r2.between_default !== true) throw new Error("r2.between_default failed"); // 20 is inside [10, 20]
    if (r2.between_left !== false) throw new Error("r2.between_left failed"); // 20 not inside [10, 20)
    if (r2.between_right !== true) throw new Error("r2.between_right failed"); // 20 is inside (10, 20]
    if (r2.between_none !== false) throw new Error("r2.between_none failed"); // 20 not inside (10, 20)
    if (r2.eq_missing_null !== false) throw new Error("r2.eq_missing_null failed");
    if (r2.eq_missing_val !== true) throw new Error("r2.eq_missing_val failed");
    if (r2.ne_missing_null !== true) throw new Error("r2.ne_missing_null failed");
    if (r2.ne_missing_val !== false) throw new Error("r2.ne_missing_val failed");
    if (r2.is_in_expr !== false) throw new Error("r2.is_in_expr failed");
    if (r2.not_in_expr !== true) throw new Error("r2.not_in_expr failed");

    // TypedArray test
    const typedDf = $tbl.data({
        val: new Int32Array([15, 5, 20]),
        lower: new Int32Array([10, 10, 10]),
        upper: new Int32Array([20, 20, 20]),
        tags: [new Int32Array([15, 10]), new Int32Array([5]), new Int32Array([20])]
    } as any);

    const typedProjected = typedDf.select([
        $tbl.col("val").between($tbl.col("lower"), $tbl.col("upper")).alias("between"),
        $tbl.col("val").is_in(new Int32Array([15, 20]) as any).alias("is_in_static"),
        $tbl.col("val").and(true).alias("and_true")
    ]).collect() as any[];

    if (typedProjected[0].between !== true) throw new Error("TypedArray between failed on index 0");
    if (typedProjected[1].between !== false) throw new Error("TypedArray between failed on index 1");
    if (typedProjected[2].between !== true) throw new Error("TypedArray between failed on index 2");

    if (typedProjected[0].is_in_static !== true) throw new Error("TypedArray is_in_static failed on index 0");
    if (typedProjected[1].is_in_static !== false) throw new Error("TypedArray is_in_static failed on index 1");
    if (typedProjected[2].is_in_static !== true) throw new Error("TypedArray is_in_static failed on index 2");

    console.log("=========================================");
    console.log("🎉 ALL COLUMN EXPRESSION COMPARISON TESTS PASSED!");
    console.log("=========================================");
} catch (error) {
    console.error("Test failed with error:", error);
    process.exit(1);
}

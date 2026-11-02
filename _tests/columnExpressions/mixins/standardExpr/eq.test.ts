declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.eq edge-case tests...");

// 1. Basic Primitives Comparison (Numbers, Strings, Booleans, BigInts)
{
    const df = $df.data({
        nums_a: [10, 20, 30],
        nums_b: [10, 99, 30],
        str_a: ["apple", "banana", "cherry"],
        str_b: ["apple", "orange", "cherry"],
        bool_a: [true, false, true],
        bool_b: [true, true, false],
        big_a: [100n, 200n, 300n],
        big_b: [100n, 999n, 300n]
    });

    const res = df.select([
        $df.col("nums_a").eq($df.col("nums_b")).alias("nums"),
        $df.col("str_a").eq($df.col("str_b")).alias("strs"),
        $df.col("bool_a").eq($df.col("bool_b")).alias("bools"),
        $df.col("big_a").eq($df.col("big_b")).alias("big")
    ]).toDicts() as any[];

    if (res[0].nums !== true || res[1].nums !== false || res[2].nums !== true) {
        throw new Error("Case 1a: Number eq failed");
    }
    if (res[0].strs !== true || res[1].strs !== false || res[2].strs !== true) {
        throw new Error("Case 1b: String eq failed");
    }
    if (res[0].bools !== true || res[1].bools !== false || res[2].bools !== false) {
        throw new Error("Case 1c: Boolean eq failed");
    }
    if (res[0].big !== true || res[1].big !== false || res[2].big !== true) {
        throw new Error("Case 1d: BigInt eq failed");
    }
}

// 2. Kleene Three-Valued Logic with Null & Undefined (unknown === anything -> null)
{
    const df = $df.data({
        a: [10, null, 30, null],
        b: [10, null, null, 40]
    });
    const res = df.select($df.col("a").eq($df.col("b")).alias("r")).toDicts() as any[];
    if (res[0].r !== true) throw new Error("Case 2a: (10, 10) should be true");
    if (res[1].r !== null) throw new Error("Case 2b: (null, null) under Kleene logic must be null");
    if (res[2].r !== null) throw new Error("Case 2c: (30, null) under Kleene logic must be null");
    if (res[3].r !== null) throw new Error("Case 2d: (null, 40) under Kleene logic must be null");
}

// 3. Scalar Literal Broadcasting (`.eq(scalar)`)
{
    const df = $df.data({
        x: [1, 2, 3, 2, null]
    });
    const res = df.select($df.col("x").eq(2).alias("r")).toDicts() as any[];
    if (res[0].r !== false || res[1].r !== true || res[2].r !== false || res[3].r !== true || res[4].r !== null) {
        throw new Error("Case 3a: Scalar number broadcasting failed");
    }

    // Scalar null broadcasting -> all rows produce null
    const resNull = df.select($df.col("x").eq(null).alias("r")).toDicts() as any[];
    if (resNull.some((row: any) => row.r !== null)) {
        throw new Error("Case 3b: Scalar null broadcasting must yield null for all rows");
    }
}

// 4. IEEE 754 NaN Comparisons (`NaN === NaN` is false, `NaN === null` is null)
{
    const df = $df.data({
        a: [NaN, NaN, 10, NaN],
        b: [NaN, 10, NaN, null]
    });
    const res = df.select($df.col("a").eq($df.col("b")).alias("r")).toDicts() as any[];
    if (res[0].r !== false) throw new Error("Case 4a: NaN === NaN must be false under IEEE 754");
    if (res[1].r !== false) throw new Error("Case 4b: NaN === number must be false");
    if (res[2].r !== false) throw new Error("Case 4c: number === NaN must be false");
    if (res[3].r !== null) throw new Error("Case 4d: NaN === null must be null");
}

// 5. Date Object Timestamp Equality Normalization
{
    const d1 = new Date("2026-01-01T00:00:00Z");
    const d1Copy = new Date("2026-01-01T00:00:00Z");
    const d2 = new Date("2026-06-01T00:00:00Z");

    const df = $df.data({
        d_a: [d1, d1],
        d_b: [d1Copy, d2]
    });
    const res = df.select($df.col("d_a").eq($df.col("d_b")).alias("r")).toDicts() as any[];
    if (res[0].r !== true) throw new Error("Case 5a: Distinct Date instances with same timestamp must be equal");
    if (res[1].r !== false) throw new Error("Case 5b: Different dates must not be equal");
}

// 6. Zero Sign Semantics (`+0 === -0` is true in JS strict equality)
{
    const df = $df.data({
        a: [+0, 0],
        b: [-0, 0]
    });
    const res = df.select($df.col("a").eq($df.col("b")).alias("r")).toDicts() as any[];
    if (res[0].r !== true || res[1].r !== true) {
        throw new Error("Case 6: +0 and -0 equality failed");
    }
}

// 7. Array Literal as `val`
{
    const df = $df.data({
        x: ["a", "b", "c"]
    });
    const res = df.select($df.col("x").eq(["a", "z", "c"]).alias("r")).toDicts() as any[];
    if (res[0].r !== true || res[1].r !== false || res[2].r !== true) {
        throw new Error("Case 7: Array literal comparison failed");
    }
}

// 8. Empty DataFrame
{
    const emptyDf = $df.data({ a: [], b: [] });
    const res = emptyDf.select($df.col("a").eq($df.col("b")).alias("r")).toDicts() as any[];
    if (res.length !== 0) throw new Error("Case 8: Empty DataFrame should yield empty results");
}

// 9. Multi-Column Selector on Left Operand
{
    const df = $df.data({
        target: [10, 20, 30],
        col1: [10, 99, 30],
        col2: [99, 20, 99]
    });
    const res = df.select(
        $df.col(["col1", "col2"]).eq($df.col("target"))
    ).toDicts() as any[];

    if (res[0].col1 !== true || res[1].col1 !== false || res[2].col1 !== true) {
        throw new Error("Case 9a: Multi-column projection col1 failed");
    }
    if (res[0].col2 !== false || res[1].col2 !== true || res[2].col2 !== false) {
        throw new Error("Case 9b: Multi-column projection col2 failed");
    }
}

// 10. Filter Behavior (Null Dropping in Predicate Filters)
{
    const df = $df.data({
        id: [1, 2, 3, 4],
        status: ["active", "pending", null, "active"]
    });
    // Under filter, only strictly true rows pass; null and false are filtered out
    const filtered = df.filter($df.col("status").eq("active")).toDicts() as any[];
    if (filtered.length !== 2 || filtered[0].id !== 1 || filtered[1].id !== 4) {
        throw new Error("Case 10: Filtering with .eq() predicate failed to drop nulls and mismatches");
    }
}

// 11. TypedArray Support (Uint8Array and Float64Array)
{
    const df = $df.data({
        u8: new Uint8Array([10, 20, 30])
    });
    const res = df.select($df.col("u8").eq(new Uint8Array([10, 99, 30])).alias("r")).toDicts() as any[];
    if (res[0].r !== true || res[1].r !== false || res[2].r !== true) {
        throw new Error("Case 11: TypedArray comparison failed under .eq()");
    }
}

// 12. Cross-Type Scalar Comparisons (Strict JS === Semantics across Different Data Types)
{
    const df = $df.data({
        str_col: ["10", "true"]
    });
    // In strict equality, string "10" !== number 10, string "true" !== boolean true
    const resNum = df.select($df.col("str_col").eq(10).alias("r")).toDicts() as any[];
    const resBool = df.select($df.col("str_col").eq(true).alias("r")).toDicts() as any[];
    if (resNum[0].r !== false || resBool[1].r !== false) {
        throw new Error("Case 12: Cross-type strict comparison failed under .eq()");
    }
}

console.log("✓ StandardExpr.eq edge-case test suite passed successfully! (12 comprehensive test suites)");

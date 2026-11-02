declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.eqMissing edge-case tests...");

// 1. Basic Primitives Comparison (Numbers, Strings, Booleans)
{
    const df = $df.data({
        nums_a: [10, 20, 30],
        nums_b: [10, 99, 30],
        str_a: ["apple", "banana", "cherry"],
        str_b: ["apple", "orange", "cherry"],
        bool_a: [true, false, true],
        bool_b: [true, true, false]
    });

    const res = df.select([
        $df.col("nums_a").eqMissing($df.col("nums_b")).alias("nums"),
        $df.col("str_a").eqMissing($df.col("str_b")).alias("strs"),
        $df.col("bool_a").eqMissing($df.col("bool_b")).alias("bools")
    ]).toDicts() as any[];

    if (res[0].nums !== true || res[1].nums !== false || res[2].nums !== true) {
        throw new Error("Case 1a: Number eqMissing failed");
    }
    if (res[0].strs !== true || res[1].strs !== false || res[2].strs !== true) {
        throw new Error("Case 1b: String eqMissing failed");
    }
    if (res[0].bools !== true || res[1].bools !== false || res[2].bools !== false) {
        throw new Error("Case 1c: Boolean eqMissing failed");
    }
}

// 2. Missing Value Equivalence: null === null -> true, undefined === null -> true
{
    const df = $df.data({
        a: [10, null, 30, null],
        b: [10, null, null, 40]
    });
    const res = df.select($df.col("a").eqMissing($df.col("b")).alias("r")).toDicts() as any[];
    if (res[0].r !== true) throw new Error("Case 2a: (10, 10) must be true");
    if (res[1].r !== true) throw new Error("Case 2b: (null, null) must be true under eqMissing");
    if (res[2].r !== false) throw new Error("Case 2c: (30, null) must be false under eqMissing");
    if (res[3].r !== false) throw new Error("Case 2d: (null, 40) must be false under eqMissing");
}

// 3. Scalar Literal Null: .eqMissing(null) acts as isNull()
{
    const df = $df.data({
        x: [100, null, 200, undefined, 300]
    });
    const res = df.select($df.col("x").eqMissing(null).alias("is_missing")).toDicts() as any[];
    if (
        res[0].is_missing !== false ||
        res[1].is_missing !== true ||
        res[2].is_missing !== false ||
        res[3].is_missing !== true ||
        res[4].is_missing !== false
    ) {
        throw new Error("Case 3: .eqMissing(null) scalar matching failed");
    }
}

// 4. Scalar Non-Null Literal: .eqMissing(val) on a column with nulls produces false, never null
{
    const df = $df.data({
        x: [1, 2, null, 2]
    });
    const res = df.select($df.col("x").eqMissing(2).alias("r")).toDicts() as any[];
    if (res[0].r !== false || res[1].r !== true || res[2].r !== false || res[3].r !== true) {
        throw new Error("Case 4: .eqMissing(2) on nullable column failed; nulls must evaluate to false, not null");
    }
}

// 5. IEEE 754 NaN Comparisons (NaN is not equal to NaN in eqMissing; NaN is not null)
{
    const df = $df.data({
        a: [NaN, NaN, 10, NaN],
        b: [NaN, 10, NaN, null]
    });
    const res = df.select($df.col("a").eqMissing($df.col("b")).alias("r")).toDicts() as any[];
    if (res[0].r !== false) throw new Error("Case 5a: NaN eqMissing NaN must be false");
    if (res[1].r !== false) throw new Error("Case 5b: NaN eqMissing number must be false");
    if (res[2].r !== false) throw new Error("Case 5c: number eqMissing NaN must be false");
    if (res[3].r !== false) throw new Error("Case 5d: NaN eqMissing null must be false (NaN is non-null)");
}

// 6. Date Object Timestamp Equality Normalization
{
    const d1 = new Date("2026-01-01T00:00:00Z");
    const d1Copy = new Date("2026-01-01T00:00:00Z");
    const d2 = new Date("2026-06-01T00:00:00Z");

    const df = $df.data({
        d_a: [d1, d1, null],
        d_b: [d1Copy, d2, null]
    });
    const res = df.select($df.col("d_a").eqMissing($df.col("d_b")).alias("r")).toDicts() as any[];
    if (res[0].r !== true) throw new Error("Case 6a: Date equality normalization failed");
    if (res[1].r !== false) throw new Error("Case 6b: Different dates failed");
    if (res[2].r !== true) throw new Error("Case 6c: (null, null) dates must evaluate to true");
}

// 7. Array Literal as `val` with Nulls
{
    const df = $df.data({
        x: ["a", null, "c"]
    });
    const res = df.select($df.col("x").eqMissing(["a", null, "z"]).alias("r")).toDicts() as any[];
    if (res[0].r !== true || res[1].r !== true || res[2].r !== false) {
        throw new Error("Case 7: Array literal with nulls failed under eqMissing");
    }
}

// 8. Empty DataFrame
{
    const emptyDf = $df.data({ a: [], b: [] });
    const res = emptyDf.select($df.col("a").eqMissing($df.col("b")).alias("r")).toDicts() as any[];
    if (res.length !== 0) throw new Error("Case 8: Empty DataFrame should yield empty results");
}

// 9. Multi-Column Selector on Left Operand
{
    const df = $df.data({
        target: [10, null, 30],
        col1: [10, null, 99],
        col2: [99, null, 30]
    });
    const res = df.select(
        $df.col(["col1", "col2"]).eqMissing($df.col("target"))
    ).toDicts() as any[];

    if (res[0].col1 !== true || res[1].col1 !== true || res[2].col1 !== false) {
        throw new Error("Case 9a: Multi-column projection col1 failed under eqMissing");
    }
    if (res[0].col2 !== false || res[1].col2 !== true || res[2].col2 !== true) {
        throw new Error("Case 9b: Multi-column projection col2 failed under eqMissing");
    }
}

// 10. Filter Behavior: Filtering on Missing Values (`df.filter(col("x").eqMissing(null))`)
{
    const df = $df.data({
        id: [1, 2, 3, 4],
        val: ["A", null, "B", null]
    });
    // With eqMissing(null), null rows become strictly true and pass the filter
    const missingOnly = df.filter($df.col("val").eqMissing(null)).toDicts() as any[];
    if (missingOnly.length !== 2 || missingOnly[0].id !== 2 || missingOnly[1].id !== 4) {
        throw new Error("Case 10: Filtering with .eqMissing(null) failed to select null rows");
    }
}

// 11. TypedArray Support
{
    const df = $df.data({
        u8: new Uint8Array([10, 20, 30])
    });
    const res = df.select($df.col("u8").eqMissing(new Uint8Array([10, 99, 30])).alias("r")).toDicts() as any[];
    if (res[0].r !== true || res[1].r !== false || res[2].r !== true) {
        throw new Error("Case 11: TypedArray comparison failed under .eqMissing()");
    }
}

// 12. Type-Mismatched Equality (Null vs Cross-Type Literals)
{
    const df = $df.data({
        str_val: ["null", "", "0", null],
        target: [null, null, null, null]
    });
    // Literal string "null" or "0" is not missing; only actual null matches null under eqMissing
    const res = df.select($df.col("str_val").eqMissing($df.col("target")).alias("r")).toDicts() as any[];
    if (res[0].r !== false || res[1].r !== false || res[2].r !== false || res[3].r !== true) {
        throw new Error("Case 12: Literal strings vs actual nulls failed under .eqMissing()");
    }
}

console.log("✓ StandardExpr.eqMissing edge-case test suite passed successfully! (12 comprehensive test suites)");

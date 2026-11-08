declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.isClose exhaustive 10/10 tests...");

// Test 1: Basic approximate comparison
{
    const df = $df.data([{ a: 1.000001, b: 1.0 }, { a: 1.1, b: 1.0 }]);
    const res = df.select([$df.col("a").isClose($df.col("b"), { absTol: 1e-4 }).alias("c")]).toDicts() as any[];
    if (res[0].c !== true || res[1].c !== false) throw new Error("Test 1 Failed: basic comparison");
}

// Test 2: Literal scalar comparison against column
{
    const df = $df.data({ a: [10.000000001, 10.05, 9.999999999] });
    const res = df.select($df.col("a").isClose(10, { absTol: 1e-6 }).alias("c")).toDicts() as any[];
    if (res[0].c !== true || res[1].c !== false || res[2].c !== true) {
        throw new Error(`Test 2 Failed: literal comparison: ${JSON.stringify(res)}`);
    }
}

// Test 3: Array literal comparison
{
    const df = $df.data({ a: [1.0, 2.0, 3.0] });
    const res = df.select($df.col("a").isClose([1.000000001, 2.5, 3.0], { absTol: 1e-5 }).alias("c")).toDicts() as any[];
    if (res[0].c !== true || res[1].c !== false || res[2].c !== true) {
        throw new Error(`Test 3 Failed: array literal comparison: ${JSON.stringify(res)}`);
    }
}

// Test 4: NaN comparisons with nansEqual: true vs false
{
    const df = $df.data({ a: [NaN, 1.0], b: [NaN, 1.0] });
    const resEqual = df.select($df.col("a").isClose($df.col("b"), { nansEqual: true }).alias("c")).toDicts() as any[];
    const resNotEqual = df.select($df.col("a").isClose($df.col("b"), { nansEqual: false }).alias("c")).toDicts() as any[];
    if (resEqual[0].c !== true || resEqual[1].c !== true) throw new Error("Test 4a Failed: nansEqual: true");
    if (resNotEqual[0].c !== false || resNotEqual[1].c !== true) throw new Error("Test 4b Failed: nansEqual: false");
}

// Test 5: Relative tolerance check (relTol)
{
    const df = $df.data({ a: [1000, 1000], b: [1005, 1020] });
    // relTol: 0.01 (1%) -> threshold is 10.05 => 1005 is within 10, 1020 is not
    const res = df.select($df.col("a").isClose($df.col("b"), { relTol: 0.01, absTol: 0 }).alias("c")).toDicts() as any[];
    if (res[0].c !== true || res[1].c !== false) throw new Error("Test 5 Failed: relTol");
}

// Test 6: Default options object (empty object passed)
{
    const df = $df.data({ a: [1.0], b: [1.0] });
    const res = df.select($df.col("a").isClose($df.col("b"), {}).alias("c")).toDicts() as any[];
    if (res[0].c !== true) throw new Error("Test 6 Failed: empty options");
}

// Test 7: Nullish values follow standard Kleene 3-valued logic (null compared to anything yields null)
{
    const df = $df.data({ a: [null, "hello", null], b: [null, "hello", "world"] });
    const res = df.select($df.col("a").isClose($df.col("b") as any).alias("c")).toDicts() as any[];
    if (res[0].c !== null || res[1].c !== true || res[2].c !== null) {
        throw new Error(`Test 7 Failed: null/string Kleene logic: ${JSON.stringify(res)}`);
    }
}

// Test 8: Empty DataFrame (0 rows)
{
    const df = $df.data({ a: [] as number[], b: [] as number[] });
    const res = df.select($df.col("a").isClose($df.col("b")).alias("c")).toDicts();
    if (res.length !== 0) throw new Error(`Test 8 Failed: expected 0 rows, got ${res.length}`);
}

// Test 9: Chained with logical operations (.isClose(...).not())
{
    const df = $df.data({ a: [1.0, 1.1], b: [1.0, 1.0] });
    const res = df.select($df.col("a").isClose($df.col("b"), { absTol: 1e-4 }).not().alias("not_c")).toDicts() as any[];
    if (res[0].not_c !== false || res[1].not_c !== true) throw new Error("Test 9 Failed: chained .not()");
}

console.log("✓ All 9 exhaustive StandardExpr.isClose tests passed!");

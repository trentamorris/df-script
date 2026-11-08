declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.rand exhaustive 10/10 tests...");

// Test 1: Unseeded generates numbers within [0, 1)
{
    const df = $df.data({ val: [1, 2, 3, 4, 5] });
    const res = df.select($df.col("val").rand().alias("r")).toDicts() as any[];
    for (const row of res) {
        if (row.r < 0 || row.r >= 1) throw new Error(`Test 1 Failed: out of bounds ${row.r}`);
    }
}

// Test 2: Seeded produces deterministic identical output across runs
{
    const df = $df.data({ val: [1, 2, 3, 4, 5] });
    const res1 = df.select($df.col("val").rand(12345).alias("r")).toDicts() as any[];
    const res2 = df.select($df.col("val").rand(12345).alias("r")).toDicts() as any[];
    for (let i = 0; i < res1.length; i++) {
        if (res1[i].r !== res2[i].r) throw new Error(`Test 2 Failed: seed mismatch at index ${i}`);
    }
}

// Test 3: Custom range [min, max] floating point
{
    const df = $df.data({ val: new Array(20).fill(0) });
    const res = df.select($df.col("val").rand(42, { min: 10, max: 20 }).alias("r")).toDicts() as any[];
    for (const row of res) {
        if (row.r < 10 || row.r > 20) throw new Error(`Test 3 Failed: ${row.r} not in [10, 20]`);
    }
}

// Test 4: Custom range integer mode generates integers only within [min, max]
{
    const df = $df.data({ val: new Array(50).fill(0) });
    const res = df.select($df.col("val").rand(999, { min: 5, max: 15, integer: true }).alias("r")).toDicts() as any[];
    for (const row of res) {
        if (!Number.isInteger(row.r)) throw new Error(`Test 4 Failed: ${row.r} is not an integer`);
        if (row.r < 5 || row.r > 15) throw new Error(`Test 4 Failed: ${row.r} not in [5, 15]`);
    }
}

// Test 5: Negative range [min: -100, max: -50]
{
    const df = $df.data({ val: [1, 2, 3] });
    const res = df.select($df.col("val").rand(7, { min: -100, max: -50 }).alias("r")).toDicts() as any[];
    for (const row of res) {
        if (row.r < -100 || row.r > -50) throw new Error(`Test 5 Failed: ${row.r} not in [-100, -50]`);
    }
}

// Test 6: Zero-width range (min === max) produces exact constant
{
    const df = $df.data({ val: [1, 2, 3] });
    const res = df.select($df.col("val").rand(42, { min: 77, max: 77 }).alias("r")).toDicts() as any[];
    for (const row of res) {
        if (row.r !== 77) throw new Error(`Test 6 Failed: expected 77, got ${row.r}`);
    }
}

// Test 7: Empty options object does not crash and defaults to [0, 1) float
{
    const df = $df.data({ val: [1, 2] });
    const res = df.select($df.col("val").rand(42, {}).alias("r")).toDicts() as any[];
    if (res[0].r < 0 || res[0].r >= 1) throw new Error(`Test 7 Failed: ${res[0].r}`);
}

// Test 8: Empty DataFrame (0 rows) returns empty Float64Array
{
    const df = $df.data({ val: [] as number[] });
    const res = df.select($df.col("val").rand().alias("r")).toDicts();
    if (res.length !== 0) throw new Error(`Test 8 Failed: expected 0 rows, got ${res.length}`);
}

// Test 9: Chaining builder operations after .rand()
{
    const df = $df.data({ val: [1, 2, 3] });
    const res = df.select($df.col("val").rand(42, { min: 1, max: 5, integer: true }).add(10).alias("r")).toDicts() as any[];
    for (const row of res) {
        if (row.r < 11 || row.r > 15) throw new Error(`Test 9 Failed: chained math failed ${row.r}`);
    }
}

console.log("✓ All 9 exhaustive StandardExpr.rand tests passed!");

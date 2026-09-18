declare const process: any;
import { $df } from "../../../../src";
import { InvalidArgumentError } from "../../../../src/exceptions";

console.log("Running StandardExpr.ewmSum tests...");

// Test 1: Basic EWM Sum with alpha=0.5
{
    const df = $df.data({ a: [10, 20, 30] });
    // w: [0.25, 0.5, 1.0] -> 10*0.25 + 20*0.5 + 30*1.0 = 2.5 + 10 + 30 = 42.5
    const res = df.select($df.col("a").ewmSum({ alpha: 0.5 }).alias("r")).toDicts() as any[];
    if (res[0].r !== 10 || res[1].r !== 25 || res[2].r !== 42.5) {
        throw new Error(`Test 1 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 2: Span=1 (zero memory, sum equals current element)
{
    const df = $df.data({ a: [5, 15, 25, 35] });
    const res = df.select($df.col("a").ewmSum({ span: 1 }).alias("r")).toDicts() as any[];
    if (res[0].r !== 5 || res[1].r !== 15 || res[2].r !== 25 || res[3].r !== 35) {
        throw new Error(`Test 2 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 3: Negative floats and zero values
{
    const df = $df.data({ a: [-10.5, 0, 10.5] });
    const res = df.select($df.col("a").ewmSum({ alpha: 0.5 }).alias("r")).toDicts() as any[];
    if (res[0].r !== -10.5 || res[1].r !== -5.25 || res[2].r !== 7.875) {
        throw new Error(`Test 3 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 4: Huge gaps counting as decayed steps (ignoreNulls: false)
{
    const df = $df.data({ a: [100, null, null, null, 10] });
    const res = df.select($df.col("a").ewmSum({ alpha: 0.5, ignoreNulls: false }).alias("r")).toDicts() as any[];
    if (res[4].r !== 16.25) throw new Error(`Test 4 Failed: expected 16.25, got ${res[4].r}`);
}

// Test 5: ignoreNulls: true does not decay across null steps
{
    const df = $df.data({ a: [100, null, 10] });
    // null ignored: 100 * 0.5 + 10 = 60
    const res = df.select($df.col("a").ewmSum({ alpha: 0.5, ignoreNulls: true }).alias("r")).toDicts() as any[];
    if (res[2].r !== 60) throw new Error(`Test 5 Failed: expected 60, got ${res[2].r}`);
}

// Test 6: SumBy across large exponential time deltas
{
    const df = $df.data({
        time: [0, 1000, 1000000],
        val: [100, 100, 10]
    });
    const res = df.select($df.col("val").ewmSum({ halfLife: 1000, by: "time" }).alias("r")).toDicts() as any[];
    if (Math.abs(res[2].r - 10) > 1e-6) throw new Error(`Test 6 Failed: ${JSON.stringify(res)}`);
}

// Test 7: SumBy with duration string halfLife
{
    const df = $df.data({
        time: [0, 50, 100],
        val: [10, 20, 30]
    });
    const res = df.select($df.col("val").ewmSum({ halfLife: "50ms", by: "time" }).alias("r")).toDicts() as any[];
    if (res[0].r !== 10 || res[1].r !== 25 || res[2].r !== 42.5) {
        throw new Error(`Test 7 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 8: SumBy with Date objects
{
    const df = $df.data({
        time: [new Date("2026-01-01T00:00:00Z"), new Date("2026-01-01T01:00:00Z")],
        val: [50, 50]
    });
    const res = df.select($df.col("val").ewmSum({ halfLife: "1h", by: "time" }).alias("r")).toDicts() as any[];
    if (res[0].r !== 50 || res[1].r !== 75) throw new Error(`Test 8 Failed: ${JSON.stringify(res)}`);
}

// Test 9: Options validation guard
{
    let caught = false;
    try {
        const df = $df.data({ a: [1, 2] });
        df.select($df.col("a").ewmSum(null as any));
    } catch (e: any) {
        if (e instanceof InvalidArgumentError) caught = true;
    }
    if (!caught) throw new Error("Test 9 Failed: expected InvalidArgumentError");
}

// Test 10: Empty dataframe
{
    const df = $df.data({ a: [] });
    const res = df.select($df.col("a").ewmSum({ alpha: 0.5 }).alias("r")).toDicts() as any[];
    if (res.length !== 0) throw new Error("Test 10 Failed: empty dataframe");
}

// Test 11: Polars parity test for ewm_sum_by with Date and 1h halfLife
{
    const df = $df.data({
        t: [
            new Date("2024-01-01T00:00:00Z"),
            new Date("2024-01-01T01:00:00Z"),
            new Date("2024-01-01T02:00:00Z")
        ],
        v: [10.0, 20.0, 30.0]
    });
    // Expected in Polars ewm_sum_by(by="t", half_life="1h"): [10.0, 25.0, 42.5]
    const res = df.select($df.col("v").ewmSum({ halfLife: "1h", by: "t" }).alias("r")).toDicts() as any[];
    if (res[0].r !== 10.0 || Math.abs(res[1].r - 25.0) > 1e-4 || Math.abs(res[2].r - 42.5) > 1e-4) {
        throw new Error(`Test 11 Failed: expected [10, 25, 42.5], got ${JSON.stringify(res)}`);
    }
}

console.log("✓ StandardExpr.ewmSum tests passed!");

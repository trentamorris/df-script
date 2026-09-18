declare const process: any;
import { $df } from "../../../../src";
import { InvalidArgumentError } from "../../../../src/exceptions";

console.log("Running StandardExpr.ewmStd tests...");

// Test 1: Basic EWM Std (first observation count < 2 returns null, subsequent return valid std)
{
    const df = $df.data({ a: [10, 20, 30] });
    const res = df.select($df.col("a").ewmStd({ alpha: 0.5 }).alias("s")).toDicts() as any[];
    if (res[0].s !== null || typeof res[1].s !== "number" || typeof res[2].s !== "number") {
        throw new Error(`Test 1 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 2: EWM Std of constant sequence must be exactly 0 after count >= 2
{
    const df = $df.data({ a: [42, 42, 42, 42] });
    const res = df.select($df.col("a").ewmStd({ span: 2 }).alias("s")).toDicts() as any[];
    if (res[0].s !== null) throw new Error(`Test 2 Failed: first element must be null`);
    for (let i = 1; i < 4; i++) {
        if (res[i].s !== 0) throw new Error(`Test 2 Failed: constant std must be 0, got ${res[i].s}`);
    }
}

// Test 3: Single valid value surrounded by nulls returns null (count < 2)
{
    const df = $df.data({ a: [null, 100, null] });
    const res = df.select($df.col("a").ewmStd({ alpha: 0.5 }).alias("s")).toDicts() as any[];
    if (res[0].s !== null || res[1].s !== null || res[2].s !== null) {
        throw new Error(`Test 3 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 4: Scale invariance: std(10 * X) == 10 * std(X)
{
    const df = $df.data({ a: [10, 20, 30] });
    const df10x = $df.data({ a: [100, 200, 300] });
    const res1 = df.select($df.col("a").ewmStd({ alpha: 0.5 }).alias("s")).toDicts() as any[];
    const res10x = df10x.select($df.col("a").ewmStd({ alpha: 0.5 }).alias("s")).toDicts() as any[];
    if (Math.abs(res1[2].s * 10 - res10x[2].s) > 1e-4) {
        throw new Error(`Test 4 Failed: scale invariance violated`);
    }
}

// Test 5: Translation invariance: std(X + c) == std(X)
{
    const df = $df.data({ a: [10, 20, 30] });
    const dfPlus100 = $df.data({ a: [110, 120, 130] });
    const res1 = df.select($df.col("a").ewmStd({ alpha: 0.5 }).alias("s")).toDicts() as any[];
    const res2 = dfPlus100.select($df.col("a").ewmStd({ alpha: 0.5 }).alias("s")).toDicts() as any[];
    if (Math.abs(res1[2].s - res2[2].s) > 1e-4) {
        throw new Error("Test 5 Failed: translation invariance violated");
    }
}

// Test 6: minSamples requirement
{
    const df = $df.data({ a: [10, 20, 30] });
    const res = df.select($df.col("a").ewmStd({ alpha: 0.5, minSamples: 3 }).alias("s")).toDicts() as any[];
    if (res[0].s !== null || res[1].s !== null || typeof res[2].s !== "number") {
        throw new Error("Test 6 Failed: minSamples not respected");
    }
}

// Test 7: Options validation guard
{
    let caught = false;
    try {
        const df = $df.data({ a: [1, 2] });
        df.select($df.col("a").ewmStd(null as any));
    } catch (e: any) {
        if (e instanceof InvalidArgumentError) caught = true;
    }
    if (!caught) throw new Error("Test 7 Failed: expected InvalidArgumentError");
}

// Test 8: Empty DataFrame
{
    const df = $df.data({ a: [] });
    const res = df.select($df.col("a").ewmStd({ alpha: 0.5 }).alias("s")).toDicts() as any[];
    if (res.length !== 0) throw new Error("Test 8 Failed: expected empty array");
}

// Test 9: All nulls column
{
    const df = $df.data({ a: [null, null, null] });
    const res = df.select($df.col("a").ewmStd({ alpha: 0.5 }).alias("s")).toDicts() as any[];
    if (res[0].s !== null || res[1].s !== null || res[2].s !== null) {
        throw new Error(`Test 9 Failed: all nulls must produce null`);
    }
}

// Test 10: Non-uniform time steps with by parameter
{
    const df = $df.data({
        time: [0, 10, 20, 30],
        val: [100, 200, 100, 200]
    });
    const res = df.select($df.col("val").ewmStd({ halfLife: 10, by: "time" }).alias("s")).toDicts() as any[];
    if (res[0].s !== null || res[1].s <= 0 || res[2].s <= 0 || res[3].s <= 0) {
        throw new Error(`Test 10 Failed: expected positive std for oscillating values`);
    }
}

console.log("✓ StandardExpr.ewmStd tests passed!");

declare const process: any;
import { $df } from "../../../../src";
import { InvalidArgumentError } from "../../../../src/exceptions";

console.log("Running StandardExpr.ewmKurt tests...");

// Test 1: Basic EWM Kurtosis
{
    const df = $df.data({ a: [1, 2, 3, 4, 5] });
    const res = df.select($df.col("a").ewmKurt({ alpha: 0.5 }).alias("kt")).toDicts() as any[];
    // Initial observation count < 2 -> null
    if (res[0].kt !== null) throw new Error("Test 1 Failed: count < 2 must return null");
    if (typeof res[4].kt !== "number") throw new Error("Test 1 Failed: expected valid number");
}

// Test 2: Constant sequence (zero variance) returns null
{
    const df = $df.data({ a: [10, 10, 10] });
    const res = df.select($df.col("a").ewmKurt({ alpha: 0.5 }).alias("kt")).toDicts() as any[];
    for (let i = 0; i < 3; i++) {
        if (res[i].kt !== null) throw new Error(`Test 2 Failed: zero variance must produce null kurtosis`);
    }
}

// Test 3: Leptokurtic distribution (heavy tails/sharp peak)
{
    const df = $df.data({ a: [0, 0, 0, 0, 0, 100] });
    const res = df.select($df.col("a").ewmKurt({ alpha: 0.2 }).alias("kt")).toDicts() as any[];
    if (typeof res[5].kt !== "number") throw new Error("Test 3 Failed: expected valid number");
}

// Test 4: Options validation guard
{
    let caught = false;
    try {
        const df = $df.data({ a: [1, 2] });
        df.select($df.col("a").ewmKurt(null as any));
    } catch (e: any) {
        if (e instanceof InvalidArgumentError) caught = true;
    }
    if (!caught) throw new Error("Test 4 Failed: expected InvalidArgumentError");
}

// Test 5: Empty DataFrame
{
    const df = $df.data({ a: [] });
    const res = df.select($df.col("a").ewmKurt({ alpha: 0.5 }).alias("kt")).toDicts() as any[];
    if (res.length !== 0) throw new Error("Test 5 Failed: expected empty array");
}

// Test 6: All nulls column
{
    const df = $df.data({ a: [null, null, null] });
    const res = df.select($df.col("a").ewmKurt({ alpha: 0.5 }).alias("kt")).toDicts() as any[];
    if (res[0].kt !== null || res[1].kt !== null || res[2].kt !== null) {
        throw new Error(`Test 6 Failed: all nulls must produce null`);
    }
}

// Test 7: minSamples constraint
{
    const df = $df.data({ a: [10, 20, 30, 40] });
    const res = df.select($df.col("a").ewmKurt({ alpha: 0.5, minSamples: 3 }).alias("kt")).toDicts() as any[];
    if (res[0].kt !== null || res[1].kt !== null || typeof res[2].kt !== "number") {
        throw new Error("Test 7 Failed: minSamples=3 was not respected");
    }
}

// Test 8: Translation invariance: kurt(X + c) == kurt(X)
{
    const df1 = $df.data({ a: [1, 5, 2, 8, 3] });
    const df2 = $df.data({ a: [101, 105, 102, 108, 103] });
    const res1 = df1.select($df.col("a").ewmKurt({ alpha: 0.5 }).alias("kt")).toDicts() as any[];
    const res2 = df2.select($df.col("a").ewmKurt({ alpha: 0.5 }).alias("kt")).toDicts() as any[];
    if (Math.abs(res1[4].kt - res2[4].kt) > 1e-4) {
        throw new Error("Test 8 Failed: translation invariance violated");
    }
}

// Test 9: Scale invariance: kurt(c * X) == kurt(X)
{
    const df1 = $df.data({ a: [1, 5, 2, 8, 3] });
    const df2 = $df.data({ a: [10, 50, 20, 80, 30] });
    const res1 = df1.select($df.col("a").ewmKurt({ alpha: 0.5 }).alias("kt")).toDicts() as any[];
    const res2 = df2.select($df.col("a").ewmKurt({ alpha: 0.5 }).alias("kt")).toDicts() as any[];
    if (Math.abs(res1[4].kt - res2[4].kt) > 1e-4) {
        throw new Error("Test 9 Failed: scale invariance violated");
    }
}

// Test 10: Single valid value surrounded by nulls
{
    const df = $df.data({ a: [null, 42, null] });
    const res = df.select($df.col("a").ewmKurt({ alpha: 0.5 }).alias("kt")).toDicts() as any[];
    if (res[0].kt !== null || res[1].kt !== null || res[2].kt !== null) {
        throw new Error(`Test 10 Failed: single valid observation cannot compute kurtosis`);
    }
}

console.log("✓ StandardExpr.ewmKurt tests passed!");

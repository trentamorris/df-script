declare const process: any;
import { $df } from "../../../../src";
import { InvalidArgumentError } from "../../../../src/exceptions";

console.log("Running StandardExpr.ewmVar tests...");

// Test 1: Identical values yield 0 variance once count >= 2, first is null
{
    const df = $df.data({ a: [7, 7, 7] });
    const res = df.select($df.col("a").ewmVar({ alpha: 0.5 }).alias("v")).toDicts() as any[];
    if (res[0].v !== null || res[1].v !== 0 || res[2].v !== 0) {
        throw new Error(`Test 1 Failed: constant var must be 0 for count >= 2, got ${JSON.stringify(res)}`);
    }
}

// Test 2: Relation with Std (Var = Std^2)
{
    const df = $df.data({ a: [1, 5, 2, 8, 3] });
    const resVar = df.select($df.col("a").ewmVar({ span: 3 }).alias("v")).toDicts() as any[];
    const resStd = df.select($df.col("a").ewmStd({ span: 3 }).alias("s")).toDicts() as any[];
    if (resVar[0].v !== null || resStd[0].s !== null) {
        throw new Error("Test 2 Failed: first observation must be null");
    }
    for (let i = 1; i < 5; i++) {
        if (Math.abs(Math.sqrt(resVar[i].v) - resStd[i].s) > 1e-5) {
            throw new Error(`Test 2 Failed at index ${i}: std=${resStd[i].s}, var=${resVar[i].v}`);
        }
    }
}

// Test 3: minSamples constraint
{
    const df = $df.data({ a: [1, 2, 3, 4] });
    const res = df.select($df.col("a").ewmVar({ alpha: 0.5, minSamples: 3 }).alias("v")).toDicts() as any[];
    if (res[0].v !== null || res[1].v !== null || typeof res[2].v !== "number" || typeof res[3].v !== "number") {
        throw new Error("Test 3 Failed: minSamples=3 was not respected");
    }
}

// Test 4: Scale variance property: var(c * X) == c^2 * var(X)
{
    const df = $df.data({ a: [10, 20, 30] });
    const df10x = $df.data({ a: [100, 200, 300] });
    const res1 = df.select($df.col("a").ewmVar({ alpha: 0.5 }).alias("v")).toDicts() as any[];
    const res10x = df10x.select($df.col("a").ewmVar({ alpha: 0.5 }).alias("v")).toDicts() as any[];
    if (Math.abs(res1[2].v * 100 - res10x[2].v) > 1e-3) {
        throw new Error("Test 4 Failed: scale property violated");
    }
}

// Test 5: Options validation guard
{
    let caught = false;
    try {
        const df = $df.data({ a: [1, 2] });
        df.select($df.col("a").ewmVar(null as any));
    } catch (e: any) {
        if (e instanceof InvalidArgumentError) caught = true;
    }
    if (!caught) throw new Error("Test 5 Failed: expected InvalidArgumentError");
}

// Test 6: Empty DataFrame
{
    const df = $df.data({ a: [] });
    const res = df.select($df.col("a").ewmVar({ alpha: 0.5 }).alias("v")).toDicts() as any[];
    if (res.length !== 0) throw new Error("Test 6 Failed: expected empty array");
}

// Test 7: All nulls column
{
    const df = $df.data({ a: [null, null, null] });
    const res = df.select($df.col("a").ewmVar({ alpha: 0.5 }).alias("v")).toDicts() as any[];
    if (res[0].v !== null || res[1].v !== null || res[2].v !== null) {
        throw new Error(`Test 7 Failed: all nulls must produce null`);
    }
}

// Test 8: Single valid value surrounded by nulls (count < 2 returns null)
{
    const df = $df.data({ a: [null, 50, null] });
    const res = df.select($df.col("a").ewmVar({ alpha: 0.5 }).alias("v")).toDicts() as any[];
    if (res[0].v !== null || res[1].v !== null || res[2].v !== null) {
        throw new Error(`Test 8 Failed: single observation must yield null variance, got ${JSON.stringify(res)}`);
    }
}

// Test 9: By parameter with timestamp halfLife
{
    const df = $df.data({
        t: [0, 100, 200],
        a: [10, 30, 20]
    });
    const res = df.select($df.col("a").ewmVar({ halfLife: 100, by: "t" }).alias("v")).toDicts() as any[];
    if (res[0].v !== null || res[1].v <= 0 || res[2].v <= 0) {
        throw new Error(`Test 9 Failed: variance should be positive after varying values`);
    }
}

// Test 10: Translation invariance: var(X + c) == var(X)
{
    const df1 = $df.data({ a: [10, 20, 30] });
    const df2 = $df.data({ a: [1010, 1020, 1030] });
    const res1 = df1.select($df.col("a").ewmVar({ alpha: 0.5 }).alias("v")).toDicts() as any[];
    const res2 = df2.select($df.col("a").ewmVar({ alpha: 0.5 }).alias("v")).toDicts() as any[];
    if (Math.abs(res1[2].v - res2[2].v) > 1e-4) {
        throw new Error("Test 10 Failed: translation invariance violated");
    }
}

console.log("✓ StandardExpr.ewmVar tests passed!");

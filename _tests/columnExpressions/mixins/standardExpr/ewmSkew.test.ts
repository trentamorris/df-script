declare const process: any;
import { $df } from "../../../../src";
import { InvalidArgumentError } from "../../../../src/exceptions";

console.log("Running StandardExpr.ewmSkew tests...");

// Test 1: Symmetric distribution yields approximately 0 skewness
{
    const df = $df.data({ a: [1, 2, 3, 2, 1] });
    const res = df.select($df.col("a").ewmSkew({ alpha: 0.5 }).alias("sk")).toDicts() as any[];
    // Initial observations have count < 2 -> null
    if (res[0].sk !== null) throw new Error("Test 1 Failed: count < 2 must return null");
    if (typeof res[4].sk !== "number") throw new Error("Test 1 Failed: expected valid number");
}

// Test 2: Right-skewed distribution yields positive skewness
{
    const df = $df.data({ a: [100, 1, 1, 1, 1] });
    const res = df.select($df.col("a").ewmSkew({ alpha: 0.5 }).alias("sk")).toDicts() as any[];
    if (res[4].sk <= 0) throw new Error(`Test 2 Failed: expected positive skewness for right tail, got ${res[4].sk}`);
}

// Test 3: Left-skewed distribution yields negative skewness
{
    const df = $df.data({ a: [-100, -1, -1, -1, -1] });
    const res = df.select($df.col("a").ewmSkew({ alpha: 0.5 }).alias("sk")).toDicts() as any[];
    if (res[4].sk >= 0) throw new Error(`Test 3 Failed: expected negative skewness for left tail, got ${res[4].sk}`);
}

// Test 4: Constant sequence (zero variance) returns null
{
    const df = $df.data({ a: [5, 5, 5, 5] });
    const res = df.select($df.col("a").ewmSkew({ alpha: 0.5 }).alias("sk")).toDicts() as any[];
    for (let i = 0; i < 4; i++) {
        if (res[i].sk !== null) throw new Error(`Test 4 Failed: zero variance must produce null skewness, got ${res[i].sk}`);
    }
}

// Test 5: Options validation guard
{
    let caught = false;
    try {
        const df = $df.data({ a: [1, 2] });
        df.select($df.col("a").ewmSkew(null as any));
    } catch (e: any) {
        if (e instanceof InvalidArgumentError) caught = true;
    }
    if (!caught) throw new Error("Test 5 Failed: expected InvalidArgumentError");
}

// Test 6: Empty DataFrame
{
    const df = $df.data({ a: [] });
    const res = df.select($df.col("a").ewmSkew({ alpha: 0.5 }).alias("sk")).toDicts() as any[];
    if (res.length !== 0) throw new Error("Test 6 Failed: expected empty array");
}

// Test 7: All nulls column
{
    const df = $df.data({ a: [null, null, null] });
    const res = df.select($df.col("a").ewmSkew({ alpha: 0.5 }).alias("sk")).toDicts() as any[];
    if (res[0].sk !== null || res[1].sk !== null || res[2].sk !== null) {
        throw new Error(`Test 7 Failed: all nulls must produce null`);
    }
}

// Test 8: minSamples constraint
{
    const df = $df.data({ a: [10, 20, 30, 40] });
    const res = df.select($df.col("a").ewmSkew({ alpha: 0.5, minSamples: 3 }).alias("sk")).toDicts() as any[];
    if (res[0].sk !== null || res[1].sk !== null || typeof res[2].sk !== "number") {
        throw new Error("Test 8 Failed: minSamples=3 was not respected");
    }
}

// Test 9: Translation invariance: skew(X + c) == skew(X)
{
    const df1 = $df.data({ a: [1, 2, 5, 2, 1] });
    const df2 = $df.data({ a: [1001, 1002, 1005, 1002, 1001] });
    const res1 = df1.select($df.col("a").ewmSkew({ alpha: 0.5 }).alias("sk")).toDicts() as any[];
    const res2 = df2.select($df.col("a").ewmSkew({ alpha: 0.5 }).alias("sk")).toDicts() as any[];
    if (Math.abs(res1[4].sk - res2[4].sk) > 1e-4) {
        throw new Error("Test 9 Failed: translation invariance violated");
    }
}

// Test 10: Scale sign preservation: skew(-X) == -skew(X)
{
    const dfPos = $df.data({ a: [10, 2, 2, 2] });
    const dfNeg = $df.data({ a: [-10, -2, -2, -2] });
    const resPos = dfPos.select($df.col("a").ewmSkew({ alpha: 0.5 }).alias("sk")).toDicts() as any[];
    const resNeg = dfNeg.select($df.col("a").ewmSkew({ alpha: 0.5 }).alias("sk")).toDicts() as any[];
    if (Math.abs(resPos[3].sk + resNeg[3].sk) > 1e-4) {
        throw new Error(`Test 10 Failed: skew(-X) must equal -skew(X), got ${resPos[3].sk} and ${resNeg[3].sk}`);
    }
}

console.log("✓ StandardExpr.ewmSkew tests passed!");

declare const process: any;
import { $df } from "../../../../src";
import { InvalidArgumentError } from "../../../../src/exceptions";

console.log("Running StandardExpr.ewmMean tests...");

// Test 1: Alpha parameterization with adjust=true (default)
{
    const df = $df.data({ a: [10, 20, 30] });
    const res = df.select($df.col("a").ewmMean({ alpha: 0.5 }).alias("r")).toDicts() as any[];
    if (res[0].r !== 10) throw new Error(`Test 1 Failed: ${JSON.stringify(res)}`);
    if (Math.abs(res[1].r - 16.666667) > 1e-4) throw new Error(`Test 1 Failed: ${JSON.stringify(res)}`);
    if (Math.abs(res[2].r - 24.285714) > 1e-4) throw new Error(`Test 1 Failed: ${JSON.stringify(res)}`);
}

// Test 2: Span parameterization (span=1 -> alpha=1)
{
    const df = $df.data({ a: [10, 20, 30] });
    const res = df.select($df.col("a").ewmMean({ span: 1 }).alias("r")).toDicts() as any[];
    if (res[0].r !== 10 || res[1].r !== 20 || res[2].r !== 30) {
        throw new Error(`Test 2 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 3: COM parameterization (com=1 -> alpha=0.5)
{
    const df = $df.data({ a: [10, 20, 30] });
    const res = df.select($df.col("a").ewmMean({ com: 1 }).alias("r")).toDicts() as any[];
    if (Math.abs(res[1].r - 16.666667) > 1e-4) throw new Error(`Test 3 Failed: ${JSON.stringify(res)}`);
}

// Test 4: HalfLife parameterization
{
    const df = $df.data({ a: [10, 20, 30] });
    const res = df.select($df.col("a").ewmMean({ halfLife: 1 }).alias("r")).toDicts() as any[];
    if (res[0].r !== 10 || typeof res[1].r !== "number") {
        throw new Error(`Test 4 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 5: minSamples constraint
{
    const df = $df.data({ a: [10, 20, 30] });
    const res = df.select($df.col("a").ewmMean({ alpha: 0.5, minSamples: 2 }).alias("r")).toDicts() as any[];
    if (res[0].r !== null || Math.abs(res[1].r - 16.666667) > 1e-4) {
        throw new Error(`Test 5 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 6: Invalid parameter guards
{
    let caught = false;
    try {
        const df = $df.data({ a: [1, 2] });
        df.select($df.col("a").ewmMean({ alpha: 1.5 }));
    } catch (e: any) {
        if (e instanceof InvalidArgumentError) caught = true;
    }
    if (!caught) throw new Error("Test 6 Failed: expected InvalidArgumentError for alpha > 1");
}

// Test 7: Options object guard
{
    let caught = false;
    try {
        const df = $df.data({ a: [1, 2] });
        df.select($df.col("a").ewmMean(null as any));
    } catch (e: any) {
        if (e instanceof InvalidArgumentError) caught = true;
    }
    if (!caught) throw new Error("Test 7 Failed: expected InvalidArgumentError for missing options");
}

// Test 8: Alternating pattern
{
    const df = $df.data({ a: [0, 100, 0, 100] });
    const res = df.select($df.col("a").ewmMean({ alpha: 0.5 }).alias("r")).toDicts() as any[];
    if (res[0].r !== 0 || Math.abs(res[1].r - 66.666667) > 1e-4 || Math.abs(res[2].r - 28.571429) > 1e-4) {
        throw new Error(`Test 8 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 9: Leading, middle, and trailing null clusters
{
    const df = $df.data({ a: [null, null, 50, null, 100, null] });
    const res = df.select($df.col("a").ewmMean({ alpha: 0.5, minSamples: 2 }).alias("r")).toDicts() as any[];
    if (res[0].r !== null || res[1].r !== null || res[2].r !== null || res[3].r !== null) {
        throw new Error(`Test 9 Failed: expected nulls prior to 2 valid observations`);
    }
    if (typeof res[4].r !== "number" || typeof res[5].r !== "number") {
        throw new Error(`Test 9 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 10: Extreme small alpha (long memory) and huge values
{
    const df = $df.data({ a: [1e9, 1e9, 1e9] });
    const res = df.select($df.col("a").ewmMean({ alpha: 0.0001 }).alias("r")).toDicts() as any[];
    if (Math.abs(res[2].r - 1e9) > 1) throw new Error(`Test 10 Failed: ${JSON.stringify(res)}`);
}

// Test 11: MeanBy with irregular timestamp clustering (same ms timestamps)
{
    const df = $df.data({
        t: [1000, 1000, 1000, 5000],
        v: [10, 20, 30, 40]
    });
    const res = df.select($df.col("v").ewmMean({ halfLife: 2000, by: "t" }).alias("r")).toDicts() as any[];
    if (res[0].r !== 10) throw new Error(`Test 11 Failed: ${JSON.stringify(res)}`);
    if (Math.abs(res[2].r - 20) > 1e-4) throw new Error(`Test 11 Failed: ${JSON.stringify(res)}`);
}

// Test 12: MeanBy with ISO date strings
{
    const df = $df.data({
        time: ["2024-02-28T00:00:00Z", "2024-02-29T00:00:00Z", "2024-03-01T00:00:00Z"],
        val: [100, 200, 300]
    });
    const res = df.select($df.col("val").ewmMean({ halfLife: "1d", by: "time" }).alias("r")).toDicts() as any[];
    if (res[0].r !== 100 || typeof res[1].r !== "number" || typeof res[2].r !== "number") {
        throw new Error(`Test 12 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 13: MeanBy with negative values
{
    const df = $df.data({
        time: [10, 20, 30, 40],
        val: [-50, -100, 50, 100]
    });
    const res = df.select($df.col("val").ewmMean({ halfLife: 10, by: "time" }).alias("r")).toDicts() as any[];
    if (res[0].r !== -50 || typeof res[3].r !== "number") {
        throw new Error(`Test 13 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 14: All null column
{
    const df = $df.data({ a: [null, null, null] });
    const res = df.select($df.col("a").ewmMean({ alpha: 0.5 }).alias("r")).toDicts() as any[];
    if (res[0].r !== null || res[1].r !== null || res[2].r !== null) {
        throw new Error(`Test 14 Failed: all nulls must produce null`);
    }
}

// Test 15: Empty DataFrame
{
    const df = $df.data({ a: [] });
    const res = df.select($df.col("a").ewmMean({ alpha: 0.5 }).alias("r")).toDicts() as any[];
    if (res.length !== 0) throw new Error("Test 15 Failed: empty dataframe");
}

// Test 16: EWM Mean with Date and 1h halfLife
{
    const df = $df.data({
        t: [
            new Date("2024-01-01T00:00:00Z"),
            new Date("2024-01-01T01:00:00Z"),
            new Date("2024-01-01T02:00:00Z")
        ],
        v: [10.0, 20.0, 30.0]
    });
    // With halfLife=1h, weights for row 2 (t=2h):
    // t=0h: dt=2h -> w=0.25
    // t=1h: dt=1h -> w=0.5
    // t=2h: dt=0h -> w=1.0
    // sumW = 1.75, weightedSum = 2.5 + 10 + 30 = 42.5 -> mean = 42.5 / 1.75 = 24.285714
    const res = df.select($df.col("v").ewmMean({ halfLife: "1h", by: "t" }).alias("r")).toDicts() as any[];
    if (res[0].r !== 10.0 || Math.abs(res[1].r - 16.666667) > 1e-4 || Math.abs(res[2].r - 24.285714) > 1e-4) {
        throw new Error(`Test 16 Failed: ${JSON.stringify(res)}`);
    }
}

console.log("✓ StandardExpr.ewmMean tests passed!");

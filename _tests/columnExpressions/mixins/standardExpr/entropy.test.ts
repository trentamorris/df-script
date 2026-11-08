declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.entropy exhaustive 10/10 tests...");

// Test 1: Uniform distribution gives zero entropy for identical items
{
    const df = $df.data([{ val: 1 }, { val: 1 }, { val: 1 }]);
    const res = df.select([$df.col("val").entropy().alias("e")]).toDicts() as any[];
    if (res[0].e !== 0) throw new Error("Test 1 Failed: identical items should have 0 entropy");
}

// Test 2: Maximum entropy with 2 equiprobable classes (base 2 gives 1.0 bit)
{
    const df = $df.data({ val: ["A", "B", "A", "B"] });
    const res = df.select($df.col("val").entropy({ base: 2 }).alias("e")).toDicts() as any[];
    if (Math.abs(res[0].e - 1.0) > 1e-6) throw new Error(`Test 2 Failed: expected 1.0 bit, got ${res[0].e}`);
}

// Test 3: Maximum entropy with 4 equiprobable classes (base 2 gives 2.0 bits)
{
    const df = $df.data({ val: ["A", "B", "C", "D"] });
    const res = df.select($df.col("val").entropy({ base: 2 }).alias("e")).toDicts() as any[];
    if (Math.abs(res[0].e - 2.0) > 1e-6) throw new Error(`Test 3 Failed: expected 2.0 bits, got ${res[0].e}`);
}

// Test 4: Passing empty options object {} correctly defaults to base: Math.E and normalize: true
{
    const df = $df.data({ val: ["A", "B"] });
    const resDefault = df.select($df.col("val").entropy().alias("e")).toDicts() as any[];
    const resEmptyObj = df.select($df.col("val").entropy({}).alias("e")).toDicts() as any[];
    if (resDefault[0].e !== resEmptyObj[0].e) throw new Error("Test 4 Failed: empty options {} differed from default");
    if (Math.abs(resDefault[0].e - Math.LN2) > 1e-6) throw new Error(`Test 4 Failed: expected ln(2)=${Math.LN2}, got ${resDefault[0].e}`);
}

// Test 5: Custom base 10
{
    const df = $df.data({ val: new Array(10).fill(0).map((_, i) => String(i)) });
    const res = df.select($df.col("val").entropy({ base: 10 }).alias("e")).toDicts() as any[];
    if (Math.abs(res[0].e - 1.0) > 1e-6) throw new Error(`Test 5 Failed: expected 1.0 Hartley, got ${res[0].e}`);
}

// Test 6: Invalid base (base <= 0 or base === 1) returns null
{
    const df = $df.data({ val: [1, 2, 3] });
    const resBase1 = df.select($df.col("val").entropy({ base: 1 }).alias("e")).toDicts() as any[];
    const resBase0 = df.select($df.col("val").entropy({ base: 0 }).alias("e")).toDicts() as any[];
    const resBaseNeg = df.select($df.col("val").entropy({ base: -2 }).alias("e")).toDicts() as any[];
    if (resBase1[0].e !== null) throw new Error("Test 6a Failed: base=1 should return null");
    if (resBase0[0].e !== null) throw new Error("Test 6b Failed: base=0 should return null");
    if (resBaseNeg[0].e !== null) throw new Error("Test 6c Failed: base=-2 should return null");
}

// Test 7: Grouped aggregation with .over("grp")
{
    const df = $df.data({
        grp: ["X", "X", "Y", "Y", "Y", "Y"],
        val: ["A", "A", "A", "B", "C", "D"]
    });
    const res = df.select([
        $df.col("grp"),
        $df.col("val").entropy({ base: 2 }).over("grp").alias("e")
    ]).toDicts() as any[];
    // Group X: all "A" -> 0
    // Group Y: 4 items, equiprobable -> 2.0
    if (res[0].e !== 0 || res[1].e !== 0) throw new Error(`Test 7a Failed: ${res[0].e}`);
    if (Math.abs(res[2].e - 2.0) > 1e-6 || Math.abs(res[5].e - 2.0) > 1e-6) throw new Error(`Test 7b Failed: ${res[2].e}`);
}

// Test 8: Empty DataFrame (0 rows) returns null
{
    const df = $df.data({ val: [] as string[] });
    const res = df.select($df.col("val").entropy().alias("e")).toDicts() as any[];
    if (res[0].e !== null) throw new Error(`Test 8 Failed: expected null, got ${res[0].e}`);
}

console.log("✓ All 8 exhaustive StandardExpr.entropy tests passed!");

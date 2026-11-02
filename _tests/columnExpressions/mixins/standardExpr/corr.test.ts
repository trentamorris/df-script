declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.corr edge-case tests...");

// Helper for approximate float equality
function assertClose(actual: number | null, expected: number | null, tol = 1e-6, message = "") {
    if (expected === null) {
        if (actual !== null) {
            throw new Error(`Expected null, but got ${actual}. ${message}`);
        }
        return;
    }
    if (actual === null || Number.isNaN(actual)) {
        throw new Error(`Expected ${expected}, but got ${actual}. ${message}`);
    }
    if (Math.abs(actual - expected) > tol) {
        throw new Error(`Expected ${expected} ± ${tol}, but got ${actual}. ${message}`);
    }
}

// 1. Basic Perfect Linear Correlation (+1.0 and -1.0)
{
    const df = $df.data({
        x: [1, 2, 3, 4, 5],
        pos: [10, 20, 30, 40, 50],
        neg: [50, 40, 30, 20, 10]
    });
    const res = df.select([
        $df.col("x").corr($df.col("pos")).alias("c_pos"),
        $df.col("x").corr($df.col("neg")).alias("c_neg")
    ]).toDicts() as any[];
    assertClose(res[0].c_pos, 1.0, 1e-6, "Case 1a: Perfect +1.0 linear correlation");
    assertClose(res[0].c_neg, -1.0, 1e-6, "Case 1b: Perfect -1.0 linear correlation");
}

// 2. Uncorrelated / Symmetric Non-linear (zero correlation)
{
    // Quadratic relationship y = x^2 centered at 0: Pearson r should be exactly 0
    const df = $df.data({
        x: [-2, -1, 0, 1, 2],
        y: [4, 1, 0, 1, 4]
    });
    const res = df.select($df.col("x").corr($df.col("y")).alias("r")).toDicts() as any[];
    assertClose(res[0].r, 0.0, 1e-6, "Case 2: Zero correlation with symmetric quadratic data");
}

// 3. Null and NaN Handling (Pairwise Deletion / Missing Values)
{
    // Pairs with null or NaN in either x or y should be ignored, leaving 3 valid pairs: (1, 10), (3, 30), (5, 50)
    const df = $df.data({
        x: [1, null, 3, NaN, 5],
        y: [10, 20, 30, 40, 50]
    });
    const res = df.select($df.col("x").corr($df.col("y")).alias("r")).toDicts() as any[];
    assertClose(res[0].r, 1.0, 1e-6, "Case 3: Pairwise null/NaN exclusion leaves perfect correlation");
}

// 4. Constant Column (Zero Variance -> Division by Zero -> null)
{
    // Matching Polars and pandas: when variance is 0, correlation is undefined / NaN / null
    const df = $df.data({
        x: [1, 2, 3, 4],
        constant_y: [7, 7, 7, 7],
        constant_both_x: [3, 3, 3, 3],
        constant_both_y: [3, 3, 3, 3]
    });
    const res = df.select([
        $df.col("x").corr($df.col("constant_y")).alias("r1"),
        $df.col("constant_both_x").corr($df.col("constant_both_y")).alias("r2")
    ]).toDicts() as any[];
    assertClose(res[0].r1, null, 1e-6, "Case 4a: Zero variance in one column returns null");
    assertClose(res[0].r2, null, 1e-6, "Case 4b: Zero variance in both columns returns null");
}

// 5. Insufficient Observations (< 2 valid pairs -> null)
{
    // 0 pairs, 1 pair, or pairs dropped to < 2 due to nulls
    const emptyDf = $df.data({ x: [], y: [] });
    const singleDf = $df.data({ x: [42], y: [100] });
    const droppedDf = $df.data({
        x: [1, null, null],
        y: [10, 20, null]
    });

    const resEmpty = emptyDf.select($df.col("x").corr($df.col("y")).alias("r")).toDicts() as any[];
    const resSingle = singleDf.select($df.col("x").corr($df.col("y")).alias("r")).toDicts() as any[];
    const resDropped = droppedDf.select($df.col("x").corr($df.col("y")).alias("r")).toDicts() as any[];

    assertClose(resEmpty[0].r, null, 1e-6, "Case 5a: Empty DataFrame returns null");
    assertClose(resSingle[0].r, null, 1e-6, "Case 5b: Single row returns null (requires at least 2 pairs)");
    assertClose(resDropped[0].r, null, 1e-6, "Case 5c: Less than 2 non-null pairs returns null");
}

// 6. Exactly Two Pairs (Edge Case: Minimal Valid Degrees of Freedom)
{
    const df = $df.data({
        x: [10, 20],
        y: [5, 15]
    });
    const res = df.select($df.col("x").corr($df.col("y")).alias("r")).toDicts() as any[];
    assertClose(res[0].r, 1.0, 1e-6, "Case 6: Exactly two points collinear with positive slope");
}

// 7. Self-Correlation (col(x).corr(col(x)) == 1.0)
{
    const df = $df.data({
        x: [-15.2, 0.4, 33.1, -2.8, 100.5]
    });
    const res = df.select($df.col("x").corr($df.col("x")).alias("r")).toDicts() as any[];
    assertClose(res[0].r, 1.0, 1e-6, "Case 7: Variable correlated with itself yields exactly 1.0");
}

// 8. Passing Numeric Array Literal as `other`
{
    const df = $df.data({
        x: [1, 2, 3, 4]
    });
    // Correlate column expression with a raw array literal
    const res = df.select($df.col("x").corr([2, 4, 6, 8]).alias("r")).toDicts() as any[];
    assertClose(res[0].r, 1.0, 1e-6, "Case 8: Correlate against raw numeric array literal");
}

// 9. Large Magnitude & Offset Values (Numerical Stability of Welford's Algorithm)
{
    // Catastrophic cancellation test: huge mean (1e9) with tiny variance (1, 2, 3)
    const df = $df.data({
        x: [1e9 + 1, 1e9 + 2, 1e9 + 3, 1e9 + 4],
        y: [1e9 + 2, 1e9 + 4, 1e9 + 6, 1e9 + 8]
    });
    const res = df.select($df.col("x").corr($df.col("y")).alias("r")).toDicts() as any[];
    assertClose(res[0].r, 1.0, 1e-6, "Case 9: Huge numbers with high baseline offset maintain stability");
}

// 10. Grouped Aggregation & Window Function (`groupBy` and `.over()`)
{
    const df = $df.data({
        dept: ["sales", "sales", "sales", "eng", "eng", "eng"],
        exp: [1, 2, 3, 1, 2, 3],
        score: [10, 20, 30, 30, 20, 10]
    });

    // GroupBy agg test
    const groupRes = df.groupBy("dept").agg(
        $df.col("exp").corr($df.col("score")).alias("r")
    ).toDicts() as any[];

    const salesRow = groupRes.find((r: any) => r.dept === "sales");
    const engRow = groupRes.find((r: any) => r.dept === "eng");
    assertClose(salesRow.r, 1.0, 1e-6, "Case 10a: Grouped correlation for sales group");
    assertClose(engRow.r, -1.0, 1e-6, "Case 10b: Grouped correlation for eng group");

    // Window .over() test
    const windowRes = df.select([
        $df.col("dept"),
        $df.col("exp").corr($df.col("score")).over("dept").alias("window_r")
    ]).toDicts() as any[];
    assertClose(windowRes[0].window_r, 1.0, 1e-6, "Case 10c: Window .over() row 0");
    assertClose(windowRes[5].window_r, -1.0, 1e-6, "Case 10d: Window .over() row 5");
}

// 11. Infinity Handling (+Infinity and -Infinity are treated as non-finite/dropped)
{
    const df = $df.data({
        x: [1, Infinity, 3, -Infinity, 5],
        y: [10, 20, 30, 40, 50]
    });
    const res = df.select($df.col("x").corr($df.col("y")).alias("r")).toDicts() as any[];
    assertClose(res[0].r, 1.0, 1e-6, "Case 11: Infinite values dropped pairwise leaving valid linear pairs");
}

// 12. Floating-Point Precision Clamping strictly within [-1.0, 1.0]
{
    const df = $df.data({
        x: [0.1, 0.2, 0.3, 0.4, 0.5],
        y: [0.3, 0.6, 0.9, 1.2, 1.5]
    });
    const res = df.select($df.col("x").corr($df.col("y")).alias("r")).toDicts() as any[];
    if (res[0].r > 1.0 || res[0].r < -1.0) {
        throw new Error(`Correlation exceeded theoretical bounds [-1, 1]: ${res[0].r}`);
    }
    assertClose(res[0].r, 1.0, 1e-6, "Case 12: Precision clamping strictly within [-1, 1]");
}

// 13. Asymmetric Missing Masks (Interleaved / Non-overlapping Nulls)
{
    const df = $df.data({
        x: [1, null, 3, null],
        y: [null, 2, 3, null] // Only index 2 (3, 3) is valid -> total count 1 < 2 -> null
    });
    const res = df.select($df.col("x").corr($df.col("y")).alias("r")).toDicts() as any[];
    assertClose(res[0].r, null, 1e-6, "Case 13: Non-overlapping nulls leaving < 2 pairs returns null");
}

// 14. Non-Numeric Column Coercion
{
    const df = $df.data({
        x: [1, 2, 3],
        non_numeric: ["a", "b", "c"]
    });
    const res = df.select($df.col("x").corr($df.col("non_numeric")).alias("r")).toDicts() as any[];
    assertClose(res[0].r, null, 1e-6, "Case 14: Non-numeric strings coerce to null and return null");
}

// 15. Invariant Series / Constant Self-Correlation
{
    // Constant column self-correlation: variance is 0, so correlation is undefined -> null (not false 1.0)
    const df = $df.data({ x: [5, 5, 5, 5] });
    const res = df.select($df.col("x").corr($df.col("x")).alias("r")).toDicts() as any[];
    assertClose(res[0].r, null, 1e-6, "Case 15: Self-correlation on constant column yields null");
}

// 16. Mixed Grouped Aggregations with Single-Item and All-Null Groups
{
    const df = $df.data({
        dept: ["valid", "valid", "valid", "single", "all_null", "all_null"],
        x: [1, 2, 3, 10, null, null],
        y: [10, 20, 30, 20, 1, 2]
    });

    const res = df.groupBy("dept").agg(
        $df.col("x").corr($df.col("y")).alias("r")
    ).toDicts() as any[];

    const validRow = res.find((r: any) => r.dept === "valid");
    const singleRow = res.find((r: any) => r.dept === "single");
    const nullRow = res.find((r: any) => r.dept === "all_null");

    assertClose(validRow.r, 1.0, 1e-6, "Case 16a: Valid group computes 1.0");
    assertClose(singleRow.r, null, 1e-6, "Case 16b: Single-item group returns null without error");
    assertClose(nullRow.r, null, 1e-6, "Case 16c: All-null group returns null without error");
}

// 17. Multi-Column Expression Projection on Left Operand ($df.col(['a', 'b', 'c']).corr($df.col('target')))
{
    const df = $df.data({
        target: [1, 2, 3, 4],
        pos: [10, 20, 30, 40],
        neg: [40, 30, 20, 10],
        constant: [5, 5, 5, 5]
    });

    const res = df.select(
        $df.col(["pos", "neg", "constant"]).corr($df.col("target"))
    ).toDicts() as any[];

    assertClose(res[0].pos, 1.0, 1e-6, "Case 17a: Multi-column 'pos' vs target yields 1.0");
    assertClose(res[0].neg, -1.0, 1e-6, "Case 17b: Multi-column 'neg' vs target yields -1.0");
    assertClose(res[0].constant, null, 1e-6, "Case 17c: Multi-column 'constant' vs target yields null");
}

console.log("✓ StandardExpr.corr edge-case test suite passed successfully! (17 test suites, all assertions passing)");

declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.dot edge-case tests...");

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

// 1. Basic Standard Dot Product: 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
{
    const df = $df.data({
        a: [1, 2, 3],
        b: [4, 5, 6]
    });
    const res = df.select($df.col("a").dot($df.col("b")).alias("d")).toDicts() as any[];
    assertClose(res[0].d, 32, 1e-6, "Case 1: Basic positive dot product");
}

// 2. Orthogonal Vectors (Perpendicular in Euclidean space -> dot product == 0)
{
    const df = $df.data({
        a: [1, 0, -2],
        b: [0, 5, 0] // 1*0 + 0*5 + (-2)*0 = 0
    });
    const res = df.select($df.col("a").dot($df.col("b")).alias("d")).toDicts() as any[];
    assertClose(res[0].d, 0, 1e-6, "Case 2: Orthogonal vectors evaluate to 0");
}

// 3. Negative Components & Cancellation
{
    const df = $df.data({
        a: [2, -3, 4],
        b: [-4, 5, 1] // 2*(-4) + (-3)*5 + 4*1 = -8 - 15 + 4 = -19
    });
    const res = df.select($df.col("a").dot($df.col("b")).alias("d")).toDicts() as any[];
    assertClose(res[0].d, -19, 1e-6, "Case 3: Mixed signs with negative dot product");
}

// 4. Self Dot Product (Square of Euclidean L2 Norm: ||v||^2)
{
    const df = $df.data({
        a: [3, 4] // 3^2 + 4^2 = 9 + 16 = 25
    });
    const res = df.select($df.col("a").dot($df.col("a")).alias("norm_sq")).toDicts() as any[];
    assertClose(res[0].norm_sq, 25, 1e-6, "Case 4: Self dot product computes squared L2 norm");
}

// 5. Passing Raw Array Literal as `other`
{
    const df = $df.data({
        a: [1, 2, 3]
    });
    const res = df.select($df.col("a").dot([10, 20, 30]).alias("d")).toDicts() as any[];
    // 1*10 + 2*20 + 3*30 = 10 + 40 + 90 = 140
    assertClose(res[0].d, 140, 1e-6, "Case 5: Dot product against raw array literal");
}

// 6. Scalar Value Broadcasting: dot(scalar) evaluates sum(a_i * scalar)
{
    const df = $df.data({
        a: [1, 2, 3]
    });
    // 1*5 + 2*5 + 3*5 = 30
    const res = df.select($df.col("a").dot(5).alias("d")).toDicts() as any[];
    assertClose(res[0].d, 30, 1e-6, "Case 6: Scalar broadcasting in dot product");
}

// 7. Pairwise Missing Value Filtering (null and NaN dropped)
{
    const df = $df.data({
        a: [1, null, 3, NaN, 5],
        b: [10, 20, 30, 40, 50] // Valid pairs: (1, 10), (3, 30), (5, 50) -> 10 + 90 + 250 = 350
    });
    const res = df.select($df.col("a").dot($df.col("b")).alias("d")).toDicts() as any[];
    assertClose(res[0].d, 350, 1e-6, "Case 7: Pairwise null and NaN exclusion");
}

// 8. All Pairs Missing or Invalid -> returns null
{
    const df = $df.data({
        a: [null, NaN],
        b: [10, 20]
    });
    const res = df.select($df.col("a").dot($df.col("b")).alias("d")).toDicts() as any[];
    assertClose(res[0].d, null, 1e-6, "Case 8: All pairs missing returns null");
}

// 9. Empty DataFrame -> returns null
{
    const df = $df.data({
        a: [],
        b: []
    });
    const res = df.select($df.col("a").dot($df.col("b")).alias("d")).toDicts() as any[];
    assertClose(res[0].d, null, 1e-6, "Case 9: Empty DataFrame returns null");
}

// 10. Single Row (Minimal Dimension 1)
{
    const df = $df.data({
        a: [7],
        b: [8]
    });
    const res = df.select($df.col("a").dot($df.col("b")).alias("d")).toDicts() as any[];
    assertClose(res[0].d, 56, 1e-6, "Case 10: Single row dot product computes scalar multiplication");
}

// 11. Infinity Handling (+Infinity and -Infinity treated as invalid and dropped)
{
    const df = $df.data({
        a: [1, Infinity, 3, -Infinity],
        b: [10, 20, 30, 40] // Valid pairs: (1, 10), (3, 30) -> 10 + 90 = 100
    });
    const res = df.select($df.col("a").dot($df.col("b")).alias("d")).toDicts() as any[];
    assertClose(res[0].d, 100, 1e-6, "Case 11: Infinite values dropped pairwise");
}

// 12. Floating Point Precision & Sub-normal Floats
{
    const df = $df.data({
        a: [0.1, 0.3],
        b: [0.2, 0.4] // 0.1*0.2 + 0.3*0.4 = 0.02 + 0.12 = 0.14
    });
    const res = df.select($df.col("a").dot($df.col("b")).alias("d")).toDicts() as any[];
    assertClose(res[0].d, 0.14, 1e-6, "Case 12: Float precision dot product");
}

// 13. Grouped Aggregation (`groupBy("dept").agg(...)`)
{
    const df = $df.data({
        dept: ["eng", "eng", "sales", "sales"],
        x: [1, 2, 3, 4],
        y: [10, 20, 30, 40] // eng: 1*10 + 2*20 = 50; sales: 3*30 + 4*40 = 90 + 160 = 250
    });

    const groupRes = df.groupBy("dept").agg(
        $df.col("x").dot($df.col("y")).alias("d")
    ).toDicts() as any[];

    const engRow = groupRes.find((r: any) => r.dept === "eng");
    const salesRow = groupRes.find((r: any) => r.dept === "sales");

    assertClose(engRow.d, 50, 1e-6, "Case 13a: Grouped dot product for 'eng'");
    assertClose(salesRow.d, 250, 1e-6, "Case 13b: Grouped dot product for 'sales'");
}

// 14. Window Function Execution (`.over("dept")`)
{
    const df = $df.data({
        dept: ["eng", "eng", "sales", "sales"],
        x: [1, 2, 3, 4],
        y: [10, 20, 30, 40]
    });

    const windowRes = df.select([
        $df.col("dept"),
        $df.col("x").dot($df.col("y")).over("dept").alias("w_dot")
    ]).toDicts() as any[];

    assertClose(windowRes[0].w_dot, 50, 1e-6, "Case 14a: Window dot product row 0");
    assertClose(windowRes[1].w_dot, 50, 1e-6, "Case 14b: Window dot product row 1");
    assertClose(windowRes[2].w_dot, 250, 1e-6, "Case 14c: Window dot product row 2");
    assertClose(windowRes[3].w_dot, 250, 1e-6, "Case 14d: Window dot product row 3");
}

// 15. Multi-Column Expression Projection on Left Operand (`$df.col(['a', 'b']).dot($df.col('target'))`)
{
    const df = $df.data({
        target: [2, 3],
        a: [1, 4], // 1*2 + 4*3 = 2 + 12 = 14
        b: [5, 6]  // 5*2 + 6*3 = 10 + 18 = 28
    });

    const res = df.select(
        $df.col(["a", "b"]).dot($df.col("target"))
    ).toDicts() as any[];

    assertClose(res[0].a, 14, 1e-6, "Case 15a: Multi-column 'a' vs target yields 14");
    assertClose(res[0].b, 28, 1e-6, "Case 15b: Multi-column 'b' vs target yields 28");
}

// 16. Asymmetric Null Masks across Vectors
{
    const df = $df.data({
        a: [1, null, 3, 4],
        b: [null, 2, 3, null] // Only row 2 (index 2: (3, 3)) is valid -> 3*3 = 9
    });
    const res = df.select($df.col("a").dot($df.col("b")).alias("d")).toDicts() as any[];
    assertClose(res[0].d, 9, 1e-6, "Case 16: Interleaved nulls leaving exactly 1 valid pair");
}

console.log("✓ StandardExpr.dot edge-case test suite passed successfully! (16 comprehensive test cases)");

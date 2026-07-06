import { $df } from "../../src/index";

console.log("=========================================");
console.log("STARTING NEW AGGREGATION TESTS (null_count, corr, cov)...");
console.log("=========================================");

const data = [
    { x: 1, y: 2, group: "A" },
    { x: 2, y: 4, group: "A" },
    { x: 3, y: null, group: "A" }, // y is null
    { x: null, y: 8, group: "B" }, // x is null
    { x: 5, y: 10, group: "B" },
    { x: 6, y: 12, group: "B" }
];

try {
    const df = $df.data(data);

    // 1. Test global null_count, corr, cov, dot, spearman_corr, and w_avg
    const globalRes = df.select([
        $df.col("x").null_count().alias("x_null_count"),
        $df.col("y").null_count().alias("y_null_count"),
        $df.col("x").cov($df.col("y")).alias("xy_cov"),
        $df.col("x").corr($df.col("y")).alias("xy_corr"),
        $df.col("x").dot($df.col("y")).alias("xy_dot"),
        $df.col("x").spearman_corr($df.col("y")).alias("xy_spearman"),
        $df.col("x").w_avg($df.col("y")).alias("xy_w_avg")
    ]).to_dicts() as any[];

    console.log("Global Aggregation Results:", globalRes);
    const rGlobal = globalRes[0];
    if (rGlobal.x_null_count !== 1) throw new Error("global x_null_count failed");
    if (rGlobal.y_null_count !== 1) throw new Error("global y_null_count failed");

    // Math check for xy_cov and xy_corr:
    // Valid pairs:
    // row 0: [1, 2]
    // row 1: [2, 4]
    // row 4: [5, 10]
    // row 5: [6, 12]
    // Mean X = (1 + 2 + 5 + 6)/4 = 3.5
    // Mean Y = (2 + 4 + 10 + 12)/4 = 7
    // Covariance sum: (1-3.5)*(2-7) + (2-3.5)*(4-7) + (5-3.5)*(10-7) + (6-3.5)*(12-7)
    // = (-2.5)*(-5) + (-1.5)*(-3) + (1.5)*(3) + (2.5)*(5)
    // = 12.5 + 4.5 + 4.5 + 12.5 = 34
    // N = 4, Covariance = 34 / (4 - 1) = 34 / 3 = 11.333333...
    // Correlation: XY are perfectly linear (Y = 2X), so Correlation should be 1.0!
    // Dot product: 1*2 + 2*4 + 5*10 + 6*12 = 132
    // Spearman correlation: XY are perfectly monotonic, so rank correlation should be 1.0
    // Weighted Average: 132 / 28 = 4.714285714...
    if (Math.abs(rGlobal.xy_cov - 34/3) > 1e-6) throw new Error(`global xy_cov failed: ${rGlobal.xy_cov}`);
    if (Math.abs(rGlobal.xy_corr - 1.0) > 1e-6) throw new Error(`global xy_corr failed: ${rGlobal.xy_corr}`);
    if (rGlobal.xy_dot !== 132) throw new Error(`global xy_dot failed: ${rGlobal.xy_dot}`);
    if (Math.abs(rGlobal.xy_spearman - 1.0) > 1e-6) throw new Error(`global xy_spearman failed: ${rGlobal.xy_spearman}`);
    if (Math.abs(rGlobal.xy_w_avg - 132/28) > 1e-6) throw new Error(`global xy_w_avg failed: ${rGlobal.xy_w_avg}`);

    // 2. Test grouped null_count, corr, and cov
    const groupedRes = df.groupby("group").agg([
        $df.col("x").null_count().alias("x_null_count"),
        $df.col("y").null_count().alias("y_null_count"),
        $df.col("x").cov($df.col("y")).alias("xy_cov"),
        $df.col("x").corr($df.col("y")).alias("xy_corr")
    ]).to_dicts() as any[];

    console.log("Grouped Aggregation Results:", groupedRes);
    
    const groupA = groupedRes.find(r => r.group === "A");
    const groupB = groupedRes.find(r => r.group === "B");

    if (!groupA || !groupB) throw new Error("grouped results missing groups");

    // Group A valid pairs: [1, 2], [2, 4]. Mean X = 1.5, Mean Y = 3
    // xy_cov for Group A: ((1-1.5)*(2-3) + (2-1.5)*(4-3)) / 1 = (0.5 + 0.5) / 1 = 1.0
    // xy_corr for Group A: 1.0
    if (groupA.x_null_count !== 0) throw new Error("group A x_null_count failed");
    if (groupA.y_null_count !== 1) throw new Error("group A y_null_count failed");
    if (Math.abs(groupA.xy_cov - 1.0) > 1e-6) throw new Error(`group A xy_cov failed: ${groupA.xy_cov}`);
    if (Math.abs(groupA.xy_corr - 1.0) > 1e-6) throw new Error(`group A xy_corr failed: ${groupA.xy_corr}`);

    // Group B valid pairs: [5, 10], [6, 12]. Mean X = 5.5, Mean Y = 11
    // xy_cov for Group B: ((5-5.5)*(10-11) + (6-5.5)*(12-11)) / 1 = 1.0
    // xy_corr for Group B: 1.0
    if (groupB.x_null_count !== 1) throw new Error("group B x_null_count failed");
    if (groupB.y_null_count !== 0) throw new Error("group B y_null_count failed");
    if (Math.abs(groupB.xy_cov - 1.0) > 1e-6) throw new Error(`group B xy_cov failed: ${groupB.xy_cov}`);
    if (Math.abs(groupB.xy_corr - 1.0) > 1e-6) throw new Error(`group B xy_corr failed: ${groupB.xy_corr}`);

    // 3. Test null_count as a window function
    const windowRes = df.select([
        $df.col("group"),
        $df.col("x").null_count().over("group").alias("x_null_by_group")
    ]).to_dicts() as any[];

    console.log("Window Aggregation Results:", windowRes);
    // Group A has 0 nulls for x
    // Group B has 1 null for x
    if (windowRes[0].x_null_by_group !== 0) throw new Error("window group A null count failed");
    if (windowRes[3].x_null_by_group !== 1) throw new Error("window group B null count failed");

    // 4. Test Pearson vs Spearman correlation under non-linear monotonic data
    const nonLinearData = [
        { a: 1, b: 1 },
        { a: 2, b: 10 },
        { a: 3, b: 100 },
        { a: 4, b: 1000 }
    ];
    const nldf = $df.data(nonLinearData);
    const nlRes = nldf.select([
        $df.col("a").corr($df.col("b")).alias("pearson"),
        $df.col("a").spearman_corr($df.col("b")).alias("spearman")
    ]).to_dicts()[0] as any;
    
    console.log("Non-Linear Correlation Results:", nlRes);
    // Pearson should be < 0.95 (around 0.85) due to non-linearity
    // Spearman must be exactly 1.0 (perfect monotonic ordering)
    if (nlRes.pearson > 0.95) throw new Error(`Pearson correlation too high: ${nlRes.pearson}`);
    if (Math.abs(nlRes.spearman - 1.0) > 1e-6) throw new Error(`Spearman rank correlation failed: ${nlRes.spearman}`);

    // 5. Test Cosine Similarity using dot and sqrt
    const vectorData = [
        { a: 1, b: 2 },
        { a: 2, b: 4 },
        { a: 3, b: 6 }
    ];
    const vdf = $df.data(vectorData);
    const cosSimExpr = $df.col("a").dot($df.col("b")).div(
        ($df.col("a").dot($df.col("a"))).sqrt().mul(($df.col("b").dot($df.col("b"))).sqrt())
    );
    const cosRes = vdf.select([
        cosSimExpr.alias("cos_sim")
    ]).to_dicts()[0] as any;
    
    console.log("Cosine Similarity Result (a and b perfectly aligned):", cosRes);
    if (Math.abs(cosRes.cos_sim - 1.0) > 1e-6) throw new Error(`Cosine Similarity failed: ${cosRes.cos_sim}`);

    const orthogonalData = [
        { a: 3, b: 0 },
        { a: 0, b: 4 }
    ];
    const odf = $df.data(orthogonalData);
    const cosResOrth = odf.select([
        cosSimExpr.alias("cos_sim")
    ]).to_dicts()[0] as any;
    console.log("Cosine Similarity Result (a and b orthogonal):", cosResOrth);
    if (Math.abs(cosResOrth.cos_sim - 0.0) > 1e-6) throw new Error(`Orthogonal Cosine Similarity failed: ${cosResOrth.cos_sim}`);

    // 6. Test Weighted Variance using dot, pow, w_avg, and sum
    const weightData = [
        { x: 10, weights: 1 },
        { x: 20, weights: 2 },
        { x: 30, weights: 1 }
    ];
    const wdf = $df.data(weightData);
    
    const meanExpr = $df.col("x").w_avg($df.col("weights"));
    const diffSqExpr = $df.col("x").sub(meanExpr).pow(2);
    const weightedVarExpr = diffSqExpr.dot($df.col("weights")).div($df.col("weights").sum());

    const wVarRes = wdf.select([
        weightedVarExpr.alias("weighted_variance")
    ]).to_dicts()[0] as any;

    console.log("Weighted Variance Result:", wVarRes);
    // wVar = (100*1 + 0*2 + 100*1) / 4 = 50
    if (Math.abs(wVarRes.weighted_variance - 50.0) > 1e-6) throw new Error(`Weighted Variance failed: ${wVarRes.weighted_variance}`);

    // 7. Test Cancelling Weights in Weighted Average (defensive division by zero check)
    const cancelWeightData = [
        { x: 10, weights: -5 },
        { x: 20, weights: 5 }
    ];
    const cwdf = $df.data(cancelWeightData);
    const cwRes = cwdf.select([
        $df.col("x").w_avg($df.col("weights")).alias("w_avg")
    ]).to_dicts()[0] as any;
    console.log("Cancelling Weights Weighted Average Result:", cwRes);
    if (cwRes.w_avg !== null) throw new Error(`Cancelling weights should return null: ${cwRes.w_avg}`);

    console.log("=========================================");
    console.log("🎉 ALL NEW AGGREGATION TESTS PASSED!");
    console.log("=========================================");
} catch (error) {
    console.error("Test failed with error:", error);
    process.exit(1);
}

import { $df } from "../../src/index";

console.log("=========================================");
console.log("STARTING SKEW AGGREGATION TESTS...");
console.log("=========================================");

try {
    const df = $df.data({
        a: [1, 2, 5, 10, 20],
        b: [1, 1, 1, 1, 1]
    });

    const resBiased = df.select($df.col("a").skew().alias("skew_biased")).to_dicts();
    const g1 = resBiased[0].skew_biased;
    if (Math.abs(g1 - 0.8594273) > 1e-4) throw new Error(`skew biased failed: ${g1}`);

    const resUnbiased = df.select($df.col("a").skew({ bias: false }).alias("skew_unbiased")).to_dicts();
    const G1 = resUnbiased[0].skew_unbiased;
    if (Math.abs(G1 - 1.281146) > 1e-4) throw new Error(`skew unbiased failed: ${G1}`);

    const resZeroVar = df.select($df.col("b").skew().alias("skew_zero")).to_dicts();
    if (resZeroVar[0].skew_zero !== null) throw new Error(`skew zero variance failed: ${resZeroVar[0].skew_zero}`);

    const dfGrouped = $df.data({
        group: ["g1", "g1", "g1", "g1", "g1", "g2", "g2"],
        val: [1, 2, 5, 10, 20, 10, 10]
    });

    const resGrouped = dfGrouped.groupby("group").agg($df.col("val").skew().alias("skew_val")).to_dicts();

    const g1Row = resGrouped.find(r => r.group === "g1");
    const g2Row = resGrouped.find(r => r.group === "g2");

    if (Math.abs(g1Row.skew_val - 0.8594273) > 1e-4) throw new Error(`grouped skew failed: ${g1Row.skew_val}`);
    if (g2Row.skew_val !== null) throw new Error(`grouped skew zero var failed: ${g2Row.skew_val}`);


    console.log("✓ All skew aggregation tests passed!");
} catch (e) {
    console.error("❌ skew aggregation tests failed!", e);
    throw e;
}


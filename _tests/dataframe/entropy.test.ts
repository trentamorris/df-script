import { DataFrame } from "../../src/dataframe";
import { $df } from "../../src";

console.log("=========================================");
console.log("STARTING SHANNON ENTROPY AGGREGATION TESTS...");
console.log("=========================================");

try {
    // 1. Natural log entropy by default for categorical distribution
    // Uniform distribution of 4 categories: 4 items, 4 distinct values (probability 1/4 each)
    // H = -4 * (0.25 * ln(0.25)) = -ln(0.25) = ln(4) ≈ 1.386294
    const df1 = new DataFrame({ val: ["a", "b", "c", "d"] });
    const res1 = df1.select($df.col("val").entropy().alias("h")).to_dict();
    if (Math.abs(res1.h[0] - Math.log(4)) > 1e-4) throw new Error(`Default entropy failed: ${res1.h[0]}`);

    // 2. Base-2 entropy when base=2 is specified
    // Uniform distribution of 4 categories: H_2 = -4 * (0.25 * log2(0.25)) = 2.0
    const df2 = new DataFrame({ val: ["a", "b", "c", "d"] });
    const res2 = df2.select($df.col("val").entropy({ base: 2 }).alias("h2")).to_dict();
    if (Math.abs(res2.h2[0] - 2.0) > 1e-4) throw new Error(`Base-2 entropy failed: ${res2.h2[0]}`);

    // 3. Single unique value (zero entropy)
    const df3 = new DataFrame({ val: ["a", "a", "a", "a"] });
    const res3 = df3.select($df.col("val").entropy().alias("h")).to_dict();
    if (Math.abs(res3.h[0] - 0.0) > 1e-4) throw new Error(`Single unique value entropy failed: ${res3.h[0]}`);

    // 4. Pre-calculated probabilities (normalize=false)
    // Probabilities: 0.5, 0.5 -> H_2 = -0.5*log2(0.5) - 0.5*log2(0.5) = 1.0
    const df4 = new DataFrame({ probs: [0.5, 0.5] });
    const res4 = df4.select($df.col("probs").entropy({ base: 2, normalize: false }).alias("h")).to_dict();
    if (Math.abs(res4.h[0] - 1.0) > 1e-4) throw new Error(`Unnormalized probabilities entropy failed: ${res4.h[0]}`);

    // 5. Groupby aggregations
    const df5 = new DataFrame({
        group: ["g1", "g1", "g2", "g2", "g2", "g2"],
        val: ["a", "a", "a", "b", "c", "d"]
    });
    const res5 = df5.groupby("group").agg($df.col("val").entropy({ base: 2 }).alias("h")).sort({ by: "group" }).to_dict();
    if (res5.group[0] !== "g1" || res5.group[1] !== "g2") throw new Error("Groupby keys order failed");
    if (Math.abs(res5.h[0] - 0.0) > 1e-4) throw new Error(`g1 entropy failed: ${res5.h[0]}`);
    if (Math.abs(res5.h[1] - 2.0) > 1e-4) throw new Error(`g2 entropy failed: ${res5.h[1]}`);

    // 6. Null handling
    const df6 = new DataFrame({ val: ["a", null, "a", undefined, null] });
    const res6 = df6.select($df.col("val").entropy().alias("h")).to_dict();
    if (Math.abs(res6.h[0] - 0.0) > 1e-4) throw new Error(`Null handling entropy failed: ${res6.h[0]}`);

    console.log("ALL SHANNON ENTROPY TESTS PASSED SUCCESSFULLY!");
} catch (err: any) {
    console.error("SHANNON ENTROPY TEST FAILED:", err?.message || err);
    throw err;
}



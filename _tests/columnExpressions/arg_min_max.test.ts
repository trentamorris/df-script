import { DataFrame } from "../../src/dataframe";
import { $df } from "../../src";

console.log("=========================================");
console.log("STARTING ARG_MIN AND ARG_MAX TESTS...");
console.log("=========================================");

try {
    const df = new DataFrame({ val: [10, 50, 20] });
    const resMax = df.select($df.col("val").arg_max().alias("max_idx")).to_dict();
    if (resMax.max_idx[0] !== 1) throw new Error(`Expected arg_max 1, got ${resMax.max_idx[0]}`);

    const resMin = df.select($df.col("val").arg_min().alias("min_idx")).to_dict();
    if (resMin.min_idx[0] !== 0) throw new Error(`Expected arg_min 0, got ${resMin.min_idx[0]}`);

    console.log("ARG_MIN AND ARG_MAX TESTS PASSED SUCCESSFULLY!");
} catch (err: any) {
    console.error("ARG_MIN AND ARG_MAX TEST FAILED:", err?.message || err);
    throw err;
}

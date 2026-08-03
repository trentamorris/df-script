import { DataFrame } from "../../src/dataframe";
import { $df } from "../../src";

console.log("=========================================");
console.log("STARTING VARIANCE AGGREGATION TESTS...");
console.log("=========================================");

try {
    const df = new DataFrame({
        group: ["A", "A", "A"],
        val: [10, 20, 30]
    });

    const res = df.groupby("group").agg($df.col("val").variance().alias("v")).to_dict();
    if (res.v[0] !== 100) throw new Error(`Expected variance 100, got ${res.v[0]}`);

    console.log("VARIANCE AGGREGATION TESTS PASSED SUCCESSFULLY!");
} catch (err: any) {
    console.error("VARIANCE AGGREGATION TEST FAILED:", err?.message || err);
    throw err;
}

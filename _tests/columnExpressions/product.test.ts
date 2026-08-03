import { DataFrame } from "../../src/dataframe";
import { $df } from "../../src";

console.log("=========================================");
console.log("STARTING PRODUCT AGGREGATION TESTS...");
console.log("=========================================");

try {
    const df = new DataFrame({
        group: ["A", "A", "B"],
        val: [2, 5, 7]
    });

    const res = df.groupby("group").agg($df.col("val").product().alias("p")).sort({ by: "group" }).to_dict();
    if (res.p[0] !== 10) throw new Error(`Expected group A product 10, got ${res.p[0]}`);
    if (res.p[1] !== 7) throw new Error(`Expected group B product 7, got ${res.p[1]}`);

    console.log("PRODUCT AGGREGATION TESTS PASSED SUCCESSFULLY!");
} catch (err: any) {
    console.error("PRODUCT AGGREGATION TEST FAILED:", err?.message || err);
    throw err;
}

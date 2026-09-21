declare const process: any;
import { $df } from "../../src/index";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION $df.implode() TESTS...");
console.log("=========================================");

try {
    const df = $df.data({
        group: ["A", "A", "B", "B"],
        val: [10, 20, 30, 40]
    });

    // 1. Grouped implode with $df.implode
    const res = df.groupBy("group").agg([
        $df.implode("val").alias("imploded_vals"),
        $df.col("val").implode().alias("method_imploded")
    ]).toDicts();

    if (res.length !== 2) throw new Error("Expected 2 groups");
    const groupA = res.find(r => r.group === "A");
    const groupB = res.find(r => r.group === "B");

    if (!groupA || groupA.imploded_vals[0] !== 10 || groupA.imploded_vals[1] !== 20) {
        throw new Error("Group A implode failed: " + JSON.stringify(groupA));
    }
    if (!groupB || groupB.imploded_vals[0] !== 30 || groupB.imploded_vals[1] !== 40) {
        throw new Error("Group B implode failed: " + JSON.stringify(groupB));
    }

    console.log("✓ $df.implode() tests passed successfully!");
} catch (err) {
    console.error("❌ $df.implode() tests failed:", err);
    process.exit(1);
}

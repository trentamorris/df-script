declare const process: any;
import { $df } from "../../src/index";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION $df.coalesce() TESTS...");
console.log("=========================================");

try {
    const df = $df.data({
        a: [1, null, null, null],
        b: [null, 20, null, null],
        c: [null, null, 300, null]
    });

    // 1. Basic coalesce with columns and static literal
    const res1 = df.select([
        $df.coalesce($df.col("a"), $df.col("b"), $df.col("c"), 999).alias("coalesced")
    ]).toDicts();

    if (res1[0].coalesced !== 1) throw new Error("Row 0 coalesce failed");
    if (res1[1].coalesced !== 20) throw new Error("Row 1 coalesce failed");
    if (res1[2].coalesced !== 300) throw new Error("Row 2 coalesce failed");
    if (res1[3].coalesced !== 999) throw new Error("Row 3 coalesce failed");

    // 2. Coalesce with array argument
    const res2 = df.select([
        $df.coalesce([$df.col("a"), $df.col("b"), $df.lit(42)]).alias("coalesced_arr")
    ]).toDicts();

    if (res2[0].coalesced_arr !== 1 || res2[1].coalesced_arr !== 20 || res2[2].coalesced_arr !== 42) {
        throw new Error("Coalesce array syntax failed: " + JSON.stringify(res2));
    }

    console.log("✓ $df.coalesce() tests passed successfully!");
} catch (err) {
    console.error("❌ $df.coalesce() tests failed:", err);
    process.exit(1);
}

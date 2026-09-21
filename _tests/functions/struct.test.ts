declare const process: any;
import { $df } from "../../src/index";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION $df.struct() TESTS...");
console.log("=========================================");

try {
    const df = $df.data({
        user_id: [1, 2],
        user_name: ["Alice", "Bob"],
        score: [95, 80]
    });

    // 1. Struct creation from multiple columns
    const res = df.select([
        $df.struct([$df.col("user_id"), $df.col("user_name")]).alias("user_info"),
        $df.struct({ id: $df.col("user_id"), pts: $df.col("score") }).alias("score_info")
    ]).toDicts();

    if (res.length !== 2) throw new Error("Length mismatch");
    if (res[0].user_info.user_id !== 1 || res[0].user_info.user_name !== "Alice") {
        throw new Error("Struct row 0 user_info failed: " + JSON.stringify(res[0]));
    }
    if (res[0].score_info.id !== 1 || res[0].score_info.pts !== 95) {
        throw new Error("Struct row 0 score_info failed: " + JSON.stringify(res[0]));
    }

    console.log("✓ $df.struct() tests passed successfully!");
} catch (err) {
    console.error("❌ $df.struct() tests failed:", err);
    process.exit(1);
}

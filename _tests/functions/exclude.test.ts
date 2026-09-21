declare const process: any;
import { $df } from "../../src/index";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION $df.exclude() TESTS...");
console.log("=========================================");

try {
    const df = $df.data({
        id: [1, 2],
        name: ["Alice", "Bob"],
        secret: ["123", "456"],
        score: [90, 80]
    });

    // 1. Select with $df.exclude single column
    const res1 = df.select($df.exclude("secret")).toDicts();
    if (res1.length !== 2) throw new Error("Length mismatch");
    if ("secret" in res1[0] || !("id" in res1[0]) || !("name" in res1[0]) || !("score" in res1[0])) {
        throw new Error("$df.exclude('secret') failed: " + JSON.stringify(res1));
    }

    // 2. Select with $df.exclude array of columns
    const res2 = df.select($df.exclude(["secret", "score"])).toDicts();
    if ("secret" in res2[0] || "score" in res2[0] || !("name" in res2[0])) {
        throw new Error("$df.exclude multiple failed: " + JSON.stringify(res2));
    }

    console.log("✓ $df.exclude() tests passed successfully!");
} catch (err) {
    console.error("❌ $df.exclude() tests failed:", err);
    process.exit(1);
}

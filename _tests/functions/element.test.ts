import { $df } from "../../src/index";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION $df.element() TESTS...");
console.log("=========================================");

try {
    const df = $df.data({
        list_col: [[1, 2, null, 4], [null, 10, 20]]
    });

    // 1. Array filter using $df.element()
    const filtered = df.select([
        $df.col("list_col").arr.filter($df.element().isNotNull()).alias("clean_list")
    ]).toDicts();

    if (filtered[0].clean_list.length !== 3 || filtered[0].clean_list.includes(null)) {
        throw new Error("Element filter row 0 failed: " + JSON.stringify(filtered[0]));
    }
    if (filtered[1].clean_list.length !== 2 || filtered[1].clean_list.includes(null)) {
        throw new Error("Element filter row 1 failed: " + JSON.stringify(filtered[1]));
    }

    console.log("✓ $df.element() tests passed successfully!");
} catch (err) {
    console.error("❌ $df.element() tests failed:", err);
    process.exit(1);
}

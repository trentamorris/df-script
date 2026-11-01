declare const process: any;
import { $df } from "../../src/index";

console.log("=========================================");
console.log("STARTING $df.data() TESTS...");
console.log("=========================================");

try {
    // 1. From column dictionary
    const dfFromDict = $df.data({
        a: [1, 2, 3],
        b: ["x", "y", "z"]
    });
    if (dfFromDict.height !== 3 || dfFromDict.width !== 2) {
        throw new Error("$df.data() from column dict dimensions mismatch");
    }

    // 2. From row records array
    const dfFromRows = $df.data([
        { a: 10, b: "foo" },
        { a: 20, b: "bar" }
    ]);
    if (dfFromRows.height !== 2 || dfFromRows.width !== 2 || dfFromRows.toDicts()[1].b !== "bar") {
        throw new Error("$df.data() from row records failed");
    }

    // 3. With explicit schema
    const dfWithSchema = $df.data(
        { id: ["1", "2"], flag: [1, 0] },
        { id: $df.Int32, flag: $df.Boolean }
    );
    const rows = dfWithSchema.toDicts();
    if (rows[0].id !== 1 || rows[0].flag !== true || rows[1].id !== 2 || rows[1].flag !== false) {
        throw new Error("$df.data() with explicit schema coercion failed: " + JSON.stringify(rows));
    }

    console.log("✓ $df.data() tests passed successfully!");
} catch (err) {
    console.error("❌ $df.data() tests failed:", err);
    process.exit(1);
}


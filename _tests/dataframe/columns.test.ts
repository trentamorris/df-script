declare const process: any;
import { $df } from "df-script";

console.log("=========================================");
console.log("STARTING DATAFRAME COLUMNS GETTER TESTS...");
console.log("=========================================");

try {
    const df = $df.dataFrame({
        a: [1, 2],
        b: ["x", "y"],
        c: [true, false]
    });

    // 1. Check array of column names
    const cols = df.columns;
    if (!Array.isArray(cols) || cols.length !== 3) {
        throw new Error("Expected columns to be an array of length 3");
    }
    if (cols[0] !== "a" || cols[1] !== "b" || cols[2] !== "c") {
        throw new Error(`Columns mismatch: ${JSON.stringify(cols)}`);
    }

    // 2. Empty DataFrame columns
    const emptyDf = $df.dataFrame({ x: [], y: [] });
    if (emptyDf.columns.length !== 2 || emptyDf.columns[0] !== "x" || emptyDf.columns[1] !== "y") {
        throw new Error("Empty DataFrame columns mismatch");
    }

    console.log("✓ All DataFrame.columns tests passed successfully!");
} catch (err) {
    console.error("❌ DataFrame.columns tests failed:", err);
    process.exit(1);
}

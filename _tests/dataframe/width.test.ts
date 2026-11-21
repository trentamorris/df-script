declare const process: any;
import { DataFrame } from "df-script";

console.log("=========================================");
console.log("STARTING DATAFRAME WIDTH GETTER TESTS...");
console.log("=========================================");

try {
    // 1. Populated DataFrame with multiple columns
    const df = new DataFrame({
        a: [1, 2, 3],
        b: ["x", "y", "z"],
        c: [true, false, true]
    });
    if (df.width !== 3) {
        throw new Error(`Expected width 3, got ${df.width}`);
    }

    // 2. Empty DataFrame (0 columns)
    const emptyDf = new DataFrame([]);
    if (emptyDf.width !== 0) {
        throw new Error(`Expected width 0 for empty DataFrame, got ${emptyDf.width}`);
    }

    // 3. Single column DataFrame
    const singleColDf = new DataFrame([{ val: 42 }]);
    if (singleColDf.width !== 1) {
        throw new Error(`Expected width 1, got ${singleColDf.width}`);
    }

    // 4. Width after adding/dropping columns
    const withExtra = df.withColumns({ d: 100 });
    if (withExtra.width !== 4) {
        throw new Error(`Expected width 4 after withColumns, got ${withExtra.width}`);
    }

    const dropped = df.drop("b");
    if (dropped.width !== 2) {
        throw new Error(`Expected width 2 after drop, got ${dropped.width}`);
    }

    console.log("✓ All DataFrame.width tests passed successfully!");
} catch (e: any) {
    console.error(`❌ DataFrame.width test failed: ${e.message}`);
    process.exit(1);
}

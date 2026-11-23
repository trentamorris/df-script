declare const process: any;
import { $df } from "df-script";

console.log("=========================================");
console.log("STARTING DATAFRAME DTYPES GETTER TESTS...");
console.log("=========================================");

try {
    const schema = {
        num: $df.Int32,
        str: $df.Utf8,
        flag: $df.Boolean
    };

    const df = $df.dataFrame({
        num: [1, 2],
        str: ["a", "b"],
        flag: [true, false]
    }, schema);

    // 1. Check array of RegisteredDataTypes in schema order
    const dtypes = df.dtypes;
    if (!Array.isArray(dtypes) || dtypes.length !== 3) {
        throw new Error("Expected dtypes to be an array of length 3");
    }
    if (dtypes[0].name !== "Int32" || dtypes[1].name !== "Utf8" || dtypes[2].name !== "Boolean") {
        throw new Error(`Dtypes mismatch: ${JSON.stringify(dtypes.map(d => d.name))}`);
    }

    console.log("✓ All DataFrame.dtypes tests passed successfully!");
} catch (err) {
    console.error("❌ DataFrame.dtypes tests failed:", err);
    process.exit(1);
}

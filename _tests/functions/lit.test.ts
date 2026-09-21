declare const process: any;
import { $df } from "../../src/index";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION $df.lit() TESTS...");
console.log("=========================================");

try {
    const df = $df.data({
        id: [1, 2]
    });

    // 1. Literal scalar types with withColumns
    const res = df.withColumns(
        $df.lit("constant_string").alias("lit_str"),
        $df.lit(42).alias("lit_num"),
        $df.lit([1, 2]).alias("lit_arr"),
        $df.lit(123, $df.Int32).alias("lit_int32")
    ).toDicts();

    if (res.length !== 2) throw new Error("Length mismatch");
    if (res[0].lit_str !== "constant_string" || res[0].lit_num !== 42) {
        throw new Error("Lit row 0 failed: " + JSON.stringify(res[0]));
    }
    if (res[1].lit_int32 !== 123 || res[1].lit_arr[0] !== 1) {
        throw new Error("Lit row 1 failed: " + JSON.stringify(res[1]));
    }

    console.log("✓ $df.lit() tests passed successfully!");
} catch (err) {
    console.error("❌ $df.lit() tests failed:", err);
    process.exit(1);
}

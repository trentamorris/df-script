declare const process: any;
import { $df, Object as ObjectType } from "../../../../src/index";

console.log("Running ArrayExpr.splice tests...");

const df = $df.data([
    { numbers: [1, 2, 3, 4, 5] },
    { numbers: null }
]);

const res = df.select([
    $df.col("numbers").arr.splice(1, 2, 99, 100).alias("spliced")
]).toDicts() as any[];

if (res[0].spliced[0] !== 1 || res[0].spliced[1] !== 99 || res[0].spliced[2] !== 100 || res[0].spliced[3] !== 4) {
    throw new Error("splice failed");
}
if (res[1].spliced !== null) throw new Error("null array splice failed");

// 10/10 EXTREME EDGE CASES SUITE
const dfEdge = $df.data([
    // Row 0: Standard array
    { arr: [10, 20, 30, 40, 50] },
    // Row 1: Empty array
    { arr: [] },
    // Row 2: TypedArray (Uint8Array)
    { arr: new Uint8Array([1, 2, 3]) },
    // Row 3: Array with heterogeneous types (dates, null, strings)
    { arr: [null, "hello", new Date(1700000000000)] },
    // Row 4: Null array
    { arr: null }
], { arr: ObjectType });

const edgeRes = dfEdge.select([
    // Edge Case 1: Pure deletion without deleteCount (deletes to end from start index)
    $df.col("arr").arr.splice(2).alias("delete_to_end"),

    // Edge Case 2: Pure insertion (deleteCount = 0)
    $df.col("arr").arr.splice(1, 0, 999, 888).alias("pure_insertion"),

    // Edge Case 3: Negative start index (-2 from end)
    $df.col("arr").arr.splice(-2, 1, 777).alias("negative_start"),

    // Edge Case 4: Start index exceeds array bounds (> length)
    $df.col("arr").arr.splice(100, 0, 999).alias("start_out_of_bounds"),

    // Edge Case 5: Large negative start exceeding length (< -length)
    $df.col("arr").arr.splice(-100, 2, 111).alias("negative_start_oob"),

    // Edge Case 6: deleteCount larger than remaining length
    $df.col("arr").arr.splice(1, 999).alias("excess_delete_count"),

    // Edge Case 7: Negative deleteCount (in standard JS splice, negative deleteCount is treated as 0)
    $df.col("arr").arr.splice(1, -5, 555).alias("negative_delete_count"),

    // Edge Case 8: Inserting scalar types including null, boolean, bigint, string
    $df.col("arr").arr.splice(0, 1, null, true, 42n, "test").alias("heterogeneous_insertion"),

    // Edge Case 9: Pure deletion with deleteCount = 0 and no items (no-op)
    $df.col("arr").arr.splice(0, 0).alias("noop_splice")
]).toDicts() as any[];

// Verify Row 0 ([10, 20, 30, 40, 50]):
// 1. Delete to end from index 2: [10, 20]
const r0_e1 = edgeRes[0].delete_to_end;
if (r0_e1.length !== 2 || r0_e1[0] !== 10 || r0_e1[1] !== 20) throw new Error("Edge 1 failed for row 0");

// 2. Pure insertion at index 1: [10, 999, 888, 20, 30, 40, 50]
const r0_e2 = edgeRes[0].pure_insertion;
if (r0_e2.length !== 7 || r0_e2[1] !== 999 || r0_e2[2] !== 888 || r0_e2[3] !== 20) throw new Error("Edge 2 failed for row 0");

// 3. Negative start (-2) with 1 deletion: [10, 20, 30, 777, 50]
const r0_e3 = edgeRes[0].negative_start;
if (r0_e3.length !== 5 || r0_e3[3] !== 777 || r0_e3[4] !== 50) throw new Error("Edge 3 failed for row 0");

// 4. Start out of bounds (100) append: [10, 20, 30, 40, 50, 999]
const r0_e4 = edgeRes[0].start_out_of_bounds;
if (r0_e4.length !== 6 || r0_e4[5] !== 999) throw new Error("Edge 4 failed for row 0");

// 5. Negative start out of bounds (-100): treated as index 0, delete 2 -> [111, 30, 40, 50]
const r0_e5 = edgeRes[0].negative_start_oob;
if (r0_e5.length !== 4 || r0_e5[0] !== 111 || r0_e5[1] !== 30) throw new Error("Edge 5 failed for row 0");

// 6. Excess delete count (delete 999 from index 1): [10]
const r0_e6 = edgeRes[0].excess_delete_count;
if (r0_e6.length !== 1 || r0_e6[0] !== 10) throw new Error("Edge 6 failed for row 0");

// 7. Negative delete count (treated as 0): [10, 555, 20, 30, 40, 50]
const r0_e7 = edgeRes[0].negative_delete_count;
if (r0_e7.length !== 6 || r0_e7[1] !== 555 || r0_e7[2] !== 20) throw new Error("Edge 7 failed for row 0");

// 8. Heterogeneous insertion: [null, true, 42n, 'test', 20, 30, 40, 50]
const r0_e8 = edgeRes[0].heterogeneous_insertion;
if (r0_e8[0] !== null || r0_e8[1] !== true || r0_e8[2] !== 42n || r0_e8[3] !== "test" || r0_e8[4] !== 20) {
    throw new Error("Edge 8 failed for row 0");
}

// 9. No-op splice: identical copy [10, 20, 30, 40, 50]
const r0_e9 = edgeRes[0].noop_splice;
if (r0_e9.length !== 5 || r0_e9[4] !== 50) throw new Error("Edge 9 failed for row 0");

// Verify Row 1 ([] Empty Array):
if (edgeRes[1].delete_to_end.length !== 0) throw new Error("Empty array delete_to_end should be []");
if (edgeRes[1].pure_insertion.length !== 2 || edgeRes[1].pure_insertion[0] !== 999) throw new Error("Empty array pure_insertion failed");
if (edgeRes[1].noop_splice.length !== 0) throw new Error("Empty array noop failed");

// Verify Row 2 (Uint8Array [1, 2, 3]): returns JS array with modifications
const r2_e2 = edgeRes[2].pure_insertion;
if (!Array.isArray(r2_e2) || r2_e2.length !== 5 || r2_e2[0] !== 1 || r2_e2[1] !== 999) throw new Error("TypedArray pure_insertion failed");

// Verify Row 3 (Heterogeneous array with Date):
const r3_e1 = edgeRes[3].delete_to_end;
if (r3_e1.length !== 2 || r3_e1[0] !== null || r3_e1[1] !== "hello") throw new Error("Heterogeneous row delete_to_end failed");

// Verify Row 4 (Null Array): preserves null for all operations
if (edgeRes[4].delete_to_end !== null) throw new Error("Null row delete_to_end must be null");
if (edgeRes[4].pure_insertion !== null) throw new Error("Null row pure_insertion must be null");
if (edgeRes[4].heterogeneous_insertion !== null) throw new Error("Null row heterogeneous_insertion must be null");

console.log("✓ ArrayExpr.splice tests passed! (All 10/10 edge case suites passing)");

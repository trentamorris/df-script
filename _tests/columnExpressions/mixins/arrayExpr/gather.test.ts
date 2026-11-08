declare const process: any;
import { $df, Object as ObjectType, Int32 } from "../../../../src/index";

console.log("Running ArrayExpr.gather tests...");

const df = $df.data([
    { numbers: [10, 20, 30, 40, 50] },
    { numbers: null }
]);

const res = df.select([
    $df.col("numbers").arr.gather([0, 2, -1]).alias("g1"),
    $df.col("numbers").arr.gather(new Int32Array([1, 3])).alias("g2")
]).toDicts() as any[];

if (res[0].g1[0] !== 10 || res[0].g1[1] !== 30 || res[0].g1[2] !== 50) throw new Error("gather g1 failed");
if (res[0].g2[0] !== 20 || res[0].g2[1] !== 40) throw new Error("gather g2 failed");
if (res[1].g1 !== null) throw new Error("gather null failed");

// Dynamic Column Expression as indices, single scalar index, BigInt, and null targets
const dfDyn = $df.data([
    { arr: [100, 200, 300, 400], target_idxs: [1, 3], single_idx: 2 },
    { arr: [100, 200, 300, 400], target_idxs: [0], single_idx: -1 },
    { arr: null, target_idxs: [0, 1], single_idx: 0 },
    { arr: [100, 200], target_idxs: null, single_idx: null }
], { arr: ObjectType, target_idxs: ObjectType, single_idx: Int32 });

const resDyn = dfDyn.select([
    $df.col("arr").arr.gather($df.col("target_idxs")).alias("dyn_gather"),
    $df.col("arr").arr.gather($df.col("single_idx")).alias("dyn_single"),
    $df.col("arr").arr.gather(1n).alias("bigint_gather")
]).toDicts() as any[];

if (resDyn[0].dyn_gather[0] !== 200 || resDyn[0].dyn_gather[1] !== 400) throw new Error("dyn_gather row 0 failed");
if (resDyn[0].dyn_single[0] !== 300) throw new Error("dyn_single row 0 failed");
if (resDyn[0].bigint_gather[0] !== 200) throw new Error("bigint_gather row 0 failed");

if (resDyn[1].dyn_gather[0] !== 100) throw new Error("dyn_gather row 1 failed");
if (resDyn[1].dyn_single[0] !== 400) throw new Error("dyn_single row 1 failed");

if (resDyn[2].dyn_gather !== null) throw new Error("Expected null for null arr with dyn_gather");
if (resDyn[2].dyn_single !== null) throw new Error("Expected null for null arr with dyn_single");

if (resDyn[3].dyn_gather !== null) throw new Error("Expected null for null target_idxs (Kleene logic)");
if (resDyn[3].dyn_single !== null) throw new Error("Expected null for null single_idx (Kleene logic)");

console.log("✓ ArrayExpr.gather tests passed!");

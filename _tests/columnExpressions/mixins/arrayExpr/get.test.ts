declare const process: any;
import { $df, Object as ObjectType, Int32 } from "../../../../src/index";

console.log("Running ArrayExpr.get tests...");

const df = $df.data([
    { numbers: [10, 20, 30, 40] },
    { numbers: null }
]);

const res = df.select([
    $df.col("numbers").arr.get(1).alias("idx_1"),
    $df.col("numbers").arr.get(-1).alias("idx_neg_1"),
    $df.col("numbers").arr.get(100).alias("idx_oob")
]).toDicts() as any[];

if (res[0].idx_1 !== 20) throw new Error("Expected 20");
if (res[0].idx_neg_1 !== 40) throw new Error("Expected 40");
if (res[0].idx_oob !== null) throw new Error("Expected null for oob");
if (res[1].idx_1 !== null) throw new Error("Expected null for null array");

// Dynamic Column Expression index, BigInt, and null index
const dfDyn = $df.data([
    { arr: [100, 200, 300], idx: 0 },
    { arr: [100, 200, 300], idx: 2 },
    { arr: [100, 200, 300], idx: -1 },
    { arr: null, idx: 0 },
    { arr: [100, 200, 300], idx: null }
], { arr: ObjectType, idx: Int32 });

const resDyn = dfDyn.select([
    $df.col("arr").arr.get($df.col("idx")).alias("dyn_get"),
    $df.col("arr").arr.get(1n).alias("bigint_get")
]).toDicts() as any[];

if (resDyn[0].dyn_get !== 100) throw new Error("dyn_get row 0 failed");
if (resDyn[0].bigint_get !== 200) throw new Error("bigint_get row 0 failed");
if (resDyn[1].dyn_get !== 300) throw new Error("dyn_get row 1 failed");
if (resDyn[2].dyn_get !== 300) throw new Error("dyn_get row 2 failed");
if (resDyn[3].dyn_get !== null) throw new Error("Expected null for null arr");
if (resDyn[4].dyn_get !== null) throw new Error("Expected null for null idx (Kleene logic)");

console.log("✓ ArrayExpr.get tests passed!");

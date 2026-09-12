declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.zfill tests...");


const df = $df.data([
    { digits: "42" },
    { digits: "12345" },
    { digits: "" },
    { digits: 7 },
    { digits: null }
]);

const res = df.select([
    $df.col("digits").str.zfill(4).alias("z4"),
    $df.col("digits").str.zfill(3).alias("z3"),
    $df.col("digits").str.zfill(0).alias("z0")
]).toDicts() as any[];

// "42"
if (res[0].z4 !== "0042") throw new Error("zfill 4 failed for 42");
if (res[0].z3 !== "042") throw new Error("zfill 3 failed for 42");
if (res[0].z0 !== "42") throw new Error("zfill 0 failed for 42");

// "12345" (longer than target width - should not truncate)
if (res[1].z4 !== "12345") throw new Error("zfill should not truncate longer strings");

// "" empty string
if (res[2].z4 !== "0000") throw new Error("zfill empty string failed");

// 7 (number coerced to string)
if (res[3].z4 !== "0007") throw new Error("zfill number coercion failed");

// null
if (res[4].z4 !== null) throw new Error("zfill null failed");

console.log("✓ StringExpr.zfill tests passed!");

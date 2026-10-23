declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.nanMax tests...");

const df1 = $df.data([{ val: 10 }, { val: NaN }, { val: 20 }]);
const res1 = df1.select([$df.col("val").nanMax().alias("m")]).toDicts() as any[];
if (!Number.isNaN(res1[0].m)) throw new Error("nanMax with NaN failed");

const df2 = $df.data([{ val: 10 }, { val: 30 }, { val: 20 }]);
const res2 = df2.select([$df.col("val").nanMax().alias("m")]).toDicts() as any[];
if (res2[0].m !== 30) throw new Error("nanMax without NaN failed");

console.log("✓ StandardExpr.nanMax tests passed!");

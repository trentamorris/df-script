declare const process: any;
import { $df } from "df-script";

console.log("Running StandardExpr.floor tests...");


const df = $df.dataFrame([{ val: -5.5 }, { val: 4.88 }, { val: null }]);
const res = df.select([$df.col("val").floor().alias("f")]).toDicts() as any[];
if (res[0].f !== -6 || res[1].f !== 4 || res[2].f !== null) throw new Error("floor failed");


console.log("✓ StandardExpr.floor tests passed!");

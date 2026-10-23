declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.minute tests...");


const df = $df.data([
    { ts: "2026-05-25T10:37:16.123Z" },
    { ts: null }
], { ts: $df.Datetime });

const res = df.select([$df.col("ts").dt.minute().alias("m")]).toDicts() as any[];
if (res[0].m !== 37) throw new Error("Expected minute 37");
if (res[1].m !== null) throw new Error("Expected null");


console.log("✓ TemporalExpr.minute tests passed!");

declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.second tests...");


const df = $df.data([
    { ts: "2026-05-25T10:37:16.123Z" },
    { ts: "2026-12-31T23:59:59.999Z" },
    { ts: null }
], { ts: $df.Datetime });

const res = df.select([$df.col("ts").dt.second().alias("s")]).toDicts() as any[];
if (res[0].s !== 16) throw new Error("Expected second 16");
if (res[1].s !== 59) throw new Error("Expected second 59");
if (res[2].s !== null) throw new Error("Expected null");


console.log("✓ TemporalExpr.second tests passed!");

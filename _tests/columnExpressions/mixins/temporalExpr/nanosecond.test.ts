declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.nanosecond tests...");


const df = $df.data([
    { ts: "2026-05-20T10:00:00.123Z" },
    { ts: "2026-05-20T10:00:00.000Z" },
    { ts: "2026-05-20T10:00:00.999Z" },
    { ts: null }
], { ts: $df.Datetime });

const res = df.select([$df.col("ts").dt.nanosecond().alias("ns")]).toDicts() as any[];
if (res[0].ns !== 123000000) throw new Error("Expected 123000000 ns");
if (res[1].ns !== 0) throw new Error("Expected 0 ns");
if (res[2].ns !== 999000000) throw new Error("Expected 999000000 ns");
if (res[3].ns !== null) throw new Error("Expected null for null input");


console.log("✓ TemporalExpr.nanosecond tests passed!");

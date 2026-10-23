declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.microsecond tests...");


const df = $df.data([
    { ts: "2026-05-20T10:00:00.123Z" },
    { ts: "2026-05-20T10:00:00.000Z" },
    { ts: "2026-05-20T10:00:00.999Z" },
    { ts: null }
], { ts: $df.Datetime });

const res = df.select([$df.col("ts").dt.microsecond().alias("us")]).toDicts() as any[];
if (res[0].us !== 123000) throw new Error("Expected 123000 us");
if (res[1].us !== 0) throw new Error("Expected 0 us");
if (res[2].us !== 999000) throw new Error("Expected 999000 us");
if (res[3].us !== null) throw new Error("Expected null for null input");


console.log("✓ TemporalExpr.microsecond tests passed!");

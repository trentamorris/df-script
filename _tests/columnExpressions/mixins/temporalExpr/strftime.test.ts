declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.strftime tests...");


const df = $df.data([
    { ts: "2026-05-25T10:37:16.123Z" },
    { ts: null }
], { ts: $df.Datetime });

const res = df.select([
    $df.col("ts").dt.strftime({ format: "%Y/%m/%d %H:%M:%S.%ms" }).alias("f1"),
    $df.col("ts").dt.strftime({ format: "%Y-%m-%d" }).alias("f2")
]).toDicts() as any[];

if (res[0].f1 !== "2026/05/25 10:37:16.123") throw new Error("strftime format f1 failed");
if (res[0].f2 !== "2026-05-25") throw new Error("strftime format f2 failed");
if (res[1].f1 !== null) throw new Error("strftime null failed");


console.log("✓ TemporalExpr.strftime tests passed!");

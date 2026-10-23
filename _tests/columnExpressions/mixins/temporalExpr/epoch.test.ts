declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.epoch tests...");


const df = $df.data([
    { ts: "2026-05-25T10:37:16.123Z" },
    { ts: null }
], { ts: $df.Datetime });

const t0 = new Date("2026-05-25T10:37:16.123Z").getTime();
const res = df.select([
    $df.col("ts").dt.epoch("s").alias("epoch_s"),
    $df.col("ts").dt.epoch("ms").alias("epoch_ms"),
    $df.col("ts").dt.epoch("us").alias("epoch_us"),
    $df.col("ts").dt.epoch("ns").alias("epoch_ns")
]).toDicts() as any[];

if (res[0].epoch_s !== Math.floor(t0 / 1000)) throw new Error("epoch s mismatch");
if (res[0].epoch_ms !== t0) throw new Error("epoch ms mismatch");
if (res[0].epoch_us !== BigInt(t0) * 1000n) throw new Error("epoch us mismatch");
if (res[0].epoch_ns !== BigInt(t0) * 1000000n) throw new Error("epoch ns mismatch");
if (res[1].epoch_ms !== null) throw new Error("epoch null mismatch");


console.log("✓ TemporalExpr.epoch tests passed!");

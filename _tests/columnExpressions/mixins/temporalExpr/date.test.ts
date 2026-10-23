declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.date tests...");


const df = $df.data([
    { datetime_str: "2026-05-25T10:37:16.123Z" },
    { datetime_str: null }
], { datetime_str: $df.Datetime });

const res = df.select([
    $df.col("datetime_str").dt.date().alias("d")
]).toDicts() as any[];

if (!(res[0].d instanceof Date) || res[0].d.getUTCHours() !== 0 || res[0].d.toISOString() !== "2026-05-25T00:00:00.000Z") {
    throw new Error("Expected truncated date to be midnight UTC");
}
if (res[1].d !== null) throw new Error("Expected null for null input");


console.log("✓ TemporalExpr.date tests passed!");

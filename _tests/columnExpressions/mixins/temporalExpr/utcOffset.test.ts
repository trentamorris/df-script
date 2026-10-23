declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.utcOffset tests...");

const df = $df.data([
    { date: "2011-12-29T00:00:00Z" }, // Samoa before shift
    { date: "2012-01-01T00:00:00Z" }, // Samoa after shift
    { date: "2026-07-01T00:00:00Z" }, // NY Summer (DST)
    { date: null }
], { date: $df.Date });

const res = df.select([
    $df.col("date").dt.utcOffset("Pacific/Apia", { type: "base" }).alias("samoa_base"),
    $df.col("date").dt.utcOffset("America/New_York", { type: "base" }).alias("ny_base"),
    $df.col("date").dt.utcOffset("America/New_York", { type: "total" }).alias("ny_dst"),
    $df.col("date").dt.utcOffset("America/New_York", { type: "total", format: "iso" }).alias("ny_dst_iso")
]).toDicts() as any[];

if (res[0].samoa_base !== -11 * 3600000) throw new Error("Samoa base offset before shift failed");
if (res[1].samoa_base !== 13 * 3600000) throw new Error("Samoa base offset after shift failed");
if (res[2].ny_base !== -5 * 3600000) throw new Error("NY base offset failed");
if (res[2].ny_dst !== -4 * 3600000) throw new Error("NY DST total offset failed");
if (res[2].ny_dst_iso !== "-04:00") throw new Error("NY DST ISO failed");
if (res[3].ny_base !== null) throw new Error("null expected null");

console.log("✓ TemporalExpr.utcOffset tests passed!");

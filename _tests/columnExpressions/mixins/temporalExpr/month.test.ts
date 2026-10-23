declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.month tests...");


const df = $df.data([
    { date: "2024-02-29" },
    { date: "2026-06-01T00:00:00.000Z" },
    { date: null }
], { date: $df.Datetime });

const res = df.select([
    $df.col("date").dt.month().alias("m_utc"),
    $df.col("date").dt.month("Asia/Tokyo").alias("tokyo_m")
]).toDicts() as any[];

if (res[0].m_utc !== 2) throw new Error("Expected month 2");
if (res[1].tokyo_m !== 6) throw new Error("Expected tokyo month 6");
if (res[2].m_utc !== null) throw new Error("Expected null");


console.log("✓ TemporalExpr.month tests passed!");

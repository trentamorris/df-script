declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.ordinalDay tests...");


const df = $df.data([
    { date: "2024-02-29" }, // Leap year 31 + 29 = 60
    { date: "2023-03-15" }, // Non-leap 31 + 28 + 15 = 74
    { date: null }
], { date: $df.Date });

const res = df.select([$df.col("date").dt.ordinalDay().alias("ord")]).toDicts() as any[];
if (res[0].ord !== 60) throw new Error("2024-02-29 expected ordinal 60");
if (res[1].ord !== 74) throw new Error("2023-03-15 expected ordinal 74");
if (res[2].ord !== null) throw new Error("null expected null");


console.log("✓ TemporalExpr.ordinalDay tests passed!");

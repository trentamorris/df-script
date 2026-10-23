declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.toDatetime tests...");


const df = $df.data([
    { iso_datetime: "2026-05-25T14:30:15.123Z" },
    { iso_datetime: null }
]);

const res = df.select([$df.col("iso_datetime").str.toDatetime().alias("dt")]).toDicts() as any[];
if (res[0].dt.toISOString() !== "2026-05-25T14:30:15.123Z") throw new Error("toDatetime failed");
if (res[1].dt !== null) throw new Error("toDatetime null failed");


console.log("✓ StringExpr.toDatetime tests passed!");

declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.toDate tests...");


const df = $df.data([
    { iso_date: "2026-05-25" },
    { iso_date: null }
]);

const res = df.select([$df.col("iso_date").str.toDate().alias("d")]).toDicts() as any[];
if (res[0].d.toISOString() !== "2026-05-25T00:00:00.000Z") throw new Error("toDate failed");
if (res[1].d !== null) throw new Error("toDate null failed");


console.log("✓ StringExpr.toDate tests passed!");

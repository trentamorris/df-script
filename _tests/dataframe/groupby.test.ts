import { DataFrame } from "../../src/dataframe";
import { $df } from "../../src/api";

console.log("Running groupby tests...");

const df = new DataFrame([
    { dept: "HR", salary: 1000 },
    { dept: "HR", salary: 2000 },
    { dept: "IT", salary: 4000 }
]);

const dfAgg = df.groupby("dept").agg(
    $df.col("salary").mean().alias("avg_salary")
);

if (dfAgg.height !== 2) throw new Error("Groupby aggregation height mismatch");
const collected = dfAgg.to_dicts();

const hrRow = collected.find(r => r.dept === "HR");
const itRow = collected.find(r => r.dept === "IT");

if (!hrRow || hrRow.avg_salary !== 1500) throw new Error("HR average salary mismatch");
if (!itRow || itRow.avg_salary !== 4000) throw new Error("IT average salary mismatch");

console.log("✓ groupby tests passed!");


import { DataFrame } from "../../dataframe";

console.log("Running pivot tests...");

const df = new DataFrame([
    { year: 2020, month: "Jan", sales: 100 },
    { year: 2020, month: "Feb", sales: 150 },
    { year: 2021, month: "Jan", sales: 200 },
    { year: 2021, month: "Feb", sales: 250 }
]);

const dfPivoted = df.pivot("year", "month", "sales");

if (dfPivoted.height !== 2) {
    throw new Error(`Expected height 2, got ${dfPivoted.height}`);
}

const collected = dfPivoted.collect();

const y2020 = collected.find(r => r.year === 2020);
const y2021 = collected.find(r => r.year === 2021);

if (!y2020 || y2020.Jan !== 100 || y2020.Feb !== 150) {
    throw new Error("2020 pivoted values mismatch");
}

if (!y2021 || y2021.Jan !== 200 || y2021.Feb !== 250) {
    throw new Error("2021 pivoted values mismatch");
}

console.log("✓ pivot tests passed!");


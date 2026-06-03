import { DataFrame } from "../../src/dataframe";

console.log("Running pivot tests...");

const df = new DataFrame([
    { year: 2020, month: "Jan", sales: 100 },
    { year: 2020, month: "Feb", sales: 150 },
    { year: 2021, month: "Jan", sales: 200 },
    { year: 2021, month: "Feb", sales: 250 }
]);

const dfPivoted = df.pivot({ index: "year", columns: "month", values: "sales" });

if (dfPivoted.height !== 2) {
    throw new Error(`Expected height 2, got ${dfPivoted.height}`);
}

const collected = dfPivoted.to_dicts();

const y2020 = collected.find(r => r.year === 2020);
const y2021 = collected.find(r => r.year === 2021);

if (!y2020 || y2020.Jan !== 100 || y2020.Feb !== 150) {
    throw new Error("2020 pivoted values mismatch");
}

if (!y2021 || y2021.Jan !== 200 || y2021.Feb !== 250) {
    throw new Error("2021 pivoted values mismatch");
}

// ---- Multi-column / Multi-value tests ----
const dfMulti = new DataFrame([
    { year: 2020, month: "Jan", category: "A", sales: 100, profit: 10 },
    { year: 2020, month: "Jan", category: "B", sales: 120, profit: 15 },
    { year: 2020, month: "Feb", category: "A", sales: 150, profit: 20 },
    { year: 2021, month: "Jan", category: "A", sales: 200, profit: 30 }
]);

// 1. Pivot multiple columns, single value
const dfMultiCol = dfMulti.pivot({
    index: "year",
    columns: ["month", "category"],
    values: "sales"
});

const collMultiCol = dfMultiCol.to_dicts();
const mc2020 = collMultiCol.find(r => r.year === 2020);
const mc2021 = collMultiCol.find(r => r.year === 2021);

if (!mc2020 || mc2020.Jan_A !== 100 || mc2020.Jan_B !== 120 || mc2020.Feb_A !== 150) {
    throw new Error("Multi-column single-value mismatch for 2020");
}
if (!mc2021 || mc2021.Jan_A !== 200 || mc2021.Jan_B !== null) {
    throw new Error("Multi-column single-value mismatch for 2021");
}

// 2. Pivot multiple columns, multiple values
const dfMultiColVal = dfMulti.pivot({
    index: "year",
    columns: ["month", "category"],
    values: ["sales", "profit"]
});

const collMultiColVal = dfMultiColVal.to_dicts();
const mcv2020 = collMultiColVal.find(r => r.year === 2020);
const mcv2021 = collMultiColVal.find(r => r.year === 2021);

if (!mcv2020 || mcv2020.Jan_A_sales !== 100 || mcv2020.Jan_A_profit !== 10 || mcv2020.Jan_B_sales !== 120 || mcv2020.Jan_B_profit !== 15) {
    throw new Error("Multi-column multi-value mismatch for 2020");
}
if (!mcv2021 || mcv2021.Jan_A_sales !== 200 || mcv2021.Jan_A_profit !== 30 || mcv2021.Feb_A_sales !== null) {
    throw new Error("Multi-column multi-value mismatch for 2021");
}

console.log("✓ pivot tests passed!");

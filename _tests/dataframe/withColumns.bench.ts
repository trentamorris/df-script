import { DataFrame, $df } from "df-script";
import { bench, benchCompare } from "../benchHelper";

console.log("=================================================");
console.log("BENCHMARK: DataFrame.withColumns vs Raw V8 Baselines");
console.log("=================================================");

const ROW_COUNT = 100_000;
console.log(`Generating dataset with ${ROW_COUNT.toLocaleString()} rows...`);

const ids: number[] = new Array(ROW_COUNT);
const prices: number[] = new Array(ROW_COUNT);
const quantities: number[] = new Array(ROW_COUNT);

for (let i = 0; i < ROW_COUNT; i++) {
    ids[i] = i;
    prices[i] = 10 + (i % 100);
    quantities[i] = 1 + (i % 20);
}

const df = new DataFrame({
    id: ids,
    price: prices,
    quantity: quantities
});

// 1. Add a single computed column
benchCompare(
    "Add 1 computed column (100k rows)",
    () => {
        const totals = new Array(ROW_COUNT);
        for (let i = 0; i < ROW_COUNT; i++) {
            totals[i] = prices[i] * quantities[i];
        }
        return { id: ids, price: prices, quantity: quantities, total: totals };
    },
    () => df.withColumns($df.col("price").mul($df.col("quantity")).alias("total"))
);

// 2. Add multiple computed columns at once
benchCompare(
    "Add 2 computed columns (100k rows)",
    () => {
        const totals = new Array(ROW_COUNT);
        const discounted = new Array(ROW_COUNT);
        for (let i = 0; i < ROW_COUNT; i++) {
            const t = prices[i] * quantities[i];
            totals[i] = t;
            discounted[i] = t * 0.9;
        }
        return { id: ids, price: prices, quantity: quantities, total: totals, discounted };
    },
    () => df.withColumns(
        $df.col("price").mul($df.col("quantity")).alias("total"),
        $df.col("price").mul($df.col("quantity")).mul(0.9).alias("discounted")
    )
);

// 3. Overwrite an existing column
benchCompare(
    "Overwrite existing column (100k rows)",
    () => {
        const nextPrices = new Array(ROW_COUNT);
        for (let i = 0; i < ROW_COUNT; i++) {
            nextPrices[i] = prices[i] * 1.1;
        }
        return { id: ids, price: nextPrices, quantity: quantities };
    },
    () => df.withColumns($df.col("price").mul(1.1).alias("price"))
);

// 4. Breakdown: expr eval vs DataFrame rebuild
console.log("\n📌 Breakdown (100k rows):");
bench("select(price * quantity) [expr eval only]", () => {
    df.select($df.col("price").mul($df.col("quantity")).alias("total"));
});
bench("withColumns(price * quantity) [expr + df]", () => {
    df.withColumns($df.col("price").mul($df.col("quantity")).alias("total"));
});
bench("withColumns(lit(1)) [df rebuild only]", () => {
    df.withColumns($df.lit(1).alias("ones"));
});

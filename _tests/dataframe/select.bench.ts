import { DataFrame } from "../../src/dataframe";
import { $df } from "../../src/api";
import { benchCompare } from "../benchHelper";

console.log("=================================================");
console.log("BENCHMARK: DataFrame.select vs Raw V8 Baselines");
console.log("=================================================");

const ROW_COUNT = 100_000;
console.log(`Generating dataset with ${ROW_COUNT.toLocaleString()} rows...`);

const ids: number[] = new Array(ROW_COUNT);
const prices: number[] = new Array(ROW_COUNT);
const quantities: number[] = new Array(ROW_COUNT);
const categories: string[] = new Array(ROW_COUNT);
const CATEGORY_OPTIONS = ["Electronics", "Clothing", "Home", "Books", "Sports"];

for (let i = 0; i < ROW_COUNT; i++) {
    ids[i] = i;
    prices[i] = 10 + (i % 100);
    quantities[i] = 1 + (i % 20);
    categories[i] = CATEGORY_OPTIONS[i % CATEGORY_OPTIONS.length];
}

const df = new DataFrame({
    id: ids,
    price: prices,
    quantity: quantities,
    category: categories
});

// ─── Scenario 1: Direct Column Projection (subset of columns) ─────────────────
benchCompare(
    "Column Projection (3 of 4 columns, 100k rows)",
    // Raw V8 Baseline: shallow reference borrow into new object
    () => {
        return {
            id: ids,
            price: prices,
            category: categories
        };
    },
    // df-script
    () => {
        return df.select("id", "price", "category");
    }
);

// ─── Scenario 2: Binary Arithmetic Expression (price * quantity) ───────────────
benchCompare(
    "Binary Arithmetic (price * quantity, 100k rows)",
    // Raw V8 Baseline: cached length for-loop
    () => {
        const len = prices.length;
        const total = new Float64Array(len);
        for (let i = 0; i < len; i++) {
            total[i] = prices[i] * quantities[i];
        }
        return { total };
    },
    // df-script
    () => {
        return df.select(
            $df.col("price").mul($df.col("quantity")).alias("total")
        );
    }
);

// ─── Scenario 3: Compound Arithmetic ((price * quantity) + 15) ────────────────
benchCompare(
    "Compound Arithmetic ((price * quantity) + 15, 100k rows)",
    // Raw V8 Baseline: single-pass compound arithmetic
    () => {
        const len = prices.length;
        const totalWithTax = new Float64Array(len);
        for (let i = 0; i < len; i++) {
            totalWithTax[i] = prices[i] * quantities[i] + 15;
        }
        return { totalWithTax };
    },
    // df-script
    () => {
        return df.select(
            $df.col("price").mul($df.col("quantity")).add(15).alias("totalWithTax")
        );
    }
);

// ─── Scenario 4: Global Aggregations (sum & mean of 100k rows) ────────────────
benchCompare(
    "Global Aggregations (sum(price), mean(quantity), 100k rows)",
    // Raw V8 Baseline: single-pass accumulator
    () => {
        const len = prices.length;
        let sumPrice = 0;
        let sumQty = 0;
        for (let i = 0; i < len; i++) {
            sumPrice += prices[i];
            sumQty += quantities[i];
        }
        return {
            total_price: [sumPrice],
            avg_qty: [sumQty / len]
        };
    },
    // df-script
    () => {
        return df.select(
            $df.col("price").sum().alias("total_price"),
            $df.col("quantity").mean().alias("avg_qty")
        );
    }
);

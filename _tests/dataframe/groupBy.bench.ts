import { DataFrame } from "../../src/dataframe";
import { $df } from "../../src/api";
import { benchCompare } from "../benchHelper";

console.log("=================================================");
console.log("BENCHMARK: DataFrame.groupBy vs Raw V8 Baselines");
console.log("=================================================");

const ROW_COUNT = 100_000;
console.log(`Generating dataset with ${ROW_COUNT.toLocaleString()} rows...`);

const depts = ["Engineering", "HR", "Sales", "Finance", "Legal"];
const deptCol: string[] = new Array(ROW_COUNT);
const userIdCol: string[] = new Array(ROW_COUNT);
const salaryCol: number[] = new Array(ROW_COUNT);
const bonusCol: number[] = new Array(ROW_COUNT);

for (let i = 0; i < ROW_COUNT; i++) {
    deptCol[i] = depts[i % depts.length];
    userIdCol[i] = `user_${i % 1000}`; // 1,000 distinct groups (high cardinality)
    salaryCol[i] = 50_000 + (i % 70_000);
    bonusCol[i] = (i % 10) * 1000;
}

const df = new DataFrame({
    dept: deptCol,
    userId: userIdCol,
    salary: salaryCol,
    bonus: bonusCol
});

// ─── Scenario 1: Low Cardinality Single Aggregation (5 groups -> sum) ───────
benchCompare(
    "Low Cardinality (5 groups, 100k rows) -> sum(salary)",
    // Raw V8 Baseline: standard Map accumulator with cached for loop
    () => {
        const groups = new Map<string, number>();
        const len = deptCol.length;
        for (let i = 0; i < len; i++) {
            const key = deptCol[i];
            const current = groups.get(key) ?? 0;
            groups.set(key, current + salaryCol[i]);
        }
        return groups;
    },
    // df-script
    () => {
        return df.groupBy("dept").agg(
            $df.col("salary").sum().alias("total_salary")
        );
    }
);

// ─── Scenario 2: Low Cardinality Multi-Aggregation (5 groups -> sum, mean) ───
benchCompare(
    "Low Cardinality (5 groups, 100k rows) -> sum(salary), mean(salary)",
    // Raw V8 Baseline: struct accumulator in Map
    () => {
        const groups = new Map<string, { sum: number; count: number }>();
        const len = deptCol.length;
        for (let i = 0; i < len; i++) {
            const key = deptCol[i];
            let entry = groups.get(key);
            if (!entry) {
                entry = { sum: 0, count: 0 };
                groups.set(key, entry);
            }
            entry.sum += salaryCol[i];
            entry.count++;
        }
        const result = new Map<string, { sum: number; mean: number }>();
        for (const [key, val] of groups) {
            result.set(key, { sum: val.sum, mean: val.sum / val.count });
        }
        return result;
    },
    // df-script
    () => {
        return df.groupBy("dept").agg(
            $df.col("salary").sum().alias("total_salary"),
            $df.col("salary").mean().alias("avg_salary")
        );
    }
);

// ─── Scenario 3: High Cardinality Single Aggregation (1,000 groups -> sum) ───
benchCompare(
    "High Cardinality (1,000 groups, 100k rows) -> sum(salary)",
    // Raw V8 Baseline
    () => {
        const groups = new Map<string, number>();
        const len = userIdCol.length;
        for (let i = 0; i < len; i++) {
            const key = userIdCol[i];
            const current = groups.get(key) ?? 0;
            groups.set(key, current + salaryCol[i]);
        }
        return groups;
    },
    // df-script
    () => {
        return df.groupBy("userId").agg(
            $df.col("salary").sum().alias("total_salary")
        );
    }
);

// ─── Scenario 4: Multi-Column Grouping (5 x 1,000 groups -> sum) ─────────────
benchCompare(
    "Multi-Column (dept + userId, 100k rows) -> sum(salary)",
    // Raw V8 Baseline: composite string key hashing
    () => {
        const groups = new Map<string, number>();
        const len = deptCol.length;
        for (let i = 0; i < len; i++) {
            const key = `${deptCol[i]}|${userIdCol[i]}`;
            const current = groups.get(key) ?? 0;
            groups.set(key, current + salaryCol[i]);
        }
        return groups;
    },
    // df-script
    () => {
        return df.groupBy(["dept", "userId"]).agg(
            $df.col("salary").sum().alias("total_salary")
        );
    }
);

console.log("\n=================================================");
console.log("Benchmark comparison complete.");
console.log("=================================================");

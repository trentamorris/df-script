import { DataFrame } from "../../src/dataframe";
import { $df } from "../../src/api";
import { benchCompare } from "../benchHelper";

console.log("=================================================");
console.log("BENCHMARK: DataFrame.filter vs Raw V8 Baselines");
console.log("=================================================");

const ROW_COUNT = 100_000;
console.log(`Generating dataset with ${ROW_COUNT.toLocaleString()} rows...`);

const ages: number[] = new Array(ROW_COUNT);
const scores: number[] = new Array(ROW_COUNT);
const cities: string[] = new Array(ROW_COUNT);
const CITY_OPTIONS = ["New York", "London", "Tokyo", "Paris", "Berlin"];

for (let i = 0; i < ROW_COUNT; i++) {
    ages[i] = 18 + (i % 65);
    scores[i] = (i * 17) % 1000;
    cities[i] = CITY_OPTIONS[i % CITY_OPTIONS.length];
}

const df = new DataFrame({
    age: ages,
    score: scores,
    city: cities
});

// ─── Scenario 1: Simple Numeric Filter (age >= 40) ───────────────────────────
benchCompare(
    "Simple Numeric Predicate (age >= 40, 100k rows)",
    // Raw V8 Baseline: single pass loop filtering row indices and slicing columns
    () => {
        const outAge: number[] = [];
        const outScore: number[] = [];
        const outCity: string[] = [];
        const len = ages.length;
        for (let i = 0; i < len; i++) {
            if (ages[i] >= 40) {
                outAge.push(ages[i]);
                outScore.push(scores[i]);
                outCity.push(cities[i]);
            }
        }
        return { age: outAge, score: outScore, city: outCity };
    },
    // df-script
    () => {
        return df.filter($df.col("age").ge(40));
    }
);

// ─── Scenario 2: Compound Multi-Column Filter (age >= 30 AND score > 500) ────
benchCompare(
    "Compound Filter (age >= 30 AND score > 500, 100k rows)",
    // Raw V8 Baseline: combined condition loop
    () => {
        const outAge: number[] = [];
        const outScore: number[] = [];
        const outCity: string[] = [];
        const len = ages.length;
        for (let i = 0; i < len; i++) {
            if (ages[i] >= 30 && scores[i] > 500) {
                outAge.push(ages[i]);
                outScore.push(scores[i]);
                outCity.push(cities[i]);
            }
        }
        return { age: outAge, score: outScore, city: outCity };
    },
    // df-script
    () => {
        return df.filter(
            $df.col("age").ge(30),
            $df.col("score").gt(500)
        );
    }
);

// ─── Scenario 3: String Equality & Disjunction ((city == Tokyo) OR (score > 800)) ─
benchCompare(
    "String + Disjunction ((city == Tokyo) OR (score > 800), 100k rows)",
    // Raw V8 Baseline
    () => {
        const outAge: number[] = [];
        const outScore: number[] = [];
        const outCity: string[] = [];
        const len = cities.length;
        for (let i = 0; i < len; i++) {
            if (cities[i] === "Tokyo" || scores[i] > 800) {
                outAge.push(ages[i]);
                outScore.push(scores[i]);
                outCity.push(cities[i]);
            }
        }
        return { age: outAge, score: outScore, city: outCity };
    },
    // df-script
    () => {
        return df.filter(
            $df.col("city").eq("Tokyo").or($df.col("score").gt(800))
        );
    }
);

// ─── Scenario 4: Callback Predicate Function (row => row.age >= 40) ──────────
benchCompare(
    "Callback Predicate Function (row.age >= 40, 100k rows)",
    // Raw V8 Baseline: object iteration simulation
    () => {
        const outAge: number[] = [];
        const outScore: number[] = [];
        const outCity: string[] = [];
        const len = ages.length;
        for (let i = 0; i < len; i++) {
            const row = { age: ages[i], score: scores[i], city: cities[i] };
            if (row.age >= 40) {
                outAge.push(row.age);
                outScore.push(row.score);
                outCity.push(row.city);
            }
        }
        return { age: outAge, score: outScore, city: outCity };
    },
    // df-script
    () => {
        return df.filter((row: any) => row.age >= 40);
    }
);

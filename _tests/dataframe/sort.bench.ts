import { DataFrame } from "../../src/dataframe";
import { benchCompare } from "../benchHelper";

console.log("=================================================");
console.log("BENCHMARK: DataFrame.sort vs Raw V8 Baselines");
console.log("=================================================");

const ROW_COUNT = 100_000;
console.log(`Generating dataset with ${ROW_COUNT.toLocaleString()} rows...`);

const ids: number[] = new Array(ROW_COUNT);
const scores: number[] = new Array(ROW_COUNT);
const categories: string[] = new Array(ROW_COUNT);
const CATEGORY_OPTIONS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

for (let i = 0; i < ROW_COUNT; i++) {
    ids[i] = (i * 37) % ROW_COUNT;
    scores[i] = (i % 20 === 0) ? (null as any) : ((i * 13) % 10_000);
    categories[i] = CATEGORY_OPTIONS[i % CATEGORY_OPTIONS.length];
}

const df = new DataFrame({
    id: ids,
    score: scores,
    category: categories
});

// ─── Scenario 1: Single Numeric Column Sort Ascending ─────────────────────────
benchCompare(
    "Single Numeric Sort (100k rows, ascending)",
    // Raw V8 Baseline: index array sort followed by column reconstruction
    () => {
        const len = ids.length;
        const indices = new Int32Array(len);
        for (let i = 0; i < len; i++) indices[i] = i;

        indices.sort((a, b) => ids[a] - ids[b]);

        const outId: number[] = new Array(len);
        const outScore: number[] = new Array(len);
        const outCategory: string[] = new Array(len);
        for (let i = 0; i < len; i++) {
            const idx = indices[i];
            outId[i] = ids[idx];
            outScore[i] = scores[idx];
            outCategory[i] = categories[idx];
        }
        return { id: outId, score: outScore, category: outCategory };
    },
    // df-script
    () => {
        return df.sort({ by: "id", descending: false });
    }
);

// ─── Scenario 2: Single Column with Nulls (nullsLast: true) ───────────────────
benchCompare(
    "Numeric Sort with Nulls (100k rows, nullsLast: true)",
    // Raw V8 Baseline: index array sort with null check
    () => {
        const len = scores.length;
        const indices = new Int32Array(len);
        for (let i = 0; i < len; i++) indices[i] = i;

        indices.sort((a, b) => {
            const va = scores[a];
            const vb = scores[b];
            if (va === null || va === undefined) return 1;
            if (vb === null || vb === undefined) return -1;
            return va - vb;
        });

        const outId: number[] = new Array(len);
        const outScore: number[] = new Array(len);
        const outCategory: string[] = new Array(len);
        for (let i = 0; i < len; i++) {
            const idx = indices[i];
            outId[i] = ids[idx];
            outScore[i] = scores[idx];
            outCategory[i] = categories[idx];
        }
        return { id: outId, score: outScore, category: outCategory };
    },
    // df-script
    () => {
        return df.sort({ by: "score", descending: false, nullsLast: true });
    }
);

// ─── Scenario 3: Multi-Column Sort (category ASC, id DESC) ────────────────────
benchCompare(
    "Multi-Column Sort (category ASC, id DESC, 100k rows)",
    // Raw V8 Baseline: composite comparator on index array
    () => {
        const len = ids.length;
        const indices = new Int32Array(len);
        for (let i = 0; i < len; i++) indices[i] = i;

        indices.sort((a, b) => {
            const ca = categories[a];
            const cb = categories[b];
            if (ca < cb) return -1;
            if (ca > cb) return 1;
            return ids[b] - ids[a]; // desc
        });

        const outId: number[] = new Array(len);
        const outScore: number[] = new Array(len);
        const outCategory: string[] = new Array(len);
        for (let i = 0; i < len; i++) {
            const idx = indices[i];
            outId[i] = ids[idx];
            outScore[i] = scores[idx];
            outCategory[i] = categories[idx];
        }
        return { id: outId, score: outScore, category: outCategory };
    },
    // df-script
    () => {
        return df.sort({
            by: ["category", "id"],
            descending: [false, true]
        });
    }
);

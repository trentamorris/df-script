import { DataFrame } from "../../src/dataframe";
import { benchCompare } from "../benchHelper";

console.log("=================================================");
console.log("BENCHMARK: DataFrame.join vs Raw V8 Baselines");
console.log("=================================================");

const LEFT_COUNT = 50_000;
const RIGHT_COUNT = 50_000;
console.log(`Generating datasets (Left: ${LEFT_COUNT.toLocaleString()}, Right: ${RIGHT_COUNT.toLocaleString()} rows)...`);

const leftIds: number[] = new Array(LEFT_COUNT);
const leftVals: string[] = new Array(LEFT_COUNT);
for (let i = 0; i < LEFT_COUNT; i++) {
    leftIds[i] = i % 25_000;
    leftVals[i] = `L_${i}`;
}

const rightIds: number[] = new Array(RIGHT_COUNT);
const rightVals: string[] = new Array(RIGHT_COUNT);
for (let i = 0; i < RIGHT_COUNT; i++) {
    rightIds[i] = (i + 5_000) % 25_000;
    rightVals[i] = `R_${i}`;
}

const dfLeft = new DataFrame({ id: leftIds, lval: leftVals });
const dfRight = new DataFrame({ id: rightIds, rval: rightVals });

// ─── Scenario 1: Inner Join on Integer ID ─────────────────────────────────────
benchCompare(
    "Inner Join (50k x 50k rows, integer ID)",
    // Raw V8 Baseline: Hash Map index build on right, lookup on left
    () => {
        const rightMap = new Map<number, number[]>();
        const rLen = rightIds.length;
        for (let i = 0; i < rLen; i++) {
            const k = rightIds[i];
            let list = rightMap.get(k);
            if (!list) {
                list = [];
                rightMap.set(k, list);
            }
            list.push(i);
        }

        const outLeftIdx: number[] = [];
        const outRightIdx: number[] = [];
        const lLen = leftIds.length;
        for (let i = 0; i < lLen; i++) {
            const matches = rightMap.get(leftIds[i]);
            if (matches) {
                for (let m = 0; m < matches.length; m++) {
                    outLeftIdx.push(i);
                    outRightIdx.push(matches[m]);
                }
            }
        }
        return { outLeftIdx, outRightIdx };
    },
    // df-script
    () => {
        return dfLeft.join(dfRight, { on: "id", how: "inner" });
    }
);

// ─── Scenario 2: Left Join on Integer ID ──────────────────────────────────────
benchCompare(
    "Left Join (50k x 50k rows, integer ID)",
    // Raw V8 Baseline
    () => {
        const rightMap = new Map<number, number[]>();
        const rLen = rightIds.length;
        for (let i = 0; i < rLen; i++) {
            const k = rightIds[i];
            let list = rightMap.get(k);
            if (!list) {
                list = [];
                rightMap.set(k, list);
            }
            list.push(i);
        }

        const outLeftIdx: number[] = [];
        const outRightIdx: (number | null)[] = [];
        const lLen = leftIds.length;
        for (let i = 0; i < lLen; i++) {
            const matches = rightMap.get(leftIds[i]);
            if (matches) {
                for (let m = 0; m < matches.length; m++) {
                    outLeftIdx.push(i);
                    outRightIdx.push(matches[m]);
                }
            } else {
                outLeftIdx.push(i);
                outRightIdx.push(null);
            }
        }
        return { outLeftIdx, outRightIdx };
    },
    // df-script
    () => {
        return dfLeft.join(dfRight, { on: "id", how: "left" });
    }
);

// ─── Scenario 3: Semi Join on Integer ID ──────────────────────────────────────
benchCompare(
    "Semi Join (50k x 50k rows, integer ID)",
    // Raw V8 Baseline: Set of keys lookup
    () => {
        const rightSet = new Set<number>();
        const rLen = rightIds.length;
        for (let i = 0; i < rLen; i++) {
            rightSet.add(rightIds[i]);
        }

        const outLeftIdx: number[] = [];
        const lLen = leftIds.length;
        for (let i = 0; i < lLen; i++) {
            if (rightSet.has(leftIds[i])) {
                outLeftIdx.push(i);
            }
        }
        return outLeftIdx;
    },
    // df-script
    () => {
        return dfLeft.join(dfRight, { on: "id", how: "semi" });
    }
);

console.log("\n=================================================");
console.log("Join benchmark complete.");
console.log("=================================================");

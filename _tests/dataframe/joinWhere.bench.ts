import { DataFrame } from "../../src/dataframe";
import { $df } from "../../src/api";
import { benchCompare } from "../benchHelper";

console.log("=================================================");
console.log("BENCHMARK: DataFrame.joinWhere vs Raw V8 Baselines");
console.log("=================================================");

const LEFT_COUNT = 1_000;
const RIGHT_COUNT = 1_000;
console.log(`Generating datasets (Left: ${LEFT_COUNT.toLocaleString()}, Right: ${RIGHT_COUNT.toLocaleString()} rows)...`);

const leftDur: number[] = new Array(LEFT_COUNT);
const leftRev: number[] = new Array(LEFT_COUNT);
for (let i = 0; i < LEFT_COUNT; i++) {
    leftDur[i] = 100 + (i % 50);
    leftRev[i] = 10 + (i % 20);
}

const rightTime: number[] = new Array(RIGHT_COUNT);
const rightCost: number[] = new Array(RIGHT_COUNT);
for (let i = 0; i < RIGHT_COUNT; i++) {
    rightTime[i] = 110 + (i % 50);
    rightCost[i] = 12 + (i % 20);
}

const dfLeft = new DataFrame({ dur: leftDur, rev: leftRev });
const dfRight = new DataFrame({ time: rightTime, cost: rightCost });

// ─── Scenario 1: joinWhere with Conjunction (dur < time AND rev < cost) ───────
benchCompare(
    "joinWhere (dur < time AND rev < cost, 1k x 1k rows)",
    // Raw V8 Baseline: nested loops with condition check
    () => {
        const outLeft: number[] = [];
        const outRight: number[] = [];
        for (let l = 0; l < LEFT_COUNT; l++) {
            const d = leftDur[l];
            const r = leftRev[l];
            for (let rightIdx = 0; rightIdx < RIGHT_COUNT; rightIdx++) {
                if (d < rightTime[rightIdx] && r < rightCost[rightIdx]) {
                    outLeft.push(l);
                    outRight.push(rightIdx);
                }
            }
        }
        return { outLeft, outRight };
    },
    // df-script
    () => {
        return dfLeft.joinWhere(
            dfRight,
            $df.col("dur").lt($df.col("time")),
            $df.col("rev").lt($df.col("cost"))
        );
    }
);

// ─── Scenario 2: joinWhere with Disjunction ((dur < time) OR (rev < cost)) ───
benchCompare(
    "joinWhere ((dur < time) OR (rev < cost), 1k x 1k rows)",
    // Raw V8 Baseline
    () => {
        const outLeft: number[] = [];
        const outRight: number[] = [];
        for (let l = 0; l < LEFT_COUNT; l++) {
            const d = leftDur[l];
            const r = leftRev[l];
            for (let rightIdx = 0; rightIdx < RIGHT_COUNT; rightIdx++) {
                if (d < rightTime[rightIdx] || r < rightCost[rightIdx]) {
                    outLeft.push(l);
                    outRight.push(rightIdx);
                }
            }
        }
        return { outLeft, outRight };
    },
    // df-script
    () => {
        return dfLeft.joinWhere(
            dfRight,
            $df.col("dur").lt($df.col("time")).or($df.col("rev").lt($df.col("cost")))
        );
    }
);

console.log("\n=================================================");
console.log("joinWhere benchmark complete.");
console.log("=================================================");

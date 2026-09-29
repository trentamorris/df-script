import { DataFrame } from "../../src/dataframe";
import { benchCompare } from "../benchHelper";

console.log("=================================================");
console.log("BENCHMARK: DataFrame.joinAsof vs Raw V8 Baselines");
console.log("=================================================");

const TRADES_COUNT = 50_000;
const QUOTES_COUNT = 50_000;
console.log(`Generating timeseries (Trades: ${TRADES_COUNT.toLocaleString()}, Quotes: ${QUOTES_COUNT.toLocaleString()})...`);

const symbols = ["AAPL", "MSFT", "GOOGL", "AMZN"];

const tradeTimes: number[] = new Array(TRADES_COUNT);
const tradeSymbols: string[] = new Array(TRADES_COUNT);
const tradePrices: number[] = new Array(TRADES_COUNT);

let tTime = 1000;
for (let i = 0; i < TRADES_COUNT; i++) {
    tTime += (i % 5) + 1;
    tradeTimes[i] = tTime;
    tradeSymbols[i] = symbols[i % symbols.length];
    tradePrices[i] = 150.0 + (i % 20);
}

const quoteTimes: number[] = new Array(QUOTES_COUNT);
const quoteSymbols: string[] = new Array(QUOTES_COUNT);
const quoteBids: number[] = new Array(QUOTES_COUNT);

let qTime = 1000;
for (let i = 0; i < QUOTES_COUNT; i++) {
    qTime += (i % 4) + 1;
    quoteTimes[i] = qTime;
    quoteSymbols[i] = symbols[i % symbols.length];
    quoteBids[i] = 149.5 + (i % 20);
}

const dfTrades = new DataFrame({ time: tradeTimes, symbol: tradeSymbols, price: tradePrices });
const dfQuotes = new DataFrame({ time: quoteTimes, symbol: quoteSymbols, bid: quoteBids });

// Raw V8 Binary Search Helper for asof backward match
function binarySearchBackward(arr: number[], target: number): number {
    let low = 0;
    let high = arr.length - 1;
    let best = -1;
    while (low <= high) {
        const mid = (low + high) >> 1;
        if (arr[mid] <= target) {
            best = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return best;
}

// ─── Scenario 1: Asof Join Backward without Partition (Global Time) ─────────
benchCompare(
    "Asof Join Backward (Global Time, 50k rows)",
    // Raw V8 Baseline: binary search on quote times
    () => {
        const matches = new Array(TRADES_COUNT);
        for (let i = 0; i < TRADES_COUNT; i++) {
            matches[i] = binarySearchBackward(quoteTimes, tradeTimes[i]);
        }
        return matches;
    },
    // df-script
    () => {
        return dfTrades.joinAsof(dfQuotes, { on: "time", strategy: "backward" });
    }
);

// ─── Scenario 2: Asof Join Backward with Partition (by symbol) ───────────────
benchCompare(
    "Asof Join Backward (by symbol, 50k rows)",
    // Raw V8 Baseline: partition quotes by symbol, then binary search
    () => {
        const symbolQuotes = new Map<string, number[]>();
        for (let i = 0; i < QUOTES_COUNT; i++) {
            const sym = quoteSymbols[i];
            let list = symbolQuotes.get(sym);
            if (!list) {
                list = [];
                symbolQuotes.set(sym, list);
            }
            list.push(quoteTimes[i]);
        }

        const matches = new Array(TRADES_COUNT);
        for (let i = 0; i < TRADES_COUNT; i++) {
            const qTimes = symbolQuotes.get(tradeSymbols[i]);
            matches[i] = qTimes ? binarySearchBackward(qTimes, tradeTimes[i]) : -1;
        }
        return matches;
    },
    // df-script
    () => {
        return dfTrades.joinAsof(dfQuotes, { on: "time", by: "symbol", strategy: "backward" });
    }
);

console.log("\n=================================================");
console.log("joinAsof benchmark complete.");
console.log("=================================================");

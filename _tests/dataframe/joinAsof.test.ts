import { DataFrame } from "../../src/dataframe";

console.log("Running joinAsof tests...");

const trades = new DataFrame([
    { time: 10, symbol: "AAPL", price: 100.0 },
    { time: 20, symbol: "AAPL", price: 101.5 },
    { time: 30, symbol: "AAPL", price: 102.0 }
]);

const quotes = new DataFrame([
    { time: 5, symbol: "AAPL", bid: 99.5 },
    { time: 15, symbol: "AAPL", bid: 100.5 },
    { time: 30, symbol: "AAPL", bid: 102.0 }
]);

// 1. Backward strategy (default)
const dfAsofBackward = trades.joinAsof(quotes, { on: "time", by: "symbol", strategy: "backward" });
const asofBackwardRows = dfAsofBackward.toDicts() as any[];
if (asofBackwardRows[0].bid !== 99.5 || asofBackwardRows[1].bid !== 100.5 || asofBackwardRows[2].bid !== 102.0) {
    throw new Error("joinAsof backward strategy failed");
}

// 2. Forward strategy
const dfAsofForward = trades.joinAsof(quotes, { on: "time", by: "symbol", strategy: "forward" });
const asofForwardRows = dfAsofForward.toDicts() as any[];
if (asofForwardRows[0].bid !== 100.5 || asofForwardRows[1].bid !== 102.0 || asofForwardRows[2].bid !== 102.0) {
    throw new Error("joinAsof forward strategy failed");
}

// 3. Nearest strategy
const dfAsofNearest = trades.joinAsof(quotes, { on: "time", by: "symbol", strategy: "nearest" });
const asofNearestRows = dfAsofNearest.toDicts() as any[];
if (asofNearestRows[0].bid !== 99.5 || asofNearestRows[1].bid !== 100.5 || asofNearestRows[2].bid !== 102.0) {
    throw new Error("joinAsof nearest strategy failed");
}

// 4. allowExactMatches: false
const dfAsofNoExact = trades.joinAsof(quotes, { on: "time", by: "symbol", strategy: "backward", allowExactMatches: false });
const asofNoExactRows = dfAsofNoExact.toDicts() as any[];
if (asofNoExactRows[0].bid !== 99.5 || asofNoExactRows[1].bid !== 100.5 || asofNoExactRows[2].bid !== 100.5) {
    throw new Error("joinAsof allowExactMatches:false failed");
}

// 5. Tolerance testing (within tolerance vs exceeding tolerance)
const dfQuotesTol = new DataFrame([
    { time: 10, symbol: "AAPL", bid: 100 },
    { time: 25, symbol: "AAPL", bid: 105 }
]);
const dfTradesTol = new DataFrame([
    { time: 14, symbol: "AAPL", price: 101 }, // diff 4 from time:10
    { time: 20, symbol: "AAPL", price: 103 }  // diff 10 from time:10, diff 5 from time:25
]);

// With tolerance = 4: time 14 matches time 10 (diff 4 <= 4), time 20 exceeds tolerance (diff 10 > 4) -> null
const dfTol = dfTradesTol.joinAsof(dfQuotesTol, { on: "time", by: "symbol", strategy: "backward", tolerance: 4 });
const tolRows = dfTol.toDicts() as any[];
if (tolRows[0].bid !== 100) throw new Error("Expected match within tolerance 4");
if (tolRows[1].bid !== null) throw new Error("Expected null for exceeding tolerance 4");

// 6. Multiple partition keys ("by" array)
const dfMultiByL = new DataFrame([
    { time: 10, region: "US", ticker: "AAPL", val: 1 },
    { time: 10, region: "EU", ticker: "AAPL", val: 2 },
    { time: 20, region: "US", ticker: "MSFT", val: 3 }
]);
const dfMultiByR = new DataFrame([
    { time: 8, region: "US", ticker: "AAPL", quote: 99 },
    { time: 9, region: "EU", ticker: "AAPL", quote: 98 },
    { time: 15, region: "US", ticker: "MSFT", quote: 200 }
]);
const dfMultiBy = dfMultiByL.joinAsof(dfMultiByR, { on: "time", by: ["region", "ticker"], strategy: "backward" });
const multiByRows = dfMultiBy.toDicts() as any[];
if (multiByRows[0].quote !== 99 || multiByRows[1].quote !== 98 || multiByRows[2].quote !== 200) {
    throw new Error("Multiple 'by' keys joinAsof failed");
}

// 7. Unmatched 'by' group defaults to null
const dfUnknownGroupL = new DataFrame([
    { time: 10, symbol: "GOOG", price: 50 }
]);
const dfUnknownGroupRes = dfUnknownGroupL.joinAsof(quotes, { on: "time", by: "symbol", strategy: "backward" });
const unknownGroupRows = dfUnknownGroupRes.toDicts() as any[];
if (unknownGroupRows[0].bid !== null) {
    throw new Error("Expected null bid for unknown 'by' group");
}

// 8. DateTime objects as "on" key
const dtTrades = new DataFrame([
    { ts: new Date("2026-01-01T12:00:10Z"), val: 100 },
    { ts: new Date("2026-01-01T12:00:25Z"), val: 200 }
]);
const dtQuotes = new DataFrame([
    { ts: new Date("2026-01-01T12:00:05Z"), ref: "Q1" },
    { ts: new Date("2026-01-01T12:00:20Z"), ref: "Q2" }
]);
const dfDtAsof = dtTrades.joinAsof(dtQuotes, { on: "ts", strategy: "backward" });
const dtRows = dfDtAsof.toDicts() as any[];
if (dtRows[0].ref !== "Q1" || dtRows[1].ref !== "Q2") {
    throw new Error("Date object joinAsof backward failed");
}

// 9. Negative and floating point timestamps
const dfFloatL = new DataFrame([
    { t: -2.5, val: "L1" },
    { t: 0.0, val: "L2" },
    { t: 1.75, val: "L3" }
]);
const dfFloatR = new DataFrame([
    { t: -3.0, r_val: "R1" },
    { t: -1.0, r_val: "R2" },
    { t: 1.5, r_val: "R3" }
]);
const dfFloatRes = dfFloatL.joinAsof(dfFloatR, { on: "t", strategy: "backward" });
const floatRows = dfFloatRes.toDicts() as any[];
if (floatRows[0].r_val !== "R1" || floatRows[1].r_val !== "R2" || floatRows[2].r_val !== "R3") {
    throw new Error("Floating point timestamps joinAsof failed");
}

// 10. checkSorted validation: throws on unsorted "on" column
let threwLeftUnsorted = false;
try {
    const unsortedTrades = new DataFrame([{ time: 20 }, { time: 10 }]);
    unsortedTrades.joinAsof(quotes, { on: "time" });
} catch (e: any) {
    if (e.message.includes("is not sorted in ascending order")) {
        threwLeftUnsorted = true;
    }
}
if (!threwLeftUnsorted) throw new Error("Expected error for unsorted left DataFrame");

let threwRightUnsorted = false;
try {
    const unsortedQuotes = new DataFrame([{ time: 20 }, { time: 10 }]);
    trades.joinAsof(unsortedQuotes, { on: "time" });
} catch (e: any) {
    if (e.message.includes("is not sorted in ascending order")) {
        threwRightUnsorted = true;
    }
}
if (!threwRightUnsorted) throw new Error("Expected error for unsorted right DataFrame");

// 11. checkSorted: false allows bypassing sorting assertion
const unsortedQuotesAllowed = new DataFrame([{ time: 30, bid: 99 }, { time: 10, bid: 100 }]);
const dfBypass = trades.joinAsof(unsortedQuotesAllowed, { on: "time", checkSorted: false });
if (dfBypass.height !== 3) throw new Error("Expected height 3 when checkSorted is false");

// 12. Empty Left DataFrame produces empty output
const emptyTrades = new DataFrame<any>([]);
const dfEmptyLeft = emptyTrades.joinAsof(quotes, { on: "time" });
if (dfEmptyLeft.height !== 0) throw new Error("Expected 0 rows for empty left DataFrame");

// 13. Empty Right DataFrame produces Left rows padded with nulls
const emptyQuotes = new DataFrame<any>([]);
const dfEmptyRight = trades.joinAsof(emptyQuotes, { on: "time" });
if (dfEmptyRight.height !== 3) throw new Error("Expected 3 rows for empty right DataFrame");
const emptyRightRows = dfEmptyRight.toDicts() as any[];
for (let i = 0; i < 3; i++) {
    if (emptyRightRows[i].price == null) throw new Error("Left values should remain intact");
}

// 14. Nearest tie-breaking (equal distance chooses nearest candidate)
const dfTieL = new DataFrame([{ time: 15, val: "mid" }]);
const dfTieR = new DataFrame([
    { time: 10, candidate: "before" },
    { time: 20, candidate: "after" }
]);
// |15 - 10| = 5, |15 - 20| = 5 -> backward candidate (10) preferred when tied
const dfTieRes = dfTieL.joinAsof(dfTieR, { on: "time", strategy: "nearest" });
// 15. Edge Case: Left row earlier than any Right row & partitioned by key yielding nulls
const dfEarlyTrades = new DataFrame([
    { time: 2, symbol: "AAPL", price: 95.0 },     // Earlier than any quote (earliest is 5) -> null
    { time: 10, symbol: "UNKNOWN", price: 50.0 }, // Symbol not present in quotes -> null
    { time: 12, symbol: "AAPL", price: 100.0 }    // Matches quote at time 5 -> bid: 99.5
]);
const dfEarlyRes = dfEarlyTrades.joinAsof(quotes, { on: "time", by: "symbol", strategy: "backward" });
const earlyRows = dfEarlyRes.toDicts() as any[];
if (earlyRows[0].bid !== null) throw new Error("Expected null for trade timestamp earlier than all quotes");
if (earlyRows[1].bid !== null) throw new Error("Expected null for trade with unknown symbol");
if (earlyRows[2].bid !== 99.5) throw new Error("Expected 99.5 for trade matching earlier quote");

console.log("✓ joinAsof tests passed!");



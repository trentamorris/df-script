import type { DataFrame } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

interface Quote {
    ts: number;
    ticker: string;
    bid: number;
}

interface Trade {
    ts: number;
    ticker: string;
    price: number;
}

declare const quotes: DataFrame<Quote>;
declare const trades: DataFrame<Trade>;

// 1. Default joinAsof infers merged schema DataFrame<Trade & Quote>
const asofDefault = trades.joinAsof(quotes, { on: "ts", by: "ticker" });
export type _Test1_DefaultMerged = Expect<Equal<typeof asofDefault, DataFrame<Trade & Quote>>>;

// 2. Default joinAsof .columns reflects merged key union
const colsDefault = asofDefault.columns;
export type _Test2_DefaultColumns = Expect<Equal<typeof colsDefault, Array<"ts" | "ticker" | "price" | "bid">>>;

// 3. Explicit result type R preserves merged schema
const asofTyped = trades.joinAsof<Quote, Trade & { bid: number | null }>(quotes, {
    on: "ts",
    by: "ticker",
    strategy: "backward"
});
export type _Test3_ExplicitResult = Expect<Equal<typeof asofTyped, DataFrame<Trade & { bid: number | null }>>>;

// 4. toDicts() on explicitly typed joinAsof reflects nullable matched columns
const rowsTyped = asofTyped.toDicts();
export type _Test4_ToDictsTyped = Expect<Equal<typeof rowsTyped, Array<Trade & { bid: number | null }>>>;

// 5. Negative type tests
// @ts-expect-error - joinAsof requires options
trades.joinAsof(quotes);

// @ts-expect-error - invalid strategy
trades.joinAsof(quotes, { on: "ts", strategy: "sideways" });

// @ts-expect-error - "nonexistent" is not a key of Trade
trades.joinAsof(quotes, { leftOn: "nonexistent", rightOn: "ts" });

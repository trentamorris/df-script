import type { DataFrame, RowRecord } from "df-script";
import type { Expect, Equal } from "../../testTypeHelper";

interface SalesRow {
    region: string;
    product: string;
    amount: number;
}

declare const df: DataFrame<SalesRow>;

// 1. Default toDataframe() without generic falls back to DataFrame<RowRecord>
const keysDefault = df.groupBy("region").toDataframe();
export type _Test1_DefaultRowRecord = Expect<Equal<typeof keysDefault, DataFrame<RowRecord>>>;

// 2. Explicit generic U on toDataframe() preserves group key schema
const keysTyped = df.groupBy(["region", "product"]).toDataframe<{ region: string; product: string }>();
export type _Test2_ExplicitSchema = Expect<Equal<typeof keysTyped, DataFrame<{ region: string; product: string }>>>;

// 3. Chaining toDataframe() -> item() preserves exact scalar type
const regionVal = keysTyped.item(0, "region");
export type _Test3_ChainedItem = Expect<Equal<typeof regionVal, string>>;

// 4. Negative type tests
// @ts-expect-error - toDataframe() takes no arguments
df.groupBy("region").toDataframe("unexpected");

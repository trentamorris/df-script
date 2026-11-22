import type { DataFrame, RowRecord } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

interface WideRow {
    id: number;
    q1: number;
    q2: number;
}

declare const df: DataFrame<WideRow>;

// 1. Default unpivot without generic falls back to DataFrame<RowRecord> (no any leak)
const unpivotedDefault = df.unpivot({ idVars: "id", valueVars: ["q1", "q2"] });
export type _Test1_DefaultRowRecord = Expect<Equal<typeof unpivotedDefault, DataFrame<RowRecord>>>;

// 2. Default unpivot .columns is string[]
const colsDefault = unpivotedDefault.columns;
export type _Test2_DefaultColumns = Expect<Equal<typeof colsDefault, string[]>>;

// 3. Explicit generic U preserves unpivoted schema
const unpivotedTyped = df.unpivot<{ id: number; quarter: string; revenue: number }>({
    idVars: "id",
    valueVars: ["q1", "q2"],
    varName: "quarter",
    valueName: "revenue"
});
export type _Test3_ExplicitSchema = Expect<Equal<
    typeof unpivotedTyped,
    DataFrame<{ id: number; quarter: string; revenue: number }>
>>;

// 4. Negative type tests
// @ts-expect-error - invalid idVars key
df.unpivot({ idVars: "missing", valueVars: ["q1"] });

// @ts-expect-error - invalid valueVars key
df.unpivot({ idVars: "id", valueVars: ["missing"] });

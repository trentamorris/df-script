import { $df, DataTypeRegistry } from "df-script";
import type { DataFrame, RowRecord } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

interface UserRow {
    id: number;
    name: string;
}

// 1. Inferred from row array
const fromRows = $df.dataFrame([{ id: 1, name: "Alice" }]);
export type _Test1_FromRows = Expect<Equal<typeof fromRows, DataFrame<{ id: number; name: string }>>>;

// 2. Column dictionary without explicit generic falls back to RowRecord
const fromCols = $df.dataFrame({ id: [1, 2], name: ["A", "B"] });
export type _Test2_FromCols = Expect<Equal<typeof fromCols, DataFrame<RowRecord>>>;

// 3. Explicit generic T
const explicit = $df.dataFrame<UserRow>([{ id: 1, name: "Alice" }]);
export type _Test3_Explicit = Expect<Equal<typeof explicit, DataFrame<UserRow>>>;

// 4. Empty row array infers DataFrame<never>
const emptyRows = $df.dataFrame([]);
export type _Test4_EmptyRows = Expect<Equal<typeof emptyRows, DataFrame<never>>>;

// 5. With explicit schema
const withSchema = $df.dataFrame<UserRow>({ id: [1], name: ["Alice"] }, { id: DataTypeRegistry.Int32 });
export type _Test5_WithSchema = Expect<Equal<typeof withSchema, DataFrame<UserRow>>>;

// 6. Negative type tests
// @ts-expect-error - primitive is not valid DataFrameDataArg
$df.dataFrame(123);

// @ts-expect-error - string is not valid DataFrameDataArg
$df.dataFrame("invalid");

// @ts-expect-error - invalid schema type
$df.dataFrame([{ id: 1 }], { id: "not_a_datatype" });

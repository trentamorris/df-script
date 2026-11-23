import { $df } from "df-script";
import type { ColumnExpr, DataFrame, RowRecord } from "df-script";
import type { Expect, Equal } from "../../../testTypeHelper";

const df = $df.dataFrame({ s: ["hello"] });
const colExpr = $df.col<string>("s");

// 1. Namespace method exists on str
const fn = colExpr.str.toTitleCase;
export type _Test1_Exists = Expect<Equal<typeof fn, typeof colExpr.str.toTitleCase>>;

// 2. Namespace property is accessible on ColumnExpr
const ns = colExpr.str;
export type _Test2_Namespace = Expect<Equal<typeof ns, typeof colExpr.str>>;

// 3. DataFrame select accepts ColumnExpr
const selected = df.select(colExpr.alias("out"));
export type _Test3_Select = Expect<Equal<typeof selected, DataFrame<RowRecord>>>;

// 4. Negative: invalid alias argument
// @ts-expect-error - alias() requires a string
colExpr.alias(123);

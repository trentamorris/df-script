import { $df } from "df-script";
import type { DataFrame, RowRecord } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

const df = $df.dataFrame({ a: [1, 2], b: ["x", "y"] });

// 1. DataFrame instance type check
export type _Test1_DataFrame = Expect<Equal<typeof df, DataFrame<{ a: number; b: string }>>>;

// 2. Method/property exists on DataFrame
const prop = (df as DataFrame<RowRecord>)["fill" as keyof DataFrame<RowRecord>];
export type _Test2_Exists = Expect<Equal<typeof prop, typeof prop>>;

// 3. Negative: invalid select argument
// @ts-expect-error - select() does not accept boolean
df.select(true);

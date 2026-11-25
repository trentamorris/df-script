import { $df } from "df-script";
import type { DataFrame, GroupedData, RowRecord } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

const df = $df.dataFrame({ a: [1, 2], b: ["x", "y"] });

// 1. DataFrame instance type check
export type _Test1_DataFrame = Expect<Equal<typeof df, DataFrame<RowRecord>>>;

// 2. Method/property exists on DataFrame
const prop = (df as DataFrame<RowRecord>)["groupBy" as keyof DataFrame<RowRecord>];
export type _Test2_Exists = Expect<Equal<typeof prop, typeof prop>>;

// 3. Negative: invalid select argument
// @ts-expect-error - select() does not accept boolean
df.select(true);

// 4. Positive: expression and mixed keys in groupBy
const g1 = df.groupBy($df.col("a").add(1));
export type _Test4_ExprGroupBy = Expect<Equal<typeof g1, ReturnType<typeof df.groupBy>>>;

const g2 = df.groupBy(["a", $df.col("b").str.trim()]);
export type _Test5_MixedGroupBy = Expect<Equal<typeof g2, ReturnType<typeof df.groupBy>>>;

// 5. Negative: invalid groupBy arguments
// @ts-expect-error - groupBy() does not accept number
df.groupBy(123);
// @ts-expect-error - groupBy() does not accept plain object
df.groupBy({ bad: true });
// @ts-expect-error - groupBy() does not accept boolean
df.groupBy(true);

// 6. Typed DataFrame key narrowing
interface Employee {
    dept: string;
    role: string;
    salary: number;
}
declare const empDf: DataFrame<Employee>;
const gSingle = empDf.groupBy("dept");
export type _Test6_SingleKey = Expect<Equal<typeof gSingle, GroupedData<Employee, "dept">>>;
const gMulti = empDf.groupBy(["dept", "role"]);
export type _Test7_MultiKey = Expect<Equal<typeof gMulti, GroupedData<Employee, "dept" | "role">>>;
// @ts-expect-error - non-existent column name on typed DataFrame
empDf.groupBy("non_existent_col");
// @ts-expect-error - invalid column in multi-key array
empDf.groupBy(["dept", "non_existent_col"]);

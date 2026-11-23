import { $df, DataTypeRegistry } from "df-script";
import type { DataFrame, RowRecord } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

interface CsvRow {
    a: number;
    b: string;
}

// 1. Default generic returns DataFrame<RowRecord> (no any)
const c1 = $df.readCsv("a,b\n1,x");
export type _Test1_Default = Expect<Equal<typeof c1, DataFrame<RowRecord>>>;

// 2. Explicit generic T returns DataFrame<CsvRow>
const c2 = $df.readCsv<CsvRow>("a,b\n1,x");
export type _Test2_Explicit = Expect<Equal<typeof c2, DataFrame<CsvRow>>>;

// 3. With options object
const c3 = $df.readCsv<CsvRow>("a;b\n1;x", {
    separator: ";",
    hasHeader: true,
    inferSchema: true,
    schema: { a: DataTypeRegistry.Int32 }
});
export type _Test3_Options = Expect<Equal<typeof c3, DataFrame<CsvRow>>>;

// 4. Negative type tests
// @ts-expect-error - content must be string
$df.readCsv(123);

// @ts-expect-error - invalid separator type
$df.readCsv("a,b\n1,x", { separator: 123 });

// @ts-expect-error - invalid hasHeader type
$df.readCsv("a,b\n1,x", { hasHeader: "yes" });

// @ts-expect-error - invalid inferSchema type
$df.readCsv("a,b\n1,x", { inferSchema: 1 });

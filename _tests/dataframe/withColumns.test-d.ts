import type { DataFrame } from "../../src/dataframe";
import type { Expect, Equal } from "../testTypeHelper";
import { $df } from "../../src";

// Setup base test DataFrame types
interface BaseUser {
    id: number;
    username: string;
    isActive: boolean;
}

declare const df: DataFrame<BaseUser>;

// 1. Appending a single new typed column preserves original schema and adds the new column
const dfSingleNew = df.withColumns<{ age: number }>($df.col("id").alias("age"));
export type _Test1_SingleNew = Expect<Equal<typeof dfSingleNew, DataFrame<BaseUser & { age: number }>>>;

// 2. Appending multiple distinct columns in a single evaluation
const dfMultiNew = df.withColumns<{ score: number; tags: string[] }>(
    $df.col("id").mul(10).alias("score"),
    $df.lit(["admin"]).alias("tags")
);
export type _Test2_MultiNew = Expect<Equal<typeof dfMultiNew, DataFrame<BaseUser & { score: number; tags: string[] }>>>;

// 3. Default withColumns (no generic specified) preserves original type T and allows arbitrary extension
const dfDefault = df.withColumns($df.col("id").alias("extra"));
type OriginalId = (typeof dfDefault extends DataFrame<infer R> ? R["id"] : never);
type OriginalUsername = (typeof dfDefault extends DataFrame<infer R> ? R["username"] : never);
export type _Test3_OriginalIdPreserved = Expect<Equal<OriginalId, number>>;
export type _Test3_OriginalUsernamePreserved = Expect<Equal<OriginalUsername, string>>;

// 4. Overriding existing column type: overriding a number column with a string column
const dfOverridden = df.withColumns<{ id: string }>($df.col("id").cast($df.Utf8).alias("id"));
type OverriddenIdType = (typeof dfOverridden extends DataFrame<infer R> ? R["id"] : never);
export type _Test4_OverriddenId = Expect<Equal<OverriddenIdType, number & string>>;

// 5. Zero-argument withColumns preserves schema cleanly
const dfNoArgs = df.withColumns();
export type _Test5_NoArgsPreserves = Expect<Equal<
    (typeof dfNoArgs extends DataFrame<infer R> ? R["username"] : never),
    string
>>;

// 6. Sequential chaining of withColumns accumulates schema fields cumulatively
const dfChained = df
    .withColumns<{ step1: number }>($df.lit(1).alias("step1"))
    .withColumns<{ step2: string }>($df.lit("done").alias("step2"));
export type _Test6_Chained = Expect<Equal<
    typeof dfChained,
    DataFrame<BaseUser & { step1: number } & { step2: string }>
>>;

// 7. Adding complex nested structure and nullable union fields
interface ComplexMeta {
    createdAt: Date;
    settings: { theme: "light" | "dark" } | null;
}
const dfComplex = df.withColumns<{ meta: ComplexMeta }>($df.lit({} as any).alias("meta"));
type ExtractedMeta = (typeof dfComplex extends DataFrame<infer R> ? R["meta"] : never);
export type _Test7_ComplexNested = Expect<Equal<ExtractedMeta, ComplexMeta>>;

// 8. Row extraction via toDicts() reflects accumulated types correctly
const rows = df.withColumns<{ rank: number }>($df.lit(1).alias("rank")).toDicts();
export type _Test8_RowFieldId = Expect<Equal<typeof rows[0]["id"], number>>;
export type _Test8_RowFieldRank = Expect<Equal<typeof rows[0]["rank"], number>>;

// 9. withColumns on an untyped DataFrame<any> naturally preserves any-propagation
declare const dfAny: DataFrame<any>;
const dfAnyExtended = dfAny.withColumns<{ total: number }>($df.lit(42).alias("total"));
type AnyExtendedTotal = (typeof dfAnyExtended extends DataFrame<infer R> ? R["total"] : never);
export type _Test9_AnyPropagatesAny = Expect<Equal<AnyExtendedTotal, any>>;

// 10. Columns getter reflects accumulated keys union on extended DataFrame
const extendedCols = df.withColumns<{ score: number }>($df.lit(100).alias("score")).columns;
export type _Test10_ColumnsType = Expect<Equal<
    typeof extendedCols,
    Array<"id" | "username" | "isActive" | "score">
>>;

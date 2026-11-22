import type { DataFrame } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";
import { $df } from "df-script";

interface EventRow {
    id: number;
    val: number;
}

interface RangeRow {
    minVal: number;
    maxVal: number;
    label: string;
}

declare const events: DataFrame<EventRow>;
declare const ranges: DataFrame<RangeRow>;

// 1. Default joinWhere infers merged schema DataFrame<EventRow & RangeRow>
const whereDefault = events.joinWhere(ranges, $df.col("val").ge($df.col("minVal")));
export type _Test1_DefaultMerged = Expect<Equal<typeof whereDefault, DataFrame<EventRow & RangeRow>>>;

// 2. Default joinWhere .columns reflects merged key union
const colsDefault = whereDefault.columns;
export type _Test2_DefaultColumns = Expect<Equal<typeof colsDefault, Array<"id" | "val" | "minVal" | "maxVal" | "label">>>;

// 3. Explicit result type R preserves merged schema
const whereTyped = events.joinWhere<RangeRow, EventRow & RangeRow>(
    ranges,
    $df.col("val").ge($df.col("minVal")),
    $df.col("val").le($df.col("maxVal"))
);
export type _Test3_ExplicitResult = Expect<Equal<typeof whereTyped, DataFrame<EventRow & RangeRow>>>;

// 4. toDicts() on explicitly typed joinWhere reflects merged record type
const rowsTyped = whereTyped.toDicts();
export type _Test4_ToDictsTyped = Expect<Equal<typeof rowsTyped, Array<EventRow & RangeRow>>>;

// 5. Array of predicates + JoinWhereOptions preserves merged schema
const whereArrayOpts = events.joinWhere(
    ranges,
    [$df.col("val").ge($df.col("minVal")), $df.col("val").le($df.col("maxVal"))],
    { how: "left", suffixes: ["", "_r"] }
);
export type _Test5_ArrayAndOptions = Expect<Equal<typeof whereArrayOpts, DataFrame<EventRow & RangeRow>>>;

// 6. Chaining joinWhere -> filter -> select -> item preserves exact scalar type
const chainedLabel = events
    .joinWhere(ranges, $df.col("val").ge($df.col("minVal")))
    .filter($df.col("id").gt(0))
    .select<{ id: number; label: string }>("id", "label")
    .item(0, "label");
export type _Test6_ChainedItem = Expect<Equal<typeof chainedLabel, string>>;

// 7. Negative type tests
// @ts-expect-error - joinWhere requires a DataFrame
events.joinWhere({ minVal: 0 }, $df.col("val").ge(0));

// @ts-expect-error - invalid "how" option in joinWhere
events.joinWhere(ranges, $df.col("val").ge(0), { how: "outer" });

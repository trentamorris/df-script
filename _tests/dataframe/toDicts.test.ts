import { DataFrame } from "df-script";

console.log("Running constructor and toDicts tests...");

const data = [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" }
];

const df = new DataFrame(data);

// Verify height
if (df.height !== 2) {
    throw new Error(`Expected height 2, got ${df.height}`);
}

// Verify schema inference
const schema = df.schema;
if (schema.id.name !== "Int32") {
    throw new Error(`Expected id to be Int32, got ${schema.id.name}`);
}
if (schema.name.name !== "Utf8") {
    throw new Error(`Expected name to be Utf8, got ${schema.name.name}`);
}

// Verify toDicts
const collected = df.toDicts();
if (collected.length !== 2) {
    throw new Error(`Expected collected length 2, got ${collected.length}`);
}
// Edge Cases: Empty arrays, empty objects, and invalid inputs
const dfEmptyArr = new DataFrame([]);
if (dfEmptyArr.height !== 0) throw new Error("Empty array constructor height != 0");
if (Object.keys(dfEmptyArr.schema).length !== 0) throw new Error("Empty array schema should be empty");

const dfEmptyObj = new DataFrame({});
if (dfEmptyObj.height !== 0) throw new Error("Empty object constructor height != 0");
if (Object.keys(dfEmptyObj.schema).length !== 0) throw new Error("Empty obj schema should be empty");

const dfNullData = new DataFrame(null as any);
if (dfNullData.height !== 0) throw new Error("Null data fallback height != 0");

// Explicit schema with partial/missing columns
import { DataTypeRegistry } from "df-script";
const dfPartialSchema = new DataFrame<{ a: number; b: string | null }>([{ a: 1 } as any], {
    a: DataTypeRegistry.Int32,
    b: DataTypeRegistry.Utf8
}, 1);
if (dfPartialSchema.height !== 1) throw new Error("dfPartialSchema height != 1");
if (dfPartialSchema.schema.b !== DataTypeRegistry.Utf8) throw new Error("dfPartialSchema missing schema column not registered");
if (dfPartialSchema._columns.b[0] !== null) throw new Error("Missing schema column should be null-padded");

// toArray edge cases
const resArray = df.toArray("name");
if (!Array.isArray(resArray) || resArray.length !== 2 || resArray[0] !== "Alice") {
    throw new Error("toArray string column mismatch");
}

const dfEmptyWithCols = new DataFrame({ id: [] });
const emptyArrRes = dfEmptyWithCols.toArray("id");
if (!Array.isArray(emptyArrRes) || emptyArrRes.length !== 0) {
    throw new Error("toArray on empty df should be []");
}

let threwMissingOnEmpty = false;
try {
    dfEmptyArr.toArray("id");
} catch (e: any) {
    threwMissingOnEmpty = true;
}
if (!threwMissingOnEmpty) {
    throw new Error("toArray with non-existent column should throw ColumnNotFoundError");
}

console.log("✓ constructor and toDicts tests passed!");



declare const process: any;
import { $df } from "../../src/index";

const data = [
    { name: "Alice", age: 30, is_active: 1, joined: "2026-05-20" },
    { name: "Bob", age: 25.4, is_active: 0, joined: new Date("2026-05-24") },
    { name: null, age: null, is_active: null, joined: null },
];

console.log("Input data for schema tests:");
console.table(data);

try {
    // 1. Test automatic schema inference
    const df = $df.data(data);
    const schema = df.get_schema();
    
    console.log("\nInferred Schema:");
    for (const [col, type] of Object.entries(schema)) {
        console.log(`Column "${col}": ${type.name}`);
    }

    // Assert inferred types
    if (schema.name.name !== "Utf8") throw new Error(`Expected name to be Utf8, got ${schema.name.name}`);
    if (schema.age.name !== "Float64") throw new Error(`Expected age to be Float64, got ${schema.age.name}`);
    if (schema.is_active.name !== "Int32") throw new Error(`Expected is_active to be Int32, got ${schema.is_active.name}`);
    if (schema.joined.name !== "Datetime") throw new Error(`Expected joined to be Datetime, got ${schema.joined.name}`);

    // 2. Test explicit schema coercion
    const explicitSchema = {
        name: $df.DataType.Utf8,
        age: $df.DataType.Int32, // coerce float string to int
        is_active: $df.DataType.Boolean, // coerce 1/0/null to boolean/null
        joined: $df.DataType.Datetime,
        missing_col: $df.DataType.Utf8 // will be null-padded
    };

    const dfCoerced = $df.data(data, explicitSchema);
    const coercedData = dfCoerced.to_dicts() as any[];
    
    console.log("\nCoerced Data (with Null Padding):");
    console.table(coercedData);

    // Assertions
    if (coercedData[0].age !== 30) throw new Error(`Expected age 30, got ${coercedData[0].age}`);
    if (coercedData[1].age !== 25) throw new Error(`Expected age 25, got ${coercedData[1].age}`); // Float 25.4 truncated to Int 25
    if (coercedData[0].is_active !== true) throw new Error(`Expected is_active true, got ${coercedData[0].is_active}`);
    if (coercedData[1].is_active !== false) throw new Error(`Expected is_active false, got ${coercedData[1].is_active}`);
    if (coercedData[2].is_active !== null) throw new Error(`Expected is_active null, got ${coercedData[2].is_active}`);
    if (coercedData[0].missing_col !== null) throw new Error(`Expected missing_col null, got ${coercedData[0].missing_col}`);

    // 3. Test List and Struct types coercion
    const complexData = [
        {
            tags: ["ts", "js"],
            info: { val: 10, label: "A" }
        },
        {
            tags: [100],
            info: { val: "20.5", label: "B" }
        }
    ];

    const complexSchema = {
        tags: $df.DataType.List($df.DataType.Utf8),
        info: $df.DataType.Struct({
            val: $df.DataType.Int32,
            label: $df.DataType.Utf8
        })
    };

    const dfComplex = $df.data(complexData, complexSchema);
    const complexResult = dfComplex.to_dicts() as any[];

    console.log("\nComplex List & Struct Coerced Result:");
    console.dir(complexResult, { depth: null });

    // Assert complex types
    if (complexResult[0].tags[0] !== "ts" || complexResult[0].tags[1] !== "js") throw new Error("List string coercion failed");
    if (complexResult[1].tags[0] !== "100") throw new Error("List element numeric-to-string coercion failed");
    if (complexResult[0].info.val !== 10) throw new Error("Struct field Int32 preserve failed");
    if (complexResult[1].info.val !== 20) throw new Error("Struct field String-to-Int32 coercion failed");
    if (complexResult[1].info.label !== "B") throw new Error("Struct field label string preserve failed");

    // 4. Test inferred schema TypedArray coercion
    const inferredDf = $df.data({
        age: [30, 25, 40],
        price: [10.5, 20.3, 30.1]
    });
    const inferredSchema = inferredDf.get_schema();
    if (inferredSchema.age.name !== "Int32") throw new Error(`Expected age schema to be Int32, got ${inferredSchema.age.name}`);
    if (inferredSchema.price.name !== "Float64") throw new Error(`Expected price schema to be Float64, got ${inferredSchema.price.name}`);
    
    // Check that underlying arrays were actually coerced to TypedArrays!
    const cols = (inferredDf as any)._columns;
    if (!(cols.age instanceof Int32Array)) throw new Error("Expected age column array to be instantiated as Int32Array");
    if (!(cols.price instanceof Float64Array)) throw new Error("Expected price column array to be instantiated as Float64Array");

    // 5. Test nested TypedArrays list type inference
    const listTypedArrayData = {
        nested_lists: [
            new Int32Array([1, 2]),
            new Int32Array([3, 4])
        ]
    };
    const listTypedArrayDf = $df.data(listTypedArrayData);
    const listTypedArraySchema = listTypedArrayDf.get_schema();
    if (listTypedArraySchema.nested_lists.name !== "List") throw new Error(`Expected nested_lists schema to be List, got ${listTypedArraySchema.nested_lists.name}`);
    if ((listTypedArraySchema.nested_lists as any).innerType.name !== "Int32") throw new Error(`Expected nested list inner type to be Int32, got ${(listTypedArraySchema.nested_lists as any).innerType.name}`);

    console.log("\n🎉 ALL SCHEMA AND DATATYPE TESTS PASSED!");
} catch (e) {
    console.error("\n❌ SCHEMA TESTS FAILED:", e);
    process.exit(1);
}

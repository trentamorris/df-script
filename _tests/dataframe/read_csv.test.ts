import { $df } from "../../src/index";
import { Int64, Utf8, Float64, Boolean as BoolType, Int32 } from "../../src/datatypes";

console.log("=========================================");
console.log("STARTING DATAFRAME CSV READ TESTS...");
console.log("=========================================");

try {
    const csvContent = `id,name,age,active,score
1,"Alice",30,true,95.5
2,"Bob",25,false,88.0
3,"Charlie",,1,NaN`;

    // 1. Test basic parsing and inference
    const df1 = $df.read_csv(csvContent);
    const schema1 = df1.schema;
    
    if (schema1.id !== Int64) throw new Error("ID inference failed");
    if (schema1.name !== Utf8) throw new Error("Name inference failed");
    if (schema1.age !== Int64) throw new Error(`Age inference failed: expected Int64, got ${schema1.age?.name}`);
    if (schema1.active !== BoolType) throw new Error("Active inference failed");
    if (schema1.score !== Float64) throw new Error("Score inference failed");
    
    const rows1 = df1.to_dicts();
    if (rows1[0].name !== "Alice") throw new Error("Row 0 name failed");
    if (rows1[2].age !== null) throw new Error("Row 2 age null failed");
    if (rows1[2].active !== true) throw new Error("Row 2 active '1'->true failed");
    if (rows1[2].score !== null) throw new Error("Row 2 score NaN->null failed");
    
    console.log("✓ Basic parsing and inference passed!");

    // 2. Test explicit schema
    const df2 = $df.read_csv(csvContent, {
        schema: {
            id: Int32,
            name: Utf8,
            age: Int32, // explicit int cast
            active: Int32, // active as int
            score: Utf8 // score as string
        }
    });
    const schema2 = df2.schema;
    if (schema2.id !== Int32) throw new Error("Explicit schema id failed");
    
    const rows2 = df2.to_dicts();
    if (rows2[2].active !== 1) throw new Error("Row 2 active explicit Int32 failed");
    if (rows2[0].score !== "95.5") throw new Error("Row 0 score explicit Utf8 failed");
    
    console.log("✓ Explicit schema coercion passed!");

    // 3. Test no headers
    const csvNoHeader = `1,"Alice",30\n2,"Bob",25`;
    const df3 = $df.read_csv(csvNoHeader, { hasHeader: false });
    
    if (df3.columns[0] !== "column_0" || df3.columns[2] !== "column_2") {
        throw new Error("No-header default names failed");
    }
    
    const rows3 = df3.to_dicts();
    if (rows3[0]["column_1"] !== "Alice") throw new Error("No-header row 0 failed");
    
    console.log("✓ No header parsing passed!");

    console.log("\n🎉 ALL DATAFRAME CSV READ TESTS PASSED SUCCESSFULLY!");
} catch (e: any) {
    console.error(`\n❌ DATAFRAME CSV READ TEST FAILED: ${e.message}`);
    process.exit(1);
}

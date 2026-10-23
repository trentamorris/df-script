declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.toStruct tests...");


const df = $df.data([
    { numbers: [10, 20, 30] },
    { numbers: null }
]);

const res = df.select([
    $df.col("numbers").arr.toStruct({ fields: ["a", "b", "c"] }).alias("st")
]).toDicts() as any[];

if (res[0].st.a !== 10 || res[0].st.b !== 20 || res[0].st.c !== 30) throw new Error("toStruct failed");
if (res[1].st !== null) throw new Error("null array toStruct failed");


console.log("✓ ArrayExpr.toStruct tests passed!");

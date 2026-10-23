declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.extractGroups tests...");


const df = $df.data([
    { code: "id:100-name:alice" },
    { code: null }
]);

const res = df.select([
    $df.col("code").str.extractGroups(/(?<id_key>id:\d+)-(?<name_key>name:\w+)/).alias("named")
]).toDicts() as any[];

if (res[0].named?.id_key !== "id:100" || res[0].named?.name_key !== "name:alice") throw new Error("extractGroups failed");
if (res[1].named !== null) throw new Error("extractGroups null failed");


console.log("✓ StringExpr.extractGroups tests passed!");

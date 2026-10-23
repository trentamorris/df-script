declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.jsonPathMatch tests...");


const df = $df.data({
    json_str: [
        '{"user": {"name": "Alice", "age": 30, "tags": ["admin", "dev"]}, "active": true}',
        '{"user": {"name": "Bob", "age": 25, "tags": ["user", "guest", "tester"]}, "active": false}',
        null
    ]
});

const res = df.select([
    $df.col("json_str").str.jsonPathMatch("$.user.name").alias("name"),
    $df.col("json_str").str.jsonPathMatch("$.user.age").alias("age"),
    $df.col("json_str").str.jsonPathMatch("$.user.tags[0]").alias("first_tag")
]).toDicts() as any[];

if (res[0].name !== "Alice" || res[0].age !== "30" || res[0].first_tag !== "admin") throw new Error("jsonPathMatch row 0 failed");
if (res[1].name !== "Bob") throw new Error("jsonPathMatch row 1 failed");
if (res[2].name !== null) throw new Error("jsonPathMatch null failed");


console.log("✓ StringExpr.jsonPathMatch tests passed!");

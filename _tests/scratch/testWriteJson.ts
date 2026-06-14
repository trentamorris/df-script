import { DataFrame } from "../../src/dataframe/dataframe";

const df = new DataFrame([{ a: 1n, b: new Set([1, 2]) }]);
console.log(df.write_json());

// Auto-generated static import runner for full browser test suite
console.log("=========================================");
console.log("RUNNING ALL DFSCRIPT PROJECT TESTS IN BROWSER...");
console.log("=========================================");

// 1. ColumnExpressions
import "./columnExpressions/mixins/arrayExpr/run_all.ts";
import "./columnExpressions/mixins/standardExpr/run_all.ts";
import "./columnExpressions/mixins/stringExpr/run_all.ts";
import "./columnExpressions/mixins/structExpr/run_all.ts";
import "./columnExpressions/mixins/temporalExpr/run_all.ts";
import "./columnExpressions/typeSelector.test.ts";
import "./columnExpressions/typeInference.test.ts";

// 2. DataFrames
import "./dataframe/run_all.ts";

// 3. Functions
import "./functions/all.test.ts";
import "./functions/coalesce.test.ts";
import "./functions/col.test.ts";
import "./functions/concat.test.ts";
import "./functions/data.test.ts";
import "./functions/duration.test.ts";
import "./functions/element.test.ts";
import "./functions/exclude.test.ts";
import "./functions/horizontal.test.ts";
import "./functions/implode.test.ts";
import "./functions/lit.test.ts";
import "./functions/readCsv.test.ts";
import "./functions/readJson.test.ts";
import "./functions/seqRange.test.ts";
import "./functions/struct.test.ts";
import "./functions/when.test.ts";

// 4. DataTypes
import "./datatypes/dataTypes.test.ts";
import "./exceptions/run_all.ts";

// 5. Utils
import "./utils/array/run_all.ts";
import "./utils/binary/run_all.ts";
import "./utils/csv/run_all.ts";
import "./utils/date/run_all.ts";
import "./utils/duration/run_all.ts";
import "./utils/json/run_all.ts";
import "./utils/number/run_all.ts";
import "./utils/object/run_all.ts";
import "./utils/string/run_all.ts";

console.log("=========================================");
console.log("🎉 ALL TESTS IN BROWSER SUITE FINISHED!");
console.log("=========================================");

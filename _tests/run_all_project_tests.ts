console.log("=========================================");
console.log("RUNNING ALL FRAMESCRIPT PROJECT TESTS...");
console.log("=========================================");

import "./columnExpressions/test_dt_expr";
import "./columnExpressions/test_list_expr";
import "./columnExpressions/test_str_expr";
import "./columnExpressions/test_window";
import "./columnExpressions/test_arithmetic_expr";
import "./columnExpressions/test_comparison_expr";
import "./columnExpressions/test_new_manipulations";
import "./columnExpressions/test_when_then";
import "./dataframe/run_all";
import "./datatypes/test_polars_types";
import "./utils/test_date_robustness";
import "./utils/test_types";
import "./utils/test_string";

console.log("=========================================");
console.log("🎉 ALL TESTS IN THE PROJECT PASSED SUCCESSFULLY!");
console.log("=========================================");

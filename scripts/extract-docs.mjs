/**
 * extract-docs.mjs
 *
 * Reads JSDoc comments from the df-script library source files recursively
 * and outputs a static, structured docs.json file grouped by file paths.
 *
 * Usage:
 *   node scripts/extract-docs.mjs
 *   node scripts/extract-docs.mjs --out ./docs.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, "../src");

// ─── JSDoc Tag Constants ──────────────────────────────────────────────────────
const TAG_PREFIX = "@";
const TAG_EXAMPLE = "@example";
const TAG_PARAM = "@param";
const TAG_RETURNS = "@returns";
const TAG_NAMESPACE = "@namespace";
const TAG_CATEGORY = "@category";
const TAG_SYNTAX = "@syntax";
const TAG_INTERNAL = "@internal";
const TAG_IGNORE = "@ignore";
const TAG_TYPEFILE = "@typefile";
const TAG_INTERNALFILE = "@internalfile";

// ─── Regexes to capture JSDoc comments followed by identifiers ────────────────

// Capture any JSDoc block + the immediate next declaration name (method, function, or class)
const JSDOC_BLOCK_REGEX = /\/\*\*([\s\S]*?)\*\/[\s\r\n]*?(?:(?:export|public|private|static|function|class|get|set)\s+|\*\s*)*([a-zA-Z0-9_$]+)/g;

// Regexes for specific tags
const PARAM_REGEX = new RegExp(`${TAG_PARAM}\\s+(?:\\{([^{}]*(?:\\{[^{}]*\\}[^{}]*)*)\\}\\s+)?([\\[\\]a-zA-Z0-9_$.?]+)\\s+(.*)`);
const RETURNS_REGEX = new RegExp(`${TAG_RETURNS}\\s+(.*)`);
const NAMESPACE_REGEX = new RegExp(`${TAG_NAMESPACE}\\s+([a-zA-Z0-9_$..]+)`);
const CATEGORY_REGEX = new RegExp(`${TAG_CATEGORY}\\s+([a-zA-Z0-9_$..]+)`);
const SYNTAX_REGEX = new RegExp(`${TAG_SYNTAX}\\s+(.+)`);

// ─── JSDoc Parser ────────────────────────────────────────────────────────────

function parseJSDocComment(comment) {
  let desc = "";
  let returns;
  const examplesList = [];
  const paramsList = [];

  const descLines = [];
  let currentExampleLines = [];
  let inExample = false;

  for (const rawLine of comment.split("\n")) {
    const line = rawLine.replace(/^\s*\*?\s?/, "");
    const trimmed = line.trim();

    if (trimmed.startsWith(TAG_PREFIX)) {
      if (inExample) {
        examplesList.push(currentExampleLines.join("\n").trimEnd());
        currentExampleLines = [];
        inExample = false;
      }
      if (trimmed.startsWith(TAG_EXAMPLE)) {
        inExample = true;
      } else if (trimmed.startsWith(TAG_PARAM)) {
        const m = trimmed.match(PARAM_REGEX);
        if (m) {
          const type = m[1] ? m[1].trim() : undefined;
          const name = m[2];
          const desc = m[3].trim();
          paramsList.push(type ? { name, type, desc } : { name, desc });
        }
      } else if (trimmed.startsWith(TAG_RETURNS)) {
        const m = trimmed.match(RETURNS_REGEX);
        if (m) returns = m[1].trim();
      }
    } else {
      if (inExample) {
        currentExampleLines.push(line);
      } else {
        descLines.push(trimmed);
      }
    }
  }

  if (inExample && currentExampleLines.length > 0) {
    examplesList.push(currentExampleLines.join("\n").trimEnd());
  }

  desc = descLines
    .reduce((acc, line) => {
      if (line === "") return acc + "\n\n";
      return acc ? (acc.endsWith("\n\n") ? acc + line : acc + " " + line) : line;
    }, "")
    .trim();

  return {
    desc,
    examples: examplesList.length > 0 ? examplesList : undefined,
    params: paramsList.length > 0 ? paramsList : undefined,
    returns
  };
}

function extractSignatureFromCode(rawContent, startIndex, symbolName, isGetter) {
  let parenDepth = 0;
  let braceDepth = 0;
  let angleDepth = 0;
  let inString = null; // Track string char: ", ', or `
  let isEscaped = false;
  let signature = isGetter ? "get " + symbolName : symbolName;

  let i = startIndex;
  while (i < rawContent.length && /\s/.test(rawContent[i])) i++;

  while (i < rawContent.length) {
    const char = rawContent[i];

    if (inString) {
      if (char === inString && !isEscaped) {
        inString = null; // String closed
      }
      isEscaped = char === "\\" && !isEscaped;
    } else {
      if (char === '"' || char === "'" || char === "`") {
        inString = char;
      } else if (char === "(") parenDepth++;
      else if (char === ")") parenDepth--;
      else if (char === "{") {
        if (parenDepth === 0 && angleDepth === 0 && braceDepth === 0) break;
        braceDepth++;
      } else if (char === "}") braceDepth--;
      else if (char === "<") angleDepth++;
      else if (char === ">") {
        if (angleDepth > 0) angleDepth--;
      }
      else if (char === ";" && parenDepth === 0 && braceDepth === 0) break;
    }

    signature += char;
    i++;
  }

  return signature.replace(/\s+/g, " ").trim();
}

// formatSignature: splits params onto individual lines and, when a function has a
// single config/options param with documented sub-properties, expands them inline.
function formatSignature(signatureStr, params) {
  const firstParen = signatureStr.indexOf("(");
  const lastParen = signatureStr.lastIndexOf(")");
  if (firstParen === -1 || lastParen === -1) {
    return signatureStr;
  }
  
  const prefix = signatureStr.substring(0, firstParen);
  const paramsStr = signatureStr.substring(firstParen + 1, lastParen);
  const suffix = signatureStr.substring(lastParen + 1);
  
  // Split top-level params from the raw signature
  const rawParams = [];
  let currentParam = "";
  let parenDepth = 0;
  let braceDepth = 0;
  let angleDepth = 0;
  
  for (let i = 0; i < paramsStr.length; i++) {
    const char = paramsStr[i];
    if (char === "(") parenDepth++;
    else if (char === ")") parenDepth--;
    else if (char === "{") braceDepth++;
    else if (char === "}") braceDepth--;
    else if (char === "<") angleDepth++;
    else if (char === ">") {
      if (angleDepth > 0) angleDepth--;
    }
    
    if (char === "," && parenDepth === 0 && braceDepth === 0 && angleDepth === 0) {
      rawParams.push(currentParam.trim());
      currentParam = "";
    } else {
      currentParam += char;
    }
  }
  if (currentParam.trim()) {
    rawParams.push(currentParam.trim());
  }
  
  if (rawParams.length === 0) {
    return `${prefix}()${suffix}`;
  }

  // Try to expand a config/options param using JSDoc sub-params
  const expandedParams = rawParams.map(p => {
    // 1. Check if the parameter is destructured (e.g. "{ a, b }: Type = {}")
    const destructuringMatch = p.match(/^\s*\{([\s\S]*)\}\s*:\s*([a-zA-Z0-9_$<>, ]+)\s*(?:=\s*([\s\S]*))?$/);
    if (destructuringMatch) {
      const fieldsStr = destructuringMatch[1].trim();
      const typeName = destructuringMatch[2].trim();
      const defaultValue = destructuringMatch[3] ? destructuringMatch[3].trim() : undefined;
      
      const fields = [];
      let currentField = "";
      let pDepth = 0;
      let bDepth = 0;
      for (let i = 0; i < fieldsStr.length; i++) {
        const char = fieldsStr[i];
        if (char === "(") pDepth++;
        else if (char === ")") pDepth--;
        else if (char === "{") bDepth++;
        else if (char === "}") bDepth--;
        
        if (char === "," && pDepth === 0 && bDepth === 0) {
          fields.push(currentField.trim());
          currentField = "";
        } else {
          currentField += char;
        }
      }
      if (currentField.trim()) {
        fields.push(currentField.trim());
      }

      const lines = fields.map(f => `    ${f}`);
      const defaultPart = defaultValue ? ` = ${defaultValue}` : "";
      return `  {\n${lines.join(",\n")}\n  }: ${typeName}${defaultPart}`;
    }

    // 2. Otherwise, check if we can expand a named config object parameter using JSDoc sub-params
    let namePart = p;
    let typePart = "";
    
    const lastColon = p.lastIndexOf(":");
    if (lastColon !== -1) {
      namePart = p.substring(0, lastColon).trim();
      typePart = p.substring(lastColon + 1).trim();
    }

    let cleanType = typePart.split("=")[0].trim();
    let isOptionalParam = namePart.endsWith("?") || typePart.includes("=");
    let paramName = namePart.replace(/\?$/, "").trim();

    if (!paramName || !cleanType || !params) return "  " + p;

    // Collect documented sub-params for this param name (e.g. config.on, config.values)
    const subParams = params.filter(pr => {
      const cleanName = pr.name.replace(/^\[|\]$/g, ""); // strip optional brackets
      return cleanName.startsWith(paramName + ".");
    });

    if (subParams.length === 0) return "  " + p;

    const lines = subParams.map(sp => {
      const cleanName = sp.name.replace(/^\[|\]$/g, "");
      const propName = cleanName.slice(paramName.length + 1); // strip "config."
      const isOptional = sp.name.startsWith("[");
      const typePart = sp.type ? `: ${sp.type}` : "";
      return `    ${propName}${isOptional ? "?" : ""}${typePart}`;
    });

    return `  ${paramName}${isOptionalParam ? "?" : ""}: {\n${lines.join(",\n")}\n  }`;
  });
  
  return `${prefix}(\n${expandedParams.join(",\n")}\n)${suffix}`;
}

// ─── Recursive Directory Walker ──────────────────────────────────────────────

function getSourceFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getSourceFiles(filePath));
    } else if (file.endsWith(".ts") && !file.endsWith(".d.ts")) {
      results.push(filePath);
    }
  }
  return results;
}

// ─── Pure Raw Extraction ─────────────────────────────────────────────────────

function extractRawDocs() {
  const docs = {};
  const sourceFiles = getSourceFiles(srcDir);

  for (const filePath of sourceFiles) {
    const rawContent = fs.readFileSync(filePath, "utf-8");

    // Skip pure type definition files (@typefile) or internal utility files (@internalfile)
    if (rawContent.includes(TAG_TYPEFILE) || rawContent.includes(TAG_INTERNALFILE)) {
      continue;
    }

    // Normalize path to relative format with forward slashes for cross-platform stability
    const relativePath = path.relative(srcDir, filePath).replace(/\\/g, "/");

    let fileDocs = null;
    let match;

    // Scan the raw file content for an `@namespace <value>` tag in any JSDoc block
    const namespaceMatch = rawContent.match(NAMESPACE_REGEX);
    const fileNamespace = namespaceMatch ? namespaceMatch[1].trim() : null;

    // Scan for `@category <value>`
    const categoryMatch = rawContent.match(CATEGORY_REGEX);
    const fileCategory = categoryMatch ? categoryMatch[1].trim() : "ColumnExpression";

    // Scan for `@syntax <template>`
    const syntaxMatch = rawContent.match(SYNTAX_REGEX);
    const fileSyntaxTemplate = syntaxMatch ? syntaxMatch[1].trim() : null;

    JSDOC_BLOCK_REGEX.lastIndex = 0;
    while ((match = JSDOC_BLOCK_REGEX.exec(rawContent)) !== null) {
      const comment = match[1];
      const symbolName = match[2];

      // Skip internal functions marked with @internal or @ignore, or constructor / leading underscore symbols
      if (comment.includes(TAG_INTERNAL) || comment.includes(TAG_IGNORE) || symbolName.startsWith("_") || symbolName === "constructor") {
        continue;
      }

      const parsed = parseJSDocComment(comment);

      // Parse @namespace from the individual JSDoc if overridden, otherwise use file-level namespace
      let symbolNamespace = fileNamespace;
      const localNamespaceMatch = comment.match(NAMESPACE_REGEX);
      if (localNamespaceMatch) {
        symbolNamespace = localNamespaceMatch[1].trim();
      }

      if (symbolNamespace) {
        parsed.namespace = symbolNamespace;
      }

      // Parse @category from the individual JSDoc if overridden, otherwise use file-level category
      let symbolCategory = fileCategory;
      const localCategoryMatch = comment.match(CATEGORY_REGEX);
      if (localCategoryMatch) {
        symbolCategory = localCategoryMatch[1].trim();
      }
      parsed.category = symbolCategory;

      // Parse @syntax from the individual JSDoc if overridden, otherwise use file-level syntax template
      let symbolSyntax = null;
      const localSyntaxMatch = comment.match(SYNTAX_REGEX);
      if (localSyntaxMatch) {
        symbolSyntax = localSyntaxMatch[1].trim().replace("{symbol}", symbolName);
      } else if (fileSyntaxTemplate) {
        symbolSyntax = fileSyntaxTemplate.replace("{symbol}", symbolName);
      } else {
        symbolSyntax = `$df.col(<column_name>).${symbolName}(...)`;
      }
      parsed.syntax = symbolSyntax;

      const afterComment = match[0].substring(match[0].lastIndexOf("*/") + 2);
      const isGetter = /\bget\b/.test(afterComment);
      const rawSignature = extractSignatureFromCode(rawContent, JSDOC_BLOCK_REGEX.lastIndex, symbolName, isGetter);
      const formattedSignature = formatSignature(rawSignature, parsed.params);

      const symbolIndex = symbolSyntax.indexOf(symbolName);
      const callerPrefix = symbolIndex !== -1 ? symbolSyntax.substring(0, symbolIndex) : "";
      parsed.signature = callerPrefix + formattedSignature;

      // If we successfully parsed JSDoc details, add them
      if (parsed.desc || parsed.params || parsed.returns || parsed.examples) {
        if (!fileDocs) {
          fileDocs = {};
        }
        fileDocs[symbolName] = parsed;
      }
    }

    if (fileDocs) {
      docs[relativePath] = fileDocs;
    }
  }

  return docs;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const outArg = process.argv.indexOf("--out");
const outPath = outArg !== -1
  ? path.resolve(process.argv[outArg + 1])
  : path.resolve(__dirname, "../docs.json");

console.log("Extracting raw docs recursively from source files...");
const docs = extractRawDocs();
const fileCount = Object.keys(docs).length;
const symbolCount = Object.values(docs).reduce((acc, f) => acc + Object.keys(f).length, 0);

console.log(`  Found JSDocs in ${fileCount} files containing ${symbolCount} documented symbols.`);

fs.writeFileSync(outPath, JSON.stringify(docs, null, 2), "utf-8");
console.log(`  Written to: ${outPath}`);
console.log("Done.");

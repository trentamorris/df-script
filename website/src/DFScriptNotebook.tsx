import React, { useState, useEffect, useRef } from "react";
import { $df, DataFrame } from "../../src/index";
import Editor from "@monaco-editor/react";
import { marked } from "marked";

// Standard bold play triangle icon
const RunIcon = ({ className }: { className?: string }) => (
  <svg className={`w-5.5 h-5.5 transition-colors ${className}`} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="8,5 19,12 8,19" />
  </svg>
);

// VS Code style checkmark icon for markdown cells
const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={`transition-colors ${className || "w-5.5 h-5.5"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const RunAllIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    {/* Left overlapping play triangle */}
    <path d="M4 5l9 7-9 7V5z" fill="currentColor" stroke="none" />
    {/* Right overlapping play triangle */}
    <path d="M12 5l9 7-9 7V5z" fill="currentColor" stroke="none" />
  </svg>
);

const AddIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const ClearIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ResetIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
  </svg>
);

const SaveIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const LoadIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const UpIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
  </svg>
);

const DownIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const DeleteIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const ExpandIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const CollapseIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

// Collapse/Expand Eye Toggles for input folding
const EyeOpenIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeClosedIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L1.54 1.54m1.907 4.933A10.07 10.07 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21.3 21.3" />
  </svg>
);

const DOMNodeRenderer = ({ node }: { node: HTMLElement | SVGElement }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = "";
      ref.current.appendChild(node);
    }
  }, [node]);
  return <div ref={ref} className="w-full h-full overflow-auto" />;
};

function DataFrameGrid({ df }: { df: DataFrame }) {
  const cols = df.columns;
  const schema = df.get_schema();
  const rows = df.to_dicts() as any[];

  // Output Truncation: Show first 100 rows maximum to preserve browser memory
  const maxRows = 100;
  const isTruncated = rows.length > maxRows;
  const displayedRows = isTruncated ? rows.slice(0, maxRows) : rows;

  const getTypeBadgeClass = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("int") || n.includes("float") || n.includes("num")) return "text-emerald-400 border-emerald-950/30 bg-emerald-950/10";
    if (n.includes("str") || n.includes("char") || n.includes("text")) return "text-sky-400 border-sky-950/30 bg-sky-950/10";
    if (n.includes("bool")) return "text-amber-400 border-amber-950/30 bg-amber-950/10";
    if (n.includes("date") || n.includes("time")) return "text-purple-400 border-purple-950/30 bg-purple-950/10";
    return "text-[#9c9c9c] border-[#1e1e1e] bg-[#161616]";
  };

  return (
    <div className="overflow-x-auto select-text w-full max-h-[350px]">
      <table className="w-full text-left border-collapse text-[10px] font-mono leading-relaxed">
        <thead>
          <tr className="border-b border-[#1e1e1e] bg-[#0c0c0c] sticky top-0 z-10">
            {cols.map((colName) => {
              const typeStr = schema[colName]?.name || "Unknown";
              return (
                <th key={colName} className="p-2 border-r border-[#1e1e1e]/60 min-w-[80px] bg-[#0c0c0c] select-none">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[#e5e5e5]">{colName}</span>
                    <span className={`inline-block text-[7px] font-bold px-1 rounded border self-start ${getTypeBadgeClass(typeStr)}`}>
                      {typeStr.toLowerCase()}
                    </span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {displayedRows.length === 0 ? (
            <tr>
              <td colSpan={cols.length} className="p-6 text-center text-[#5c5c5c] uppercase select-none">
                EMPTY DATAFRAME (0 ROWS)
              </td>
            </tr>
          ) : (
            displayedRows.map((row, rIdx) => (
              <tr key={rIdx} className="border-b border-[#1e1e1e]/40 hover:bg-[#111]/30">
                {cols.map((colName) => {
                  const val = row[colName];
                  return (
                    <td key={colName} className="p-2 border-r border-[#1e1e1e]/40 text-[#9c9c9c] truncate max-w-[180px]">
                      {val === null ? (
                        <span className="text-[#5c5c5c] italic select-none">null</span>
                      ) : typeof val === "object" ? (
                        JSON.stringify(val)
                      ) : (
                        String(val)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {isTruncated && (
        <div className="border-t border-[#1e1e1e]/60 p-2.5 text-center text-[9px] font-mono text-[#5c5c5c] select-none bg-[#0c0c0c] sticky bottom-0 uppercase tracking-wide">
          Showing first {maxRows} of {rows.length} rows (Output truncated to preserve browser memory)
        </div>
      )}
    </div>
  );
}

// Robust markdown parser using the industry-standard 'marked' library
const renderMarkdown = (text: string) => {
  if (!text.trim()) {
    return <p className="text-xs text-[#5c5c5c] italic select-none">Empty markdown cell. Click to edit.</p>;
  }

  try {
    const rawHtml = marked.parse(text, {
      gfm: true,
      breaks: true
    });
    
    const htmlString = typeof rawHtml === "string" ? rawHtml : "";

    return (
      <div 
        className="prose prose-invert max-w-none select-text p-1 text-xs text-[#9c9c9c] leading-relaxed [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-white [&_h3]:mt-2 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:text-xs [&_li]:text-[#9c9c9c] [&_p]:mb-1.5 [&_pre]:bg-[#070707] [&_pre]:border [&_pre]:border-[#1e1e1e] [&_pre]:p-2.5 [&_pre]:rounded [&_pre]:text-[10px] [&_pre]:font-mono [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:text-[#e5e5e5] [&_code]:bg-[#161616] [&_code]:border [&_code]:border-[#2c2c2c] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[10px] [&_code]:font-mono [&_code]:text-emerald-400" 
        dangerouslySetInnerHTML={{ __html: htmlString }} 
      />
    );
  } catch (e) {
    return <p className="text-xs text-rose-400">Failed to render markdown: {String(e)}</p>;
  }
};

// Dotted line hover component to add a cell at specific position (Jupyter style)
function CellInsertZone({ index, onAdd }: { index: number; onAdd: (type: "code" | "jsx" | "markdown") => void }) {
  return (
    <div className="relative h-6 group flex items-center justify-center -my-3 z-30 select-none">
      {/* Horizontal dotted guide line */}
      <div className="absolute inset-x-0 h-[1px] border-t border-dashed border-[#222222]/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
      
      {/* Dynamic insert options popup container */}
      <div className="opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-200 flex items-center gap-1.5 bg-[#060606] px-3 py-1 rounded-full border border-[#1e1e1e] shadow-lg">
        <button
          onClick={() => onAdd("code")}
          className="px-2 py-0.5 text-[9px] font-mono tracking-wider font-semibold bg-[#161616] hover:bg-[#222] text-[#9c9c9c] hover:text-white rounded border border-[#2c2c2c] cursor-pointer transition-colors"
        >
          + Code
        </button>
        <button
          onClick={() => onAdd("jsx")}
          className="px-2 py-0.5 text-[9px] font-mono tracking-wider font-semibold bg-[#161616] hover:bg-[#222] text-[#9c9c9c] hover:text-white rounded border border-[#2c2c2c] cursor-pointer transition-colors"
        >
          + JSX
        </button>
        <button
          onClick={() => onAdd("markdown")}
          className="px-2 py-0.5 text-[9px] font-mono tracking-wider font-semibold bg-[#161616] hover:bg-[#222] text-[#9c9c9c] hover:text-white rounded border border-[#2c2c2c] cursor-pointer transition-colors"
        >
          + Markdown
        </button>
      </div>
    </div>
  );
}

interface CellState {
  id: string;
  type: "code" | "markdown" | "jsx";
  code: string; // contains the text (code or markdown content)
  output: any; // The evaluated return value
  error: string | null;
  timeTaken: string | null;
  execIndex: number | null;
  logs?: string[]; // captured console.log messages
  metadata?: Record<string, any>; // cell metadata config
  isCodeCollapsed?: boolean;
  isOutputCollapsed?: boolean;
}

const WELCOME_NOTEBOOK: CellState[] = [
  {
    id: "cell-intro",
    type: "markdown",
    code: `# DFScript Notebook Workspace
Welcome to your interactive notebook workspace! 
* Run cells using the **YouTube-style play buttons** in the left margin.
* Alignments and spacing visual guides are synced natively.
* Double-click any Markdown cell to edit, and run it to render.
* Hover between cells to insert new **Code** or **Markdown** components!`,
    output: null,
    error: null,
    timeTaken: null,
    execIndex: null,
    logs: [],
    metadata: {},
    isCodeCollapsed: true,
    isOutputCollapsed: false
  },
  {
    id: "cell-1",
    type: "code",
    code: `// 1. Let's create our initial dataset using $df.data()
console.log("Initializing dataset 'sales'...");
const sales = $df.data({
  userId: ["usr-1", "usr-2", "usr-1", "usr-3", "usr-2"],
  price: [120, 450, 80, 200, 310],
  amount: [2, 1, 5, 2, 3],
  category: ["Books", "Electronics", "Books", "Toys", "Electronics"]
});

console.log("Success! 'sales' created with height:", sales.height);
sales`,
    output: null,
    error: null,
    timeTaken: null,
    execIndex: null,
    logs: [],
    metadata: {},
    isCodeCollapsed: false,
    isOutputCollapsed: false
  },
  {
    id: "cell-2",
    type: "code",
    code: `// 2. We can perform column expression math to calculate order value
const salesWithTotal = sales.with_columns(
  ($df.col("price").mul($df.col("amount"))).alias("total")
);

salesWithTotal`,
    output: null,
    error: null,
    timeTaken: null,
    execIndex: null,
    logs: [],
    metadata: {},
    isCodeCollapsed: false,
    isOutputCollapsed: false
  },
  {
    id: "cell-3",
    type: "code",
    code: `// 3. Next, aggregate total sales and average price by category
const summary = salesWithTotal
  .groupby("category")
  .agg([
    $df.col("total").sum().alias("categoryTotal"),
    $df.col("price").mean().alias("avgPrice")
  ]);

summary`,
    output: null,
    error: null,
    timeTaken: null,
    execIndex: null,
    logs: [],
    metadata: {},
    isCodeCollapsed: false,
    isOutputCollapsed: false
  }
];

export default function DFScriptNotebook() {
  const [notebookName, setNotebookName] = useState("untitled_notebook.dfnb");
  const [isEditingName, setIsEditingName] = useState(false);
  const [cells, setCells] = useState<CellState[]>(WELCOME_NOTEBOOK);
  const [activeCellId, setActiveCellId] = useState<string | null>(null);
  const [copiedCellId, setCopiedCellId] = useState<string | null>(null);
  const [copiedCellCodeId, setCopiedCellCodeId] = useState<string | null>(null);
  
  const nextExecIndexRef = useRef(1);
  const sharedStateRef = useRef<Record<string, any>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const babelRef = useRef<any>(null);
  const [isBabelLoading, setIsBabelLoading] = useState(false);

  const loadBabel = async () => {
    if (babelRef.current) return babelRef.current;
    setIsBabelLoading(true);
    try {
      // @ts-ignore
      const module = await import("https://esm.sh/@babel/standalone");
      babelRef.current = module.default || module;
      return babelRef.current;
    } catch (e) {
      console.error("Failed to load Babel: ", e);
      throw new Error("Failed to load Babel standalone transpiler from CDN. Please check your internet connection.");
    } finally {
      setIsBabelLoading(false);
    }
  };

  // Set up custom dark theme matching the app theme background (#060606 / #0c0c0c)
  const handleEditorWillMount = (monaco: any) => {
    monaco.editor.defineTheme("dfnb-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#070707",
        "editor.lineHighlightBackground": "#0c0c0c",
        "editorGutter.background": "#070707"
      }
    });
  };

  const extractDeclaredVars = (code: string) => {
    const vars: string[] = [];
    const regex = /(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=|function\s+([a-zA-Z_$][\w$]*)\s*\(/g;
    let match;
    while ((match = regex.exec(code)) !== null) {
      const name = match[1] || match[2];
      if (name && !vars.includes(name)) {
        vars.push(name);
      }
    }
    return vars;
  };

  const runCell = async (cellId: string) => {
    const cellIndex = cells.findIndex(c => c.id === cellId);
    if (cellIndex === -1) return;

    const cell = cells[cellIndex];

    if (cell.type === "markdown") {
      // Toggle preview mode for Markdown cell
      setCells(prev => prev.map(c => c.id === cellId ? { ...c, isCodeCollapsed: true } : c));
      return;
    }

    const code = cell.code.trim();
    if (!code) return;

    // Set cell to running state visually
    setCells(prev => prev.map(c => c.id === cellId ? { ...c, execIndex: null, error: null, timeTaken: "..." } : c));

    // Wait slightly to let the UI update
    await new Promise(resolve => setTimeout(resolve, 50));

    const t0 = performance.now();
    const cellLogs: string[] = [];
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

    const collectLog = (...args: any[]) => {
      originalLog(...args);
      const msg = args.map(arg => {
        if (arg === null) return "null";
        if (arg === undefined) return "undefined";
        if (typeof arg === "object") {
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(" ");
      cellLogs.push(msg);
    };

    console.log = collectLog;
    console.warn = collectLog;
    console.error = collectLog;
    console.info = collectLog;

    try {
      let finalJSCode = code;

      // If it's JSX, compile via dynamic Babel standalone loaded from CDN
      if (cell.type === "jsx") {
        let babel;
        try {
          babel = await loadBabel();
        } catch (babelErr: any) {
          throw babelErr;
        }

        const transpiled = babel.transform(code, {
          presets: [["react", { runtime: "classic" }]],
          compact: true,
          filename: "cell.tsx"
        }).code || "";
        finalJSCode = transpiled;
      }

      const declaredVars = extractDeclaredVars(code);
      const filteredKeys = Object.keys(sharedStateRef.current).filter(k => !declaredVars.includes(k));
      const filteredVals = filteredKeys.map(k => sharedStateRef.current[k]);

      let bodyCode = "";
      if (cell.type === "jsx") {
        // Wrap JSX code in a dynamic React component block to permit state hooks
        const lines = finalJSCode.split("\n");
        let lastLine = "";
        let lastLineIndex = -1;
        for (let i = lines.length - 1; i >= 0; i--) {
          if (lines[i].trim() && !lines[i].trim().startsWith("//") && !lines[i].trim().startsWith("/*")) {
            lastLine = lines[i].trim();
            lastLineIndex = i;
            break;
          }
        }

        let componentBody = "";
        if (lastLine && !/^(const|let|var|function|class|return|if|for|while|try|import|throw)\b/.test(lastLine)) {
          const cleanLastLine = lastLine.endsWith(";") ? lastLine.slice(0, -1) : lastLine;
          const prefix = lines.slice(0, lastLineIndex).join("\n");
          componentBody = `
            ${prefix}
            return (${cleanLastLine});
          `;
        } else {
          componentBody = `
            ${finalJSCode}
          `;
        }

        bodyCode = `
          const CellComponent = () => {
            try {
              ${componentBody}
            } catch (innerErr) {
              return React.createElement("div", { className: "text-rose-500 font-mono text-xs p-2 bg-rose-950/10 border border-rose-900/30 rounded" }, "Render Error: " + innerErr.message);
            }
          };
          return {
            _returnValue: React.createElement(CellComponent, null),
            ${declaredVars.map(v => `${v}: typeof ${v} !== 'undefined' ? ${v} : undefined`).join(',\n')}
          };
        `;
      } else {
        // Standard JS cell wrapping logic
        const lines = finalJSCode.split("\n");
        let lastLine = "";
        let lastLineIndex = -1;
        for (let i = lines.length - 1; i >= 0; i--) {
          if (lines[i].trim() && !lines[i].trim().startsWith("//") && !lines[i].trim().startsWith("/*")) {
            lastLine = lines[i].trim();
            lastLineIndex = i;
            break;
          }
        }

        if (lastLine && !/^(const|let|var|function|class|return|if|for|while|try|import|throw)\b/.test(lastLine)) {
          const cleanLastLine = lastLine.endsWith(";") ? lastLine.slice(0, -1) : lastLine;
          const prefix = lines.slice(0, lastLineIndex).join("\n");
          bodyCode = `
            ${prefix}
            const _cell_result = (${cleanLastLine});
            return {
              _returnValue: _cell_result,
              ${declaredVars.map(v => `${v}: typeof ${v} !== 'undefined' ? ${v} : undefined`).join(',\n')}
            };
          `;
        } else {
          bodyCode = `
            ${finalJSCode}
            return {
              _returnValue: undefined,
              ${declaredVars.map(v => `${v}: typeof ${v} !== 'undefined' ? ${v} : undefined`).join(',\n')}
            };
          `;
        }
      }

      // Map standard React hooks + HTML helper in the eval scope context
      const htmlHelper = (str: string) => ({ toHTML: () => str });
      const hookKeys = ["useState", "useEffect", "useRef", "useMemo", "useCallback", "useContext", "html"];
      const hookVals = [React.useState, React.useEffect, React.useRef, React.useMemo, React.useCallback, React.useContext, htmlHelper];

      // Assign html helper to $df runtime
      ($df as any).html = htmlHelper;

      // Construct AsyncFunction to support top level await!
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const fn = new AsyncFunction("$df", "React", ...hookKeys, ...filteredKeys, bodyCode);
      const execRes = await fn($df, React, ...hookVals, ...filteredVals);
      const elapsed = performance.now() - t0;

      let outputVal = undefined;
      if (execRes) {
        outputVal = execRes._returnValue;
        for (const key of Object.keys(execRes)) {
          if (key !== "_returnValue") {
            sharedStateRef.current[key] = execRes[key];
          }
        }
      }

      const runNum = nextExecIndexRef.current++;
      setCells(prev => prev.map(c => c.id === cellId ? {
        ...c,
        output: outputVal,
        error: null,
        timeTaken: `${elapsed.toFixed(2)}ms`,
        execIndex: runNum,
        logs: cellLogs
      } : c));
    } catch (err: any) {
      const elapsed = performance.now() - t0;
      setCells(prev => prev.map(c => c.id === cellId ? {
        ...c,
        output: null,
        error: err?.message || String(err),
        timeTaken: `${elapsed.toFixed(2)}ms`,
        execIndex: nextExecIndexRef.current++,
        logs: cellLogs
      } : c));
    } finally {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      console.info = originalInfo;
    }
  };

  const runAllCells = () => {
    // Reset shared state and next exec index for clean sequential run
    sharedStateRef.current = {};
    nextExecIndexRef.current = 1;

    let chain = Promise.resolve();
    cells.forEach((cell) => {
      chain = chain.then(() => {
        if (cell.type === "code" || cell.type === "jsx") {
          return runCell(cell.id);
        } else {
          // Fold markdown
          setCells(prev => prev.map(c => c.id === cell.id ? { ...c, isCodeCollapsed: true } : c));
          return Promise.resolve();
        }
      });
    });
  };

  const addCellAtIndex = (index: number, type: "code" | "jsx" | "markdown") => {
    const newId = `cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let initialCode = "";
    if (type === "markdown") {
      initialCode = "## Double-click to edit Markdown\n* Bullet point 1\n* Bullet point 2";
    } else if (type === "jsx") {
      initialCode = `// JSX Cells let you render interactive React components natively!
const [count, setCount] = useState(0);

<div className="flex flex-col gap-3 items-start font-sans">
  <h4 className="text-sm font-semibold text-emerald-400">JSX Live Component Output</h4>
  <p className="text-xs text-[#9c9c9c]">This is a fully reactive cell rendering directly inside the virtual DOM!</p>
  <button 
    onClick={() => setCount(count + 1)}
    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all text-black font-mono text-xs rounded font-bold cursor-pointer"
  >
    Clicked: {count} times
  </button>
</div>`;
    }

    const newCell: CellState = {
      id: newId,
      type,
      code: initialCode,
      output: null,
      error: null,
      timeTaken: null,
      execIndex: null,
      isCodeCollapsed: false,
      isOutputCollapsed: false
    };
    setCells(prev => {
      const copy = [...prev];
      copy.splice(index, 0, newCell);
      return copy;
    });
    setActiveCellId(newId);
  };

  const addCell = () => {
    addCellAtIndex(cells.length, "code");
  };

  const deleteCell = (id: string) => {
    setCells(prev => prev.filter(c => c.id !== id));
    if (activeCellId === id) {
      setActiveCellId(null);
    }
  };

  const moveCellUp = (index: number) => {
    if (index === 0) return;
    setCells(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  const moveCellDown = (index: number) => {
    if (index === cells.length - 1) return;
    setCells(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  const toggleCodeCollapse = (id: string) => {
    setCells(prev => prev.map(c => c.id === id ? { ...c, isCodeCollapsed: !c.isCodeCollapsed } : c));
  };

  const toggleOutputCollapse = (id: string) => {
    setCells(prev => prev.map(c => c.id === id ? { ...c, isOutputCollapsed: !c.isOutputCollapsed } : c));
  };

  const clearOutputs = () => {
    setCells(prev => prev.map(c => ({
      ...c,
      output: null,
      error: null,
      timeTaken: null,
      execIndex: null,
      logs: []
    })));
  };

  const resetNotebook = () => {
    if (window.confirm("Are you sure you want to reset the notebook? This will clear all cells and reset code context.")) {
      sharedStateRef.current = {};
      nextExecIndexRef.current = 1;
      setCells([
        {
          id: `cell-${Date.now()}`,
          type: "code",
          code: "",
          output: null,
          error: null,
          timeTaken: null,
          execIndex: null,
          isCodeCollapsed: false,
          isOutputCollapsed: false
        }
      ]);
    }
  };

  const saveNotebook = () => {
    const dataStr = JSON.stringify({ name: notebookName, cells }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = notebookName.endsWith(".dfnb") ? notebookName : `${notebookName}.dfnb`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const triggerLoadNotebook = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.cells)) {
          setNotebookName(parsed.name || file.name);
          setCells(parsed.cells);
          sharedStateRef.current = {};
          nextExecIndexRef.current = 1;
        } else {
          alert("Invalid notebook format. Ensure it contains a valid cells list.");
        }
      } catch (err) {
        alert("Failed to parse notebook file.");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // clear
  };

  const updateCellCode = (id: string, newCode: string) => {
    setCells(prev => prev.map(c => c.id === id ? { ...c, code: newCode } : c));
  };

  const renderCellOutput = (cell: CellState) => {
    if (cell.type === "markdown") return null;

    if (cell.isOutputCollapsed) {
      return (
        <div className="mt-3 flex items-center justify-between border border-[#1e1e1e]/40 bg-[#0c0c0c]/30 px-3 py-2 rounded text-[10px] font-mono text-[#5c5c5c] select-none">
          <span>Output collapsed ({cell.error ? "Execution Error" : (cell.output instanceof DataFrame ? "DataFrame Object" : "Raw Value")})</span>
          <button
            onClick={() => toggleOutputCollapse(cell.id)}
            className="text-[#9c9c9c] hover:text-[#ffffff] cursor-pointer"
          >
            <ExpandIcon />
          </button>
        </div>
      );
    }

    if (cell.timeTaken === "...") {
      return (
        <div className="mt-3 flex items-center gap-2 text-xs font-mono text-[#5c5c5c]">
          <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          evaluating...
        </div>
      );
    }

    const hasLogs = cell.logs && cell.logs.length > 0;
    const hasError = !!cell.error;
    const hasValue = cell.output !== undefined && cell.output !== null;

    if (!hasLogs && !hasError && !hasValue) return null;

    return (
      <div className="flex flex-col gap-3 relative animate-fade-in">
        {/* Collapse button for the whole output group */}
        <button
          onClick={() => toggleOutputCollapse(cell.id)}
          className="absolute top-0 right-1 text-[#5c5c5c] hover:text-[#ffffff] cursor-pointer select-none z-20"
          title="Collapse Output"
        >
          <CollapseIcon />
        </button>

        {/* 1. Render Console Logs if present */}
        {hasLogs && (
          <div className="mt-3 border border-[#1e1e1e]/40 bg-[#070707] text-[#8c8c8c] p-3 rounded font-mono text-[10px] select-text whitespace-pre overflow-x-auto leading-relaxed border-l-[3px] border-l-[#444444]">
            <div className="text-[8px] text-[#5c5c5c] font-bold uppercase tracking-wider mb-1 select-none">Console Output</div>
            {cell.logs!.join("\n")}
          </div>
        )}

        {/* 2. Render Error if present */}
        {hasError && (
          <div className={`border border-rose-950/40 bg-rose-950/10 text-rose-400 p-3 rounded font-mono text-xs select-text leading-relaxed relative ${hasLogs ? "" : "mt-3"}`}>
            <div className="flex justify-between items-start mb-1 select-none">
              <span className="font-bold uppercase tracking-wider text-[10px] text-rose-500 block">Execution Error</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(cell.error || "");
                  setCopiedCellId(cell.id);
                  setTimeout(() => setCopiedCellId(null), 1500);
                }}
                className="text-[9px] font-mono tracking-widest bg-transparent hover:bg-rose-900/30 text-rose-400/70 hover:text-rose-300 border border-rose-900/30 px-1.5 py-0.5 rounded cursor-pointer transition-all uppercase font-semibold"
                title="Copy Error Message"
              >
                {copiedCellId === cell.id ? "Copied!" : "Copy"}
              </button>
            </div>
            {cell.error}
          </div>
        )}

        {/* 3. Render Return Value if present */}
        {!hasError && hasValue && (() => {
          const val = cell.output;
          if (val instanceof DataFrame) {
            const shapeStr = `${val.height} Rows × ${val.columns.length} Cols`;
            return (
              <div className={`flex flex-col gap-2 ${hasLogs ? "" : "mt-3"}`}>
                <div className="flex justify-between items-center text-[10px] font-mono text-[#5c5c5c] select-none pr-8">
                  <span>DATAFRAME OBJECT</span>
                  <span>{shapeStr}</span>
                </div>
                <div className="border border-[#1e1e1e] rounded bg-[#0c0c0c] overflow-hidden select-text">
                  <DataFrameGrid df={val} />
                </div>
              </div>
            );
          }
          
          // Check for HTML DOM elements directly
          if (val instanceof HTMLElement || val instanceof SVGElement) {
            return (
              <div className={`p-3 border border-[#1e1e1e] bg-[#070707] rounded ${hasLogs ? "" : "mt-3"}`}>
                <DOMNodeRenderer node={val} />
              </div>
            );
          }

          // Check for custom toHTML interface (plots/helper outputs)
          if (val && typeof val.toHTML === "function") {
            try {
              const htmlStr = val.toHTML();
              return (
                <div 
                  className={`p-3 border border-[#1e1e1e] bg-[#070707] rounded ${hasLogs ? "" : "mt-3"}`}
                  dangerouslySetInnerHTML={{ __html: htmlStr }}
                />
              );
            } catch (e) {
              console.error("toHTML failed:", e);
            }
          }

          // Check for live React Element/JSX output
          if (React.isValidElement(val)) {
            return (
              <div className={`p-3 border border-[#1e1e1e] bg-[#070707] rounded ${hasLogs ? "" : "mt-3"}`}>
                {val}
              </div>
            );
          }

          // Default formatting for other values
          let displayStr = "";
          if (typeof val === "object") {
            try {
              displayStr = JSON.stringify(val, null, 2);
            } catch (e) {
              displayStr = String(val);
            }
          } else {
            displayStr = String(val);
          }

          return (
            <div className={`border border-[#1e1e1e] bg-[#070707] text-[#e5e5e5] p-3 rounded font-mono text-xs select-text whitespace-pre overflow-x-auto leading-relaxed max-h-[300px] ${hasLogs ? "" : "mt-3"}`}>
              {displayStr}
            </div>
          );
        })()}
      </div>
    );
  };

  return (
    <div className="flex-grow h-full overflow-y-auto bg-[#060606] flex flex-col min-w-0 select-text animate-fade-in">
      
      {/* Sticky Notebook Name and Global Toolbar */}
      <div className="sticky top-0 bg-[#060606]/95 backdrop-blur-md z-30 border-b border-[#1a1a1a] shadow-lg w-full flex justify-center py-4 px-6 md:px-10 select-none shrink-0">
        <div className="w-full max-w-4xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📓</span>
            {isEditingName ? (
              <input
                type="text"
                value={notebookName}
                onChange={(e) => setNotebookName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => { if (e.key === "Enter") setIsEditingName(false); }}
                autoFocus
                className="bg-[#0c0c0c] border border-[#1e1e1e] rounded px-2 py-0.5 text-[#ffffff] font-mono text-sm focus:outline-none focus:border-[#9c9c9c]"
              />
            ) : (
              <h1
                onClick={() => setIsEditingName(true)}
                className="text-sm font-mono font-semibold text-[#ffffff] cursor-pointer hover:text-emerald-400 transition-colors flex items-center gap-1.5"
              >
                {notebookName}
                <span className="text-[#5c5c5c] text-[10px]">
                  <EditIcon />
                </span>
              </h1>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => addCellAtIndex(cells.length, "code")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-mono tracking-wider uppercase border border-[#1e1e1e] bg-[#0c0c0c] hover:bg-[#111] text-[#9c9c9c] hover:text-[#ffffff] transition-colors rounded cursor-pointer font-semibold"
            >
              <AddIcon /> + Code
            </button>
            <button
              onClick={() => addCellAtIndex(cells.length, "jsx")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-mono tracking-wider uppercase border border-[#1e1e1e] bg-[#0c0c0c] hover:bg-[#111] text-[#9c9c9c] hover:text-[#ffffff] transition-colors rounded cursor-pointer font-semibold"
            >
              <AddIcon /> + JSX
            </button>
            <button
              onClick={() => addCellAtIndex(cells.length, "markdown")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-mono tracking-wider uppercase border border-[#1e1e1e] bg-[#0c0c0c] hover:bg-[#111] text-[#9c9c9c] hover:text-[#ffffff] transition-colors rounded cursor-pointer font-semibold"
            >
              <AddIcon /> + Markdown
            </button>
            <button
              onClick={runAllCells}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono tracking-wider uppercase border border-[#1e1e1e] bg-[#0c0c0c] hover:bg-[#111] text-[#9c9c9c] hover:text-[#ffffff] transition-colors rounded cursor-pointer font-medium"
            >
              <RunAllIcon /> Run All
            </button>
            <button
              onClick={clearOutputs}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono tracking-wider uppercase border border-[#1e1e1e] bg-[#0c0c0c] hover:bg-[#111] text-[#9c9c9c] hover:text-[#ffffff] transition-colors rounded cursor-pointer font-medium"
            >
              <ClearIcon /> Clear Outputs
            </button>
            <button
              onClick={resetNotebook}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono tracking-wider uppercase border border-[#1e1e1e] bg-[#0c0c0c] hover:bg-[#111] text-[#9c9c9c] hover:text-[#ffffff] transition-colors rounded cursor-pointer font-medium"
            >
              <ResetIcon /> Reset
            </button>
            <button
              onClick={saveNotebook}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono tracking-wider uppercase border border-[#1e1e1e] bg-[#0c0c0c] hover:bg-[#111] text-[#9c9c9c] hover:text-[#ffffff] transition-colors rounded cursor-pointer font-medium"
            >
              <SaveIcon /> Save
            </button>
            <button
              onClick={triggerLoadNotebook}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono tracking-wider uppercase border border-[#1e1e1e] bg-[#0c0c0c] hover:bg-[#111] text-[#9c9c9c] hover:text-[#ffffff] transition-colors rounded cursor-pointer font-medium"
            >
              <LoadIcon /> Load
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".dfnb"
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Cells Workspace Container with padding */}
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 px-6 md:px-10 pt-2 pb-24">
        {cells.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3 border border-dashed border-[#1e1e1e] rounded bg-[#0c0c0c]/40 select-none">
            <span className="text-3xl">📓</span>
            <p className="text-xs text-[#5c5c5c]">Your notebook is empty. Click "+ Code" above to add a cell.</p>
          </div>
        ) : (
          cells.map((cell, idx) => {
            const isActive = activeCellId === cell.id;
            const hasRun = cell.execIndex !== null || cell.timeTaken !== null;
            
            // Border colors based on state
            let statusBorderColor = "border-l-[3px] border-l-[#1a1a1a]";
            if (cell.timeTaken === "...") {
              statusBorderColor = "border-l-[3px] border-l-sky-500 animate-pulse";
            } else if (cell.error) {
              statusBorderColor = "border-l-[3px] border-l-rose-500";
            } else if (hasRun) {
              statusBorderColor = "border-l-[3px] border-l-emerald-500";
            } else if (isActive) {
              statusBorderColor = "border-l-[3px] border-l-[#444444]";
            }

            const isRenderedMarkdown = cell.type === "markdown" && cell.isCodeCollapsed;

            if (isRenderedMarkdown) {
              return (
                <React.Fragment key={cell.id}>
                  {/* Hover Cell Insert Zone */}
                  <CellInsertZone index={idx} onAdd={(type) => addCellAtIndex(idx, type)} />

                  <div
                    onClick={() => {
                      setActiveCellId(cell.id);
                      toggleCodeCollapse(cell.id);
                    }}
                    className="group flex flex-col bg-transparent border-0 rounded hover:bg-[#111]/30 transition-all p-3 relative cursor-pointer"
                    title="Click to edit Markdown"
                  >
                    {/* Floating mini actions toolbar on hover */}
                    <div className="absolute top-1 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 z-20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(cell.code);
                          setCopiedCellCodeId(cell.id);
                          setTimeout(() => setCopiedCellCodeId(null), 1500);
                        }}
                        title="Copy Markdown"
                        className="w-5 h-5 flex items-center justify-center bg-[#0c0c0c] hover:bg-[#161616] text-[#9c9c9c] hover:text-white border border-[#1e1e1e] rounded cursor-pointer transition-all"
                      >
                        {copiedCellCodeId === cell.id ? (
                          <span className="text-[7.5px] font-mono text-emerald-400 font-bold uppercase px-0.5">Done</span>
                        ) : (
                          <CopyIcon />
                        )}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleCodeCollapse(cell.id); }}
                        title="Edit Cell"
                        className="w-5 h-5 flex items-center justify-center bg-[#0c0c0c] hover:bg-[#161616] text-[#9c9c9c] hover:text-white border border-[#1e1e1e] rounded cursor-pointer transition-colors"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteCell(cell.id); }}
                        title="Delete Cell"
                        className="w-5 h-5 flex items-center justify-center bg-[#0c0c0c] hover:bg-[#161616] text-[#9c9c9c] hover:text-rose-400 border border-[#1e1e1e] rounded cursor-pointer transition-colors"
                      >
                        <DeleteIcon />
                      </button>
                    </div>

                    {/* Main Text Layout (flush left) */}
                    <div className="flex gap-4 items-start">
                      {/* Compiled Markdown View */}
                      <div className="flex-grow min-w-0">
                        {renderMarkdown(cell.code)}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            }

            return (
              <React.Fragment key={cell.id}>
                {/* Hover Cell Insert Zone */}
                <CellInsertZone index={idx} onAdd={(type) => addCellAtIndex(idx, type)} />

                <div
                  onClick={() => setActiveCellId(cell.id)}
                  className={`flex flex-col border border-[#1a1a1a] rounded bg-[#0c0c0c]/60 p-4 transition-all duration-150 ${statusBorderColor} ${isActive ? "shadow-lg bg-[#0c0c0c] border-[#2a2a2a]" : ""}`}
                >
                  {/* Top toolbar: move, collapse, delete */}
                  <div className="flex justify-between items-center mb-2 select-none">
                    <div className="flex items-center gap-2">
                      {cell.type === "markdown" && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold font-mono tracking-wider bg-sky-950/20 text-sky-400 border border-sky-900/20 uppercase">
                          Markdown
                        </span>
                      )}
                      {cell.type === "jsx" && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold font-mono tracking-wider bg-emerald-950/20 text-emerald-400 border border-emerald-900/20 uppercase">
                          JSX / Visual
                        </span>
                      )}
                      {cell.timeTaken && cell.timeTaken !== "..." && (
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${cell.error ? "bg-rose-950/20 text-rose-400 border border-rose-900/20" : "bg-emerald-950/20 text-emerald-400 border border-emerald-900/20"}`}>
                          {cell.timeTaken}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      {cell.type === "markdown" && !cell.isCodeCollapsed && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleCodeCollapse(cell.id); }}
                          title="Render Markdown"
                          className="w-6 h-6 flex items-center justify-center bg-[#060606] hover:bg-[#111] text-emerald-400 hover:text-emerald-300 border border-[#1e1e1e] rounded cursor-pointer transition-colors"
                        >
                          <CheckIcon className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={(e) => { e.stopPropagation(); toggleCodeCollapse(cell.id); }}
                        title={cell.isCodeCollapsed ? "Expand Cell" : "Collapse Cell"}
                        className="w-6 h-6 flex items-center justify-center bg-[#060606] hover:bg-[#111] text-[#9c9c9c] hover:text-[#ffffff] border border-[#1e1e1e] rounded cursor-pointer transition-colors"
                      >
                        {cell.isCodeCollapsed ? <EyeClosedIcon /> : <EyeOpenIcon />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveCellUp(idx); }}
                        disabled={idx === 0}
                        title="Move Up"
                        className="w-6 h-6 flex items-center justify-center bg-[#060606] hover:bg-[#111] text-[#9c9c9c] hover:text-[#ffffff] border border-[#1e1e1e] rounded cursor-pointer disabled:opacity-30 transition-colors"
                      >
                        <UpIcon />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveCellDown(idx); }}
                        disabled={idx === cells.length - 1}
                        title="Move Down"
                        className="w-6 h-6 flex items-center justify-center bg-[#060606] hover:bg-[#111] text-[#9c9c9c] hover:text-[#ffffff] border border-[#1e1e1e] rounded cursor-pointer disabled:opacity-30 transition-colors"
                      >
                        <DownIcon />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteCell(cell.id); }}
                        title="Delete Cell"
                        className="w-6 h-6 flex items-center justify-center bg-[#060606] hover:bg-[#111] text-[#9c9c9c] hover:text-rose-400 border border-[#1e1e1e] rounded cursor-pointer transition-colors"
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  </div>

                  {/* Main cell block layout with run button on the left (ipynb style) */}
                  <div className="flex gap-4 items-stretch">
                    
                    {/* Left margin gutter: Run Button and cell count index aligned to bottom left */}
                    <div className="flex flex-col items-center justify-between select-none w-10 shrink-0 self-stretch py-1">
                      {cell.type === "code" || cell.type === "jsx" ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); runCell(cell.id); }}
                          disabled={cell.timeTaken === "..."}
                          title="Run Cell"
                          className="w-10 h-10 flex items-center justify-center bg-transparent border-0 cursor-pointer disabled:opacity-50 transition-all select-none"
                        >
                          <RunIcon className="text-white hover:text-emerald-400" />
                        </button>
                      ) : (
                        <div className="w-10 h-10" />
                      )}
                      
                      {/* Execution Index aligned to bottom-left corner */}
                      <span className="text-[10px] font-mono text-[#5c5c5c] text-center font-bold mt-auto select-none">
                        {cell.type === "code" || cell.type === "jsx" ? (
                          `[${cell.execIndex === null ? (cell.timeTaken === "..." ? "*" : " ") : cell.execIndex}]`
                        ) : (
                          `[MD]`
                        )}
                      </span>
                    </div>

                    {/* Right side: Code/MD Area and Output */}
                    <div className="flex-grow flex flex-col min-w-0">
                      {!cell.isCodeCollapsed ? (
                        <div className="relative border border-[#1e1e1e]/60 rounded bg-[#070707] py-2 group">
                          <Editor
                            height={Math.max(80, cell.code.split("\n").length * 18 + 20)}
                            language={cell.type === "markdown" ? "markdown" : "javascript"}
                            theme="dfnb-dark"
                            beforeMount={handleEditorWillMount}
                            onMount={(editor, monaco) => {
                              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                                runCell(cell.id);
                              });
                            }}
                            value={cell.code}
                            onChange={(newVal) => updateCellCode(cell.id, newVal || "")}
                            options={{
                              minimap: { enabled: false },
                              folding: true,
                              lineNumbers: "on",
                              guides: {
                                indentation: true
                              },
                              scrollBeyondLastLine: false,
                              fontSize: 11,
                              fontFamily: "monospace",
                              automaticLayout: true,
                              scrollbar: {
                                vertical: "hidden",
                                horizontal: "auto",
                                handleMouseWheel: false
                              },
                              renderLineHighlight: "none",
                              overviewRulerBorder: false,
                              hideCursorInOverviewRuler: true
                            }}
                          />
                          
                          {/* Absolute Overlay Copy Button inside the text area wrapper */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(cell.code);
                              setCopiedCellCodeId(cell.id);
                              setTimeout(() => setCopiedCellCodeId(null), 1500);
                            }}
                            className="absolute top-2.5 right-2.5 z-20 px-2 py-0.5 text-[8.5px] font-mono tracking-wider bg-[#0c0c0c]/80 hover:bg-[#111] text-[#9c9c9c] hover:text-white border border-[#1e1e1e] rounded cursor-pointer transition-all uppercase select-none opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Copy Cell Content"
                          >
                            {copiedCellCodeId === cell.id ? "Copied!" : "Copy"}
                          </button>
                          
                          {/* Language Badge - Bold standard white text, bottom right corner */}
                          <span className="absolute bottom-2.5 right-4 z-20 text-[9px] font-mono text-white/80 font-bold tracking-wider select-none pointer-events-none uppercase">
                            {cell.type === "markdown" ? "Markdown" : (cell.type === "jsx" ? "JSX / React" : "JavaScript")}
                          </span>
                        </div>
                      ) : (
                        <div 
                          onDoubleClick={() => toggleCodeCollapse(cell.id)}
                          className="border border-[#1e1e1e]/40 hover:border-[#3c3c3c] bg-[#0c0c0c]/40 p-3 rounded select-text min-h-[40px] cursor-pointer transition-colors duration-150"
                          title="Double click to edit cell"
                        >
                          {cell.type === "markdown" ? (
                            renderMarkdown(cell.code)
                          ) : (
                            <div className="flex items-center justify-between font-mono text-[10.5px] text-[#5c5c5c]">
                              <span className="truncate italic max-w-lg">{cell.code.split('\n')[0] || "Empty cell"}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleCodeCollapse(cell.id); }}
                                className="text-[#9c9c9c] hover:text-[#ffffff] cursor-pointer text-[10px]"
                              >
                                expand code ({cell.code.split('\n').length} lines)
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Cell Output Area */}
                      {renderCellOutput(cell)}
                    </div>

                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}

        {/* End of Notebook insert zone */}
        <CellInsertZone index={cells.length} onAdd={(type) => addCellAtIndex(cells.length, type)} />
      </div>

    </div>
  );
}

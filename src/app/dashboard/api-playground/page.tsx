"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Code, Play, Clock, Copy, Terminal, ArrowLeft, Check, ChevronDown, Trash2 } from "lucide-react";

// --- Types ---

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

interface Endpoint {
  method: HttpMethod;
  path: string;
  label: string;
  description: string;
  defaultBody?: string;
  pathParams?: string[];
}

interface HistoryEntry {
  id: number;
  endpoint: string;
  method: HttpMethod;
  status: number;
  time: number;
  timestamp: Date;
}

interface ResponseData {
  status: number;
  statusText: string;
  body: string;
  time: number;
  size: number;
}

// --- Endpoints ---

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/feeds",
    label: "List all feeds",
    description: "Returns all feeds for the authenticated user.",
  },
  {
    method: "GET",
    path: "/api/feeds/{id}",
    label: "Get feed items",
    description: "Returns items for a specific feed by ID.",
    pathParams: ["id"],
  },
  {
    method: "POST",
    path: "/api/feeds/{id}/refresh",
    label: "Refresh a feed",
    description: "Triggers a refresh of the specified feed.",
    pathParams: ["id"],
  },
  {
    method: "POST",
    path: "/api/feed/generate",
    label: "Generate new feed",
    description: "Generate a new AI-curated feed from a topic or prompt.",
    defaultBody: JSON.stringify({ prompt: "Latest AI research papers" }, null, 2),
  },
  {
    method: "POST",
    path: "/api/articles/summarize",
    label: "Summarize an article",
    description: "Uses AI to generate a summary of the given article.",
    defaultBody: JSON.stringify({ url: "https://example.com/article" }, null, 2),
  },
  {
    method: "POST",
    path: "/api/feeds/discover",
    label: "Discover feeds from URL",
    description: "Discovers RSS/Atom feeds from a given website URL.",
    defaultBody: JSON.stringify({ url: "https://example.com" }, null, 2),
  },
  {
    method: "POST",
    path: "/api/feeds/import",
    label: "Import OPML",
    description: "Imports feeds from an OPML file or XML string.",
    defaultBody: JSON.stringify({ opml: "<opml>...</opml>" }, null, 2),
  },
];

// --- Helpers ---

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  PUT: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
};

function statusColor(status: number): string {
  if (status < 300) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (status < 400) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-red-500/20 text-red-400 border-red-500/30";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function syntaxHighlight(json: string): string {
  return json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = "text-amber-300"; // number
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = "text-purple-400"; // key
            match = match.replace(/:$/, "");
            return `<span class="${cls}">${match}</span>:`;
          } else {
            cls = "text-emerald-400"; // string
          }
        } else if (/true|false/.test(match)) {
          cls = "text-blue-400"; // boolean
        } else if (/null/.test(match)) {
          cls = "text-gray-500"; // null
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
}

function resolvedPath(path: string, params: Record<string, string>): string {
  let result = path;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`{${key}}`, encodeURIComponent(value || key));
  }
  return result;
}

// --- Code Snippet Generators ---

function curlSnippet(method: HttpMethod, url: string, body?: string): string {
  let cmd = `curl -X ${method} "${url}"`;
  cmd += ` \\\n  -H "Content-Type: application/json"`;
  cmd += ` \\\n  -H "Cookie: <your-session-cookie>"`;
  if (body && method !== "GET") {
    cmd += ` \\\n  -d '${body}'`;
  }
  return cmd;
}

function fetchSnippet(method: HttpMethod, url: string, body?: string): string {
  const opts: string[] = [`  method: "${method}"`, `  headers: { "Content-Type": "application/json" }`, `  credentials: "include"`];
  if (body && method !== "GET") {
    opts.push(`  body: JSON.stringify(${body})`);
  }
  return `const response = await fetch("${url}", {\n${opts.join(",\n")}\n});\nconst data = await response.json();\nconsole.log(data);`;
}

function pythonSnippet(method: HttpMethod, url: string, body?: string): string {
  let code = `import requests\n\n`;
  if (body && method !== "GET") {
    code += `payload = ${body}\n\n`;
    code += `response = requests.${method.toLowerCase()}(\n    "${url}",\n    json=payload\n)\n`;
  } else {
    code += `response = requests.${method.toLowerCase()}("${url}")\n`;
  }
  code += `print(response.status_code)\nprint(response.json())`;
  return code;
}

// --- Component ---

export default function ApiPlaygroundPage() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pathParams, setPathParams] = useState<Record<string, string>>({});
  const [body, setBody] = useState("");
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [snippetTab, setSnippetTab] = useState<"curl" | "fetch" | "python">("curl");
  const [copied, setCopied] = useState(false);
  const [endpointOpen, setEndpointOpen] = useState(false);
  const nextHistoryId = useRef(1);

  const endpoint = ENDPOINTS[selectedIndex];
  const fullUrl = typeof window !== "undefined"
    ? `${window.location.origin}${resolvedPath(endpoint.path, pathParams)}`
    : resolvedPath(endpoint.path, pathParams);

  const selectEndpoint = useCallback((idx: number) => {
    setSelectedIndex(idx);
    setEndpointOpen(false);
    setResponse(null);
    setPathParams({});
    const ep = ENDPOINTS[idx];
    setBody(ep.defaultBody || "");
  }, []);

  const sendRequest = useCallback(async () => {
    setLoading(true);
    const url = resolvedPath(endpoint.path, pathParams);
    const start = performance.now();
    try {
      const opts: RequestInit = {
        method: endpoint.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      };
      if (body && endpoint.method !== "GET") {
        opts.body = body;
      }
      const res = await fetch(url, opts);
      const elapsed = Math.round(performance.now() - start);
      const text = await res.text();
      let formatted = text;
      try {
        formatted = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // not JSON, keep as-is
      }
      const size = new Blob([text]).size;
      setResponse({ status: res.status, statusText: res.statusText, body: formatted, time: elapsed, size });
      setHistory((prev) => {
        const entry: HistoryEntry = {
          id: nextHistoryId.current++,
          endpoint: `${endpoint.method} ${url}`,
          method: endpoint.method,
          status: res.status,
          time: elapsed,
          timestamp: new Date(),
        };
        return [entry, ...prev].slice(0, 10);
      });
    } catch (err: unknown) {
      const elapsed = Math.round(performance.now() - start);
      const message = err instanceof Error ? err.message : "Unknown error";
      setResponse({ status: 0, statusText: "Network Error", body: JSON.stringify({ error: message }, null, 2), time: elapsed, size: 0 });
    } finally {
      setLoading(false);
    }
  }, [endpoint, pathParams, body]);

  const copySnippet = useCallback(() => {
    const url = fullUrl;
    const b = body || undefined;
    let text = "";
    if (snippetTab === "curl") text = curlSnippet(endpoint.method, url, b);
    else if (snippetTab === "fetch") text = fetchSnippet(endpoint.method, url, b);
    else text = pythonSnippet(endpoint.method, url, b);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [snippetTab, endpoint, fullUrl, body]);

  const snippetCode = (() => {
    const url = fullUrl;
    const b = body || undefined;
    if (snippetTab === "curl") return curlSnippet(endpoint.method, url, b);
    if (snippetTab === "fetch") return fetchSnippet(endpoint.method, url, b);
    return pythonSnippet(endpoint.method, url, b);
  })();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-purple-500" />
            <h1 className="text-lg font-semibold">API Playground</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Request Builder */}
          <div className="lg:col-span-2 space-y-4">
            {/* Endpoint Selector */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Endpoint
                </label>
                <div className="relative mt-2">
                  <button
                    onClick={() => setEndpointOpen(!endpointOpen)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`shrink-0 px-2 py-0.5 text-xs font-bold rounded border ${METHOD_COLORS[endpoint.method]}`}>
                        {endpoint.method}
                      </span>
                      <span className="font-mono text-sm truncate">{endpoint.path}</span>
                      <span className="hidden sm:inline text-xs text-gray-400 truncate">- {endpoint.label}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${endpointOpen ? "rotate-180" : ""}`} />
                  </button>

                  {endpointOpen && (
                    <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl max-h-80 overflow-y-auto">
                      {ENDPOINTS.map((ep, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectEndpoint(idx)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${idx === selectedIndex ? "bg-purple-50 dark:bg-purple-500/10" : ""}`}
                        >
                          <span className={`shrink-0 px-2 py-0.5 text-xs font-bold rounded border ${METHOD_COLORS[ep.method]}`}>
                            {ep.method}
                          </span>
                          <div className="min-w-0">
                            <div className="font-mono text-sm truncate">{ep.path}</div>
                            <div className="text-xs text-gray-400 truncate">{ep.label}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-400">{endpoint.description}</p>
              </div>

              {/* Path Parameters */}
              {endpoint.pathParams && endpoint.pathParams.length > 0 && (
                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Path Parameters
                  </label>
                  <div className="mt-2 space-y-2">
                    {endpoint.pathParams.map((param) => (
                      <div key={param} className="flex items-center gap-2">
                        <span className="text-xs font-mono text-purple-400 w-16 shrink-0">{`{${param}}`}</span>
                        <input
                          type="text"
                          placeholder={`Enter ${param}...`}
                          value={pathParams[param] || ""}
                          onChange={(e) => setPathParams((prev) => ({ ...prev, [param]: e.target.value }))}
                          className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Headers (read-only) */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Headers
                </label>
                <div className="mt-2 font-mono text-xs space-y-1 text-gray-500 dark:text-gray-400">
                  <div><span className="text-purple-400">Content-Type:</span> application/json</div>
                  <div><span className="text-purple-400">Cookie:</span> <span className="italic text-gray-400">session (auto-attached)</span></div>
                </div>
              </div>

              {/* Request Body */}
              {endpoint.method !== "GET" && (
                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Request Body
                    </label>
                    <button
                      onClick={() => {
                        try {
                          setBody(JSON.stringify(JSON.parse(body), null, 2));
                        } catch {
                          // ignore invalid JSON
                        }
                      }}
                      className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Format JSON
                    </button>
                  </div>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={6}
                    spellCheck={false}
                    className="mt-2 w-full px-3 py-2 font-mono text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-y"
                    placeholder='{ "key": "value" }'
                  />
                </div>
              )}

              {/* Send Button */}
              <div className="p-4">
                <button
                  onClick={sendRequest}
                  disabled={loading}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {loading ? "Sending..." : "Try It"}
                </button>
              </div>
            </div>

            {/* Response Viewer */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Response</span>
                </div>
                {response && (
                  <div className="flex items-center gap-3 text-xs">
                    <span className={`px-2 py-0.5 rounded border font-bold ${statusColor(response.status)}`}>
                      {response.status} {response.statusText}
                    </span>
                    <span className="text-gray-400">{response.time} ms</span>
                    <span className="text-gray-400">{formatBytes(response.size)}</span>
                  </div>
                )}
              </div>
              <div className="p-4 max-h-96 overflow-auto">
                {response ? (
                  <pre
                    className="font-mono text-xs leading-relaxed whitespace-pre-wrap break-words"
                    dangerouslySetInnerHTML={{ __html: syntaxHighlight(response.body) }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Terminal className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-sm">Send a request to see the response</p>
                  </div>
                )}
              </div>
            </div>

            {/* Code Snippets */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Code Snippet
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {(["curl", "fetch", "python"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSnippetTab(tab)}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${snippetTab === tab ? "bg-purple-500/20 text-purple-400" : "text-gray-400 hover:text-gray-300"}`}
                    >
                      {tab}
                    </button>
                  ))}
                  <button
                    onClick={copySnippet}
                    className="ml-2 p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="p-4 max-h-64 overflow-auto">
                <pre className="font-mono text-xs leading-relaxed text-gray-300 whitespace-pre-wrap break-words">
                  {snippetCode}
                </pre>
              </div>
            </div>
          </div>

          {/* Right Column: History */}
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Request History
                  </span>
                </div>
                {history.length > 0 && (
                  <button
                    onClick={() => setHistory([])}
                    className="p-1 rounded text-gray-400 hover:text-red-400 transition-colors"
                    title="Clear history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {history.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">
                    <Clock className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    No requests yet
                  </div>
                ) : (
                  history.map((entry) => (
                    <div key={entry.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${METHOD_COLORS[entry.method]}`}>
                          {entry.method}
                        </span>
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${statusColor(entry.status)}`}>
                          {entry.status}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-auto">{entry.time} ms</span>
                      </div>
                      <div className="font-mono text-xs text-gray-400 truncate">
                        {entry.endpoint.replace(/^(GET|POST|PUT|DELETE)\s/, "")}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {entry.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Reference */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Quick Reference
                </span>
              </div>
              <div className="p-4 space-y-3 text-xs">
                <div>
                  <div className="font-medium text-gray-300 mb-1">Authentication</div>
                  <p className="text-gray-500">Requests use your session cookie automatically. No API key needed for the playground.</p>
                </div>
                <div>
                  <div className="font-medium text-gray-300 mb-1">Rate Limits</div>
                  <p className="text-gray-500">API endpoints may be rate-limited. Excessive requests will return 429 status.</p>
                </div>
                <div>
                  <div className="font-medium text-gray-300 mb-1">Response Format</div>
                  <p className="text-gray-500">All endpoints return JSON. Errors include an <code className="text-purple-400">error</code> field.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

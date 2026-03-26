"use client";

import { useState } from "react";
import { Code, Copy, Check, ArrowLeft, Key, Globe, BarChart2, Rss, RefreshCw } from "lucide-react";
import Link from "next/link";

const API_BASE = "https://feedbot-eight.vercel.app";

interface EndpointProps {
  method: "GET" | "POST" | "DELETE" | "PATCH";
  path: string;
  description: string;
  auth: boolean;
  example?: string;
  response?: string;
}

function Endpoint({ method, path, description, auth, example, response }: EndpointProps) {
  const [copied, setCopied] = useState(false);
  const methodColors: Record<string, string> = {
    GET: "bg-green-500/10 text-green-400 border-green-500/20",
    POST: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    DELETE: "bg-red-500/10 text-red-400 border-red-500/20",
    PATCH: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  };

  const copyExample = () => {
    if (example) {
      navigator.clipboard.writeText(example);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-bg-card p-5">
      <div className="flex items-start gap-3">
        <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-bold ${methodColors[method]}`}>
          {method}
        </span>
        <div className="min-w-0 flex-1">
          <code className="text-sm font-medium text-text">{path}</code>
          <p className="mt-1 text-sm text-text-muted">{description}</p>
          {auth && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
              <Key className="h-3 w-3" />
              Requires authentication (Bearer token)
            </div>
          )}
        </div>
      </div>
      {example && (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">Example</span>
            <button onClick={copyExample} className="flex items-center gap-1 text-xs text-text-muted hover:text-text">
              {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="mt-1.5 overflow-x-auto rounded-lg bg-bg p-3 text-xs text-text-muted">
            <code>{example}</code>
          </pre>
        </div>
      )}
      {response && (
        <div className="mt-3">
          <span className="text-xs text-text-muted">Response</span>
          <pre className="mt-1.5 overflow-x-auto rounded-lg bg-bg p-3 text-xs text-text-muted">
            <code>{response}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Code className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">API Documentation</h1>
            <p className="text-sm text-text-muted">Access your feeds programmatically</p>
          </div>
        </div>
      </div>

      {/* Authentication */}
      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text">
          <Key className="h-5 w-5 text-primary" />
          Authentication
        </h2>
        <div className="rounded-xl border border-border bg-bg-card p-5">
          <p className="text-sm text-text-muted">
            All API requests require a valid session cookie. When using the API from external tools,
            authenticate first by calling the login endpoint and passing the session cookie with subsequent requests.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-bg p-3 text-xs text-text-muted">
            <code>{`# Authenticate first
curl -c cookies.txt ${API_BASE}/api/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"..."}'

# Use cookies for subsequent requests
curl -b cookies.txt ${API_BASE}/api/feeds`}</code>
          </pre>
        </div>
      </section>

      {/* Feeds */}
      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text">
          <Rss className="h-5 w-5 text-primary" />
          Feeds
        </h2>
        <div className="space-y-4">
          <Endpoint
            method="GET"
            path="/api/feeds"
            description="List all your feeds."
            auth={true}
            example={`curl -b cookies.txt ${API_BASE}/api/feeds`}
            response={`{ "feeds": [{ "id": "...", "name": "AI News", "query_text": "..." }] }`}
          />
          <Endpoint
            method="POST"
            path="/api/feeds"
            description="Create a new feed. Automatically fetches initial items."
            auth={true}
            example={`curl -b cookies.txt -X POST ${API_BASE}/api/feeds \\
  -H "Content-Type: application/json" \\
  -d '{"name":"AI News","query_text":"Latest AI breakthroughs","description":"AI news"}'`}
            response={`{ "feed": { "id": "...", "name": "AI News" }, "initial_items_count": 10 }`}
          />
          <Endpoint
            method="GET"
            path="/api/feeds/:id"
            description="Get a feed and its items."
            auth={true}
            example={`curl -b cookies.txt ${API_BASE}/api/feeds/FEED_ID`}
          />
          <Endpoint
            method="DELETE"
            path="/api/feeds/:id"
            description="Delete a feed and all its items."
            auth={true}
            example={`curl -b cookies.txt -X DELETE ${API_BASE}/api/feeds/FEED_ID`}
          />
        </div>
      </section>

      {/* Feed Operations */}
      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text">
          <RefreshCw className="h-5 w-5 text-primary" />
          Feed Operations
        </h2>
        <div className="space-y-4">
          <Endpoint
            method="POST"
            path="/api/feeds/:id/refresh"
            description="Refresh a feed — fetches new items from the internet."
            auth={true}
            example={`curl -b cookies.txt -X POST ${API_BASE}/api/feeds/FEED_ID/refresh`}
          />
          <Endpoint
            method="GET"
            path="/api/feeds/:id/export?format=rss"
            description="Export feed as RSS or JSON. Formats: rss, json."
            auth={true}
            example={`curl -b cookies.txt "${API_BASE}/api/feeds/FEED_ID/export?format=rss"`}
          />
        </div>
      </section>

      {/* Stats */}
      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text">
          <BarChart2 className="h-5 w-5 text-primary" />
          Analytics
        </h2>
        <div className="space-y-4">
          <Endpoint
            method="GET"
            path="/api/feeds/:id/stats"
            description="Get statistics for a feed: item count, sources, items per day."
            auth={true}
            example={`curl -b cookies.txt ${API_BASE}/api/feeds/FEED_ID/stats`}
            response={`{
  "feed": { "id": "...", "name": "AI News" },
  "stats": {
    "totalItems": 142,
    "itemsPerDay": 4.2,
    "uniqueSources": 18,
    "topSources": [{ "source": "techcrunch.com", "count": 23 }]
  }
}`}
          />
        </div>
      </section>

      {/* Discovery */}
      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text">
          <Globe className="h-5 w-5 text-primary" />
          Discovery
        </h2>
        <div className="space-y-4">
          <Endpoint
            method="POST"
            path="/api/feeds/discover"
            description="Discover RSS feeds from any website URL."
            auth={true}
            example={`curl -b cookies.txt -X POST ${API_BASE}/api/feeds/discover \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://techcrunch.com"}'`}
            response={`{ "feeds": [{ "title": "TechCrunch", "url": "https://...", "type": "rss" }] }`}
          />
          <Endpoint
            method="POST"
            path="/api/feeds/import"
            description="Import feeds from an OPML file (multipart form upload)."
            auth={true}
            example={`curl -b cookies.txt -X POST ${API_BASE}/api/feeds/import \\
  -F "file=@feeds.opml"`}
          />
        </div>
      </section>

      {/* Rate Limits */}
      <section className="mb-10">
        <div className="rounded-xl border border-border bg-bg-card p-5">
          <h2 className="text-lg font-semibold text-text">Rate Limits</h2>
          <div className="mt-3 space-y-2 text-sm text-text-muted">
            <p>Free plan: 100 requests/hour</p>
            <p>Pro plan: 1,000 requests/hour</p>
            <p>Rate limit headers are included in every response: <code className="rounded bg-bg px-1.5 py-0.5 text-xs">X-RateLimit-Remaining</code></p>
          </div>
        </div>
      </section>
    </div>
  );
}

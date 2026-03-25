import { describe, it, expect } from "vitest";

// Inline the parser since it's not exported from the route
function parseOPML(xml: string): { title: string; xmlUrl: string; htmlUrl?: string }[] {
  const feeds: { title: string; xmlUrl: string; htmlUrl?: string }[] = [];
  const outlineRegex = /<outline[^>]*?xmlUrl\s*=\s*"([^"]*)"[^>]*?>/gi;
  let match;

  while ((match = outlineRegex.exec(xml)) !== null) {
    const fullTag = match[0];
    const xmlUrl = match[1];
    const titleMatch = fullTag.match(/(?:title|text)\s*=\s*"([^"]*)"/i);
    const htmlUrlMatch = fullTag.match(/htmlUrl\s*=\s*"([^"]*)"/i);

    feeds.push({
      title: titleMatch?.[1] || xmlUrl,
      xmlUrl,
      htmlUrl: htmlUrlMatch?.[1],
    });
  }

  return feeds;
}

describe("parseOPML", () => {
  it("parses standard OPML with title and xmlUrl", () => {
    const opml = `<?xml version="1.0"?>
    <opml version="2.0">
      <body>
        <outline text="Tech News" title="Tech News" xmlUrl="https://techcrunch.com/feed/" htmlUrl="https://techcrunch.com"/>
      </body>
    </opml>`;

    const result = parseOPML(opml);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Tech News");
    expect(result[0].xmlUrl).toBe("https://techcrunch.com/feed/");
    expect(result[0].htmlUrl).toBe("https://techcrunch.com");
  });

  it("parses multiple feeds", () => {
    const opml = `<opml>
      <body>
        <outline xmlUrl="https://a.com/feed" text="Feed A"/>
        <outline xmlUrl="https://b.com/feed" text="Feed B"/>
        <outline xmlUrl="https://c.com/feed" text="Feed C"/>
      </body>
    </opml>`;

    const result = parseOPML(opml);
    expect(result).toHaveLength(3);
    expect(result.map(f => f.title)).toEqual(["Feed A", "Feed B", "Feed C"]);
  });

  it("uses xmlUrl as title when no title/text attribute", () => {
    const opml = `<opml><body>
      <outline xmlUrl="https://example.com/rss"/>
    </body></opml>`;

    const result = parseOPML(opml);
    expect(result[0].title).toBe("https://example.com/rss");
  });

  it("ignores outlines without xmlUrl", () => {
    const opml = `<opml><body>
      <outline text="Category" type="folder">
        <outline xmlUrl="https://real.com/feed" text="Real Feed"/>
      </outline>
    </body></opml>`;

    const result = parseOPML(opml);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Real Feed");
  });

  it("returns empty for invalid/empty OPML", () => {
    expect(parseOPML("not xml")).toEqual([]);
    expect(parseOPML("")).toEqual([]);
    expect(parseOPML("<opml><body></body></opml>")).toEqual([]);
  });
});

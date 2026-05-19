import { describe, expect, test } from "vitest";

import {
    extractLinkPreviewUrl,
    fetchLinkPreviewMetadata,
    normalizeLinkPreviewUrl,
    parseLinkPreviewHtml,
} from "../link-preview.ts";

describe("extractLinkPreviewUrl", () => {
    test("extracts markdown links before bare urls", () => {
        expect(
            extractLinkPreviewUrl(
                "see [the post](https://example.com/a?b=1#hash) and https://later.test",
            ),
        ).toBe("https://example.com/a?b=1");
    });

    test("extracts bare urls and trims punctuation", () => {
        expect(extractLinkPreviewUrl("go to https://example.com/path.")).toBe(
            "https://example.com/path",
        );
    });

    test("extracts urls with balanced parentheses", () => {
        expect(
            extractLinkPreviewUrl(
                "wiki https://example.com/Avatar_(2009_film)",
            ),
        ).toBe("https://example.com/Avatar_(2009_film)");
        expect(
            extractLinkPreviewUrl(
                "[wiki](https://example.com/Avatar_(2009_film))",
            ),
        ).toBe("https://example.com/Avatar_(2009_film)");
    });

    test("ignores image markdown links", () => {
        expect(
            extractLinkPreviewUrl(
                "![alt](https://cdn.example.test/image.png) then https://example.com",
            ),
        ).toBe("https://example.com/");
    });

    test("ignores links inside fenced code blocks", () => {
        expect(
            extractLinkPreviewUrl(
                "```js\nconst url = 'https://example.com/code';\n```\nhttps://example.com/post",
            ),
        ).toBe("https://example.com/post");
    });
});

describe("normalizeLinkPreviewUrl", () => {
    test("rejects non-http protocols", () => {
        expect(normalizeLinkPreviewUrl("javascript:alert(1)")).toBeNull();
        expect(normalizeLinkPreviewUrl("vex-file://abc")).toBeNull();
    });

    test("rejects local and private network hosts", () => {
        expect(normalizeLinkPreviewUrl("http://localhost:3000")).toBeNull();
        expect(normalizeLinkPreviewUrl("https://app.local/page")).toBeNull();
        expect(normalizeLinkPreviewUrl("http://127.0.0.1/")).toBeNull();
        expect(normalizeLinkPreviewUrl("http://10.1.2.3/")).toBeNull();
        expect(normalizeLinkPreviewUrl("http://172.16.0.1/")).toBeNull();
        expect(normalizeLinkPreviewUrl("http://192.168.1.4/")).toBeNull();
        expect(normalizeLinkPreviewUrl("http://[::1]/")).toBeNull();
        expect(normalizeLinkPreviewUrl("http://[fe90::1]/")).toBeNull();
        expect(normalizeLinkPreviewUrl("http://[fd00::1]/")).toBeNull();
        expect(
            normalizeLinkPreviewUrl("http://[::ffff:127.0.0.1]/"),
        ).toBeNull();
        expect(normalizeLinkPreviewUrl("http://[::ffff:10.0.0.5]/")).toBeNull();
        expect(
            normalizeLinkPreviewUrl("http://[::ffff:192.168.1.4]/"),
        ).toBeNull();
    });
});

describe("parseLinkPreviewHtml", () => {
    test("parses Open Graph metadata", () => {
        const preview = parseLinkPreviewHtml(
            `
                <html>
                  <head>
                    <meta property="og:title" content="A &amp; B">
                    <meta property="og:description" content="The story">
                    <meta property="og:image" content="/card.png">
                    <meta property="og:site_name" content="Example">
                    <link rel="icon" href="/favicon.ico">
                  </head>
                </html>
            `,
            "https://example.com/post",
        );

        expect(preview).toEqual({
            description: "The story",
            faviconUrl: "https://example.com/favicon.ico",
            imageUrl: "https://example.com/card.png",
            siteName: "Example",
            title: "A & B",
            url: "https://example.com/post",
        });
    });

    test("falls back to title tag and hostname", () => {
        expect(
            parseLinkPreviewHtml(
                "<html><head><title>Plain Page</title></head></html>",
                "https://www.example.com/a",
            ),
        ).toEqual({
            siteName: "example.com",
            title: "Plain Page",
            url: "https://www.example.com/a",
        });
    });
});

describe("fetchLinkPreviewMetadata", () => {
    test("fetches and parses html", async () => {
        const preview = await fetchLinkPreviewMetadata(
            "https://example.com",
            async () => ({
                finalUrl: "https://example.com/final",
                html: '<meta name="twitter:title" content="Twitter title">',
            }),
        );

        expect(preview?.title).toBe("Twitter title");
        expect(preview?.url).toBe("https://example.com/final");
    });
});

import { ImageResponse } from "next/og";

import { brand } from "@/lib/brand";
import { defaultLocale, locales, type Locale } from "@/lib/locales";

export const alt = brand.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Six locales, no per-request data — force build-time generation instead of the per-request
// default `loadInter`'s `fetch` calls would otherwise trigger.
export const dynamic = "force-static";

function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

// `next/og`'s bundled default font is Latin-only, but four of our six locales (tg, ru, ky, kk)
// render their tagline in Cyrillic — Vercel's own documented fix for `ImageResponse` + non-Latin
// text: ask Google Fonts for a CSS file scoped to exactly the glyphs we need (the `text` param),
// then fetch the one font file it points at. Runs once per statically-generated locale at build
// time, not per request.
async function loadInter(text: string): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=Inter:wght@600&text=${encodeURIComponent(text)}`;
  const css = await fetch(cssUrl, { cache: "force-cache" }).then((res) => res.text());
  const fontUrl = css.match(/src: url\(([^)]+)\)/)?.[1];
  if (!fontUrl) throw new Error("loadInter: no font file found in Google Fonts response");
  const fontResponse = await fetch(fontUrl, { cache: "force-cache" });
  return fontResponse.arrayBuffer();
}

// CLAUDE.md §8.4/§8.6: one dynamic OG image per locale, the product name, the localised
// tagline, and the accent colour — the same dark "promoted card" the dashboard uses for its one
// bold moment (CLAUDE.md §6), reused here since an OG image is exactly that: the one thing that
// has to read at a glance.
export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const tagline = brand.tagline[locale];

  const fontData = await loadInter(`${brand.name}${tagline}${brand.domain}`);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          backgroundColor: "#16161a",
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 20,
              height: 20,
              borderRadius: 999,
              backgroundColor: "#6d4aff",
            }}
          />
          <span style={{ fontSize: 32, fontWeight: 600, color: "#ffffff" }}>{brand.name}</span>
        </div>

        <span
          style={{
            fontSize: 56,
            fontWeight: 600,
            lineHeight: 1.25,
            color: "#ffffff",
            maxWidth: 980,
          }}
        >
          {tagline}
        </span>

        <span style={{ fontSize: 24, color: "#e7e0ff" }}>{brand.domain}</span>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Inter", data: fontData, style: "normal", weight: 600 }],
    },
  );
}

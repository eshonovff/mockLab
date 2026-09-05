import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Root-level (outside `[locale]`) so the browser's implicit `/favicon.ico` request and the
// `<link rel="icon">` Next generates from this file never enter the `[locale]` layout tree —
// see `app/favicon.ico`'s own comment for why that matters.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#16161a",
          borderRadius: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            width: 16,
            height: 16,
            borderRadius: 999,
            backgroundColor: "#6d4aff",
          }}
        />
      </div>
    ),
    size,
  );
}

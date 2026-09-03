import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  await clearSessionCookie();
  return new Response(null, { status: 204 });
}

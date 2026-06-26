import { NextResponse } from "next/server";
import { parsePreferencesParam } from "../../../lib/preferences";
import { listProperties } from "../../../lib/listings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const preferences = parsePreferencesParam(url.searchParams.get("preferences"));
  const result = await listProperties(preferences);

  return NextResponse.json(result);
}

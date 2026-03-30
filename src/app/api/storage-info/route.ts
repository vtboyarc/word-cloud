export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getStorageInfo } from "@/lib/db";

export async function GET() {
  return NextResponse.json(getStorageInfo());
}

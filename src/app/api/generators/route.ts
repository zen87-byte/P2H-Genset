import { NextResponse } from "next/server";

// Operational status is derived from the latest approved P2H inspection.
// Manual status updates are intentionally disabled.
export async function PATCH() {
  return NextResponse.json({ error: "Status operasional dihitung otomatis dari hasil P2H terakhir yang disetujui pengawas." }, { status: 405 });
}

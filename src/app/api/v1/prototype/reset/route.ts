import { NextResponse } from "next/server"
import { resetMemoryWorkflow } from "@/lib/prototype-store"

export async function POST() {
  resetMemoryWorkflow()
  return NextResponse.json({ success: true, data: { reset: true, scenario: "core-transaction" } })
}

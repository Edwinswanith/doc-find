import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import { COOKIE_NAME, verifyPrototypeCookie } from "@/lib/prototype-session"
import { removeEvidenceDocument, submitEvidenceDocument } from "@/lib/workspace/service"
import { WorkspaceDomainError } from "@/lib/workspace/domain"

const categorySchema = z.enum(["identity", "registration", "indemnity"])
const uploadSchema = z.object({ category: categorySchema, fileName: z.string().trim().min(1).max(200), fileType: z.string().trim().min(1).max(100), fileDataUrl: z.string().trim().min(1) })
const removeSchema = z.object({ category: categorySchema })

function fail(cause: unknown) {
  const error = cause as WorkspaceDomainError
  return NextResponse.json({ success: false, error: { code: error.code || "DOCUMENT_FAILED", message: error.message || "This document could not be saved. Please try again." } }, { status: error.code === "FORBIDDEN" ? 403 : error.code === "FILE_TOO_LARGE" ? 413 : 400 })
}

export async function POST(request: Request) {
  const actor = await verifyPrototypeCookie((await cookies()).get(COOKIE_NAME)?.value)
  if (!actor) return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 })
  const parsed = uploadSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: "INVALID_DOCUMENT", message: "Choose a valid file to upload." } }, { status: 400 })
  try {
    const record = await submitEvidenceDocument(actor.id, parsed.data.category, parsed.data.fileName, parsed.data.fileType, parsed.data.fileDataUrl)
    return NextResponse.json({ success: true, data: record })
  } catch (cause) { return fail(cause) }
}

export async function DELETE(request: Request) {
  const actor = await verifyPrototypeCookie((await cookies()).get(COOKIE_NAME)?.value)
  if (!actor) return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 })
  const parsed = removeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: "INVALID_DOCUMENT", message: "Choose a document category to remove." } }, { status: 400 })
  try {
    const result = await removeEvidenceDocument(actor.id, parsed.data.category)
    return NextResponse.json({ success: true, data: result })
  } catch (cause) { return fail(cause) }
}

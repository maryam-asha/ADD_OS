// src/add-os/modules/inventory/utils/attachments.ts

/** What ADD Core's media/upload takes for an attachment: its image types and a PDF. */
export const ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"] as const

export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024

/** Why a file cannot be attached, as an `inventory.operations` key; null when it can. */
export function attachmentProblem(file: Pick<File, "type" | "size">): "attachmentType" | "attachmentTooLarge" | null {
	if (!(ATTACHMENT_TYPES as readonly string[]).includes(file.type)) return "attachmentType"
	if (file.size > MAX_ATTACHMENT_BYTES) return "attachmentTooLarge"
	return null
}

/** A stored attachment's name, read off the end of its URL. */
export function attachmentName(url: string): string {
	return url.split("?")[0].split("/").filter(Boolean).pop() ?? url
}

/**
 * ADD OS — Markdown Rendering Engine
 *
 * Uses CommonMark compliant parser (micromark) with GitHub Flavored Markdown (GFM)
 * extension to render tables, task lists, strikethrough, and autolinks safely.
 */
import { micromark } from "micromark"
import { gfm, gfmHtml } from "micromark-extension-gfm"

/**
 * Converts a Markdown string into formatted HTML.
 *
 * @param markdown - Raw Markdown string
 * @returns Formatted HTML string
 */
export function renderMarkdown(markdown: string | null | undefined): string {
	if (!markdown || typeof markdown !== "string") return ""
	try {
		return micromark(markdown, {
			extensions: [gfm()],
			htmlExtensions: [gfmHtml()]
		})
	} catch (err) {
		console.error("[ADD OS] Failed to parse markdown:", err)
		return String(markdown)
	}
}

/**
 * Strips Markdown syntax from a string to produce clean plain text.
 * Useful for datatable columns, excerpts, search previews, etc.
 *
 * @param markdown - Raw Markdown string
 * @returns Clean plain text string
 */
export function stripMarkdown(markdown: string | null | undefined): string {
	if (!markdown || typeof markdown !== "string") return ""
	return markdown
		// Headers
		.replace(/^#{1,6}\s+/gm, "")
		// Images and Links
		.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
		// Bold / Italic / Strikethrough
		.replace(/(\*\*|__)(.*?)\1/g, "$2")
		.replace(/(\*|_)(.*?)\1/g, "$2")
		.replace(/~~(.*?)~~/g, "$1")
		// Code blocks & inline code
		.replace(/```[\s\S]*?```/g, "")
		.replace(/`([^`]+)`/g, "$1")
		// Blockquotes & lists
		.replace(/^\s*>\s+/gm, "")
		.replace(/^\s*[-*+]\s+/gm, "")
		.replace(/^\s*\d+\.\s+/gm, "")
		// Task lists
		.replace(/-\s*\[[ xX]\]\s+/g, "")
		// Clean up extra spaces/newlines
		.replace(/\n+/g, " ")
		.trim()
}

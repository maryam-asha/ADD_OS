/**
 * The manufacturer's serials of a registration line: one field per unit,
 * the first to the first asset made. A line of one sends `serial_number`,
 * a line of several `serial_numbers`, a blank one meaning "not known yet"
 * (filled in later on the asset itself).
 */

/**
 * The fields for `count` units: what was typed is kept, the last units
 * dropped when the count goes down. A cleared count (null, while it is being
 * retyped) changes nothing, so the serials typed are not lost on the way.
 */
export function resizeSerials(serials: string[], count: number | null): string[] {
	if (count === null) return serials
	const units = Number.isFinite(count) && count >= 1 ? Math.floor(count) : 1
	return Array.from({ length: units }, (_, i) => serials[i] ?? "")
}

export function serialPayload(serials: string[]): { serial_number?: string | null; serial_numbers?: (string | null)[] } {
	const trimmed = serials.map(serial => serial.trim() || null)
	if (trimmed.every(serial => serial === null)) return {}
	return trimmed.length === 1 ? { serial_number: trimmed[0] } : { serial_numbers: trimmed }
}

/**
 * The refusals once line `removed` is taken out: its own go, and every later
 * line's move up one, so each error stays on the line it was about.
 */
export function errorsWithoutLine(errors: Record<string, string>, removed: number): Record<string, string> {
	const kept: Record<string, string> = {}
	for (const [field, message] of Object.entries(errors)) {
		const match = /^lines\.(\d+)\.(.*)$/.exec(field)
		if (!match) {
			kept[field] = message
			continue
		}
		const index = Number(match[1])
		if (index === removed) continue
		kept[index > removed ? `lines.${index - 1}.${match[2]}` : field] = message
	}
	return kept
}

/** Where ADD Core reports a unit's serial being refused. */
export function serialErrorKey(lineIndex: number, unit: number): string {
	return `lines.${lineIndex}.serial_numbers.${unit}`
}

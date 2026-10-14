/**
 * The dashboard's state colours, as whole Tailwind class strings so the
 * scanner sees every one. A tone never stands alone: it rides with an icon,
 * a label or a border (.claude/rules/tokens-and-color.md).
 */
export type Tone = "success" | "warning" | "danger" | "primary" | "info" | "neutral"

export const TONE_FILL: Record<Tone, string> = {
	success: "bg-[var(--add-success)]",
	warning: "bg-[var(--add-warning)]",
	danger: "bg-[var(--add-danger)]",
	primary: "bg-[var(--add-primary)]",
	info: "bg-[var(--add-info)]",
	neutral: "bg-[var(--add-border)]"
}

export const TONE_TEXT: Record<Tone, string> = {
	success: "text-[var(--add-success-text)]",
	warning: "text-[var(--add-warning-text)]",
	danger: "text-[var(--add-danger-text)]",
	primary: "text-[var(--add-primary-text)]",
	info: "text-[var(--add-info-text)]",
	neutral: "text-[var(--add-text-muted)]"
}

/** A highlighted panel in the tone: a light wash under a 1px border. */
export const TONE_PANEL: Record<Tone, string> = {
	success: "border-[var(--add-success)]/40 bg-[var(--add-success)]/8",
	warning: "border-[var(--add-warning)]/60 bg-[var(--add-warning)]/10",
	danger: "border-[var(--add-danger)]/40 bg-[var(--add-danger)]/8",
	primary: "border-[var(--add-primary)]/40 bg-[var(--add-primary)]/8",
	info: "border-[var(--add-info)]/40 bg-[var(--add-info)]/8",
	neutral: "border-[var(--add-border)]/40 bg-[var(--add-surface-sunken)]"
}

/** How worrying a share is: under a quarter fine, under half watch, else act. */
export function shareTone(percent: number): Tone {
	if (percent >= 50) return "danger"
	if (percent >= 25) return "warning"
	return "success"
}

/** How good a rate is — resolved, collected: most of it, some of it, or little. */
export function rateTone(percent: number | null, good = 70, fair = 40): Tone {
	if (percent === null) return "neutral"
	if (percent >= good) return "success"
	return percent >= fair ? "warning" : "danger"
}

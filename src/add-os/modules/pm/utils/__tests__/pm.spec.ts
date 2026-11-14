import { describe, expect, it } from "vitest"

import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"
import { PROJECT_TONES, TASK_PRIORITIES, TASK_STATUSES } from "../../types/pm"
import { dueGroup, priorityTag, toneVar } from "../pm"

interface Messages {
	[key: string]: string | Messages
}

function lookup(messages: Messages, path: string): unknown {
	return path.split(".").reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Messages)[part] : undefined), messages)
}

const task = (over: Record<string, unknown>) => ({ status: "todo", due_on: null, ...over }) as Parameters<typeof dueGroup>[0]
const TODAY = "2026-11-14"

describe("dueGroup", () => {
	it("calls a task with no due date none", () => {
		expect(dueGroup(task({}), TODAY)).toBe("none")
	})

	it("calls a done task done, whatever its date", () => {
		expect(dueGroup(task({ status: "done", due_on: "2026-01-01" }), TODAY)).toBe("done")
	})

	it("draws the day boundaries: yesterday is overdue, today is today, tomorrow and +7 are this week, +8 is later", () => {
		expect(dueGroup(task({ due_on: "2026-11-13" }), TODAY)).toBe("overdue")
		expect(dueGroup(task({ due_on: "2026-11-14" }), TODAY)).toBe("today")
		expect(dueGroup(task({ due_on: "2026-11-15" }), TODAY)).toBe("week")
		expect(dueGroup(task({ due_on: "2026-11-21" }), TODAY)).toBe("week")
		expect(dueGroup(task({ due_on: "2026-11-22" }), TODAY)).toBe("later")
	})

	it("crosses a month and a year end", () => {
		expect(dueGroup(task({ due_on: "2027-01-03" }), "2026-12-27")).toBe("week")
		expect(dueGroup(task({ due_on: "2027-01-04" }), "2026-12-27")).toBe("later")
	})

	it("takes today as a Date too", () => {
		expect(dueGroup(task({ due_on: "2026-11-14" }), new Date(2026, 10, 14, 23, 59))).toBe("today")
	})
})

describe("toneVar", () => {
	it("maps every tone to a brand custom property, never a colour value", () => {
		for (const tone of PROJECT_TONES) {
			const value = toneVar(tone)
			expect(value).toMatch(/^var\(--add-brand-[a-z-]+\)$/)
			expect(value).not.toMatch(/#|rgb/)
		}
	})

	it("keeps the six tones apart", () => {
		expect(new Set(PROJECT_TONES.map(toneVar)).size).toBe(PROJECT_TONES.length)
	})
})

describe("priorityTag", () => {
	it("maps priorities onto Naive UI tag types", () => {
		expect(priorityTag("urgent")?.type).toBe("error")
		expect(priorityTag("high")?.type).toBe("warning")
		expect(priorityTag("normal")?.type).toBe("info")
		expect(priorityTag("low")?.type).toBe("default")
	})

	it("shows nothing for a task with no priority", () => {
		expect(priorityTag(null)).toBeNull()
	})
})

describe("catalogues", () => {
	it.each([
		["en", en],
		["ar", ar]
	])("labels every tone, priority, status and due group in %s", (_name, messages) => {
		const keys = [
			...PROJECT_TONES.map(tone => `pm.tone.${tone}`),
			...TASK_PRIORITIES.map(priority => priorityTag(priority)!.labelKey),
			...TASK_STATUSES.map(status => `pm.status.${status}`),
			...["overdue", "today", "week", "later", "none", "done"].map(group => `pm.due.${group}`)
		]
		const missing = keys.filter(key => typeof lookup(messages as Messages, key) !== "string")
		expect(missing).toEqual([])
	})
})

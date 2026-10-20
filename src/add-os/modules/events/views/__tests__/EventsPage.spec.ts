import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const FILE = path.resolve(__dirname, "..", "EventsPage.vue")
const source = readFileSync(FILE, "utf8")

describe("eventsPage wiring", () => {
	it("uses the events service methods and config", () => {
		expect(source).toContain('from "@/add-os/services/events"')
		expect(source).toContain('from "@/add-os/modules/events/config/events.config"')
		expect(source).toContain("removeEvent")
		expect(source).toContain("listEvents")
		expect(source).toContain("buildEventColumns")
	})

	it("renders ResourceStatCards and ResourceTable", () => {
		expect(source).toContain("<ResourceStatCards")
		expect(source).toContain("<ResourceTable")
	})

	it("navigates to dedicated create and edit pages instead of opening a modal", () => {
		expect(source).toContain('router.push("/community/events/create")')
		expect(source).toContain("router.push(`/community/events/${" + "row.id}/edit`)")
		expect(source).not.toContain("<ResourceFormDrawer")
	})

	it("translates titles and operations via vue-i18n", () => {
		expect(source).toContain('t("events.create.button")')
		expect(source).toContain('t("nav.pages.eventCategories")')
	})
})

import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const FILE = path.resolve(__dirname, "..", "EventsPage.vue")
const source = readFileSync(FILE, "utf8")

describe("eventsPage wiring", () => {
	it("uses the events service methods and config", () => {
		expect(source).toContain('from "@/add-os/services/events"')
		expect(source).toContain('from "@/add-os/modules/events/config/events.config"')
		expect(source).toContain("createEvent")
		expect(source).toContain("updateEvent")
		expect(source).toContain("removeEvent")
		expect(source).toContain("listEvents")
	})

	it("renders ResourceStatCards, ResourceTable and ResourceFormDrawer", () => {
		expect(source).toContain("<ResourceStatCards")
		expect(source).toContain("<ResourceTable")
		expect(source).toContain("<ResourceFormDrawer")
	})

	it("translates titles and operations via vue-i18n", () => {
		expect(source).toContain('t("events.create.button")')
		expect(source).toContain("t('events.create.title')")
		expect(source).toContain("t('events.edit.title')")
	})
})

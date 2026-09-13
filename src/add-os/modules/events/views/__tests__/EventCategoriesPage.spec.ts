import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const FILE = path.resolve(__dirname, "..", "EventCategoriesPage.vue")
const source = readFileSync(FILE, "utf8")

describe("eventCategoriesPage wiring", () => {
	it("uses the event-categories service methods and config", () => {
		expect(source).toContain('from "@/add-os/services/event-categories"')
		expect(source).toContain('from "@/add-os/modules/events/config/event-categories.config"')
		expect(source).toContain("createEventCategory")
		expect(source).toContain("updateEventCategory")
		expect(source).toContain("removeEventCategory")
		expect(source).toContain("listEventCategories")
	})

	it("renders ResourceStatCards, ResourceTable and ResourceFormDrawer", () => {
		expect(source).toContain("<ResourceStatCards")
		expect(source).toContain("<ResourceTable")
		expect(source).toContain("<ResourceFormDrawer")
	})

	it("translates titles and operations via vue-i18n", () => {
		expect(source).toContain('t("eventCategories.create.button")')
		expect(source).toContain("t('eventCategories.create.title')")
		expect(source).toContain("t('eventCategories.edit.title')")
	})
})

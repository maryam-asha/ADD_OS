import { describe, expect, it } from "vitest"
import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import { updateDocumentTitle } from "../index"

describe("document title updater", () => {
	it("sets document title based on route meta.title key in Arabic by default", () => {
		setCurrentLocale("ar")
		updateDocumentTitle({ meta: { title: "nav.pages.users" } } as any)
		expect(document.title).toBe("المستخدمون | ADD | Aleppo Digital District")
	})

	it("updates document title when locale changes to English", () => {
		setCurrentLocale("en")
		updateDocumentTitle({ meta: { title: "nav.pages.users" } } as any)
		expect(document.title).toBe("Users | ADD | Aleppo Digital District")
	})

	it("falls back to baseTitle when route has no meta.title", () => {
		updateDocumentTitle({ meta: {} } as any)
		expect(document.title).toBe("ADD | Aleppo Digital District")
	})
})
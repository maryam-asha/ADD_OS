import type { Project } from "@/add-os/modules/pm/types/pm"
import { flushPromises, mount } from "@vue/test-utils"
import { NSelect } from "naive-ui"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"
import PeopleSelect from "../PeopleSelect.vue"
import ProjectFormModal from "../ProjectFormModal.vue"

const m = vi.hoisted(() => ({
	createProject: vi.fn(),
	updateProject: vi.fn(),
	replaceMembers: vi.fn(),
	searchPeople: vi.fn()
}))

vi.mock("@/add-os/services/pm", () => ({
	createProject: m.createProject,
	updateProject: m.updateProject,
	replaceMembers: m.replaceMembers,
	searchPeople: m.searchPeople
}))

vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

const sara = { id: 5, name: "Sara Haddad", avatar_url: null }
const omar = { id: 6, name: "Omar Aziz", avatar_url: null }

function projectOf(overrides: Partial<Project> = {}): Project {
	return {
		id: 1,
		name: "Launch",
		description: null,
		tone: "teal",
		starts_on: null,
		ends_on: null,
		is_archived: false,
		lead: sara,
		members: [sara],
		counts: { total: 0, done: 0, open: 0, overdue: 0 },
		can: { manage: true, lead: true },
		...overrides
	}
}

function mountForm(project: Project | null) {
	const i18n = createI18n({ legacy: false, locale: "en", messages: { ar, en }, missingWarn: false, fallbackWarn: false })
	return mount(ProjectFormModal, { props: { show: true, project }, global: { plugins: [i18n] }, attachTo: document.body })
}

const click = (name: string) => document.body.querySelector<HTMLElement>(`[data-test='${name}']`)!.click()

type Wrapper = ReturnType<typeof mountForm>
const leadSelect = (wrapper: Wrapper) => wrapper.findAllComponents(NSelect).find(select => select.attributes("data-test") === "lead")!

/** What the person does: opens the people list (which loads the directory), then ticks the ones they want. */
async function chooseTeam(wrapper: Wrapper, ids: number[]) {
	const select = wrapper.findComponent(PeopleSelect).findComponent(NSelect)
	select.vm.$emit("update:show", true)
	await flushPromises()
	select.vm.$emit("update:value", ids)
	await flushPromises()
}

describe("projectFormModal", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		m.searchPeople.mockResolvedValue([sara, omar])
		m.updateProject.mockResolvedValue(projectOf())
		m.replaceMembers.mockResolvedValue(projectOf({ members: [sara, omar] }))
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	it("offers the chosen members, and only them, as the lead", async () => {
		const wrapper = mountForm(projectOf())
		await flushPromises()

		expect(leadSelect(wrapper).props("options")).toEqual([{ label: "Sara Haddad", value: 5 }])

		await chooseTeam(wrapper, [5, 6])
		await flushPromises()
		expect(leadSelect(wrapper).props("options")).toEqual([{ label: "Sara Haddad", value: 5 }, { label: "Omar Aziz", value: 6 }])
		wrapper.unmount()
	})

	it("clears the lead when they leave the team", async () => {
		const wrapper = mountForm(projectOf())
		await flushPromises()

		await chooseTeam(wrapper, [])
		await flushPromises()
		click("save")
		await flushPromises()

		expect(m.updateProject).toHaveBeenCalledWith(1, expect.objectContaining({ lead_user_id: null }))
		wrapper.unmount()
	})

	it("replaces the members before it saves the lead", async () => {
		const wrapper = mountForm(projectOf())
		await flushPromises()

		await chooseTeam(wrapper, [5, 6])
		await flushPromises()
		leadSelect(wrapper).vm.$emit("update:value", 6)
		await flushPromises()
		click("save")
		await flushPromises()

		expect(m.replaceMembers).toHaveBeenCalledWith(1, [5, 6])
		expect(m.updateProject).toHaveBeenCalledWith(1, expect.objectContaining({ lead_user_id: 6 }))
		expect(m.replaceMembers.mock.invocationCallOrder[0]).toBeLessThan(m.updateProject.mock.invocationCallOrder[0])
		wrapper.unmount()
	})

	it("tells the page to reload when the team went through but the project did not", async () => {
		m.updateProject.mockRejectedValueOnce(new Error("refused"))
		const wrapper = mountForm(projectOf())
		await flushPromises()

		await chooseTeam(wrapper, [5, 6])
		await flushPromises()
		click("save")
		await flushPromises()

		expect(wrapper.emitted("saved")).toHaveLength(1)
		expect(document.body.querySelector("[data-test='form-error']")).not.toBeNull()
		wrapper.unmount()
	})
})

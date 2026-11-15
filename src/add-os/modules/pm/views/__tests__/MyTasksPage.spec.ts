import type { Project, Task } from "@/add-os/modules/pm/types/pm"
import { flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"
import { ApiError } from "@/add-os/services/api"
import TaskPanel from "../../components/TaskPanel.vue"
import { dayString } from "../../utils/display"
import MyTasksPage from "../MyTasksPage.vue"

const m = vi.hoisted(() => ({
	listMyTasks: vi.fn(),
	myTaskCounts: vi.fn(),
	listProjects: vi.fn(),
	createTask: vi.fn(),
	getTask: vi.fn(),
	listTags: vi.fn(),
	searchPeople: vi.fn(),
	getProject: vi.fn(),
	error: vi.fn(),
	userId: { value: 7 }
}))

vi.mock("@/add-os/services/pm", () => ({
	listMyTasks: m.listMyTasks,
	myTaskCounts: m.myTaskCounts,
	listProjects: m.listProjects,
	createTask: m.createTask,
	getTask: m.getTask,
	listTags: m.listTags,
	searchPeople: m.searchPeople,
	getProject: m.getProject
}))

vi.mock("@/stores/auth", () => ({ useAuthStore: () => ({ user: { id: m.userId.value } }) }))

vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: m.error }) }
})

function offset(days: number): string {
	const date = new Date()
	date.setDate(date.getDate() + days)
	return dayString(date)
}

function taskOf(id: number, title: string, due: number | null, status: Task["status"] = "todo"): Task {
	return {
		id,
		project: { id: 1, name: "Launch", tone: "teal" },
		parent_id: null,
		title,
		description: null,
		status,
		priority: "high",
		starts_on: null,
		due_on: due === null ? null : offset(due),
		estimate_hours: null,
		sort_order: id,
		completed_at: null,
		created_by: 1,
		assignees: [],
		tags: [],
		subtask_counts: { total: 0, done: 0 },
		can: { edit: true, move: true, delete: true, assign: true }
	}
}

function projectOf(id: number, name: string, overrides: Partial<Project> = {}): Project {
	return {
		id,
		name,
		description: null,
		tone: "teal",
		starts_on: null,
		ends_on: null,
		is_archived: false,
		lead: null,
		members: [{ id: 7, name: "Me", avatar_url: null }],
		counts: { total: 1, done: 0, open: 1, overdue: 0 },
		can: { manage: false, lead: false },
		...overrides
	}
}

let mounted: ReturnType<typeof mount> | null = null

function mountPage() {
	const i18n = createI18n({ legacy: false, locale: "en", messages: { ar, en }, missingWarn: false, fallbackWarn: false })
	mounted = mount(MyTasksPage, { global: { plugins: [i18n] }, attachTo: document.body })
	return mounted
}

describe("myTasksPage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		m.userId.value = 7
		m.listMyTasks.mockResolvedValue([
			taskOf(1, "Late one", -2),
			taskOf(2, "Today one", 0),
			taskOf(3, "Soon one", 3),
			taskOf(4, "Far one", 30),
			taskOf(5, "Undated one", null),
			taskOf(6, "Finished one", -1, "done")
		])
		m.myTaskCounts.mockResolvedValue({ overdue: 1, today: 2, week: 3, completed: 4 })
		m.listProjects.mockResolvedValue([projectOf(1, "Launch"), projectOf(2, "Website", { members: [] }), projectOf(3, "Old", { is_archived: true })])
		m.createTask.mockResolvedValue(taskOf(9, "New", null))
		m.getTask.mockResolvedValue(taskOf(1, "Late one", -2))
		m.listTags.mockResolvedValue([])
		m.searchPeople.mockResolvedValue([])
		m.getProject.mockResolvedValue(projectOf(1, "Launch"))
	})

	afterEach(() => {
		mounted?.unmount()
		mounted = null
		document.body.innerHTML = ""
	})

	it("loads the assigned tasks first and sends the chosen scope", async () => {
		const wrapper = mountPage()
		await flushPromises()
		expect(m.listMyTasks).toHaveBeenLastCalledWith("assigned")

		await wrapper.find("[data-scope='created']").trigger("click")
		await flushPromises()
		expect(m.listMyTasks).toHaveBeenLastCalledWith("created")

		await wrapper.find("[data-scope='all']").trigger("click")
		await flushPromises()
		expect(m.listMyTasks).toHaveBeenLastCalledWith("all")
	})

	it("shows the four counters from the counts endpoint", async () => {
		const wrapper = mountPage()
		await flushPromises()
		const read = (key: string) => wrapper.find(`[data-counter='${key}']`).text()
		expect(read("overdue")).toContain("1")
		expect(read("today")).toContain("2")
		expect(read("week")).toContain("3")
		expect(read("completed")).toContain("4")
	})

	it("groups tasks by due date and keeps Completed collapsed", async () => {
		const wrapper = mountPage()
		await flushPromises()
		const titles = (group: string) => wrapper.findAll(`[data-group='${group}'] [data-task]`).map(row => row.text())
		expect(titles("overdue")).toEqual([expect.stringContaining("Late one")])
		expect(titles("today")).toEqual([expect.stringContaining("Today one")])
		expect(titles("week")).toEqual([expect.stringContaining("Soon one")])
		expect(titles("later")).toEqual([expect.stringContaining("Far one")])
		expect(titles("none")).toEqual([expect.stringContaining("Undated one")])
		expect(titles("done")).toEqual([])

		await wrapper.find("[data-toggle='done']").trigger("click")
		expect(titles("done")).toEqual([expect.stringContaining("Finished one")])
	})

	it("hides empty groups and shows an empty state when there are no tasks", async () => {
		m.listMyTasks.mockResolvedValue([taskOf(2, "Today one", 0)])
		const wrapper = mountPage()
		await flushPromises()
		expect(wrapper.find("[data-group='today']").exists()).toBe(true)
		expect(wrapper.find("[data-group='overdue']").exists()).toBe(false)

		m.listMyTasks.mockResolvedValue([])
		await wrapper.find("[data-scope='created']").trigger("click")
		await flushPromises()
		expect(wrapper.find("[data-test='no-tasks']").exists()).toBe(true)
	})

	it("opens the panel for a task and reads again when it changes", async () => {
		const wrapper = mountPage()
		await flushPromises()
		await wrapper.find("[data-task='2'] [data-test='open']").trigger("click")
		const panel = wrapper.findComponent(TaskPanel)
		expect(panel.props("taskId")).toBe(2)
		expect(panel.props("projectId")).toBe(1)

		m.listMyTasks.mockClear()
		m.myTaskCounts.mockClear()
		panel.vm.$emit("saved")
		await flushPromises()
		expect(m.listMyTasks).toHaveBeenCalledTimes(1)
		expect(m.myTaskCounts).toHaveBeenCalledTimes(1)
	})

	it("quick-adds a task for oneself in the chosen project, then refreshes", async () => {
		const wrapper = mountPage()
		await flushPromises()
		const input = wrapper.find("[data-test='quick-add'] input")
		await input.setValue("  Write the report  ")
		m.listMyTasks.mockClear()
		m.myTaskCounts.mockClear()
		await input.trigger("keydown", { key: "Enter" })
		await flushPromises()

		expect(m.createTask).toHaveBeenCalledWith(1, { title: "Write the report", assignee_ids: [7] })
		expect(m.listMyTasks).toHaveBeenCalledTimes(1)
		expect(m.myTaskCounts).toHaveBeenCalledTimes(1)
		expect((wrapper.find("[data-test='quick-add'] input").element as HTMLInputElement).value).toBe("")
	})

	it("ignores an empty title and offers only open projects the account belongs to", async () => {
		const wrapper = mountPage()
		await flushPromises()
		const input = wrapper.find("[data-test='quick-add'] input")
		await input.setValue("   ")
		await input.trigger("keydown", { key: "Enter" })
		await flushPromises()
		expect(m.createTask).not.toHaveBeenCalled()
		const offered = wrapper.findComponent({ name: "QuickAddTask" }).props("projects") as Project[]
		expect(offered.map(project => project.id)).toEqual([1])
	})

	it("shows the translated refusal and keeps the title", async () => {
		m.createTask.mockRejectedValue(new ApiError(403, JSON.stringify({ message: "raw", code: "project_archived" })))
		const wrapper = mountPage()
		await flushPromises()
		const input = wrapper.find("[data-test='quick-add'] input")
		await input.setValue("Try")
		await input.trigger("keydown", { key: "Enter" })
		await flushPromises()
		expect(m.error).toHaveBeenCalledWith(en.pm.refusal.project_archived)
		expect((wrapper.find("[data-test='quick-add'] input").element as HTMLInputElement).value).toBe("Try")
	})

	it("hides quick add when the account is in no open project", async () => {
		m.listProjects.mockResolvedValue([projectOf(2, "Website", { members: [] })])
		const wrapper = mountPage()
		await flushPromises()
		expect(wrapper.find("[data-test='quick-add']").exists()).toBe(false)
	})
})

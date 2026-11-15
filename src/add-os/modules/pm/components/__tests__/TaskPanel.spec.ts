import type { Project, Task } from "@/add-os/modules/pm/types/pm"
import { flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"
import { ApiError } from "@/add-os/services/api"
import TaskPanel from "../TaskPanel.vue"

const m = vi.hoisted(() => ({
	getTask: vi.fn(),
	getProject: vi.fn(),
	listTags: vi.fn(),
	updateTask: vi.fn(),
	createTask: vi.fn(),
	deleteTask: vi.fn(),
	moveTask: vi.fn(),
	userId: { value: 99 }
}))

vi.mock("@/add-os/services/pm", () => ({
	getTask: m.getTask,
	getProject: m.getProject,
	listTags: m.listTags,
	updateTask: m.updateTask,
	createTask: m.createTask,
	deleteTask: m.deleteTask,
	moveTask: m.moveTask
}))

vi.mock("@/stores/auth", () => ({ useAuthStore: () => ({ user: { id: m.userId.value } }) }))

vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

const me = { id: 99, name: "Maya Member", avatar_url: null }
const sara = { id: 5, name: "Sara Haddad", avatar_url: null }

function projectOf(overrides: Partial<Project> = {}): Project {
	return {
		id: 1,
		name: "Launch",
		description: null,
		tone: "teal",
		starts_on: null,
		ends_on: null,
		is_archived: false,
		lead: null,
		members: [me, sara],
		counts: { total: 2, done: 0, open: 2, overdue: 0 },
		can: { manage: true, lead: false },
		...overrides
	}
}

function subtaskOf(overrides: Partial<Task> = {}): Task {
	return {
		id: 20,
		project: { id: 1, name: "Launch", tone: "teal" },
		parent_id: 10,
		title: "Collect references",
		description: null,
		status: "todo",
		priority: null,
		starts_on: null,
		due_on: null,
		estimate_hours: null,
		sort_order: 1,
		completed_at: null,
		created_by: 5,
		assignees: [],
		tags: [],
		subtask_counts: { total: 0, done: 0 },
		can: { edit: true, move: true, delete: true, assign: true },
		...overrides
	}
}

function taskOf(overrides: Partial<Task> = {}): Task {
	return {
		id: 10,
		project: { id: 1, name: "Launch", tone: "teal" },
		parent_id: null,
		title: "Draft the brief",
		description: "Two pages",
		status: "todo",
		priority: "high",
		starts_on: "2026-12-05",
		due_on: "2026-12-10",
		estimate_hours: 4,
		sort_order: 1,
		completed_at: null,
		created_by: 5,
		assignees: [sara],
		tags: [],
		subtask_counts: { total: 1, done: 0 },
		subtasks: [subtaskOf()],
		can: { edit: true, move: true, delete: true, assign: true },
		...overrides
	}
}

function mountPanel(props: { taskId: number | null, initialStatus?: Task["status"] }) {
	const i18n = createI18n({ legacy: false, locale: "en", messages: { ar, en }, missingWarn: false, fallbackWarn: false })
	return mount(TaskPanel, { props: { show: true, projectId: 1, ...props }, global: { plugins: [i18n] }, attachTo: document.body })
}

const body = () => document.body
const field = (name: string) => body().querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-test='${name}'] input, [data-test='${name}'] textarea`)
const click = (name: string) => body().querySelector<HTMLElement>(`[data-test='${name}']`)!.click()

async function type(name: string, value: string) {
	const input = field(name)!
	input.value = value
	input.dispatchEvent(new Event("input", { bubbles: true }))
	await flushPromises()
}

describe("taskPanel", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		m.userId.value = 99
		m.getTask.mockResolvedValue(taskOf())
		m.getProject.mockResolvedValue(projectOf())
		m.listTags.mockResolvedValue([])
		m.updateTask.mockResolvedValue(taskOf())
		m.createTask.mockResolvedValue(taskOf())
		m.moveTask.mockResolvedValue(taskOf({ status: "done" }))
		m.deleteTask.mockResolvedValue({})
	})

	// A closed drawer's teleported markup outlives the wrapper in jsdom; the next test must not find it.
	afterEach(() => {
		document.body.innerHTML = ""
	})

	it("loads the task, its project and its subtasks when it opens", async () => {
		const wrapper = mountPanel({ taskId: 10 })
		await flushPromises()

		expect(m.getTask).toHaveBeenCalledWith(10)
		expect(m.getProject).toHaveBeenCalledWith(1)
		expect(field("title")!.value).toBe("Draft the brief")
		expect(body().textContent).toContain("Collect references")
		wrapper.unmount()
	})

	it("shows read-only fields to a member who may not edit the task", async () => {
		m.getTask.mockResolvedValue(taskOf({ can: { edit: false, move: false, delete: false, assign: false } }))
		const wrapper = mountPanel({ taskId: 10 })
		await flushPromises()

		expect(field("title")!.disabled).toBe(true)
		expect(body().querySelector("[data-test='save']")).toBeNull()
		expect(body().querySelector("[data-test='delete']")).toBeNull()
		expect(body().querySelector("[data-test='complete']")).toBeNull()
		wrapper.unmount()
	})

	it("moves the task to done with Mark complete", async () => {
		const wrapper = mountPanel({ taskId: 10 })
		await flushPromises()

		click("complete")
		await flushPromises()

		expect(m.moveTask).toHaveBeenCalledWith(10, "done")
		expect(wrapper.emitted("saved")).toBeTruthy()
		wrapper.unmount()
	})

	it("adds a subtask under the task with parent_id", async () => {
		const wrapper = mountPanel({ taskId: 10 })
		await flushPromises()

		await type("subtask-title", "Book the room")
		click("subtask-add")
		await flushPromises()

		expect(m.createTask).toHaveBeenCalledWith(1, { title: "Book the room", parent_id: 10 })
		wrapper.unmount()
	})

	it("shows a 422 under its field and keeps the panel open", async () => {
		m.updateTask.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "x", errors: { due_on: ["The due date can't be before the start date."] } })))
		const wrapper = mountPanel({ taskId: 10 })
		await flushPromises()

		await type("title", "Draft the brief v2")
		click("save")
		await flushPromises()

		expect(m.updateTask).toHaveBeenCalled()
		expect(body().querySelector("[data-test='due-field']")!.textContent).toContain("can't be before the start date")
		expect(wrapper.emitted("saved")).toBeFalsy()
		expect(wrapper.emitted("update:show")).toBeFalsy()
		wrapper.unmount()
	})

	it("creates a task as a member for themselves: no assignee_ids, the column's status", async () => {
		m.getProject.mockResolvedValue(projectOf({ can: { manage: false, lead: false } }))
		const wrapper = mountPanel({ taskId: null, initialStatus: "review" })
		await flushPromises()

		expect(m.getTask).not.toHaveBeenCalled()
		await type("title", "New thing")
		click("save")
		await flushPromises()

		const payload = m.createTask.mock.calls[0][1] as Record<string, unknown>
		expect(m.createTask.mock.calls[0][0]).toBe(1)
		expect(payload.title).toBe("New thing")
		expect(payload.status).toBe("review")
		expect("assignee_ids" in payload).toBe(false)
		expect(wrapper.emitted("saved")).toBeTruthy()
		wrapper.unmount()
	})

	it("sends the chosen assignees when a manager creates a task", async () => {
		const wrapper = mountPanel({ taskId: null })
		await flushPromises()

		await type("title", "Managed")
		click("save")
		await flushPromises()

		const payload = m.createTask.mock.calls[0][1] as Record<string, unknown>
		expect(payload.assignee_ids).toEqual([])
		expect(payload.status).toBe("todo")
		wrapper.unmount()
	})
})

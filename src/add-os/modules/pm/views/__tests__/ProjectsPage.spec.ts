import type { Project, Task } from "@/add-os/modules/pm/types/pm"
import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"
import TaskBoard from "../../components/TaskBoard.vue"
import TaskPanel from "../../components/TaskPanel.vue"
import ProjectsPage from "../ProjectsPage.vue"

const m = vi.hoisted(() => ({
	listProjects: vi.fn(),
	listProjectTasks: vi.fn(),
	listTags: vi.fn(),
	searchPeople: vi.fn(),
	moveTask: vi.fn(),
	createProject: vi.fn(),
	updateProject: vi.fn(),
	replaceMembers: vi.fn(),
	getTask: vi.fn(),
	getProject: vi.fn(),
	manage: { value: true },
	userId: { value: 99 }
}))

vi.mock("@/add-os/services/pm", () => ({
	listProjects: m.listProjects,
	listProjectTasks: m.listProjectTasks,
	listTags: m.listTags,
	searchPeople: m.searchPeople,
	moveTask: m.moveTask,
	createProject: m.createProject,
	updateProject: m.updateProject,
	replaceMembers: m.replaceMembers,
	getTask: m.getTask,
	getProject: m.getProject
}))

vi.mock("@/add-os/config/permissions", async importOriginal => ({
	...await importOriginal<typeof import("@/add-os/config/permissions")>(),
	canManageProjects: () => m.manage.value
}))

vi.mock("@/stores/auth", () => ({ useAuthStore: () => ({ user: { id: m.userId.value } }) }))

vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

// The page keeps `?project=` and `?view=`; a reactive route stands in for the router.
vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	const { reactive } = await import("vue")
	const route = reactive<{ query: Record<string, string> }>({ query: {} })
	const replace = vi.fn(async (to: { query: Record<string, string> }) => {
		route.query = { ...to.query }
	})
	return { ...actual, useRoute: () => route, useRouter: () => ({ replace }), __route: route }
})

const router = await import("vue-router") as unknown as { __route: { query: Record<string, string> } }

function projectOf(id: number, name: string, open: number, overrides: Partial<Project> = {}): Project {
	return {
		id,
		name,
		description: null,
		tone: "teal",
		starts_on: null,
		ends_on: null,
		is_archived: false,
		lead: null,
		members: [],
		counts: { total: open + 1, done: 1, open, overdue: 0 },
		can: { manage: true, lead: false },
		...overrides
	}
}

function taskOf(id: number, title: string, status: Task["status"]): Task {
	return {
		id,
		project: { id: 1, name: "Launch", tone: "teal" },
		parent_id: null,
		title,
		description: null,
		status,
		priority: "high",
		starts_on: null,
		due_on: "2026-12-01",
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

function mountPage() {
	const i18n = createI18n({ legacy: false, locale: "en", messages: { ar, en }, missingWarn: false, fallbackWarn: false })
	return mount(ProjectsPage, { global: { plugins: [i18n] }, attachTo: document.body })
}

describe("projectsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		m.manage.value = true
		m.userId.value = 99
		router.__route.query = {}
		m.listProjects.mockResolvedValue([projectOf(1, "Launch", 4), projectOf(2, "Website", 7)])
		m.listProjectTasks.mockResolvedValue([taskOf(10, "Draft the brief", "todo"), taskOf(11, "Review copy", "review")])
		m.listTags.mockResolvedValue([])
		m.searchPeople.mockResolvedValue([])
		m.moveTask.mockResolvedValue(taskOf(10, "Draft the brief", "review"))
		m.getProject.mockResolvedValue(projectOf(1, "Launch", 4))
		m.getTask.mockResolvedValue(taskOf(10, "Draft the brief", "todo"))
	})

	it("lists the visible projects as chips with their open counts", async () => {
		const wrapper = mountPage()
		await flushPromises()

		const chips = wrapper.findAll("[data-project]")
		expect(chips.map(chip => chip.attributes("data-project"))).toEqual(["1", "2"])
		expect(chips[0].text()).toContain("Launch")
		expect(chips[0].text()).toContain("4")
		expect(chips[1].text()).toContain("7")
		wrapper.unmount()
	})

	it("shows New project only to an account that manages projects", async () => {
		const yes = mountPage()
		await flushPromises()
		expect(yes.find("[data-test='new-project']").exists()).toBe(true)
		yes.unmount()

		m.manage.value = false
		const no = mountPage()
		await flushPromises()
		expect(no.find("[data-test='new-project']").exists()).toBe(false)
		no.unmount()
	})

	it("shows the same tasks on the Board and on the List", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(m.listProjectTasks).toHaveBeenCalledWith(1, expect.anything())
		expect(wrapper.find("[data-test='board']").exists()).toBe(true)
		expect(wrapper.text()).toContain("Draft the brief")
		expect(wrapper.text()).toContain("Review copy")

		await wrapper.find("[data-view='list']").trigger("click")
		await flushPromises()

		expect(wrapper.find("[data-test='board']").exists()).toBe(false)
		expect(wrapper.text()).toContain("Draft the brief")
		expect(wrapper.text()).toContain("Review copy")
		wrapper.unmount()
	})

	it("keeps ?project= and ?view= in the URL", async () => {
		const wrapper = mountPage()
		await flushPromises()

		await wrapper.find("[data-project='2']").trigger("click")
		await flushPromises()
		expect(router.__route.query.project).toBe("2")
		expect(m.listProjectTasks).toHaveBeenLastCalledWith(2, expect.anything())

		await wrapper.find("[data-view='list']").trigger("click")
		expect(router.__route.query).toEqual({ project: "2", view: "list" })
		wrapper.unmount()
	})

	it("opens on the project and view the URL names", async () => {
		router.__route.query = { project: "2", view: "list" }
		const wrapper = mountPage()
		await flushPromises()

		expect(m.listProjectTasks).toHaveBeenCalledWith(2, expect.anything())
		expect(wrapper.find("[data-test='board']").exists()).toBe(false)
		wrapper.unmount()
	})

	it("shows Edit by the project's own can.manage, not the global permission", async () => {
		m.listProjects.mockResolvedValue([projectOf(1, "Launch", 4, { can: { manage: false, lead: false } })])
		const no = mountPage()
		await flushPromises()
		expect(m.manage.value).toBe(true)
		expect(no.find("[data-test='edit-project']").exists()).toBe(false)
		no.unmount()

		m.listProjects.mockResolvedValue([projectOf(1, "Launch", 4, { is_archived: true })])
		const archived = mountPage()
		await flushPromises()
		expect(archived.find("[data-test='edit-project']").exists()).toBe(true)
		archived.unmount()
	})

	it("shows a loading state while the projects are being read", async () => {
		let release: (rows: Project[]) => void = () => {}
		m.listProjects.mockReturnValue(new Promise<Project[]>((resolve) => {
			release = resolve
		}))
		const wrapper = mountPage()
		await flushPromises()
		expect(wrapper.find("[data-test='projects-loading']").exists()).toBe(true)

		release([projectOf(1, "Launch", 4)])
		await flushPromises()
		expect(wrapper.find("[data-test='projects-loading']").exists()).toBe(false)
		expect(wrapper.find("[data-project='1']").exists()).toBe(true)
		wrapper.unmount()
	})

	it("offers Add a task to a runner, a lead or a member, never to a plain viewer", async () => {
		const viewer = { can: { manage: false, lead: false } }
		m.listProjects.mockResolvedValue([projectOf(1, "Launch", 4, viewer)])
		const plain = mountPage()
		await flushPromises()
		expect(plain.find("[data-test='add']").exists()).toBe(false)
		plain.unmount()

		m.listProjects.mockResolvedValue([projectOf(1, "Launch", 4, { ...viewer, members: [{ id: 99, name: "Me", avatar_url: null }] })])
		const member = mountPage()
		await flushPromises()
		expect(member.find("[data-test='add']").exists()).toBe(true)
		member.unmount()

		m.listProjects.mockResolvedValue([projectOf(1, "Launch", 4, { can: { manage: false, lead: true } })])
		const lead = mountPage()
		await flushPromises()
		expect(lead.find("[data-test='add']").exists()).toBe(true)
		lead.unmount()
	})

	it("moves a dropped card, and reads the board again when the move is refused", async () => {
		m.moveTask.mockRejectedValueOnce(new Error("refused"))
		const wrapper = mountPage()
		await flushPromises()
		const before = m.listProjectTasks.mock.calls.length

		wrapper.findComponent(TaskBoard).vm.$emit("moved", 10, "review", [10, 11])
		await flushPromises()

		expect(m.moveTask).toHaveBeenCalledWith(10, "review", [10, 11])
		expect(m.listProjectTasks.mock.calls.length).toBeGreaterThan(before)
		wrapper.unmount()
	})

	it("opens the task panel on a card, and a new one in the column it was added to", async () => {
		const wrapper = mountPage()
		await flushPromises()

		wrapper.findComponent(TaskBoard).vm.$emit("open", taskOf(10, "Draft the brief", "todo"))
		await flushPromises()
		expect(m.getTask).toHaveBeenCalledWith(10)
		expect(wrapper.findComponent(TaskPanel).props("taskId")).toBe(10)

		wrapper.findComponent(TaskBoard).vm.$emit("add", "review")
		await flushPromises()
		expect(wrapper.findComponent(TaskPanel).props("taskId")).toBeNull()
		expect(wrapper.findComponent(TaskPanel).props("initialStatus")).toBe("review")
		wrapper.unmount()
	})
})

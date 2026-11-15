import type { Task } from "@/add-os/modules/pm/types/pm"
import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import { createI18n } from "vue-i18n"
import draggable from "vuedraggable"
import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"
import TaskBoard from "../TaskBoard.vue"

function taskOf(id: number, overrides: Partial<Task> = {}): Task {
	return {
		id,
		project: { id: 1, name: "Launch", tone: "teal" },
		parent_id: null,
		title: `Task ${id}`,
		description: null,
		status: "todo",
		priority: "normal",
		starts_on: null,
		due_on: null,
		estimate_hours: null,
		sort_order: id,
		completed_at: null,
		created_by: 1,
		assignees: [{ id: 5, name: "Sara Haddad", avatar_url: null }],
		tags: [],
		subtask_counts: { total: 0, done: 0 },
		can: { edit: true, move: true, delete: true, assign: true },
		...overrides
	}
}

function mountBoard(tasks: Task[]) {
	const i18n = createI18n({ legacy: false, locale: "en", messages: { ar, en }, missingWarn: false, fallbackWarn: false })
	return mount(TaskBoard, { props: { tasks }, global: { plugins: [i18n] } })
}

describe("taskBoard", () => {
	const tasks = [
		taskOf(1),
		taskOf(2, { status: "todo", can: { edit: false, move: false, delete: false, assign: false } }),
		taskOf(3, { status: "in_progress" }),
		taskOf(4, { status: "done" })
	]

	it("draws four columns in status order, each with its count", () => {
		const wrapper = mountBoard(tasks)
		const columns = wrapper.findAll("[data-column]")

		expect(columns.map(column => column.attributes("data-column"))).toEqual(["todo", "in_progress", "review", "done"])
		expect(columns[0].find("[data-test='count']").text()).toBe("2")
		expect(columns[1].find("[data-test='count']").text()).toBe("1")
		expect(columns[2].find("[data-test='count']").text()).toBe("0")
		expect(columns[3].find("[data-test='count']").text()).toBe("1")
	})

	it("gives a drag handle only to a card the reader may move", () => {
		const wrapper = mountBoard(tasks)

		expect(wrapper.find("[data-task='1'] [data-test='drag-handle']").exists()).toBe(true)
		expect(wrapper.find("[data-task='2'] [data-test='drag-handle']").exists()).toBe(false)
	})

	it("reports a drop with the target column's ids, top to bottom", () => {
		const wrapper = mountBoard(tasks)
		const review = wrapper.findAllComponents(draggable)[2]
		const dropped = tasks[0]

		review.vm.$emit("update:modelValue", [dropped])
		review.vm.$emit("change", { added: { element: dropped, newIndex: 0 } })

		expect(wrapper.emitted("moved")).toEqual([[1, "review", [1]]])
	})

	it("reports a reorder inside a column", () => {
		const wrapper = mountBoard(tasks)
		const todo = wrapper.findAllComponents(draggable)[0]

		todo.vm.$emit("update:modelValue", [tasks[1], tasks[0]])
		todo.vm.$emit("change", { moved: { element: tasks[0], oldIndex: 0, newIndex: 1 } })

		expect(wrapper.emitted("moved")).toEqual([[1, "todo", [2, 1]]])
	})

	it("opens a card and asks to add a task in a column", async () => {
		const wrapper = mountBoard(tasks)

		await wrapper.find("[data-task='3'] [data-test='open']").trigger("click")
		await wrapper.find("[data-column='review'] [data-test='add']").trigger("click")

		expect(wrapper.emitted("open")).toEqual([[tasks[2]]])
		expect(wrapper.emitted("add")).toEqual([["review"]])
	})
})

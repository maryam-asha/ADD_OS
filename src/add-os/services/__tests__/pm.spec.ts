import { beforeEach, describe, expect, it, vi } from "vitest"

import {
	createProject,
	createTask,
	deleteTask,
	getProject,
	getTask,
	listMyTasks,
	listProjects,
	listProjectTasks,
	listTags,
	moveTask,
	myTaskCounts,
	replaceMembers,
	searchPeople,
	updateProject,
	updateTask
} from "../pm"

const { getMock, postMock, putMock, patchMock, delMock } = vi.hoisted(() => ({
	getMock: vi.fn(),
	postMock: vi.fn(),
	putMock: vi.fn(),
	patchMock: vi.fn(),
	delMock: vi.fn()
}))

vi.mock("../api", () => ({ get: getMock, post: postMock, put: putMock, patch: patchMock, del: delMock }))

describe("pm service", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("lists projects, asking for archived ones only when told to", async () => {
		getMock.mockResolvedValue({ data: [{ id: 1 }] })
		expect(await listProjects()).toEqual([{ id: 1 }])
		expect(getMock).toHaveBeenCalledWith("/api/v1/pm/projects", {})

		await listProjects({ archived: true })
		expect(getMock).toHaveBeenLastCalledWith("/api/v1/pm/projects", { archived: 1 })
	})

	it("reads one project", async () => {
		getMock.mockResolvedValue({ data: { id: 4 } })
		expect(await getProject(4)).toEqual({ id: 4 })
		expect(getMock).toHaveBeenCalledWith("/api/v1/pm/projects/4")
	})

	it("creates, updates and re-teams a project", async () => {
		postMock.mockResolvedValue({ data: { id: 5 } })
		await createProject({ name: "Launch", tone: "olive", members: [2, 3], lead_user_id: 2 })
		expect(postMock).toHaveBeenCalledWith("/api/v1/pm/projects", { name: "Launch", tone: "olive", members: [2, 3], lead_user_id: 2 })

		patchMock.mockResolvedValue({ data: { id: 5 }, message: "Saved" })
		const saved = await updateProject(5, { is_archived: true })
		expect(patchMock).toHaveBeenCalledWith("/api/v1/pm/projects/5", { is_archived: true })
		expect(saved).toEqual({ id: 5 })

		putMock.mockResolvedValue({ data: { id: 5 } })
		await replaceMembers(5, [1, 2])
		expect(putMock).toHaveBeenCalledWith("/api/v1/pm/projects/5/members", { members: [1, 2] })
	})

	it("lists a project's tasks with only the filters that are set", async () => {
		getMock.mockResolvedValue({ data: [{ id: 9 }] })
		const rows = await listProjectTasks(3, { assignee: 7, status: "review", priority: null, due: "overdue", q: "" })
		expect(rows).toEqual([{ id: 9 }])
		expect(getMock).toHaveBeenCalledWith("/api/v1/pm/projects/3/tasks", { assignee: 7, status: "review", due: "overdue" })

		await listProjectTasks(3, {})
		expect(getMock).toHaveBeenLastCalledWith("/api/v1/pm/projects/3/tasks", {})
	})

	it("reads one task, subtasks included", async () => {
		getMock.mockResolvedValue({ data: { id: 8, subtasks: [] } })
		expect(await getTask(8)).toEqual({ id: 8, subtasks: [] })
		expect(getMock).toHaveBeenCalledWith("/api/v1/pm/tasks/8")
	})

	it("creates, updates, moves and deletes a task", async () => {
		postMock.mockResolvedValue({ data: { id: 11 } })
		await createTask(3, { title: "Draw it", assignee_ids: [2], tag_ids: [1] })
		expect(postMock).toHaveBeenCalledWith("/api/v1/pm/projects/3/tasks", { title: "Draw it", assignee_ids: [2], tag_ids: [1] })

		patchMock.mockResolvedValue({ data: { id: 11 } })
		await updateTask(11, { due_on: "2026-11-20" })
		expect(patchMock).toHaveBeenCalledWith("/api/v1/pm/tasks/11", { due_on: "2026-11-20" })

		postMock.mockResolvedValue({ data: { id: 11, status: "done" } })
		await moveTask(11, "done", [4, 11])
		expect(postMock).toHaveBeenLastCalledWith("/api/v1/pm/tasks/11/move", { status: "done", order: [4, 11] })

		await moveTask(11, "todo")
		expect(postMock).toHaveBeenLastCalledWith("/api/v1/pm/tasks/11/move", { status: "todo" })

		delMock.mockResolvedValue({ message: "Deleted" })
		await deleteTask(11)
		expect(delMock).toHaveBeenCalledWith("/api/v1/pm/tasks/11")
	})

	it("lists my tasks by scope and counts them", async () => {
		getMock.mockResolvedValue({ data: [] })
		await listMyTasks("created")
		expect(getMock).toHaveBeenCalledWith("/api/v1/pm/tasks", { scope: "created" })

		await listMyTasks()
		expect(getMock).toHaveBeenLastCalledWith("/api/v1/pm/tasks", { scope: "assigned" })

		getMock.mockResolvedValue({ data: { overdue: 1, today: 2, week: 3, completed: 4 } })
		expect(await myTaskCounts()).toEqual({ overdue: 1, today: 2, week: 3, completed: 4 })
		expect(getMock).toHaveBeenLastCalledWith("/api/v1/pm/tasks/counts")
	})

	it("searches people and lists tags", async () => {
		getMock.mockResolvedValue({ data: [{ id: 1, name: "Lina", avatar_url: null }] })
		expect(await searchPeople("li")).toEqual([{ id: 1, name: "Lina", avatar_url: null }])
		expect(getMock).toHaveBeenCalledWith("/api/v1/pm/people", { q: "li" })

		getMock.mockResolvedValue({ data: [{ id: 2, name: "Design", tone: "teal" }] })
		expect(await listTags()).toEqual([{ id: 2, name: "Design", tone: "teal" }])
		expect(getMock).toHaveBeenLastCalledWith("/api/v1/pm/tags")
	})
})

/**
 * Project management (`add/pm` in ADD Core) under `/api/v1/pm`. Mounted like
 * HR, inside the dashboard group: every dashboard account gets in and each
 * route decides by membership of the project, or by `pm.projects.manage`
 * (creating and editing projects, the team, tags). Reads and creates answer
 * `{data}`; deletes answer `{message}`. A refusal is `{message, code}`.
 *
 * Routes and shapes read from ADD Core `packages/add/pm/routes/admin.php`,
 * `src/Http/Resources` and `src/Http/Requests`.
 */

import type {
	MyTaskScope,
	Person,
	Project,
	ProjectPayload,
	Tag,
	Task,
	TaskCounts,
	TaskFilters,
	TaskPayload,
	TaskStatus
} from "@/add-os/modules/pm/types/pm"
import { del, get, patch, post, put } from "./api"
import { rowsOf } from "./pagination"

const BASE = "/api/v1/pm"

/** The filters that are set: an unset, null or empty one is never sent. */
function setFilters(filters: TaskFilters): Record<string, unknown> {
	const query: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(filters)) {
		if (value !== undefined && value !== null && value !== "") query[key] = value
	}
	return query
}

// ── Projects ────────────────────────────────────────────────────────────────

/** The projects the account may see; archived ones only with `archived`. */
export async function listProjects(options: { archived?: boolean } = {}): Promise<Project[]> {
	const query: Record<string, unknown> = {}
	if (options.archived) query.archived = 1
	return rowsOf<Project>((await get<{ data: Project[] }>(`${BASE}/projects`, query)).data)
}

export async function getProject(id: number): Promise<Project> {
	return (await get<{ data: Project }>(`${BASE}/projects/${id}`)).data
}

export async function createProject(payload: ProjectPayload): Promise<Project> {
	return (await post<{ data: Project }>(`${BASE}/projects`, payload)).data
}

/** Everything but the team, which has its own route. */
export async function updateProject(id: number, payload: ProjectPayload): Promise<Project> {
	return (await patch<{ data: Project }>(`${BASE}/projects/${id}`, payload)).data
}

/** The whole team, as user ids. */
export async function replaceMembers(id: number, members: number[]): Promise<Project> {
	return (await put<{ data: Project }>(`${BASE}/projects/${id}/members`, { members })).data
}

// ── Tasks ───────────────────────────────────────────────────────────────────

/** A project's top-level tasks, filtered. */
export async function listProjectTasks(projectId: number, filters: TaskFilters = {}): Promise<Task[]> {
	return rowsOf<Task>((await get<{ data: Task[] }>(`${BASE}/projects/${projectId}/tasks`, setFilters(filters))).data)
}

/** One task, with its `subtasks` listed in full. */
export async function getTask(id: number): Promise<Task> {
	return (await get<{ data: Task }>(`${BASE}/tasks/${id}`)).data
}

export async function createTask(projectId: number, payload: TaskPayload): Promise<Task> {
	return (await post<{ data: Task }>(`${BASE}/projects/${projectId}/tasks`, payload)).data
}

export async function updateTask(id: number, payload: TaskPayload): Promise<Task> {
	return (await patch<{ data: Task }>(`${BASE}/tasks/${id}`, payload)).data
}

/** Drops a card in a column; `order` is that column's task ids as the person left it. */
export async function moveTask(id: number, status: TaskStatus, order?: number[]): Promise<Task> {
	const body: { status: TaskStatus; order?: number[] } = { status }
	if (order) body.order = order
	return (await post<{ data: Task }>(`${BASE}/tasks/${id}/move`, body)).data
}

export async function deleteTask(id: number): Promise<{ message?: string }> {
	return del<{ message?: string }>(`${BASE}/tasks/${id}`)
}

/** The signed-in account's tasks, soonest due first. */
export async function listMyTasks(scope: MyTaskScope = "assigned", filters: TaskFilters = {}): Promise<Task[]> {
	const query = { ...setFilters(filters), scope }
	return rowsOf<Task>((await get<{ data: Task[] }>(`${BASE}/tasks`, query)).data)
}

export async function myTaskCounts(): Promise<TaskCounts> {
	return (await get<{ data: TaskCounts }>(`${BASE}/tasks/counts`)).data
}

// ── People and tags ─────────────────────────────────────────────────────────

/** Up to twenty accounts whose name matches `q`. */
export async function searchPeople(q: string): Promise<Person[]> {
	return rowsOf<Person>((await get<{ data: Person[] }>(`${BASE}/people`, { q })).data)
}

export async function listTags(): Promise<Tag[]> {
	return rowsOf<Tag>((await get<{ data: Tag[] }>(`${BASE}/tags`)).data)
}

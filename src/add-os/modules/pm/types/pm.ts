/**
 * Project management (`add/pm` package in ADD Core, mounted under
 * `/api/v1/pm`). Shapes taken from the package's API resources
 * (`Http/Resources/{Project,Task,Tag}Resource.php`) and its form requests.
 *
 * Dates are `Y-m-d` days; `completed_at` is an ISO-8601 instant.
 */

export const PROJECT_TONES = ["olive", "teal", "slate", "green", "cyan", "stone"] as const
export type ProjectTone = (typeof PROJECT_TONES)[number]

export const TASK_STATUSES = ["todo", "in_progress", "review", "done"] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_PRIORITIES = ["urgent", "high", "normal", "low"] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

/** A person from ADD Core's people directory. */
export interface Person {
	id: number
	name: string
	avatar_url: string | null
}

export interface Tag {
	id: number
	name: string
	tone: ProjectTone
}

export interface ProjectCounts {
	total: number
	done: number
	open: number
	overdue: number
}

export interface Project {
	id: number
	name: string
	description: string | null
	tone: ProjectTone
	starts_on: string | null
	ends_on: string | null
	is_archived: boolean
	lead: Person | null
	members: Person[]
	counts: ProjectCounts
	/** `manage`: holds `pm.projects.manage`; `lead`: is its lead or a manager. */
	can: { manage: boolean; lead: boolean }
}

export interface SubtaskCounts {
	total: number
	done: number
}

export interface Task {
	id: number
	project: { id: number; name: string; tone: ProjectTone }
	parent_id: number | null
	title: string
	description: string | null
	status: TaskStatus
	priority: TaskPriority | null
	starts_on: string | null
	due_on: string | null
	estimate_hours: number | null
	sort_order: number
	completed_at: string | null
	created_by: number | null
	assignees: Person[]
	tags: Tag[]
	subtask_counts: SubtaskCounts
	/** Only on `GET pm/tasks/{task}`. */
	subtasks?: Task[]
	can: { edit: boolean; move: boolean; delete: boolean; assign: boolean }
}

/** `GET pm/tasks/counts`: what is assigned to the signed-in account. */
export interface TaskCounts {
	overdue: number
	today: number
	week: number
	completed: number
}

export type MyTaskScope = "assigned" | "created" | "all"
export type DueFilter = "overdue" | "today" | "week" | "none"

/** `GET pm/projects/{project}/tasks` and `GET pm/tasks` filters; unset or empty ones are not sent. */
export interface TaskFilters {
	assignee?: number | null
	status?: TaskStatus | null
	priority?: TaskPriority | null
	tag?: number | null
	due?: DueFilter | null
	q?: string | null
}

export interface ProjectPayload {
	name?: string
	description?: string | null
	tone?: ProjectTone
	starts_on?: string | null
	ends_on?: string | null
	is_archived?: boolean
	lead_user_id?: number | null
	/** On create only; an existing project's team changes through `replaceMembers`. */
	members?: number[]
}

export interface TaskPayload {
	title?: string
	description?: string | null
	status?: TaskStatus
	priority?: TaskPriority | null
	starts_on?: string | null
	due_on?: string | null
	estimate_hours?: number | null
	parent_id?: number | null
	assignee_ids?: number[]
	tag_ids?: number[]
}

/** The codes a refusal (`{message, code}`) can carry. */
export type PmRefusalCode = "assign_forbidden" | "project_archived" | "assignee_not_member" | "due_before_start" | "subtask_depth"

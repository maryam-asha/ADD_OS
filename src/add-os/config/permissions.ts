import type { Role } from "@/types/auth.d"
import { useAuthStore } from "@/stores/auth"

/**
 * ADD OS's admin dashboard gates UI controls through two mechanisms that
 * deliberately coexist in this one file during an in-progress backend
 * migration (`docs/decisions/rbac-permission-pilot.md` in ADD Core):
 *
 * - Role-based gates (`canDeleteSpatialResource`, `canDeleteBusinessHours`,
 *   `canManageRoles`) — check the account's single primary role via the auth
 *   store's `isRoleGranted`. This is the original mechanism and still covers
 *   every resource below except Branches: buildings/floors/zones/spaces/
 *   resources/seatsDesks delete, Business Hours delete, and Role management
 *   (`RoleController`'s routes still run on `role:admin` middleware).
 * - The permission-based gate (`can`) — checks the account's actual granted
 *   permissions (from `GET /api/v1/admin/me`) via the auth store's
 *   `hasPermission`. Only Branches uses this today: its backend routes were
 *   migrated to `permission:branches.view|create|update|delete` middleware as
 *   a pilot, so a role check can no longer correctly express who's allowed —
 *   a custom role could hold `branches.delete` without being `"admin"`.
 *
 * This split is temporary migration state, not drift between two competing
 * patterns: as more resources' backend enforcement converts from role- to
 * permission-based middleware in follow-up work, they move from the first
 * list to the second. Use whichever mechanism matches the resource's actual
 * current backend middleware — check the route file, don't guess.
 */

/**
 * Single source for "which role may delete which spatial resource" — sourced
 * verbatim from each DELETE endpoint's description in
 * ADD-OS.postman_collection.json, not from inference. Every one of these six
 * spatial resources reads literally "Admin-only (not operations)." there
 * (Delete Building/Floor/Zone/Space/Resource/Seat-Desk). Branches is not in
 * this map — its delete decision is permission-gated now, via `can()` below;
 * see `LegacyGatedSpatialResourceKey`.
 *
 * `users` and `roles` have no entries here. Users: settled, not an open
 * question — the collection has no DELETE endpoint for the resource at all;
 * users are deactivated via `PATCH /api/v1/admin/users/{id}/status` (see
 * `UsersPage.vue`'s change-status modal), never hard-deleted. Roles: the
 * backend gained full Role CRUD in a prior task, so this claim used to be
 * true but no longer is — `GET /api/v1/admin/roles` is not read-only any
 * more. Role management is gated by `canManageRoles()` below instead of an
 * entry in this map, since it isn't a delete-only decision and isn't a
 * spatial resource.
 */
export const SPATIAL_RESOURCE_DELETE_ROLE = {
	buildings: "admin",
	floors: "admin",
	zones: "admin",
	spaces: "admin",
	resources: "admin",
	seatsDesks: "admin"
} as const satisfies Partial<Record<SpatialResourceKey, Role>>

/**
 * The full set of spatial resources, independent of which gating mechanism
 * currently covers each one. Kept separate from
 * `SPATIAL_RESOURCE_DELETE_ROLE`'s keys (which now exclude Branches) so
 * `CASCADING_SPATIAL_RESOURCES` — which still legitimately needs Branches —
 * has a type to be declared against.
 */
export type SpatialResourceKey = "branches" | "buildings" | "floors" | "zones" | "spaces" | "resources" | "seatsDesks"

/**
 * The subset of `SpatialResourceKey` still on the legacy role-based delete
 * gate — i.e. everything except Branches. Narrowing
 * `canDeleteSpatialResource`'s parameter to this type (instead of the full
 * `SpatialResourceKey`) makes `canDeleteSpatialResource("branches")` a
 * compile-time error: a permanent guardrail against ever reverting
 * `BranchesPage.vue` back to this now-stale check, since Branches' delete
 * decision must reflect its actual granted permission, which this role-based
 * map can no longer express correctly.
 */
export type LegacyGatedSpatialResourceKey = keyof typeof SPATIAL_RESOURCE_DELETE_ROLE

/**
 * Resources whose DELETE endpoint description in the collection says the
 * deletion "cascades through" children — confirmed per-resource, not a
 * guess:
 *   branches  → Building/Floor/Zone/Space/Resource/SeatDesk/Device
 *   buildings → Floor/Zone/Space/Resource/SeatDesk
 *   floors    → Zone/Space
 *   zones     → Space
 *   spaces    → Resource/SeatDesk
 * `resources` and `seatsDesks` carry no cascade wording in the collection —
 * they have no children to cascade through.
 */
export const CASCADING_SPATIAL_RESOURCES: ReadonlySet<SpatialResourceKey> = new Set([
	"branches",
	"buildings",
	"floors",
	"zones",
	"spaces"
])

/**
 * The gate itself — routed through the EXISTING auth store's
 * `isRoleGranted`, never re-implemented. This is the only place in the
 * codebase that should call `isRoleGranted` for a delete decision; the
 * six remaining role-gated spatial views ask this function, not the store
 * directly, so no view carries its own role comparison (enforced by
 * no-inline-role-checks.spec.ts). Branches no longer calls this — see
 * `LegacyGatedSpatialResourceKey` for why `resource` can't be `"branches"`
 * any more.
 *
 * IMPORTANT: this only decides whether to SHOW the delete control. It is
 * NOT an authorization boundary — the backend still rejects the request
 * with 403 regardless of what this returns. Do not read a `true` here as
 * "this request will succeed"; read it as "this request isn't expected to
 * be rejected," which is exactly the class of surprise this exists to
 * prevent.
 */
export function canDeleteSpatialResource(resource: LegacyGatedSpatialResourceKey): boolean {
	return useAuthStore().isRoleGranted(SPATIAL_RESOURCE_DELETE_ROLE[resource])
}

/**
 * Business Hours delete + Business Hour Exception delete are both "Admin-only
 * (not operations)." per the collection — same rule, so one shared constant and
 * one function cover both endpoints rather than duplicating
 * `SPATIAL_RESOURCE_DELETE_ROLE`'s per-resource map for a single value. Kept
 * separate from that map: Business Hours isn't a spatial resource, it just
 * lives in that nav section.
 */
export const BUSINESS_HOURS_DELETE_ROLE: Role = "admin"

export function canDeleteBusinessHours(): boolean {
	return useAuthStore().isRoleGranted(BUSINESS_HOURS_DELETE_ROLE)
}

/**
 * The generic permission-based gate — checks the current user's actual
 * granted permissions (from GET /api/v1/admin/me), not a role name. Use this
 * for any resource whose backend enforcement has moved to permission:
 * middleware. Today that's Branches only (`branches.view/create/update/delete`)
 * — every other resource in this file still uses the older role-based gates
 * above, because their backend enforcement hasn't moved yet. Both mechanisms
 * are expected to coexist here during the migration; see the file-level
 * comment for which resource uses which.
 */
export function can(permission: string): boolean {
	return useAuthStore().hasPermission(permission)
}

/**
 * Role management stays role-gated, not permission-gated: `RoleController`'s
 * routes are still behind `role:admin` middleware in this pilot (Branches is
 * the only resource whose backend moved to permission-based enforcement so
 * far). `RolesPage.vue` is a separate, later task's concern — this export
 * just makes the gate available to it.
 */
export const ROLE_MANAGEMENT_ROLE: Role = "admin"

export function canManageRoles(): boolean {
	return useAuthStore().isRoleGranted(ROLE_MANAGEMENT_ROLE)
}

/**
 * Activating a plan for someone without charging their wallet
 * (`POST /api/v1/admin/memberships`).
 *
 * Role-gated for the same reason as role management: the backend route sits
 * inside `admin.php`'s narrower `role:admin` group, not the shared
 * `admin|operations` block that covers most of this dashboard — granting a
 * paid subscription for free is money-adjacent, so operations is excluded
 * there and must be excluded here. Not permission-gated, because no
 * `memberships.*` permission exists: `PermissionSyncService` only derives
 * permissions for `AdminResourceController` subclasses plus a short manual
 * list, and the membership controller is in neither.
 */
export const MEMBERSHIP_ACTIVATION_ROLE: Role = "admin"

export function canActivateMemberships(): boolean {
	return useAuthStore().isRoleGranted(MEMBERSHIP_ACTIVATION_ROLE)
}

/**
 * Creating, changing and deleting a discount coupon
 * (`POST`/`PUT|PATCH`/`DELETE /api/v1/admin/coupons`).
 *
 * Role-gated: ADDCore puts those three routes in `admin.php`'s `role:admin`
 * group ("a code is money off"), while the list, detail and redemption log
 * stay in the shared `admin|operations` block — so operations reads the page
 * and sees no write control. Like every gate here, this only decides what is
 * shown; the server's 403 is the boundary.
 */
export const COUPON_MANAGEMENT_ROLE: Role = "admin"

export function canManageCoupons(): boolean {
	return useAuthStore().isRoleGranted(COUPON_MANAGEMENT_ROLE)
}

export function canViewOfficeLeases(): boolean {
	return can("office-leases.view")
}

export function canCreateOfficeLeases(): boolean {
	return can("office-leases.create")
}

export function canTerminateOfficeLeases(): boolean {
	return can("office-leases.terminate")
}

export function canManageRenewals(): boolean {
	return can("renewals.manage")
}

export function canRecordInvoicePayment(): boolean {
	return can("invoices.record_payment")
}

export function canCancelInvoice(): boolean {
	return can("invoices.cancel")
}

export function canApproveProviderRequests(): boolean {
	return can("provider-requests.approve")
}

export function canRejectProviderRequests(): boolean {
	return can("provider-requests.reject")
}

export function canViewReports(): boolean {
	return can("reports.view")
}

/**
 * The dashboard's home page shows one section per permission
 * (`dashboard.operations|spaces|finance|members`, gated the same way on ADD Core's
 * `admin/dashboard/*` routes), so each role sees what its work needs: the
 * admin role holds all three, operations is granted what it should see from
 * the roles screen.
 */
export const DASHBOARD_SECTIONS = ["operations", "spaces", "finance", "members"] as const

export type DashboardSection = (typeof DASHBOARD_SECTIONS)[number]

export function canViewDashboardSection(section: DashboardSection): boolean {
	return can(`dashboard.${section}`)
}

/** At least one section to show — where "/" lands for staff when true. */
export function canViewDashboard(): boolean {
	return DASHBOARD_SECTIONS.some(canViewDashboardSection)
}

/**
 * HR (add/hr in ADD Core). Every HR admin route carries its own `hr.*`
 * permission and no role gate, so a custom HR role works without
 * admin|operations; these only decide which controls to show. Each name
 * below is the `can:` middleware on its route in
 * `packages/add/hr/routes/<module>/admin.php`.
 */

// ── HR core ─────────────────────────────────────────────────────────────────

/** Whether an employee's name may link to their profile from another HR page. */
export function canViewEmployees(): boolean {
	return can("hr.employees.view")
}

export function canHireEmployees(): boolean {
	return can("hr.employees.create")
}

/** PATCH employees/{id}, and PUT its contacts and dependents. */
export function canUpdateEmployees(): boolean {
	return can("hr.employees.update")
}

/** GET employees/{id}/sensitive — the national ID and bank account, audited on each read. */
export function canViewEmployeeSensitive(): boolean {
	return can("hr.employees.view_sensitive")
}

/** POST employees/{id}/events: promotions, transfers, renewals, suspensions, terminations, rehires. */
export function canRecordEmploymentEvents(): boolean {
	return can("hr.lifecycle.manage")
}

export function canViewEmployeeDocuments(): boolean {
	return can("hr.documents.view")
}

/** Uploading and deleting an employee's documents. */
export function canManageEmployeeDocuments(): boolean {
	return can("hr.documents.manage")
}

/** An employee's onboarding/offboarding tasks: reading them as well as ticking them. */
export function canManageChecklists(): boolean {
	return can("hr.checklists.manage")
}

export function canManageOrgStructure(): boolean {
	return can("hr.org.manage")
}

/** HR settings: document types, checklist templates (and later modules' setup). */
export function canManageHrSettings(): boolean {
	return can("hr.settings.manage")
}

// ── HR leave ────────────────────────────────────────────────────────────────

/** Balances, ledgers, requests and the calendar — and the leave tab on an employee's file. */
export function canViewLeave(): boolean {
	return can("hr.leave.view")
}

/** Filing or cancelling leave for an employee, and adjusting their balance. */
export function canManageLeave(): boolean {
	return can("hr.leave.manage")
}

// ── HR time and attendance ──────────────────────────────────────────────────

/** Attendance days, exceptions, punches, the roster and a staff card's state — and the attendance tab on a file. */
export function canViewAttendance(): boolean {
	return can("hr.attendance.view")
}

/** Manual punches, resolving exceptions, reprocessing days. */
export function canCorrectAttendance(): boolean {
	return can("hr.attendance.correct")
}

export function canLockAttendance(): boolean {
	return can("hr.attendance.lock")
}

/** Issuing and revoking staff attendance cards. */
export function canManageAttendanceCards(): boolean {
	return can("hr.attendance.cards")
}

export function canManageRoster(): boolean {
	return can("hr.roster.manage")
}

// ── HR timesheets and cost ──────────────────────────────────────────────────

/** Timesheets, compliance, the time-by-cost-center report, cost centers and an employee's cost split — and the cost tab on a file. */
export function canViewTimesheets(): boolean {
	return can("hr.timesheets.view")
}

/** Setting an employee's cost split. Cost centers themselves are settings (canManageHrSettings). */
export function canManageTimesheets(): boolean {
	return can("hr.timesheets.manage")
}

// ── HR payroll ──────────────────────────────────────────────────────────────

/** Pay, runs, payslips and end-of-service figures, read only — and the pay tab on a file. Components and rate tables are changed with canManageHrSettings. */
export function canViewPayroll(): boolean {
	return can("hr.payroll.view")
}

/** Opening, calculating, reviewing, reconciling and adjusting a run, and throwing an unapproved one away. */
export function canManagePayroll(): boolean {
	return can("hr.payroll.manage")
}

/** Approving a reviewed run — never the person who calculated it or changed pay in it (the server refuses, 403). */
export function canApprovePayroll(): boolean {
	return can("hr.payroll.approve")
}

/** Marking an approved run paid, its journal and posting it. */
export function canPayPayroll(): boolean {
	return can("hr.payroll.pay")
}

/** Changing an employee's pay from a date. */
export function canManageCompensation(): boolean {
	return can("hr.compensation.manage")
}

/** Every loan: reading, filing one for an employee, settling one. */
export function canManageLoans(): boolean {
	return can("hr.loans.manage")
}

// ── HR benefits ─────────────────────────────────────────────────────────────

/** Benefits, who holds them, their grants — and the benefits tab on a file. The employee cost report needs canViewPayroll. */
export function canViewBenefits(): boolean {
	return can("hr.benefits.view")
}

/** Benefits, assignments, and running, retrying or cancelling grants. */
export function canManageBenefits(): boolean {
	return can("hr.benefits.manage")
}

// ── HR recruitment ──────────────────────────────────────────────────────────

/** Requisitions, openings, candidates, applications, interviews and offers, read only. */
export function canViewRecruitment(): boolean {
	return can("hr.recruitment.view")
}

/** Every recruitment change. Hiring a candidate also needs canHireEmployees. */
export function canManageRecruitment(): boolean {
	return can("hr.recruitment.manage")
}

// ── HR performance ──────────────────────────────────────────────────────────

/** Templates, cycles, reviews and goals, read only — and the performance tab on a file. */
export function canViewPerformance(): boolean {
	return can("hr.performance.view")
}

/** Templates, cycles and their phases, reviewers, calibration and goals. */
export function canManagePerformance(): boolean {
	return can("hr.performance.manage")
}

// ── HR training ─────────────────────────────────────────────────────────────

/** Courses, sessions and their enrollments, certifications, learning budgets and requests, read only — and the training tab on a file. */
export function canViewTraining(): boolean {
	return can("hr.training.view")
}

/** Courses, sessions (enroll, complete, cancel), certifications, and allocating or adjusting budgets. */
export function canManageTraining(): boolean {
	return can("hr.training.manage")
}

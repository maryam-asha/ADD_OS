import { useAuthStore } from "@/stores/auth"

/**
 * ADD OS's admin dashboard decides which controls to show from the account's
 * granted permissions (from `GET /api/v1/auth/me`), never from a role name.
 * Every gate below names the permission ADD Core guards the action's route
 * with, so a custom role made on the Roles page sees exactly the controls its
 * permissions make work — and admin, which holds every permission, sees all.
 *
 * History. Until 2026-10-27 this file held two mechanisms side by side during
 * a migration (`docs/decisions/rbac-permission-pilot.md` in ADD Core):
 * role-based gates through the store's `isRoleGranted` (spatial and Business
 * Hours deletes, Role management, membership activation, coupon writes — the
 * routes ADD Core kept in its `role:admin` group) and this permission gate,
 * which Branches piloted. ADD Core then guarded every admin route by
 * permission alone (`2026-10-27-permission-only-dashboard-access-design.md`),
 * so each role gate became the permission of its route and the role
 * mechanism went. What was given up: "admin only" no longer holds by
 * construction — a role is shown a delete exactly when it is granted
 * `<module>.delete`, so the Roles page is now where that decision lives.
 */

/**
 * The generic permission-based gate — checks the current user's actual
 * granted permissions, not a role name. Every gate in this file goes through
 * it; `no-inline-role-checks.spec.ts` keeps views from reimplementing it.
 *
 * IMPORTANT: a gate only decides whether to SHOW a control. It is NOT an
 * authorization boundary — the backend still rejects the request with 403
 * regardless of what this returns. Read a `true` as "this request isn't
 * expected to be rejected," not as "this request will succeed."
 */
export function can(permission: string): boolean {
	return useAuthStore().hasPermission(permission)
}

/**
 * The full set of spatial resources, independent of how each one's delete is
 * gated. `CASCADING_SPATIAL_RESOURCES` needs Branches too.
 */
export type SpatialResourceKey = "branches" | "buildings" | "floors" | "zones" | "spaces" | "seatsDesks"

/**
 * Which permission ADD Core's DELETE route asks for, per spatial resource:
 * `<module>.delete`, the module being the route's URI segment. Until
 * 2026-10-27 each was "admin" (the collection's "Admin-only (not
 * operations)."); see the file-level note. Branches is not in this map — its
 * page asks `can("branches.delete")` itself, as the permission pilot left it;
 * see `DeleteGatedSpatialResourceKey`.
 */
export const SPATIAL_RESOURCE_DELETE_PERMISSION = {
	buildings: "buildings.delete",
	floors: "floors.delete",
	zones: "zones.delete",
	spaces: "spaces.delete",
	seatsDesks: "seats-desks.delete"
} as const satisfies Partial<Record<SpatialResourceKey, string>>

/**
 * The spatial resources whose delete goes through `canDeleteSpatialResource`
 * — every one except Branches. Narrowing the parameter to this type makes
 * `canDeleteSpatialResource("branches")` a compile-time error, so
 * `BranchesPage.vue` keeps its own `can("branches.delete")`.
 */
export type DeleteGatedSpatialResourceKey = keyof typeof SPATIAL_RESOURCE_DELETE_PERMISSION

/**
 * Resources whose DELETE endpoint description in the collection says the
 * deletion "cascades through" children — confirmed per-resource, not a
 * guess:
 *   branches  → Building/Floor/Zone/Space/Resource/SeatDesk/Device
 *   buildings → Floor/Zone/Space/Resource/SeatDesk
 *   floors    → Zone/Space
 *   zones     → Space
 *   spaces    → SeatDesk
 * `seatsDesks` carry no cascade wording in the collection — they have no
 * children to cascade through.
 */
export const CASCADING_SPATIAL_RESOURCES: ReadonlySet<SpatialResourceKey> = new Set([
	"branches",
	"buildings",
	"floors",
	"zones",
	"spaces"
])

/** Whether to show a spatial resource's delete control. */
export function canDeleteSpatialResource(resource: DeleteGatedSpatialResourceKey): boolean {
	return can(SPATIAL_RESOURCE_DELETE_PERMISSION[resource])
}

/**
 * Business Hours delete (`DELETE business-hours/{id}`). Its exceptions are a
 * resource of their own on the server, with their own permission — see
 * `canDeleteBusinessHourExceptions`. Until 2026-10-27 both shared one
 * "admin" role gate.
 */
export function canDeleteBusinessHours(): boolean {
	return can("business-hours.delete")
}

/** Business Hour Exception delete (`DELETE business-hour-exceptions/{id}`). */
export function canDeleteBusinessHourExceptions(): boolean {
	return can("business-hour-exceptions.delete")
}

/**
 * Role management, one gate per action (`RolesPage.vue`). Until 2026-10-27
 * a single `canManageRoles()` asked for the "admin" role (`role:admin` on
 * `RoleController`'s routes) and showed create, edit and delete alike.
 */

/** Creating a role (`POST /api/v1/admin/roles`). */
export function canCreateRoles(): boolean {
	return can("roles.create")
}

/** Renaming a role or changing its permissions (`PUT|PATCH /api/v1/admin/roles/{role}`). */
export function canUpdateRoles(): boolean {
	return can("roles.update")
}

/** Deleting a role (`DELETE /api/v1/admin/roles/{role}`). */
export function canDeleteRoles(): boolean {
	return can("roles.delete")
}

/**
 * Activating a plan for someone without charging their wallet
 * (`POST /api/v1/admin/memberships`), which ADD Core guards with
 * `memberships.create`. Until 2026-10-27 it was role-gated: the route sat in
 * `admin.php`'s `role:admin` group (granting a paid subscription for free is
 * money-adjacent) and no `memberships.*` permission existed. The Roles page
 * now decides who holds it.
 */
export function canActivateMemberships(): boolean {
	return can("memberships.create")
}

/**
 * Creating, changing and deleting a discount coupon
 * (`POST`/`PUT|PATCH`/`DELETE /api/v1/admin/coupons`), each on its own
 * permission. Until 2026-10-27 all three were the "admin" role (the routes
 * sat in `admin.php`'s `role:admin` group, "a code is money off"), and
 * operations read the page with no write control. Switching a coupon on or
 * off is an update.
 */
export function canCreateCoupons(): boolean {
	return can("coupons.create")
}

export function canUpdateCoupons(): boolean {
	return can("coupons.update")
}

export function canDeleteCoupons(): boolean {
	return can("coupons.delete")
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

// ── Reception desk ──────────────────────────────────────────────────────────
//
// Seeing the desk is `reception.view` (its page's permission); each kind of
// desk work is its own grant on ADD Core's `reception/*` routes, so a role
// sees only the buttons its permissions make work.

/** Letting people in and out: confirming an arrival, checking in, checking out, ending a session. */
export function canCheckInAtReception(): boolean {
	return can("reception.check_in")
}

/** Booking for a member at the desk, and extending or cancelling a booking. */
export function canBookAtReception(): boolean {
	return can("reception.book")
}

/** Approving or rejecting a booking that waits on the desk. */
export function canApproveBookings(): boolean {
	return can("reception.approve")
}

/** Taking money for what a member owes (`reception/payments/settle`). */
export function canSettleAtReception(): boolean {
	return can("reception.settle_payment")
}

export function canTopUpWallets(): boolean {
	return can("wallet-top-ups.create")
}

export function canSellPlans(): boolean {
	return can("plan-purchases.create")
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

// ── HR reports ──────────────────────────────────────────────────────────────

/** The HR dashboard and the combined reports; money in them still needs hr.payroll.view. */
export function canViewHrReports(): boolean {
	return can("hr.reports.view")
}

/** The HR alerts page — for the dashboard's alert figures to open it. */
export function canViewHrAlerts(): boolean {
	return can("hr.alerts.view")
}

/** Every pending approval request — for the dashboard's approval figures to open them. */
export function canManageApprovals(): boolean {
	return can("hr.approvals.manage")
}

// ── Inventory ───────────────────────────────────────────────────────────────
//
// ADD Core's inventory package (`packages/add/inventory`): every route
// carries its own `can:inventory.*`, assignable to any role, so these are
// permissions, never roles. Each mirrors the middleware on its route in
// `packages/add/inventory/routes/admin.php`.

/** Categories, their fields, units and items. */
export function canManageInventoryCatalog(): boolean {
	return can("inventory.catalog.manage")
}

/** Registering, editing, moving and changing the status of assets. */
export function canManageAssets(): boolean {
	return can("inventory.assets.manage")
}

/** Handing assets over and taking them back. */
export function canManageCustody(): boolean {
	return can("inventory.assets.custody")
}

/** Repairs, servicing and maintenance schedules. */
export function canManageMaintenance(): boolean {
	return can("inventory.assets.maintenance")
}

export function canDisposeAssets(): boolean {
	return can("inventory.assets.dispose")
}

export function canReceiveStock(): boolean {
	return can("inventory.stock.receive")
}

/** Issuing stock by hand (internal use, damaged, expired). */
export function canIssueStock(): boolean {
	return can("inventory.stock.issue")
}

export function canTransferStock(): boolean {
	return can("inventory.stock.transfer")
}

/** Recording a physical count. */
export function canCountStock(): boolean {
	return can("inventory.stock.adjust")
}

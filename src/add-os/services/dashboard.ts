import type { DebtAging, RevenueTotal } from "./reports"
import { get } from "./api"

/**
 * The dashboard's home page (ADD Core `Admin\DashboardController`): one
 * read-only section per permission — `dashboard.operations|finance|members|spaces`.
 * Each section answers for a period of local days (`from`/`to`, both
 * inclusive; the server defaults to this month so far) and for the period of
 * the same length just before it. Money is per currency, never merged.
 */

export interface DashboardRange {
	from: string
	to: string
}

export interface DashboardParams {
	from?: string | null
	to?: string | null
	/** Operations and members only — money belongs to no branch. */
	branch_id?: number | null
	/**
	 * Bumped by the dashboard's refresh to make every card fetch again; never
	 * sent — `query()` passes on only the filters above.
	 */
	refresh?: number
}

export interface MoneyAmount {
	currency: string
	amount: string | null
}

// ── Operations ───────────────────────────────────────────────────────────────

export interface BranchSeats {
	id: number
	name: string | null
	/** The Co-Space seat pool: seats open, and seats reserved — a subscription holds its seats whether or not anyone sits in them, and staff may sell past capacity, so taken can exceed seats. */
	seats: number
	taken: number
	/** Private offices not retired, and those a lease holds today. */
	offices: number
	offices_leased: number
}

export interface OperationsActivity {
	bookings: number
	completed: number
	no_show: number
	cancelled: number
	/** Percentages as plain strings ("33.33"); null when there was nothing to measure. */
	no_show_rate: string | null
	cancellation_rate: string | null
	walk_ins: number
}

export interface OperationsAttention {
	bookings_awaiting_approval: number
	bookings_awaiting_payment: number
	open_service_requests: number
	new_site_inquiries: number
	unquoted_office_requests: number
}

export interface OperationsOverview {
	period: DashboardRange
	previous_period: DashboardRange
	now: {
		active_sessions: number
		expected_today: number
		branches: BranchSeats[]
	}
	activity: {
		current: OperationsActivity
		previous: OperationsActivity
	}
	attention: OperationsAttention
}

// ── Finance ──────────────────────────────────────────────────────────────────

export interface FinanceCollected {
	cash: MoneyAmount[]
	card: MoneyAmount[]
	invoice_payments: MoneyAmount[]
	invoiced: MoneyAmount[]
	points_by_purpose: Array<{ purpose: string; points: number }>
}

export interface FinanceAttention {
	pending_provider_requests: number
	stopped_renewals: number
	pending_exchange_rate_suggestions: number
	open_cash_sessions: number
}

export interface FinanceOverview {
	period: DashboardRange
	previous_period: DashboardRange
	collected: {
		current: FinanceCollected
		previous: FinanceCollected
	}
	invoices: {
		totals: RevenueTotal[]
		aging: DebtAging[]
	}
	attention: FinanceAttention
}

// ── Members ──────────────────────────────────────────────────────────────────

export interface PlanCount {
	plan: { id: number; name: string | null }
	count: number
}

export interface MembersOverview {
	period: DashboardRange
	previous_period: DashboardRange
	new_members: { current: number; previous: number }
	memberships: {
		live: number
		by_plan: PlanCount[]
		ending_within_7_days: number
		ending_within_30_days: number
	}
	office_leases: {
		active: number
		ending_within_30_days: number
	}
}

// ── Spaces ───────────────────────────────────────────────────────────────────

/** The bookable kinds the spaces section covers; private offices go by lease. */
export const DASHBOARD_SPACE_TYPES = ["room", "event_hall", "co_space"] as const

export type DashboardSpaceType = (typeof DASHBOARD_SPACE_TYPES)[number]

export interface SpacesParams extends DashboardParams {
	space_type?: DashboardSpaceType | null
	space_id?: number | null
}

export interface SpaceOutcomes {
	/** Bookings that held their slot, by the day they start. */
	bookings: number
	no_show_rate: string | null
	cancellation_rate: string | null
	/** Null for a Co-Space (a shared pool) and for a period with no open hours. */
	occupancy_percent: string | null
	members: number
}

export interface SpaceRow extends SpaceOutcomes {
	space: { id: number; name: string | null; type: DashboardSpaceType; branch: { id: number; name: string | null } }
	average_per_day: string | null
	average_per_week: string
	average_duration_minutes: number | null
	booked_hours: string
}

export interface SpacesOverview {
	period: DashboardRange
	previous_period: DashboardRange
	summary: { current: SpaceOutcomes; previous: SpaceOutcomes }
	spaces: SpaceRow[]
	peak: {
		/** Booked minutes by local weekday (0 = Sunday), then hour. */
		minutes: number[][]
		busiest_weekday: number | null
		busiest_hour: number | null
	}
}

function query(params: SpacesParams): Record<string, unknown> {
	const out: Record<string, unknown> = {}
	if (params.from) out.from = params.from
	if (params.to) out.to = params.to
	if (params.branch_id) out.branch_id = params.branch_id
	if (params.space_type) out.space_type = params.space_type
	if (params.space_id) out.space_id = params.space_id
	return out
}

export async function getOperationsOverview(params: DashboardParams = {}): Promise<OperationsOverview> {
	const res = await get<{ data: OperationsOverview }>("/api/v1/admin/dashboard/operations", query(params))
	return res.data
}

/** Centre-wide: a `branch_id` is never sent. */
export async function getFinanceOverview(params: DashboardParams = {}): Promise<FinanceOverview> {
	const res = await get<{ data: FinanceOverview }>("/api/v1/admin/dashboard/finance", query({ ...params, branch_id: null }))
	return res.data
}

export async function getMembersOverview(params: DashboardParams = {}): Promise<MembersOverview> {
	const res = await get<{ data: MembersOverview }>("/api/v1/admin/dashboard/members", query(params))
	return res.data
}

export async function getSpacesOverview(params: SpacesParams = {}): Promise<SpacesOverview> {
	const res = await get<{ data: SpacesOverview }>("/api/v1/admin/dashboard/spaces", query(params))
	return res.data
}

// ── Statistics cards ─────────────────────────────────────────────────────────

export type BookingStatusKey = "awaiting_payment" | "pending" | "confirmed" | "completed" | "no_show" | "rejected" | "cancelled"
export type RequestStatusKey = "pending" | "in_progress" | "resolved" | "rejected" | "cancelled"

export interface StatsParams extends DashboardParams {
	/** Any space type, for the cards that count bookings. */
	space_type?: string | null
}

export interface BookingsByStatus {
	period: DashboardRange
	total: number
	/** Every status, zero included, so a card always shows the same tiles. */
	by_status: Record<BookingStatusKey, number>
}

export interface ServiceRequestStats {
	period: DashboardRange
	total: number
	by_status: Record<RequestStatusKey, number>
	by_type: Array<{ type: { id: number; name: string | null }; count: number }>
	/** Resolved over submitted, as a plain percentage; null when none were submitted. */
	resolution_rate: string | null
}

export interface DailyCounts {
	period: DashboardRange
	/** One entry per local day of the period, empty days included. */
	days: Array<{ date: string; count: number }>
}

export interface AppUsers {
	members: number
	android: number
	ios: number
	without_app: number
}

function statsQuery({ space_type, ...rest }: StatsParams): Record<string, unknown> {
	const out = query(rest)
	if (space_type) out.space_type = space_type
	return out
}

export async function getBookingsByStatus(params: StatsParams = {}): Promise<BookingsByStatus> {
	const res = await get<{ data: BookingsByStatus }>("/api/v1/admin/dashboard/stats/bookings-by-status", statsQuery(params))
	return res.data
}

export async function getServiceRequestStats(params: StatsParams = {}): Promise<ServiceRequestStats> {
	const res = await get<{ data: ServiceRequestStats }>("/api/v1/admin/dashboard/stats/service-requests", statsQuery(params))
	return res.data
}

export async function getDailyBookings(params: StatsParams = {}): Promise<DailyCounts> {
	const res = await get<{ data: DailyCounts }>("/api/v1/admin/dashboard/stats/daily-bookings", statsQuery(params))
	return res.data
}

export async function getDailyMembers(params: StatsParams = {}): Promise<DailyCounts> {
	const res = await get<{ data: DailyCounts }>("/api/v1/admin/dashboard/stats/daily-members", statsQuery(params))
	return res.data
}

export async function getAppUsers(): Promise<AppUsers> {
	const res = await get<{ data: AppUsers }>("/api/v1/admin/dashboard/stats/app-users")
	return res.data
}

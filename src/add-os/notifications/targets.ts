import type { RouteLocationRaw } from "vue-router"
import type { InboxAudience } from "@/add-os/services/notifications"
import { OPEN_QUERY } from "./useOpenRecord"

/**
 * Where a notice leads when it is clicked — in the bell, or in the browser
 * notification Firebase delivered. The API names what a notice is about,
 * the same way for every notice (`data.target_type`/`target_id`, ADDCore's
 * notifiers); the dashboard owns its own pages, so the mapping lives here and
 * nowhere else. It opens the record itself: its own page where it has one
 * (a company, an event, an asset, a payslip), else its list page with
 * `?open=<id>`, which shows it in the page's detail view or picks out its row
 * (`useOpenRecord`). A page the account may not open is the route guard's to
 * refuse, as for any link. A notice with no known target opens nothing — it
 * is still marked read.
 */
interface TargetRoute {
	/** A page of its own for the record, or the list page that holds it. */
	path: string | ((id: string) => string)
	/** The list page opens the record from `?open=<id>`. */
	open?: true
}

const own = (path: (id: string) => string): TargetRoute => ({ path })
const listed = (path: string): TargetRoute => ({ path, open: true })
const page = (path: string): TargetRoute => ({ path })
const id = (value: string) => encodeURIComponent(value)

const STAFF_TARGETS: Record<string, TargetRoute> = {
	booking: listed("/bookings/all"),
	company: own(value => `/members/companies/${id(value)}`),
	event: own(value => `/community/events/${id(value)}/attendees`),
	invoice: listed("/payments/invoices"),
	invoices: page("/payments/invoices"),
	membership: page("/members/memberships"),
	office_lease: listed("/members/office-leases"),
	payment: listed("/payments/transactions"),
	private_office_request: listed("/address/private-office-requests"),
	provider_request: listed("/providers/requests"),
	service_request: listed("/address/operations-requests"),
	wallet: page("/plans/wallet"),
	exchange_rate_suggestion: page("/payments/exchange-rates"),
	inventory_asset: own(value => `/inventory/assets/${id(value)}`),
	hr_approval_request: listed("/my-hr/approvals"),
	hr_alerts: page("/hr/alerts"),
	hr_benefit_grant: page("/my-hr/benefits"),
	hr_benefit_grants: page("/hr-pay/benefit-grants"),
	hr_payslip: own(value => `/my-hr/pay/payslips/${id(value)}`),
	hr_review_cycle: page("/my-hr/performance"),
	hr_application: own(value => `/hr-talent/applications/${id(value)}`),
	hr_training_session: page("/my-hr/training")
}

const PROVIDER_TARGETS: Record<string, TargetRoute> = {
	company: listed("/provider/companies"),
	invoice: listed("/provider/invoices"),
	invoices: page("/provider/invoices"),
	membership: page("/provider/companies"),
	office_lease: listed("/provider/office-leases"),
	private_office_request: page("/provider/office-requests"),
	provider_request: listed("/provider/requests")
}

export function notificationTarget(audience: InboxAudience, data: Record<string, string> | null | undefined): RouteLocationRaw | null {
	const type = data?.target_type
	if (!type) return null

	const route = (audience === "provider" ? PROVIDER_TARGETS : STAFF_TARGETS)[type]
	if (route === undefined) return null

	const recordId = data?.target_id
	if (typeof route.path === "function") return recordId ? route.path(recordId) : null
	return route.open && recordId ? { path: route.path, query: { [OPEN_QUERY]: recordId } } : route.path
}

/** The icon of a notice, by the group its template belongs to (`booking.approved` → booking). */
const GROUP_ICONS: Record<string, string> = {
	booking: "carbon:calendar",
	access: "carbon:locked",
	reception: "carbon:user-multiple",
	coworking: "carbon:workspace",
	wallet: "carbon:wallet",
	membership: "carbon:identification",
	company: "carbon:enterprise",
	invoice: "carbon:receipt",
	renewal: "carbon:renew",
	lease: "carbon:building",
	private_office: "carbon:building",
	payment: "carbon:money",
	exchange_rate: "carbon:currency",
	event: "carbon:event",
	service_request: "carbon:tools",
	provider_request: "carbon:partnership",
	provider: "carbon:partnership",
	inquiry: "carbon:document",
	announcement: "carbon:document",
	account: "carbon:user-profile",
	hr: "carbon:user-identification",
	inventory: "carbon:box"
}

export const DEFAULT_NOTIFICATION_ICON = "carbon:notification"

function group(templateKey: string | null | undefined): string {
	return templateKey?.split(".")[0] ?? ""
}

export function notificationIcon(templateKey: string | null | undefined): string {
	return GROUP_ICONS[group(templateKey)] ?? DEFAULT_NOTIFICATION_ICON
}

/**
 * The colour family of a notice's icon, so a list reads at a glance: the
 * day's operations (bookings, the desk, doors, events) in the brand's own
 * colour, money (invoices, payments, renewals, the wallet) in amber, and the
 * accounts and requests around them in teal. The icon carries the meaning
 * too; colour is never the only signal.
 */
export type NotificationTone = "primary" | "info" | "warning"

const GROUP_TONES: Record<string, NotificationTone> = {
	booking: "primary",
	coworking: "primary",
	reception: "primary",
	access: "primary",
	event: "primary",
	invoice: "warning",
	payment: "warning",
	renewal: "warning",
	exchange_rate: "warning",
	wallet: "warning"
}

export function notificationTone(templateKey: string | null | undefined): NotificationTone {
	return GROUP_TONES[group(templateKey)] ?? "info"
}

/** The full inbox page of the account: under the dashboard for staff, under the portal for a provider. */
export function inboxPagePath(audience: InboxAudience): string {
	return audience === "provider" ? "/provider/notifications" : "/dashboard/notifications"
}

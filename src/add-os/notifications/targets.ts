import type { InboxAudience } from "@/add-os/services/notifications"

/**
 * Where a notice leads when it is clicked — in the bell, or in the browser
 * notification Firebase delivered. The API names what a notice is about
 * (`data.target_type`/`target_id`, ADDCore's notifiers); the dashboard owns
 * its own pages, so the mapping lives here and nowhere else. A page the
 * account may not open is the route guard's to refuse, as for any link.
 * A notice with no known target opens nothing — it is still marked read.
 */
type TargetPath = string | ((id: string) => string)

const STAFF_TARGETS: Record<string, TargetPath> = {
	booking: "/bookings/all",
	company: id => `/members/companies/${encodeURIComponent(id)}`,
	event: id => `/community/events/${encodeURIComponent(id)}/attendees`,
	invoice: "/payments/invoices",
	invoices: "/payments/invoices",
	membership: "/members/memberships",
	office_lease: "/members/office-leases",
	payment: "/payments/transactions",
	private_office_request: "/address/private-office-requests",
	provider_request: "/providers/requests",
	service_request: "/address/operations-requests",
	wallet: "/plans/wallet",
	exchange_rate_suggestion: "/payments/exchange-rates"
}

const PROVIDER_TARGETS: Record<string, TargetPath> = {
	company: "/provider/companies",
	invoice: "/provider/invoices",
	invoices: "/provider/invoices",
	membership: "/provider/companies",
	office_lease: "/provider/office-leases",
	private_office_request: "/provider/office-requests",
	provider_request: "/provider/requests"
}

export function notificationTarget(audience: InboxAudience, data: Record<string, string> | null | undefined): string | null {
	const type = data?.target_type
	if (!type) return null

	const target = (audience === "provider" ? PROVIDER_TARGETS : STAFF_TARGETS)[type]
	if (target === undefined) return null
	if (typeof target === "string") return target

	const id = data?.target_id
	return id ? target(id) : null
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

export function notificationIcon(templateKey: string | null | undefined): string {
	const group = templateKey?.split(".")[0] ?? ""
	return GROUP_ICONS[group] ?? DEFAULT_NOTIFICATION_ICON
}

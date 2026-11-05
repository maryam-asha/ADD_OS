// src/add-os/modules/system/config/known-permissions.ts

function crud(module: string): string[] {
	return ["view", "create", "update", "delete"].map(action => `${module}.${action}`)
}

/**
 * Every permission name ADD Core can return from `GET /api/v1/admin/permissions`,
 * as of the permission-only dashboard access contract
 * (ADDCore `docs/superpowers/specs/2026-10-27-permission-only-dashboard-access-design.md`,
 * "Permission per route", plus the routes it leaves unchanged) and the HR and
 * Inventory packages' `Authorization/Abilities.php`.
 *
 * The role editor renders whatever the API returns, so this list does not
 * gate anything at runtime. It exists so a spec can fail when a module or
 * action has no label in either catalogue: an unmapped one falls back to the
 * raw key (`displayModuleName` / `displayActionName`), which in the Arabic UI
 * reads as a stray English word. A new permission in ADD Core belongs here in
 * the same change that adds its `roles.modules.*` / `roles.actions.*` labels.
 */
export const KNOWN_PERMISSIONS: readonly string[] = [
	// Spatial structure and content (apiResource verbs)
	...crud("buildings"),
	...crud("floors"),
	...crud("zones"),
	...crud("spaces"),
	...crud("seats-desks"),
	...crud("devices"),
	...crud("device-capabilities"),
	...crud("business-hours"),
	...crud("business-hour-exceptions"),
	...crud("amenities"),
	...crud("founders"),
	...crud("partners"),
	...crud("plans"),
	...crud("plan-modules"),
	...crud("resource-types"),
	...crud("sale-items"),
	...crud("contact-links"),
	...crud("announcements"),
	...crud("event-categories"),
	...crud("events"),
	"events.manage_attendees",
	...crud("community-members"),
	...crud("private-office-requests"),
	...crud("kiosks"),
	"kiosks.pair",
	...crud("coupons"),
	...crud("service-types"),
	...crud("branches"),
	...crud("roles"),

	"reports.view",
	"app-content.view",
	"app-content.update",
	"settings.view",
	"settings.update",
	"exchange-rates.view",
	"exchange-rates.create",
	"currencies.view",
	"currencies.create",
	"currencies.update",
	"companies.view",
	"companies.update_status",
	"companies.manage_members",
	"office-leases.view",
	"office-leases.create",
	"office-leases.terminate",
	"error-logs.view",
	"error-logs.delete",
	"members.view",
	"users.view",
	"users.create",
	"users.update",
	"users.update_status",
	"users.assign_role",
	"memberships.view",
	"memberships.create",
	"bookings.view",

	"reception.view",
	"reception.check_in",
	"reception.book",
	"reception.approve",
	"reception.settle_payment",
	"reception.record_consumption",
	"wallet-top-ups.view",
	"wallet-top-ups.create",
	"plan-purchases.create",
	"item-sales.view",
	"item-sales.create",
	"cash-register.view",
	"cash-register.manage",

	"site-inquiries.view",
	"site-inquiries.update",
	"payments.view",
	"payments.reverse",
	"payment-methods.view",
	"notifications.broadcast",
	"service-requests.view",
	"service-requests.update",

	"providers.view",
	"providers.create",
	"providers.update",
	"providers.status",
	"providers.transfer_company",
	"provider-requests.view",
	"provider-requests.approve",
	"provider-requests.reject",
	"invoices.view",
	"invoices.cancel",
	"invoices.record_payment",
	"invoices.void_payment",
	"renewals.manage",
	"dashboard.operations",
	"dashboard.finance",
	"dashboard.members",
	"dashboard.spaces",

	// HR package (`Add\Hr\Authorization\Abilities`)
	"hr.org.view",
	"hr.org.manage",
	"hr.employees.view",
	"hr.employees.create",
	"hr.employees.update",
	"hr.employees.view_sensitive",
	"hr.lifecycle.manage",
	"hr.documents.view",
	"hr.documents.manage",
	"hr.checklists.manage",
	"hr.alerts.view",
	"hr.settings.manage",
	"hr.approvals.manage",
	"hr.leave.view",
	"hr.leave.manage",
	"hr.attendance.view",
	"hr.attendance.correct",
	"hr.attendance.lock",
	"hr.attendance.cards",
	"hr.roster.manage",
	"hr.timesheets.view",
	"hr.timesheets.manage",
	"hr.payroll.view",
	"hr.payroll.manage",
	"hr.payroll.approve",
	"hr.payroll.pay",
	"hr.compensation.manage",
	"hr.loans.manage",
	"hr.benefits.view",
	"hr.benefits.manage",
	"hr.recruitment.view",
	"hr.recruitment.manage",
	"hr.performance.view",
	"hr.performance.manage",
	"hr.training.view",
	"hr.training.manage",
	"hr.reports.view",

	// Inventory package (`Add\Inventory\Authorization\Abilities`)
	"inventory.catalog.view",
	"inventory.catalog.manage",
	"inventory.assets.view",
	"inventory.assets.manage",
	"inventory.assets.custody",
	"inventory.assets.maintenance",
	"inventory.assets.dispose",
	"inventory.warehouses.view",
	"inventory.warehouses.manage",
	"inventory.stock.view",
	"inventory.stock.receive",
	"inventory.stock.issue",
	"inventory.stock.transfer",
	"inventory.stock.adjust",
	"inventory.reports.view"
]

/**
 * How ADD Core groups a permission for the role editor (`RoleController`:
 * `Str::before($name, '.')` / `Str::after($name, '.')`): the module is
 * everything before the FIRST dot and the action everything after it, so
 * `hr.payroll.approve` is module `hr`, action `payroll.approve`.
 */
export function splitPermission(name: string): { module: string; action: string } {
	const cut = name.indexOf(".")
	return cut < 0 ? { module: name, action: "" } : { module: name.slice(0, cut), action: name.slice(cut + 1) }
}

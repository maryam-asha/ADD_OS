import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Company, CompanyPayload } from "@/add-os/modules/members/types/company"
import type { PrivateOfficeRequest } from "@/add-os/modules/members/types/private-office-request"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import { h } from "vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { formatDate, formatNumber } from "@/add-os/utils/format"

export function quotedRequestOptions(requests: PrivateOfficeRequest[]): SelectOption[] {
	return requests
		.filter(request => request.status === "quoted")
		.map(request => ({ label: `${request.prospect_name} (${request.quote_ref ?? ""})`, value: request.id }))
}

export function getMonogram(name: string): string {
	if (!name) return "—"
	const cleaned = name.replace(/^(شركة|مؤسسة|مجموعة|مكتب)\s+/, "").trim()
	const parts = cleaned.split(/\s+/)
	if (parts[0] && parts[0].length >= 2) {
		return parts[0].slice(0, 3)
	}
	return name.slice(0, 3)
}

const AVATAR_PALETTES = [
	"bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
	"bg-blue-100/80 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
	"bg-amber-100/80 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
	"bg-purple-100/80 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
	"bg-rose-100/80 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
	"bg-cyan-100/80 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300"
]

export function getAvatarPalette(id: number): string {
	return AVATAR_PALETTES[Math.abs(id) % AVATAR_PALETTES.length]
}

export function buildCompanyColumns(
	t: ComposerTranslation,
	branches: Branch[],
	locale: SupportedLocale,
	options?: {
		onOpenDetail?: (row: Company) => void
	}
): DataTableColumns<Company> {
	const branchName = (branchId: number) => {
		const branch = branches.find(b => b.id === branchId)
		return branch ? pickLocalized(branch.name, locale) : String(branchId)
	}

	return [
		{
			title: t("companies.columns.companyAndRecord", "الشركة / السجل"),
			key: "legal_name",
			minWidth: 260,
			align: "center",
			render: row => {
				const lease = row.office_leases?.[0]
				const spaceInfo = lease?.space?.name ? ` · ${pickLocalized(lease.space.name, locale) || lease.space.name}` : ""
				const monogram = getMonogram(row.legal_name)
				const palette = getAvatarPalette(row.id)
				return h("div", { class: "inline-flex items-center gap-3 py-1 text-start whitespace-nowrap" }, [
					h("div", { class: `w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 select-none ${palette}` }, monogram),
					h("div", { class: "flex flex-col gap-0.5 min-w-0" }, [
						h(
							"span",
							{
								class: "font-bold text-sm text-slate-900 dark:text-slate-100 truncate cursor-pointer hover:underline",
								onClick: () => options?.onOpenDetail?.(row)
							},
							row.legal_name
						),
						h("span", { class: "text-xs text-slate-400 dark:text-slate-500 font-mono" }, `CR: #${row.contract_ref}${spaceInfo}`)
					])
				])
			}
		},
		{
			title: t("companies.columns.providerResponsible", "المزود المسؤول"),
			key: "provider",
			minWidth: 160,
			width: 170,
			align: "center",
			render: row => {
				const isDirect = !row.provider
				return h("div", { class: "flex flex-col items-center justify-center text-center whitespace-nowrap" }, [
					h(
						"span",
						{ class: `text-sm ${isDirect ? "text-slate-500 dark:text-slate-400" : "font-medium text-slate-800 dark:text-slate-200"}` },
						row.provider?.name || t("companies.columns.directManagement", "إدارة المنطقة المباشرة")
					)
				])
			}
		},
		{
			title: t("companies.columns.branchAndLocation", "الفرع والموقع"),
			key: "branch_id",
			minWidth: 160,
			width: 170,
			align: "center",
			render: row => {
				const bName = branchName(row.branch_id)
				const lease = row.office_leases?.[0]
				const spaceName = lease?.space?.name ? (pickLocalized(lease.space.name, locale) || lease.space.name) : null
				return h("div", { class: "flex flex-col items-center justify-center gap-0.5 text-center whitespace-nowrap" }, [
					h("span", { class: "text-sm font-medium text-slate-800 dark:text-slate-200" }, bName),
					spaceName ? h("span", { class: "text-xs text-slate-400 dark:text-slate-500" }, spaceName) : null
				])
			}
		},
		{
			title: t("companies.columns.contractStartDate", "تاريخ بدء العقد"),
			key: "contract_start_date",
			minWidth: 130,
			width: 130,
			align: "center",
			render: row => {
				const lease = row.office_leases?.[0]
				const dateStr = lease?.starts_on ? formatDate(lease.starts_on) : "—"
				return h("span", { class: "text-sm text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap font-mono" }, dateStr)
			}
		},
		{
			title: t("companies.columns.monthlyAmount", "القيمة الشهرية"),
			key: "monthly_amount",
			minWidth: 150,
			width: 150,
			align: "center",
			render: row => {
				const lease = row.office_leases?.[0]
				if (!lease) return h("span", { class: "text-sm text-slate-400 whitespace-nowrap" }, "—")
				const symbol = lease.currency === "USD" ? "$" : `${lease.currency} `
				return h(
					"span",
					{ class: "text-sm font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap font-mono" },
					`${symbol}${formatNumber(Number(lease.monthly_amount) || 0)} ${t("companies.columns.perMonth", "/ شهر")}`
				)
			}
		},
		{
			title: t("companies.columns.status", "الحالة"),
			key: "status",
			minWidth: 120,
			width: 120,
			align: "center",
			render: row => {
				const lease = row.office_leases?.[0]
				const isUnderRenewal = lease && (!lease.auto_renew || lease.renewal_stop_reason)
				if (isUnderRenewal) {
					return h(
						"span",
						{
							class:
								"inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60 whitespace-nowrap"
						},
						[h("span", { class: "w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" }), t("companies.statusTags.underRenewal", "قيد التجديد")]
					)
				}
				if (row.status === "active") {
					return h(
						"span",
						{
							class:
								"inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60 whitespace-nowrap"
						},
						[h("span", { class: "w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" }), t("companies.status.active", "نشطة")]
					)
				}
				return h(
					"span",
					{
						class:
							"inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 whitespace-nowrap"
					},
					[h("span", { class: "w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" }), t("companies.status.inactive", "غير نشطة")]
				)
			}
		}
	]
}

export function buildCompanyFields(
	_t: ComposerTranslation,
	quotedRequests: PrivateOfficeRequest[]
): FieldDescriptor<CompanyPayload>[] {
	return [
		{ key: "private_office_request_id", labelKey: "companies.form.privateOfficeRequest", type: "select", required: true, options: quotedRequestOptions(quotedRequests) },
		{ key: "legal_name", labelKey: "companies.form.legalName", type: "text", required: true },
		{ key: "contract_ref", labelKey: "companies.form.contractRef", type: "text", required: true }
	]
}

export function emptyCompanyPayload(): CompanyPayload {
	return { private_office_request_id: null, legal_name: "", contract_ref: "" }
}

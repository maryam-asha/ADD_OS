import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { QuickAccessShortcut, QuickAccessShortcutPayload } from "@/add-os/modules/cms/types/quick-access-shortcut"
import { NImage, NTag } from "naive-ui"
import { h } from "vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import Icon from "@/components/common/Icon.vue"

export function buildQuickAccessColumns(t: ComposerTranslation, locale: SupportedLocale): DataTableColumns<QuickAccessShortcut> {
	return [
		{
			title: t("quickAccess.columns.icon"),
			key: "icon_url",
			width: 70,
			render: row =>
				row.icon_url
					? h(NImage, {
							width: 44,
							height: 44,
							src: row.icon_url,
							class: "rounded-lg overflow-hidden flex items-center justify-center",
							imgProps: {
								class: "rounded-lg object-contain w-11 h-11 p-1 border border-black/10 shadow-2xs bg-white"
							}
						})
					: h(
							"div",
							{
								class:
									"w-11 h-11 rounded-lg bg-[var(--add-surface-sunken)] flex items-center justify-center text-[var(--add-text-muted)] border border-black/5"
							},
							[h(Icon, { name: "carbon:image", size: 18 })]
						)
		},
		{
			title: t("quickAccess.columns.label"),
			key: "label",
			render: row => pickLocalized(row.label, locale)
		},
		{
			title: t("quickAccess.columns.key"),
			key: "key"
		},
		{
			title: t("quickAccess.columns.route"),
			key: "route",
			render: row => h("code", { class: "text-xs", dir: "ltr" }, row.route)
		},
		{
			title: t("quickAccess.columns.order"),
			key: "order",
			width: 90
		},
		{
			title: t("quickAccess.columns.status"),
			key: "is_active",
			render: row => h(
				NTag,
				{ type: row.is_active ? "success" : "default", round: true, bordered: true },
				{ default: () => row.is_active ? t("quickAccess.status.active") : t("quickAccess.status.inactive") }
			)
		}
	]
}

export function buildQuickAccessFields(t: ComposerTranslation): FieldDescriptor<QuickAccessShortcutPayload>[] {
	return [
		{ key: "label", labelKey: "quickAccess.form.label", type: "bilingual-text", required: true },
		{ key: "icon_url", labelKey: "quickAccess.form.icon", type: "image", folder: "quick-access", required: true },
		{ key: "route", labelKey: "quickAccess.form.route", type: "text", required: true, hint: () => t("quickAccess.form.routeHint") },
		{ key: "key", labelKey: "quickAccess.form.key", type: "text", required: true, hint: () => t("quickAccess.form.keyHint") },
		{ key: "order", labelKey: "quickAccess.form.order", type: "number", integer: true, min: 0 },
		{ key: "is_active", labelKey: "quickAccess.form.isActive", type: "switch" }
	]
}

export function emptyQuickAccessPayload(): QuickAccessShortcutPayload {
	return {
		key: "",
		label: { ar: "", en: "" },
		icon_url: "",
		route: "",
		order: null,
		is_active: true
	}
}

export function quickAccessToPayload(row: QuickAccessShortcut): QuickAccessShortcutPayload {
	return {
		key: row.key,
		label: { ...row.label },
		icon_url: row.icon_url || "",
		route: row.route,
		order: row.order,
		is_active: row.is_active
	}
}

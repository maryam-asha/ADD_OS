import type { DataTableColumns } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Amenity, AmenityPayload } from "@/add-os/modules/spatial/types/amenity"
import { NTag } from "naive-ui"
import { h } from "vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { formatNumber } from "@/add-os/utils/format"

export function buildAmenityColumns(t: ComposerTranslation, locale: SupportedLocale): DataTableColumns<Amenity> {
	return [
		{ title: t("amenities.catalog.columns.name"), key: "name", render: row => pickLocalized(row.name, locale) },
		{ title: t("amenities.catalog.columns.key"), key: "key", render: row => h("span", { class: "font-mono text-xs", dir: "ltr" }, row.key) },
		// The name the member app draws; shown as text, not drawn here: icons
		// are bundled ahead of time (`pnpm icons`) and an arbitrary name typed
		// into the catalog would not be.
		{ title: t("amenities.catalog.columns.icon"), key: "icon", render: row => h("span", { class: "font-mono text-xs", dir: "ltr" }, row.icon ?? "") },
		{ title: t("amenities.catalog.columns.order"), key: "order", render: row => formatNumber(row.order) },
		{
			title: t("amenities.catalog.columns.status"),
			key: "is_active",
			render: row =>
				h(NTag, { size: "small", round: true, type: row.is_active ? "success" : "default" }, { default: () => t(row.is_active ? "amenities.catalog.active" : "amenities.catalog.inactive") })
		}
	]
}

/**
 * `key` shows on create only: spaces and space types store it, so ADD Core
 * never accepts a new one on update. `icon` is a Carbon icon name without the
 * `carbon:` prefix, the same string the member app receives.
 */
export function buildAmenityFields(mode: "create" | "edit"): FieldDescriptor<AmenityPayload>[] {
	return [
		{ key: "name", labelKey: "amenities.catalog.form.name", type: "bilingual-text", required: true },
		{ key: "key", labelKey: "amenities.catalog.form.key", type: "text", hiddenWhen: () => mode === "edit" },
		{ key: "icon", labelKey: "amenities.catalog.form.icon", type: "text" },
		{ key: "order", labelKey: "amenities.catalog.form.order", type: "number", integer: true, min: 0 },
		{ key: "is_active", labelKey: "amenities.catalog.form.isActive", type: "switch" }
	]
}

export function emptyAmenityPayload(): AmenityPayload {
	return { key: "", name: { ar: "", en: "" }, icon: "", order: 0, is_active: true }
}

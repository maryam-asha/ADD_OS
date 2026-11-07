import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Kiosk, KioskPayload } from "@/add-os/modules/spatial/types/kiosk"
import type { Space } from "@/add-os/modules/spatial/types/space"
import { NTag } from "naive-ui"
import { h } from "vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import { formatDateTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

export function spaceLabel(space: Space, t: ComposerTranslation, locale: SupportedLocale): string {
	return space.name ? pickLocalized(space.name, locale) : `${t(`spaces.spaceType.${space.space_type}`)} #${space.id}`
}

/** ADD Core refuses a kiosk on any other space type. */
export function coworkingSpaceOptions(spaces: Space[], t: ComposerTranslation, locale: SupportedLocale): SelectOption[] {
	return spaces
		.filter(space => space.space_type === "co_space")
		.map(space => ({ label: spaceLabel(space, t, locale), value: space.id }))
}

/** `off` tells a fault (a deactivated kiosk) from a state that only awaits a step (a kiosk not paired yet). */
function statusTag(on: boolean, off: "danger" | "info", label: string) {
	const icon = on ? STATUS_ICONS.success : STATUS_ICONS[off]
	const type = on ? "success" : off === "danger" ? "error" : "default"

	return h(NTag, { type, round: true, bordered: true }, { default: () => [h(Icon, { name: icon, size: 14 }), ` ${label}`] })
}

export function buildKioskColumns(
	t: ComposerTranslation,
	locale: SupportedLocale,
	spacesById: Record<number, Space>
): DataTableColumns<Kiosk> {
	return [
		{ title: t("kiosks.columns.name"), key: "name" },
		{
			title: t("kiosks.columns.space"),
			key: "space_id",
			render: row => (spacesById[row.space_id] ? spaceLabel(spacesById[row.space_id], t, locale) : `#${row.space_id}`)
		},
		{
			title: t("kiosks.columns.isActive"),
			key: "is_active",
			render: row => statusTag(row.is_active, "danger", t(row.is_active ? "kiosks.isActiveYes" : "kiosks.isActiveNo"))
		},
		{
			title: t("kiosks.columns.isPaired"),
			key: "is_paired",
			render: row => statusTag(row.is_paired, "info", t(row.is_paired ? "kiosks.isPairedYes" : "kiosks.isPairedNo"))
		},
		{
			title: t("kiosks.columns.lastUsedAt"),
			key: "last_used_at",
			render: row => (row.last_used_at ? formatDateTime(row.last_used_at) : "—")
		}
	]
}

/**
 * `canChooseSpace` is whether the account holds `spaces.view`: without it the
 * picker could only stand empty, so the field goes. An edit then simply leaves
 * the space as it is; creating needs it, so the page hides create instead.
 */
export function buildKioskFields(
	spaceOptions: SelectOption[],
	canChooseSpace: boolean,
	t: ComposerTranslation
): FieldDescriptor<KioskPayload>[] {
	const spaceField: FieldDescriptor<KioskPayload> = {
		key: "space_id",
		labelKey: "kiosks.form.space",
		type: "select",
		required: true,
		options: spaceOptions,
		hint: () => (spaceOptions.length === 0 ? t("kiosks.form.noCoworkingSpaces") : "")
	}

	return [
		{ key: "name", labelKey: "kiosks.form.name", type: "text", required: true },
		...(canChooseSpace ? [spaceField] : []),
		{ key: "is_active", labelKey: "kiosks.form.isActive", type: "switch" }
	]
}

export function emptyKioskPayload(): KioskPayload {
	return { name: "", space_id: null, is_active: true }
}

export function kioskToPayload(kiosk: Kiosk): KioskPayload {
	return { name: kiosk.name, space_id: kiosk.space_id, is_active: kiosk.is_active }
}

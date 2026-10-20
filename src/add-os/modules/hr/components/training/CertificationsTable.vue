<template>
	<n-data-table :columns :data="certifications" :loading :bordered="false" size="small" :scroll-x="760">
		<template #empty>
			<span class="text-secondary">{{ t("hrTraining.certifications.empty") }}</span>
		</template>
	</n-data-table>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { Certification } from "@/add-os/modules/hr/types/training"
import { NButton, NDataTable, NTag } from "naive-ui"
import { computed, h } from "vue"
import { useI18n } from "vue-i18n"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { isExpired } from "@/add-os/modules/hr/utils/training"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { formatDate } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Certifications with who issued them, when, and until when — an expired
 * one says so. `onEdit` and `onDelete` add their buttons; `names` adds the
 * employee for a list of several people's.
 */
const props = defineProps<{
	certifications: Certification[]
	loading?: boolean
	onEdit?: (certification: Certification) => void
	onDelete?: (certification: Certification) => void
	names?: Map<number, string>
}>()

const { t } = useI18n()
const today = todayIso()

function expiry(row: Certification) {
	if (!row.expires_on) return h("span", { class: "text-secondary" }, t("hrTraining.certifications.noExpiry"))
	return h("div", { class: "flex flex-wrap items-center gap-2" }, [
		h("span", formatDate(row.expires_on)),
		isExpired(row, today) ? h(NTag, { type: "error", size: "small", round: true, bordered: true }, () => t("hrTraining.certifications.expired")) : null
	])
}

const columns = computed<DataTableColumns<Certification>>(() => [
	...(props.names ? [{ title: t("hr.employees.columns.employee"), key: "employee_id", minWidth: 160, render: (row: Certification) => props.names?.get(row.employee_id) ?? `#${row.employee_id}` }] : []),
	{
		title: t("hrTraining.certifications.name"),
		key: "name",
		minWidth: 200,
		render: row =>
			h("div", { class: "flex flex-col gap-0.5" }, [
				h("span", { class: "font-semibold" }, translated(row.name)),
				h("span", { class: "text-xs text-secondary" }, row.course_id ? t("hrTraining.certifications.fromCourse") : t("hrTraining.certifications.outside"))
			])
	},
	{ title: t("hrTraining.certifications.issuer"), key: "issuer", minWidth: 140, render: row => row.issuer || EMPTY },
	{ title: t("hrTraining.certifications.issuedOn"), key: "issued_on", minWidth: 110, render: row => formatDate(row.issued_on) },
	{ title: t("hrTraining.certifications.expiresOn"), key: "expires_on", minWidth: 150, render: expiry },
	{ title: t("hrTraining.certifications.reference"), key: "reference", minWidth: 110, render: row => (row.reference ? h("span", { dir: "ltr", class: "font-mono text-xs" }, row.reference) : EMPTY) },
	...(props.onEdit || props.onDelete
		? [
				{
					title: "",
					key: "actions",
					width: 90,
					render: (row: Certification) =>
						h("div", { class: "flex justify-end gap-3" }, [
							props.onEdit
								? h(NButton, { text: true, type: "primary", "aria-label": t("hr.common.edit"), title: t("hr.common.edit"), onClick: () => props.onEdit?.(row) }, { icon: () => h(Icon, { name: "carbon:edit", size: 18 }) })
								: null,
							props.onDelete
								? h(NButton, { text: true, type: "error", "aria-label": t("hr.common.delete"), title: t("hr.common.delete"), onClick: () => props.onDelete?.(row) }, { icon: () => h(Icon, { name: "carbon:trash-can", size: 18 }) })
								: null
						])
				}
			]
		: [])
])
</script>

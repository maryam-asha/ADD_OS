<!-- src/add-os/modules/hr/components/DocumentsTable.vue -->
<template>
	<n-data-table :columns :data="documents" :loading :bordered="false" size="small" :scroll-x="640">
		<template #empty>
			<span class="text-secondary">{{ t("hr.documents.empty") }}</span>
		</template>
	</n-data-table>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { DocumentLink, EmployeeDocument } from "@/add-os/modules/hr/types/hr"
import { NButton, NDataTable, NTag, useMessage } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import { formatDate } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Employee documents. A file opens only through a signed link that works
 * for a few minutes (every link is audited on the server), so `open`
 * fetches a fresh one per click. `remove`, when given, adds a delete action
 * (the caller confirms it).
 */
const props = defineProps<{
	documents: EmployeeDocument[]
	loading?: boolean
	open: (documentId: number) => Promise<DocumentLink>
	remove?: (document: EmployeeDocument) => void
	/** Ids the server counts as expired (`compliance.expired`); without it, the date decides. */
	expiredIds?: number[]
}>()

const { t } = useI18n()
const message = useMessage()
const opening = ref<number | null>(null)

async function openDocument(document: EmployeeDocument) {
	opening.value = document.id
	try {
		const link = await props.open(document.id)
		window.open(link.url, "_blank", "noopener")
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
		message.error(e.data?.message ?? t("hr.documents.linkError"))
	} finally {
		opening.value = null
	}
}

function isExpired(document: EmployeeDocument): boolean {
	if (props.expiredIds) return props.expiredIds.includes(document.id)
	return document.expires_on !== null && document.expires_on < new Date().toISOString().slice(0, 10)
}

const columns = computed<DataTableColumns<EmployeeDocument>>(() => [
	{ title: t("hr.documents.type"), key: "type", minWidth: 160, render: row => translated(row.document_type.name) },
	{ title: t("hr.documents.file"), key: "original_name", minWidth: 180, ellipsis: { tooltip: true } },
	{ title: t("hr.documents.issuedOn"), key: "issued_on", minWidth: 110, render: row => (row.issued_on ? formatDate(row.issued_on) : EMPTY) },
	{
		title: t("hr.documents.expiresOn"),
		key: "expires_on",
		minWidth: 130,
		render: row => {
			if (!row.expires_on) return EMPTY
			if (!isExpired(row)) return formatDate(row.expires_on)
			return h("span", { class: "inline-flex items-center gap-2" }, [
				formatDate(row.expires_on),
				h(
					NTag,
					{ type: "error", size: "small", round: true, bordered: true },
					{ icon: () => h(Icon, { name: STATUS_ICONS.danger, size: 14 }), default: () => t("hr.documents.expired") }
				)
			])
		}
	},
	{
		title: "",
		key: "open",
		width: props.remove ? 100 : 70,
		align: "center",
		render: row =>
			h("div", { class: "flex justify-center gap-3" }, [
				h(
					NButton,
					{
						text: true,
						type: "primary",
						loading: opening.value === row.id,
						"aria-label": t("hr.common.open"),
						title: t("hr.common.open"),
						onClick: () => openDocument(row)
					},
					{ icon: () => h(Icon, { name: "carbon:launch", size: 18 }) }
				),
				props.remove
					? h(
							NButton,
							{ text: true, type: "error", "aria-label": t("hr.common.delete"), title: t("hr.common.delete"), onClick: () => props.remove?.(row) },
							{ icon: () => h(Icon, { name: "carbon:trash-can", size: 18 }) }
						)
					: null
			])
	}
])
</script>

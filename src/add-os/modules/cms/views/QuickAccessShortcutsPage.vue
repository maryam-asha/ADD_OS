<!-- src/add-os/modules/cms/views/QuickAccessShortcutsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<PageHeader :title="t(titleKey || 'nav.pages.quickAccess')" :description="t('quickAccess.subtitle')">
			<template #actions>
				<n-button
					type="primary"
					class="!bg-[var(--add-primary)] hover:!bg-[var(--add-primary-hover)] !text-white font-medium shadow-sm px-4 py-2 rounded-lg inline-flex items-center gap-2"
					@click="openCreate"
				>
					<template #icon>
						<Icon name="carbon:add" :size="18" />
					</template>
					{{ t("quickAccess.create.button") }}
				</n-button>
			</template>
		</PageHeader>

		<ResourceStatCards v-if="!error && !isLoading" :cards="statCards" />

		<n-alert v-if="error" type="error" :title="t('quickAccess.loadError')" />

		<ResourceTable
			:columns
			:data
			:loading="isLoading"
			:on-edit="openEdit"
			:on-delete="async row => { await mutations.remove(row.id) }"
		/>

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields
			:title="mode === 'create' ? t('quickAccess.create.title') : t('quickAccess.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { QuickAccessShortcut, QuickAccessShortcutPayload } from "@/add-os/modules/cms/types/quick-access-shortcut"
import { NAlert, NButton } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import PageHeader from "@/add-os/components/page/PageHeader.vue"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { currentLocale } from "@/add-os/lang/currentLocale"
import {
	buildQuickAccessColumns,
	buildQuickAccessFields,
	emptyQuickAccessPayload,
	quickAccessToPayload
} from "@/add-os/modules/cms/config/quick-access-shortcuts.config"
import {
	createQuickAccessShortcut,
	listQuickAccessShortcuts,
	removeQuickAccessShortcut,
	updateQuickAccessShortcut
} from "@/add-os/services/quick-access-shortcuts"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data, isLoading, error, refetch } = useResourceList<QuickAccessShortcut>(listQuickAccessShortcuts)
const columns = computed(() => buildQuickAccessColumns(t, currentLocale.value))
const fields = computed(() => buildQuickAccessFields(t))

const statCards = computed<StatCard[]>(() => {
	const active = data.value.filter(s => s.is_active).length
	return [
		{ label: t("quickAccess.stats.total"), value: data.value.length },
		{ label: t("quickAccess.stats.active"), value: active },
		{ label: t("quickAccess.stats.inactive"), value: data.value.length - active }
	]
})

const mutations = useResourceMutations(
	{ create: createQuickAccessShortcut, update: updateQuickAccessShortcut, remove: removeQuickAccessShortcut },
	refetch,
	{
		createSuccess: t("quickAccess.create.success"),
		updateSuccess: t("quickAccess.edit.success"),
		deleteSuccess: t("quickAccess.delete.success")
	}
)

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref<QuickAccessShortcutPayload>(emptyQuickAccessPayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyQuickAccessPayload()
	drawerVisible.value = true
}

function openEdit(row: QuickAccessShortcut) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = quickAccessToPayload(row)
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as QuickAccessShortcutPayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as unknown as QuickAccessShortcutPayload)
	}
	drawerVisible.value = false
}
</script>

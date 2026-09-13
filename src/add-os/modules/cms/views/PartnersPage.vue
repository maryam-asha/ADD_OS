<!-- src/add-os/modules/cms/views/PartnersPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.partners") }}</h1>
		</div>

		<ResourceStatCards v-if="!error && !isLoading" :cards="statCards" />

		<n-alert v-if="error" type="error" :title="t('partners.loadError')" />

		<div class="flex justify-end">
			<n-button
				type="primary"
				class="!bg-[var(--add-primary)] hover:!bg-[var(--add-primary-hover)] !text-white font-medium shadow-sm px-4 py-2 rounded-lg inline-flex items-center gap-2"
				@click="openCreate"
			>
				<template #icon>
					<Icon name="carbon:add" :size="18" color="#ffffff" />
				</template>
				{{ t("partners.create.button") }}
			</n-button>
		</div>

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
			:fields="partnerFields"
			:title="mode === 'create' ? t('partners.create.title') : t('partners.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { Partner, PartnerPayload } from "@/add-os/modules/cms/types/partner"
import { NAlert, NButton } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { buildPartnerColumns, emptyPartnerPayload, partnerFields } from "@/add-os/modules/cms/config/partners.config"
import { createPartner, listPartners, removePartner, updatePartner } from "@/add-os/services/partners"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data, isLoading, error, refetch } = useResourceList<Partner>(listPartners)
const columns = computed(() => buildPartnerColumns(t, currentLocale.value))

const statCards = computed<StatCard[]>(() => {
	const total = data.value.length
	const active = data.value.filter(p => p.is_active).length
	const inactive = data.value.filter(p => !p.is_active).length
	return [
		{ label: t("partners.stats.total"), value: total },
		{ label: t("partners.stats.active"), value: active },
		{ label: t("partners.stats.inactive"), value: inactive }
	]
})

const mutations = useResourceMutations(
	{ create: createPartner, update: updatePartner, remove: removePartner },
	refetch,
	{
		createSuccess: t("partners.create.success"),
		updateSuccess: t("partners.edit.success"),
		deleteSuccess: t("partners.delete.success")
	}
)

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref<PartnerPayload>(emptyPartnerPayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyPartnerPayload()
	drawerVisible.value = true
}

function openEdit(row: Partner) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = {
		name: { ...row.name },
		description: row.description ? { ...row.description } : { ar: "", en: "" },
		logo_url: row.logo_url || "",
		website_url: row.website_url || "",
		category: row.category,
		order: row.order,
		is_active: row.is_active
	}
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as PartnerPayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as unknown as PartnerPayload)
	}
	drawerVisible.value = false
}
</script>

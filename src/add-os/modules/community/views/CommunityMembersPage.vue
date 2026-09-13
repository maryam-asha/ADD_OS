<!-- src/add-os/modules/community/views/CommunityMembersPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.community") }}</h1>
		</div>

		<ResourceStatCards v-if="!error && !isLoading" :cards="statCards" />

		<n-alert v-if="error" type="error" :title="t('communityMembers.loadError')" />

		<div class="flex justify-end">
			<n-button
				type="primary"
				class="!bg-[var(--add-primary)] hover:!bg-[var(--add-primary-hover)] !text-white font-medium shadow-sm px-4 py-2 rounded-lg inline-flex items-center gap-2"
				@click="openCreate"
			>
				<template #icon>
					<Icon name="carbon:add" :size="18" color="#ffffff" />
				</template>
				{{ t("communityMembers.create.button") }}
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
			:fields="communityMemberFields"
			:title="mode === 'create' ? t('communityMembers.create.title') : t('communityMembers.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { CommunityMember, CommunityMemberPayload } from "@/add-os/modules/community/types/community-member"
import { NAlert, NButton } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { currentLocale } from "@/add-os/lang/currentLocale"
import {
	buildCommunityMemberColumns,
	communityMemberFields,
	emptyCommunityMemberPayload
} from "@/add-os/modules/community/config/community-members.config"
import {
	createCommunityMember,
	listCommunityMembers,
	removeCommunityMember,
	updateCommunityMember
} from "@/add-os/services/community-members"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data, isLoading, error, refetch } = useResourceList<CommunityMember>(listCommunityMembers)
const columns = computed(() => buildCommunityMemberColumns(t, currentLocale.value))

const statCards = computed<StatCard[]>(() => {
	const total = data.value.length
	const published = data.value.filter(m => m.published).length
	const hidden = data.value.filter(m => !m.published).length
	return [
		{ label: t("communityMembers.stats.total"), value: total },
		{ label: t("communityMembers.stats.published"), value: published },
		{ label: t("communityMembers.stats.hidden"), value: hidden }
	]
})

const mutations = useResourceMutations(
	{ create: createCommunityMember, update: updateCommunityMember, remove: removeCommunityMember },
	refetch,
	{
		createSuccess: t("communityMembers.create.success"),
		updateSuccess: t("communityMembers.edit.success"),
		deleteSuccess: t("communityMembers.delete.success")
	}
)

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref<CommunityMemberPayload>(emptyCommunityMemberPayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyCommunityMemberPayload()
	drawerVisible.value = true
}

function openEdit(row: CommunityMember) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = {
		name: { ...row.name },
		category: row.category,
		company: row.company ? { ...row.company } : { ar: "", en: "" },
		title: row.title ? { ...row.title } : { ar: "", en: "" },
		bio: row.bio ? { ...row.bio } : { ar: "", en: "" },
		long_bio: row.long_bio ? { ...row.long_bio } : { ar: "", en: "" },
		year_joined: row.year_joined ?? null,
		photo_url: row.photo_url || "",
		order: row.order,
		published: row.published
	}
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as CommunityMemberPayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as CommunityMemberPayload)
	}
	drawerVisible.value = false
}
</script>

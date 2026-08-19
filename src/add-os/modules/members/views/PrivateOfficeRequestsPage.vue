<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.privateOfficeRequests") }}</h1>
			<p>{{ t("privateOfficeRequests.description") }}</p>
		</div>

		<ResourceStatCards v-if="!error && !isLoading" :cards="statCards" />
		<n-alert v-if="error" type="error" :title="t('privateOfficeRequests.loadError')" />

		<div class="flex justify-end">
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("privateOfficeRequests.create.button") }}
			</n-button>
		</div>

		<n-card class="add-ledger-table">
			<n-data-table v-if="data.length > 0 || isLoading" :columns :data :loading="isLoading" :bordered="false" :row-key />
			<div v-else class="py-10 text-center">{{ t("privateOfficeRequests.empty") }}</div>
		</n-card>

		<ResourceFormDrawer
			v-model:show="createDrawerVisible"
			v-model:model="createForm"
			:fields="requestFields"
			:title="t('privateOfficeRequests.create.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submitCreate"
		/>

		<n-modal v-model:show="quoteModalVisible" preset="card" :title="t('privateOfficeRequests.markAsQuoted.title')" class="max-w-md">
			<n-form ref="quoteFormRef" :model="quoteForm" :rules="quoteRules">
				<n-form-item path="quote_ref" :label="t('privateOfficeRequests.markAsQuoted.quoteRefLabel')">
					<n-input v-model:value="quoteForm.quote_ref" :placeholder="t('privateOfficeRequests.markAsQuoted.quoteRefPlaceholder')" />
				</n-form-item>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="quoteModalVisible = false">{{ t("resourceCrud.form.cancel") }}</n-button>
					<n-button type="primary" :loading="mutations.isSubmitting.value" @click="submitQuote">{{ t("resourceCrud.form.submit") }}</n-button>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, FormInst, FormRules } from "naive-ui"
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { MarkAsQuotedPayload, PrivateOfficeRequest, PrivateOfficeRequestPayload } from "@/add-os/modules/members/types/private-office-request"
import { NAlert, NButton, NCard, NDataTable, NForm, NFormItem, NInput, NModal, useDialog, useMessage } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { buildRequestColumns, emptyRequestPayload, requestFields } from "@/add-os/modules/members/config/private-office-requests.config"
import { ApiError } from "@/add-os/services/api"
import {
	createPrivateOfficeRequest,
	listPrivateOfficeRequests,
	markPrivateOfficeRequestAsQuoted,
	removePrivateOfficeRequest
} from "@/add-os/services/private-office-requests"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()
const { t } = useI18n()
const dialog = useDialog()
const message = useMessage()

const { data, isLoading, error, refetch } = useResourceList<PrivateOfficeRequest>(listPrivateOfficeRequests)

const mutations = useResourceMutations(
	{ create: createPrivateOfficeRequest, update: markPrivateOfficeRequestAsQuoted, remove: removePrivateOfficeRequest },
	refetch,
	{
		createSuccess: t("privateOfficeRequests.create.success"),
		updateSuccess: t("privateOfficeRequests.markAsQuoted.success"),
		deleteSuccess: t("privateOfficeRequests.delete.success")
	}
)

const statCards = computed<StatCard[]>(() => [
	{ label: t("privateOfficeRequests.stats.total"), value: data.value.length },
	{ label: t("privateOfficeRequests.stats.requested"), value: data.value.filter(r => r.status === "requested").length },
	{ label: t("privateOfficeRequests.stats.quoted"), value: data.value.filter(r => r.status === "quoted").length },
	{ label: t("privateOfficeRequests.stats.contracted"), value: data.value.filter(r => r.status === "contracted").length }
])

function rowKey(row: PrivateOfficeRequest) {
	return row.id
}

function confirmDelete(row: PrivateOfficeRequest) {
	dialog.warning({
		title: t("resourceCrud.table.deleteConfirmTitle"),
		positiveText: t("resourceCrud.table.deleteConfirmOk"),
		negativeText: t("resourceCrud.table.deleteConfirmCancel"),
		onPositiveClick: () => mutations.remove(row.id)
	})
}

const columns = computed<DataTableColumns<PrivateOfficeRequest>>(() => buildRequestColumns(t, openQuote, confirmDelete))

const createDrawerVisible = ref(false)
const createForm = ref<PrivateOfficeRequestPayload>(emptyRequestPayload())

function openCreate() {
	createForm.value = emptyRequestPayload()
	createDrawerVisible.value = true
}

async function submitCreate(payload: Record<string, unknown>) {
	await mutations.create(payload as unknown as PrivateOfficeRequestPayload)
}

const quoteModalVisible = ref(false)
const quoteTargetId = ref<number | null>(null)
const quoteForm = ref<MarkAsQuotedPayload>({ quote_ref: "" })
const quoteFormRef = ref<FormInst | null>(null)
const quoteRules: FormRules = {
	quote_ref: { required: true, message: t("privateOfficeRequests.markAsQuoted.quoteRefRequired"), trigger: ["blur", "input"] }
}

function openQuote(row: PrivateOfficeRequest) {
	quoteTargetId.value = row.id
	quoteForm.value = { quote_ref: "" }
	quoteFormRef.value?.restoreValidation()
	quoteModalVisible.value = true
}

async function submitQuote() {
	if (quoteTargetId.value === null) return
	try {
		await quoteFormRef.value?.validate()
	} catch {
		return
	}
	try {
		await mutations.update(quoteTargetId.value, quoteForm.value)
	} catch (caught) {
		if (caught instanceof ApiError && caught.status === 422) {
			message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
		}
		return
	}
	quoteModalVisible.value = false
}
</script>

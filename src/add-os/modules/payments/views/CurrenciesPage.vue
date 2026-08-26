<!-- src/add-os/modules/payments/views/CurrenciesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.currencies") }}</h1>
			<p>{{ t("currencies.description") }}</p>
		</div>

		<ResourceStatCards v-if="!error && !isLoading" :cards="statCards" />

		<n-alert v-if="error" type="error" :title="t('currencies.loadError')" />

		<div class="flex justify-end">
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("currencies.create.button") }}
			</n-button>
		</div>

		<n-card class="add-ledger-table">
			<n-data-table v-if="data.length > 0 || isLoading" :columns :data :loading="isLoading" :bordered="false" :row-key />
			<div v-else class="py-10 text-center">{{ t("currencies.empty") }}</div>
		</n-card>

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields
			:title="mode === 'create' ? t('currencies.create.title') : t('currencies.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { Currency, CurrencyPayload, CurrencyUpdatePayload } from "@/add-os/modules/payments/types/currency"
import { NAlert, NButton, NCard, NDataTable } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { useCurrencyMutations } from "@/add-os/modules/payments/composables/useCurrencyMutations"
import { buildCurrencyColumns, buildCurrencyFields, currencyPayloadFrom, emptyCurrencyPayload } from "@/add-os/modules/payments/config/currencies.config"
import { listCurrencies } from "@/add-os/services/currencies"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data, isLoading, error, refetch } = useResourceList<Currency>(listCurrencies)

const statCards = computed<StatCard[]>(() => [
	{ label: t("currencies.stats.total"), value: data.value.length },
	{ label: t("currencies.stats.active"), value: data.value.filter(currency => currency.is_active).length },
	{ label: t("currencies.stats.base"), value: data.value.find(currency => currency.is_base)?.code ?? "—" }
])

/**
 * `n-data-table` directly rather than `ResourceTable`, for one structural
 * reason: that component's generic is `T extends { id: number }` and its
 * `rowKey` returns `row.id`. A currency has no numeric id at all — `code` is
 * the primary key. `CompaniesPage` is the existing precedent for a resource
 * that renders the same `add-ledger-table` card without the shared wrapper.
 *
 * Nothing is lost by it: the wrapper's other job is the delete column, and this
 * resource has no destroy endpoint to give it.
 */
function rowKey(row: Currency) {
	return row.code
}

const mutations = useCurrencyMutations(refetch)

/** `code` of the row whose status request is in flight — drives that one switch's spinner. */
const statusPendingCode = ref<string | null>(null)

/**
 * The base currency is refused here as well as being given no control to click.
 * `CurrencyController::updateStatus()` answers 422 for it, and a live 422 raised
 * by an action the UI itself offered reads as a bug rather than as the rule it
 * is — so the rule is expressed in both places, and neither one is load-bearing
 * alone.
 */
async function toggleStatus(row: Currency, isActive: boolean) {
	if (row.is_base) return

	statusPendingCode.value = row.code
	try {
		await mutations.updateStatus(row.code, isActive)
	} catch {
		// Toasted by the mutation runner; the refetch it skipped leaves the
		// switch showing the server's last known state, which is correct.
	} finally {
		statusPendingCode.value = null
	}
}

/**
 * The edit action lives here rather than in the config, matching
 * `CompaniesPage` — the config owns the row's data columns, the view owns the
 * controls that open its own drawers. There is deliberately no delete action:
 * no destroy endpoint exists, and deactivating through the status switch IS the
 * removal path.
 */
function renderActions(row: Currency) {
	const editLabel = t("resourceCrud.table.editAction")

	return h(
		NButton,
		{ text: true, type: "primary", "aria-label": editLabel, title: editLabel, onClick: () => openEdit(row) },
		{ icon: () => h(Icon, { name: "carbon:edit", size: 18 }) }
	)
}

const columns = computed<DataTableColumns<Currency>>(() => [
	...buildCurrencyColumns(t, currentLocale.value, { onToggle: toggleStatus, pendingCode: statusPendingCode.value }),
	{ title: t("resourceCrud.table.actionsColumn"), key: "actions", render: renderActions }
])

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingCode = ref<string | null>(null)
const form = ref<CurrencyPayload>(emptyCurrencyPayload())
const fields = computed(() => buildCurrencyFields(t, mode.value))

function openCreate() {
	mode.value = "create"
	editingCode.value = null
	form.value = emptyCurrencyPayload()
	drawerVisible.value = true
}

function openEdit(row: Currency) {
	mode.value = "edit"
	editingCode.value = row.code
	form.value = currencyPayloadFrom(row)
	drawerVisible.value = true
}

/**
 * `payload` arrives already stripped to the fields the active mode declared, so
 * an edit physically cannot carry `code` — see `buildCurrencyFields`.
 */
async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as CurrencyPayload)
	} else if (editingCode.value !== null) {
		await mutations.update(editingCode.value, payload as unknown as CurrencyUpdatePayload)
	}
}

defineExpose({ openCreate, openEdit, submit, toggleStatus, form, fields, mode, editingCode, drawerVisible, data, columns })
</script>

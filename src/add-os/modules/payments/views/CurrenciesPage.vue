<!-- src/add-os/modules/payments/views/CurrenciesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.currencies") }}</h1>
		</div>

		<ResourceStatCards v-if="!error && !isLoading" :cards="statCards" />

		<n-alert v-if="error" type="error" :title="t('currencies.loadError')" />

		<div class="flex justify-end">
			<n-button
				type="primary"
				class="!bg-[var(--add-primary)] hover:!bg-[var(--add-primary-hover)] !text-white font-medium shadow-sm px-4 py-2 rounded-lg inline-flex items-center gap-2"
				@click="openCreate"
			>
				<template #icon>
					<span class="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
						<Icon name="carbon:add" :size="14" color="#ffffff" />
					</span>
				</template>
				{{ t("currencies.create.button") }}
			</n-button>
		</div>

		<ResourceTable
			:columns
			:data
			:loading="isLoading"
			:row-key="currencyRowKey"
			:on-edit="openEdit"
			:extra-actions="rowActions"
		/>

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
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { Currency, CurrencyCreatePayload, CurrencyUpdatePayload } from "@/add-os/modules/payments/types/currency"
import type { MessageResponse } from "@/add-os/services/resource-factory"
import { NAlert, NButton, useDialog, useMessage } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { currentLocale } from "@/add-os/lang/currentLocale"
import {
	buildCurrencyColumns,
	currencyCreateFields,
	currencyEditFields,
	currencyEditPayload,
	emptyCurrencyPayload
} from "@/add-os/modules/payments/config/currencies.config"
import { ApiError } from "@/add-os/services/api"
import { createCurrency, listCurrencies, setBaseCurrency, setCurrencyStatus, updateCurrency } from "@/add-os/services/currencies"
import Icon from "@/components/common/Icon.vue"

/**
 * Currencies are the one admin resource keyed by a string `code` rather than
 * an autoincrement id, and the only one where a single row action is one-way
 * and financially consequential. Both facts shape this page:
 *
 *  · `ResourceTable` is given an explicit `rowKey`, since there is no `id`.
 *  · `is_base` is NOT a form field. It is a badge in the table plus a
 *    confirm-gated row action, so it cannot be flipped by a misclick next to
 *    `symbol` in the edit drawer.
 *  · Status and base go through `runRowAction` rather than
 *    `useResourceMutations`, which re-throws 422s untoasted for the form
 *    drawer to render. These two actions have no drawer, so a 422 there would
 *    surface nowhere — and a 422 is precisely the interesting answer.
 *
 * No `can()` gate: the currency routes carry no permission or role middleware
 * (same finance-admin tier as exchange-rates, per `routes/api/v1/admin.php`),
 * so gating here would invent a rule the backend does not have.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

const { data, isLoading, error, refetch } = useResourceList<Currency>(listCurrencies)
const columns = computed(() => buildCurrencyColumns(t, currentLocale.value))

function currencyRowKey(row: Currency): string {
	return row.code
}

const statCards = computed<StatCard[]>(() => {
	const total = data.value.length
	const active = data.value.filter(currency => currency.is_active).length
	return [
		{ label: t("currencies.stats.total"), value: total },
		{ label: t("currencies.stats.active"), value: active },
		{ label: t("currencies.stats.inactive"), value: total - active }
	]
})

const mutations = useResourceMutations<Currency, CurrencyCreatePayload, CurrencyUpdatePayload, string>(
	{
		create: createCurrency,
		update: updateCurrency,
		// No destroy endpoint exists: a currency deactivates via status, it never
		// hard-deletes — plans, spaces, bookings and users all carry a real FK to
		// `currencies.code`. Present only to satisfy the shared shape, and the
		// table is given no `onDelete`, so nothing can reach it.
		remove: () => Promise.reject(new Error("Currencies cannot be deleted."))
	},
	refetch,
	{
		createSuccess: t("currencies.create.success"),
		updateSuccess: t("currencies.edit.success"),
		deleteSuccess: t("currencies.edit.success")
	}
)

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingCode = ref<string | null>(null)
const form = ref<CurrencyCreatePayload | CurrencyUpdatePayload>(emptyCurrencyPayload())

const fields = computed<FieldDescriptor<Record<string, unknown>>[]>(() =>
	mode.value === "create"
		? (currencyCreateFields(t) as FieldDescriptor<Record<string, unknown>>[])
		: (currencyEditFields as FieldDescriptor<Record<string, unknown>>[])
)

function openCreate() {
	mode.value = "create"
	editingCode.value = null
	form.value = emptyCurrencyPayload()
	drawerVisible.value = true
}

function openEdit(row: Currency) {
	mode.value = "edit"
	editingCode.value = row.code
	form.value = currencyEditPayload(row)
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as CurrencyCreatePayload)
	} else if (editingCode.value !== null) {
		await mutations.update(editingCode.value, payload as unknown as CurrencyUpdatePayload)
	}
}

/**
 * The status/base counterpart to `useResourceMutations.run`. It differs in the
 * one way that matters: a 422 is TOASTED here rather than re-thrown, because
 * the server's refusal text is the entire point of the interaction —
 * exchange-rate history blocking a base change, or an inactive currency. 403
 * still shows the fixed translated message rather than Laravel's raw gate
 * string, matching the composable.
 */
async function runRowAction(action: () => Promise<MessageResponse>, successMessage: string) {
	try {
		await action()
		message.success(successMessage)
		await refetch()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (caught.status === 403) {
			message.error(t("resourceCrud.mutations.permissionError"))
		} else {
			message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
		}
	}
}

function toggleStatus(row: Currency) {
	const next = !row.is_active
	return runRowAction(
		() => setCurrencyStatus(row.code, next),
		t(next ? "currencies.status.activateSuccess" : "currencies.status.deactivateSuccess")
	)
}

/**
 * A centered `useDialog()` confirm, not `n-popconfirm` — the same reasoning
 * ResourceTable documents for its delete prompt: the popover's floating-ui
 * placement has no RTL visual sign-off and rendered nowhere near its trigger.
 *
 * The content names the currency explicitly. This is a one-way change to the
 * unit every stored amount is reckoned against; "are you sure?" is not enough
 * to act on.
 */
function confirmSetBase(row: Currency) {
	dialog.warning({
		title: t("currencies.setBase.title"),
		content: t("currencies.setBase.content", { code: row.code }),
		positiveText: t("currencies.setBase.confirm"),
		negativeText: t("currencies.setBase.cancel"),
		onPositiveClick: () => runRowAction(() => setBaseCurrency(row.code), t("currencies.setBase.success"))
	})
}

/**
 * The base row gets neither action. Both are refused server-side with a 422 —
 * `updateStatus` returns `base_currency_status_locked`, and a currency cannot
 * be made the base it already is — so offering either would only be a click
 * into a guaranteed rejection.
 *
 * An INACTIVE non-base row still gets "Set as base", deliberately. The server
 * refuses that too, but with a message the operator needs to read; hiding the
 * button would replace an explanation with silence. The rule about which
 * currencies may become the base lives on the server, and this page does not
 * keep a second copy of it.
 */
function rowActions(row: Currency) {
	if (row.is_base) return []

	const statusLabel = t(row.is_active ? "currencies.actions.deactivate" : "currencies.actions.activate")
	const baseLabel = t("currencies.actions.setBase")

	return [
		h(
			NButton,
			{
				text: true,
				type: row.is_active ? "warning" : "success",
				"aria-label": statusLabel,
				title: statusLabel,
				onClick: () => toggleStatus(row)
			},
			{ icon: () => h(Icon, { name: row.is_active ? "carbon:close-outline" : "carbon:checkmark-outline", size: 18 }) }
		),
		h(
			NButton,
			{ text: true, type: "primary", "aria-label": baseLabel, title: baseLabel, onClick: () => confirmSetBase(row) },
			{ icon: () => h(Icon, { name: "carbon:star", size: 18 }) }
		)
	]
}

defineExpose({ rowActions, toggleStatus, confirmSetBase, openCreate, openEdit, submit, statCards, form, drawerVisible, mode })
</script>

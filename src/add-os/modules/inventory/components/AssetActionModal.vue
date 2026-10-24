<!-- src/add-os/modules/inventory/components/AssetActionModal.vue -->
<template>
	<HrFormModal v-model:show="show" :title="t(`inventory.actions.${action}.title`)" size="md" :icon="ICONS[action]">
		<p class="mb-3 text-sm text-secondary">{{ t(`inventory.actions.${action}.hint`) }}</p>

		<template v-if="action === 'move'">
			<n-form-item :label="t('inventory.assets.location')" required>
				<PlacePicker v-model:value="place" />
			</n-form-item>
		</template>

		<template v-else-if="action === 'assign'">
			<n-form-item :label="t('inventory.assets.custodian')" required>
				<CustodianPicker v-model:value="custodian" />
			</n-form-item>
		</template>

		<template v-else-if="action === 'status'">
			<n-form-item :label="t('inventory.common.status')" required>
				<n-select v-model:value="status" :options="statusOptions" />
			</n-form-item>
		</template>

		<template v-else-if="action === 'maintenance'">
			<n-form-item :label="t('inventory.maintenance.type')" required>
				<n-radio-group v-model:value="maintenanceType">
					<n-radio-button value="corrective">{{ t("inventory.maintenanceType.corrective") }}</n-radio-button>
					<n-radio-button value="preventive">{{ t("inventory.maintenanceType.preventive") }}</n-radio-button>
				</n-radio-group>
			</n-form-item>
			<n-form-item v-if="maintenanceType === 'preventive' && schedules.length" :label="t('inventory.maintenance.schedule')">
				<n-select v-model:value="scheduleId" :options="scheduleOptions" clearable />
			</n-form-item>
			<n-form-item :label="t('inventory.maintenance.description')" required>
				<n-input v-model:value="description" type="textarea" :maxlength="5000" :autosize="{ minRows: 2, maxRows: 5 }" />
			</n-form-item>
			<n-form-item :label="t('inventory.maintenance.vendor')">
				<n-input v-model:value="vendor" :maxlength="255" />
			</n-form-item>
		</template>

		<template v-else-if="action === 'close'">
			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item :label="t('inventory.maintenance.cost')">
					<n-input-number v-model:value="amount" :min="0" :precision="2" clearable class="w-full" dir="ltr" />
				</n-form-item>
				<n-form-item :label="t('inventory.assets.currency')">
					<CurrencySelect v-model:value="currency" clearable />
				</n-form-item>
			</div>
			<n-form-item :label="t('inventory.maintenance.resolution')">
				<n-input v-model:value="description" type="textarea" :maxlength="5000" :autosize="{ minRows: 2, maxRows: 5 }" />
			</n-form-item>
		</template>

		<template v-else-if="action === 'dispose'">
			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item :label="t('inventory.disposal.method')" required>
					<n-select v-model:value="method" :options="methodOptions" />
				</n-form-item>
				<n-form-item :label="t('inventory.disposal.on')" required>
					<n-date-picker v-model:formatted-value="date" value-format="yyyy-MM-dd" type="date" class="w-full" />
				</n-form-item>
				<n-form-item v-if="method === 'sold'" :label="t('inventory.disposal.proceeds')">
					<n-input-number v-model:value="amount" :min="0" :precision="2" clearable class="w-full" dir="ltr" />
				</n-form-item>
			</div>
		</template>

		<n-form-item v-if="action !== 'close' && action !== 'maintenance' && action !== 'status'" :label="t('inventory.common.note')">
			<n-input v-model:value="note" type="textarea" :maxlength="2000" :autosize="{ minRows: 1, maxRows: 4 }" />
		</n-form-item>

		<p v-if="problem" class="text-sm text-error">{{ problem }}</p>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("inventory.common.cancel") }}</n-button>
				<n-button :type="action === 'dispose' ? 'error' : 'primary'" :loading="saving" :disabled="!ready" @click="save">{{ t(`inventory.actions.${action}.confirm`) }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { Asset, AssetAction, AssetStatus, CustodianRef, DisposalMethod, MaintenanceSchedule, MaintenanceType, PlaceRef } from "@/add-os/modules/inventory/types/inventory"
import { NButton, NDatePicker, NFormItem, NInput, NInputNumber, NRadioButton, NRadioGroup, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import CurrencySelect from "@/add-os/modules/hr/components/payroll/CurrencySelect.vue"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import CustodianPicker from "@/add-os/modules/inventory/components/CustodianPicker.vue"
import PlacePicker from "@/add-os/modules/inventory/components/PlacePicker.vue"
import { DISPOSAL_METHODS, SETTABLE_ASSET_STATUSES } from "@/add-os/modules/inventory/types/inventory"
import { assignAsset, closeMaintenance, disposeAsset, moveAsset, openMaintenance, returnAsset, setAssetStatus } from "@/add-os/services/inventory"

/**
 * One action on an asset, each a short form: moving it, handing it over or
 * taking it back, setting a simple status, opening or closing a repair,
 * disposing of it. ADD Core refuses what the asset's state does not allow
 * (no custody while under repair, no disposal while held) and its message
 * is shown here.
 */
const props = defineProps<{ asset: Asset; action: AssetAction; schedules?: MaintenanceSchedule[] }>()
const emit = defineEmits<{ done: [] }>()
const show = defineModel<boolean>("show", { required: true })
const { t } = useI18n()
const message = useMessage()

const ICONS: Record<AssetAction, string> = {
	move: "carbon:location",
	assign: "carbon:user-follow",
	return: "carbon:undo",
	status: "carbon:edit",
	maintenance: "carbon:tool-kit",
	close: "carbon:checkmark-outline",
	dispose: "carbon:trash-can"
}

const place = ref<PlaceRef | null>(null)
const custodian = ref<CustodianRef | null>(null)
const status = ref<AssetStatus>("in_service")
const maintenanceType = ref<MaintenanceType>("corrective")
const scheduleId = ref<number | null>(null)
const description = ref("")
const vendor = ref("")
const amount = ref<number | null>(null)
const currency = ref<string | null>(null)
const method = ref<DisposalMethod>("scrapped")
const date = ref<string | null>(null)
const note = ref("")
const saving = ref(false)
const problem = ref("")

const schedules = computed(() => props.schedules ?? [])

watch(show, open => {
	if (!open) return
	place.value = null
	custodian.value = null
	status.value = props.asset.status === "in_service" ? "retired" : "in_service"
	maintenanceType.value = "corrective"
	scheduleId.value = null
	description.value = ""
	vendor.value = ""
	amount.value = null
	currency.value = props.asset.currency
	method.value = "scrapped"
	date.value = new Date().toISOString().slice(0, 10)
	note.value = ""
	problem.value = ""
})

const statusOptions = computed<SelectOption[]>(() => SETTABLE_ASSET_STATUSES.map(s => ({ label: t(`inventory.assetStatus.${s}`), value: s })))
const methodOptions = computed<SelectOption[]>(() => DISPOSAL_METHODS.map(m => ({ label: t(`inventory.disposal.methods.${m}`), value: m })))
const scheduleOptions = computed<SelectOption[]>(() => schedules.value.map(s => ({ label: s.title, value: s.id })))

const ready = computed(() => {
	switch (props.action) {
		case "move":
			return place.value !== null
		case "assign":
			return custodian.value !== null
		case "maintenance":
			return description.value.trim() !== ""
		case "dispose":
			return date.value !== null
		default:
			return true
	}
})

async function save() {
	saving.value = true
	problem.value = ""
	const id = props.asset.id
	try {
		let done = t(`inventory.actions.${props.action}.success`)
		switch (props.action) {
			case "move":
				await moveAsset(id, place.value!, note.value)
				break
			case "assign":
				await assignAsset(id, custodian.value!, note.value)
				break
			case "return":
				done = serverMessage(await returnAsset(id, note.value), done)
				break
			case "status":
				done = serverMessage(await setAssetStatus(id, status.value), done)
				break
			case "maintenance":
				await openMaintenance(id, { type: maintenanceType.value, description: description.value.trim(), vendor: vendor.value || null, schedule_id: maintenanceType.value === "preventive" ? scheduleId.value : null })
				break
			case "close":
				done = serverMessage(
					await closeMaintenance(props.asset.open_maintenance!.id, { cost: amount.value, currency: amount.value === null ? null : currency.value, resolution: description.value || null }),
					done
				)
				break
			case "dispose":
				done = serverMessage(await disposeAsset(id, { method: method.value, disposed_on: date.value!, proceeds: method.value === "sold" ? amount.value : null, note: note.value || null }), done)
				break
		}
		message.success(done)
		show.value = false
		emit("done")
	} catch (e) {
		problem.value = apiErrorMessage(e, t("inventory.common.saveError"))
	} finally {
		saving.value = false
	}
}
</script>

<!-- src/add-os/modules/access/views/DevicesPage.vue -->
<!--
	Door locks and the gateways they reach the internet through. A row links
	to a real TTLock device by its id, picked from the account; status, battery
	and pairing come from that account (refreshed every 15 minutes, or now with
	"Refresh from TTLock"). From here staff open or lock a door, print its QR
	sticker, and jump to its codes or its log.
-->
<template>
	<div class="flex flex-col gap-5">
		<PageHeader :title="t(titleKey || 'nav.pages.locks')" :description="t('accessDevices.subtitle')" />

		<ResourceStatCards v-if="!error && !isLoading" :cards="statCards" />

		<n-alert v-if="error" type="error" :title="t('accessDevices.loadError')" />
		<n-alert v-if="accountProblem" type="warning" :bordered="false">{{ accountProblem }}</n-alert>

		<div class="flex flex-wrap justify-end gap-2">
			<n-button v-if="canUpdate" :loading="syncing" data-testid="devices-sync" @click="sync">
				<template #icon><Icon name="carbon:renew" :size="16" /></template>
				{{ t("accessDevices.sync") }}
			</n-button>
			<n-button v-if="canCreate" type="primary" :loading="!lookupsReady" data-testid="device-create" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("accessDevices.create.button") }}
			</n-button>
		</div>

		<ResourceTable
			:columns
			:data="rows"
			:loading="isLoading"
			:on-edit="canUpdate ? openEdit : undefined"
			:on-delete="canDelete ? (async row => { await mutations.remove(row.id) }) : undefined"
			:delete-warning="t('accessDevices.delete.warning')"
			:row-actions="deviceActions"
		/>

		<ResourceFormDrawer
			v-if="lookupsReady"
			:key="drawerKey"
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields
			:title="mode === 'create' ? t('accessDevices.create.title') : t('accessDevices.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>

		<DeviceQrModal
			v-model:show="qrVisible"
			:device="qrDevice"
			:caption="qrDevice ? placeOf(qrDevice) : ''"
			:can-regenerate="canUpdate"
			@regenerate="confirmRegenerate"
		/>
	</div>
</template>

<script setup lang="ts">
import type { RowAction } from "@/add-os/components/page/row-actions"
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { Device, DevicePayload, TTLockAccount } from "@/add-os/modules/access/types/access"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { Space } from "@/add-os/modules/spatial/types/space"
import { NAlert, NButton, useDialog, useMessage } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import PageHeader from "@/add-os/components/page/PageHeader.vue"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { can } from "@/add-os/config/permissions"
import { currentLocale } from "@/add-os/lang/currentLocale"
import DeviceQrModal from "@/add-os/modules/access/components/DeviceQrModal.vue"
import {
	buildDeviceColumns,
	buildDeviceFields,
	deviceToPayload,
	emptyDevicePayload,
	isAccessDevice,
	LOW_BATTERY,
	normalizeDevicePayload,
	withAccountMac
} from "@/add-os/modules/access/config/devices.config"
import { spaceLabel } from "@/add-os/modules/spatial/config/kiosks.config"
import {
	createDevice,
	getTTLockAccount,
	listDevices,
	lockDevice,
	regenerateDeviceQr,
	removeDevice,
	syncDevices,
	unlockDevice,
	updateDevice
} from "@/add-os/services/access"
import { ApiError } from "@/add-os/services/api"
import { listBranches } from "@/add-os/services/branches"
import { listBuildings } from "@/add-os/services/buildings"
import { listSpaces } from "@/add-os/services/spaces"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const router = useRouter()

const { data, isLoading, error, refetch } = useResourceList<Device>(listDevices)
const rows = computed(() => data.value.filter(isAccessDevice))

const canCreate = computed(() => can("devices.create") && can("branches.view"))
const canUpdate = computed(() => can("devices.update"))
const canDelete = computed(() => can("devices.delete"))
const canControl = computed(() => can("devices.control"))
const canSeeCodes = computed(() => can("access-grants.view"))
const canSeeLog = computed(() => can("access-events.view"))

// ── Lookups: names for the table, choices for the form ───────────────────
const branches = ref<Branch[]>([])
const spaces = ref<{ space: Space; branchId: number | null }[]>([])
const account = ref<TTLockAccount | null>(null)
const accountProblem = ref<string | null>(null)

const spacesById = computed(() => Object.fromEntries(spaces.value.map(({ space }) => [space.id, space])))
const devicesById = computed(() => Object.fromEntries(data.value.map(device => [device.id, device])))

async function settle<T>(enabled: boolean, load: () => Promise<T>, fallback: T): Promise<T> {
	if (!enabled) return fallback
	try {
		return await load()
	} catch {
		return fallback
	}
}

async function loadAccount() {
	if (!canCreate.value && !canUpdate.value) return

	try {
		account.value = await getTTLockAccount()
		accountProblem.value = null
	} catch (caught) {
		account.value = null
		accountProblem.value = caught instanceof ApiError && caught.data?.message ? caught.data.message : t("accessDevices.accountUnavailable")
	}
}

onMounted(async () => {
	const [branchRows, buildingRows, spaceRows] = await Promise.all([
		settle(can("branches.view"), listBranches, []),
		settle(can("buildings.view"), () => listBuildings(), []),
		settle(can("spaces.view"), () => listSpaces(), [])
	])
	const branchOfBuilding = Object.fromEntries(buildingRows.map(building => [building.id, building.branch_id]))

	branches.value = branchRows
	spaces.value = spaceRows.map(space => ({ space, branchId: branchOfBuilding[space.building_id] ?? null }))
	await loadAccount()
	lookupsReady.value = true
})

/**
 * The drawer wires its dependent dropdowns once, when it mounts: it waits
 * for the lookups, and mounts again when the TTLock id switches between a
 * picker (account reachable) and a typed field (not).
 */
const lookupsReady = ref(false)
const drawerKey = computed(() => (account.value === null ? "typed" : "account"))

function placeOf(device: Device): string {
	const space = device.space_id === null ? null : spacesById.value[device.space_id]
	if (space) return spaceLabel(space, t, currentLocale.value)
	return device.space_id === null ? t(`accessDevices.type.${device.type}`) : `#${device.space_id}`
}

const columns = computed(() => buildDeviceColumns(t, currentLocale.value, { spacesById: spacesById.value, devicesById: devicesById.value }))

const statCards = computed<StatCard[]>(() => {
	const locks = rows.value.filter(device => device.type === "lock")
	return [
		{ label: t("accessDevices.stats.locks"), value: locks.length },
		{ label: t("accessDevices.stats.gateways"), value: rows.value.length - locks.length },
		{ label: t("accessDevices.stats.online"), value: rows.value.filter(device => device.status === "online").length },
		{
			label: t("accessDevices.stats.lowBattery"),
			value: locks.filter(device => typeof device.metadata?.battery === "number" && device.metadata.battery < LOW_BATTERY).length
		}
	]
})

// ── Create / edit ─────────────────────────────────────────────────────────
const mutations = useResourceMutations({ create: createDevice, update: updateDevice, remove: removeDevice }, refetch, {
	createSuccess: t("accessDevices.create.success"),
	updateSuccess: t("accessDevices.edit.success"),
	deleteSuccess: t("accessDevices.delete.success")
})

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref<DevicePayload>(emptyDevicePayload())

const fields = computed(() =>
	buildDeviceFields(
		{
			branches: () => branches.value,
			spaces: () => spaces.value,
			gateways: () => data.value.filter(device => device.type === "gateway" && device.id !== editingId.value),
			account: () => account.value,
			editingId: () => editingId.value
		},
		t,
		currentLocale.value
	)
)

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyDevicePayload()
	drawerVisible.value = true
}

function openEdit(row: Device) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = deviceToPayload(row)
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	const body = normalizeDevicePayload(withAccountMac({ ...form.value, ...payload } as DevicePayload, account.value))

	if (mode.value === "create") {
		await mutations.create(body)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, body)
	}

	void loadAccount()
}

// ── Controls ──────────────────────────────────────────────────────────────
const syncing = ref(false)

function reportFailure(caught: unknown) {
	if (!(caught instanceof ApiError)) throw caught
	message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
}

async function sync() {
	syncing.value = true
	try {
		const response = await syncDevices()
		message.success(response.message ?? t("accessDevices.synced"))
		await Promise.all([refetch(), loadAccount()])
	} catch (caught) {
		reportFailure(caught)
	} finally {
		syncing.value = false
	}
}

const busyId = ref<number | null>(null)

/** Opening lets anyone in, so it asks first; locking does not. */
function confirmUnlock(row: Device) {
	dialog.warning({
		title: t("accessDevices.unlock.title"),
		content: t("accessDevices.unlock.confirm", { place: placeOf(row) }),
		positiveText: t("accessDevices.unlock.ok"),
		negativeText: t("resourceCrud.table.deleteConfirmCancel"),
		onPositiveClick: () => control(row, unlockDevice)
	})
}

async function control(row: Device, call: (id: number) => Promise<{ message?: string }>) {
	busyId.value = row.id
	try {
		const response = await call(row.id)
		message.success(response.message ?? t("accessDevices.done"))
	} catch (caught) {
		reportFailure(caught)
	} finally {
		busyId.value = null
	}
}

const qrVisible = ref(false)
const qrDevice = ref<Device | null>(null)

function openQr(row: Device) {
	qrDevice.value = row
	qrVisible.value = true
}

function confirmRegenerate(row: Device) {
	dialog.warning({
		title: t("accessDevices.qr.regenerate"),
		content: t("accessDevices.qr.regenerateConfirm"),
		positiveText: t("accessDevices.qr.regenerateOk"),
		negativeText: t("resourceCrud.table.deleteConfirmCancel"),
		onPositiveClick: async () => {
			try {
				const response = await regenerateDeviceQr(row.id)
				message.success(response.message ?? t("accessDevices.done"))
				await refetch()
				qrDevice.value = data.value.find(device => device.id === row.id) ?? null
			} catch (caught) {
				reportFailure(caught)
			}
		}
	})
}

/** A device's own actions, laid out by RowActions; lock and unlock stay disabled while one is in flight. */
function deviceActions(row: Device): RowAction[] {
	const actions: RowAction[] = []
	const isLock = row.type === "lock"
	const busy = busyId.value === row.id

	if (isLock && canControl.value && row.external_ref) {
		actions.push({ key: "unlock", label: t("accessDevices.unlock.button"), icon: "carbon:unlocked", disabled: busy, onClick: () => confirmUnlock(row) })
		actions.push({ key: "lock", label: t("accessDevices.lock.button"), icon: "carbon:locked", disabled: busy, onClick: () => control(row, lockDevice) })
	}

	if (isLock && row.qr_value) {
		actions.push({ key: "qr", label: t("accessDevices.qr.button"), icon: "carbon:qr-code", onClick: () => openQr(row) })
	}

	if (isLock && canSeeCodes.value) {
		actions.push({ key: "codes", label: t("accessDevices.codes"), icon: "carbon:password", onClick: () => router.push({ name: "access.doorCodes", query: { lock_id: row.id } }) })
	}

	if (canSeeLog.value) {
		actions.push({ key: "log", label: t("accessDevices.log"), icon: "carbon:activity", onClick: () => router.push({ name: "access.accessLogs", query: { device_id: row.id } }) })
	}

	return actions
}
</script>

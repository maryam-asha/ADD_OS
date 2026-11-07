<!-- src/add-os/modules/spatial/views/KiosksPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.kiosks") }}</h1>
		</div>

		<ResourceStatCards v-if="!error && !isLoading" :cards="statCards" />

		<n-alert v-if="error" type="error" :title="t('kiosks.loadError')" />

		<div class="flex justify-end">
			<n-button v-if="canCreate" type="primary" data-testid="kiosk-create" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("kiosks.create.button") }}
			</n-button>
		</div>

		<ResourceTable
			:columns
			:data
			:loading="isLoading"
			:on-edit="canUpdate ? openEdit : undefined"
			:on-delete="canDelete ? (async row => { await mutations.remove(row.id) }) : undefined"
			:delete-warning="t('kiosks.delete.warning')"
			:extra-actions="canPair ? renderPairingActions : undefined"
		/>

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields
			:title="mode === 'create' ? t('kiosks.create.title') : t('kiosks.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>

		<KioskPairingCodeModal v-model:show="pairingVisible" :kiosk="pairingKiosk" :issued="issuedCode" />
	</div>
</template>

<script setup lang="ts">
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { IssuedPairingCode, Kiosk, KioskPayload } from "@/add-os/modules/spatial/types/kiosk"
import type { Space } from "@/add-os/modules/spatial/types/space"
import { NAlert, NButton, useDialog, useMessage } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { can } from "@/add-os/config/permissions"
import { currentLocale } from "@/add-os/lang/currentLocale"
import KioskPairingCodeModal from "@/add-os/modules/spatial/components/KioskPairingCodeModal.vue"
import {
	buildKioskColumns,
	buildKioskFields,
	coworkingSpaceOptions,
	emptyKioskPayload,
	kioskToPayload
} from "@/add-os/modules/spatial/config/kiosks.config"
import { ApiError } from "@/add-os/services/api"
import {
	createKiosk,
	issueKioskPairingCode,
	listKiosks,
	removeKiosk,
	revokeKioskSecret,
	updateKiosk
} from "@/add-os/services/kiosks"
import { listSpaces } from "@/add-os/services/spaces"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

const { data, isLoading, error, refetch } = useResourceList<Kiosk>(listKiosks)

// A kiosk names its space by id. `spaces.view` is a separate grant, so an
// account without it reads the ids, and cannot create: the space is required
// and there would be nothing to choose from.
const canReadSpaces = computed(() => can("spaces.view"))
const canCreate = computed(() => can("kiosks.create") && canReadSpaces.value)
const canUpdate = computed(() => can("kiosks.update"))
const canDelete = computed(() => can("kiosks.delete"))
const canPair = computed(() => can("kiosks.pair"))

const spaces = ref<Space[]>([])
const spacesById = computed(() => Object.fromEntries(spaces.value.map(space => [space.id, space])))

onMounted(async () => {
	if (!canReadSpaces.value) return

	try {
		spaces.value = await listSpaces()
	} catch {
		// The list still works, naming each space by its id.
		spaces.value = []
	}
})

const columns = computed(() => buildKioskColumns(t, currentLocale.value, spacesById.value))
const fields = computed(() =>
	buildKioskFields(coworkingSpaceOptions(spaces.value, t, currentLocale.value), canReadSpaces.value, t)
)

const statCards = computed<StatCard[]>(() => [
	{ label: t("kiosks.stats.total"), value: data.value.length },
	{ label: t("kiosks.stats.active"), value: data.value.filter(kiosk => kiosk.is_active).length },
	{ label: t("kiosks.stats.paired"), value: data.value.filter(kiosk => kiosk.is_paired).length }
])

const mutations = useResourceMutations({ create: createKiosk, update: updateKiosk, remove: removeKiosk }, refetch, {
	createSuccess: t("kiosks.create.success"),
	updateSuccess: t("kiosks.edit.success"),
	deleteSuccess: t("kiosks.delete.success")
})

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref<KioskPayload>(emptyKioskPayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyKioskPayload()
	drawerVisible.value = true
}

function openEdit(row: Kiosk) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = kioskToPayload(row)
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as KioskPayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as unknown as KioskPayload)
	}
}

const pairingVisible = ref(false)
const pairingKiosk = ref<Kiosk | null>(null)
const issuedCode = ref<IssuedPairingCode | null>(null)

function reportFailure(caught: unknown) {
	if (!(caught instanceof ApiError)) throw caught

	message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
}

async function issueCode(row: Kiosk) {
	try {
		issuedCode.value = await issueKioskPairingCode(row.id)
		pairingKiosk.value = row
		pairingVisible.value = true
	} catch (caught) {
		reportFailure(caught)
	}
}

/**
 * Issuing stops nothing by itself: the paired device keeps working until the
 * code is used on another one. That replacement is what is confirmed, so a
 * kiosk with no device yet gets its code at once.
 */
function requestCode(row: Kiosk) {
	if (!row.is_paired) {
		void issueCode(row)
		return
	}

	dialog.warning({
		title: t("kiosks.pairing.issue"),
		content: t("kiosks.pairing.issueConfirm", { name: row.name }),
		positiveText: t("kiosks.pairing.issueConfirmOk"),
		negativeText: t("resourceCrud.table.deleteConfirmCancel"),
		onPositiveClick: () => issueCode(row)
	})
}

function confirmRevoke(row: Kiosk) {
	dialog.warning({
		title: t("kiosks.pairing.revoke"),
		content: t("kiosks.pairing.revokeConfirm", { name: row.name }),
		positiveText: t("kiosks.pairing.revokeConfirmOk"),
		negativeText: t("resourceCrud.table.deleteConfirmCancel"),
		onPositiveClick: async () => {
			try {
				const response = await revokeKioskSecret(row.id)
				message.success(response.message ?? t("kiosks.pairing.revokeSuccess"))
				await refetch()
			} catch (caught) {
				reportFailure(caught)
			}
		}
	})
}

function actionButton(label: string, icon: string, type: "primary" | "warning", onClick: () => void) {
	return h(
		NButton,
		{ text: true, type, "aria-label": label, title: label, onClick },
		{ icon: () => h(Icon, { name: icon, size: 18 }) }
	)
}

/**
 * ADD Core refuses to pair a deactivated kiosk, so it gets no code. Revoking
 * stays on it: deactivating keeps the secret, and a lost device must still be
 * cut off.
 */
function renderPairingActions(row: Kiosk) {
	const buttons = []

	if (row.is_active) {
		buttons.push(actionButton(t("kiosks.pairing.issue"), "carbon:password", "primary", () => requestCode(row)))
	}

	if (row.is_paired) {
		buttons.push(actionButton(t("kiosks.pairing.revoke"), "carbon:unlink", "warning", () => confirmRevoke(row)))
	}

	return buttons
}
</script>

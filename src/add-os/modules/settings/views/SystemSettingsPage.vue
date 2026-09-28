<!-- src/add-os/modules/settings/views/SystemSettingsPage.vue -->
<template>
	<div class="flex flex-col gap-6">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.systemSettings") }}</h1>
			<p class="text-secondary">{{ t("systemSettings.description") }}</p>
		</div>

		<n-alert v-if="error" type="error" :title="t('systemSettings.loadError')" />

		<div class="flex items-center justify-between gap-4">
			<n-input
				v-model:value="searchQuery"
				:placeholder="t('systemSettings.searchPlaceholder')"
				clearable
				class="max-w-sm"
			>
				<template #prefix>
					<Icon name="carbon:search" :size="16" />
				</template>
			</n-input>
			<n-button :loading="isLoading" @click="fetchData">
				<template #icon><Icon name="carbon:renew" :size="16" /></template>
				{{ t("systemSettings.refresh") }}
			</n-button>
		</div>

		<n-card class="shadow-sm">
			<n-data-table
				:columns
				:data="filteredSettings"
				:loading="isLoading"
				:bordered="false"
			/>
		</n-card>

		<!-- Edit Setting Modal -->
		<n-modal
			v-model:show="editModalVisible"
			preset="card"
			:title="`${t('systemSettings.editTitle')}: ${currentEditing ? labelOf(currentEditing.key) : ''}`"
			class="max-w-lg"
		>
			<div v-if="currentEditing" class="flex flex-col gap-4">
				<!--
					Editing the point rate is not a local change: every price in the
					catalogue and every wallet balance is denominated in points, so
					moving the rate moves what all of them are worth in cash.
				-->
				<n-alert v-if="isPointRate(currentEditing)" type="warning" show-icon>
					{{ t("points.rateWarning") }}
				</n-alert>

				<p v-if="hintOf(currentEditing.key)" class="text-sm text-secondary">
					{{ hintOf(currentEditing.key) }}
				</p>

				<div class="flex flex-col gap-1">
					<span class="text-xs text-secondary">{{ t('systemSettings.keyLabel') }}</span>
					<code class="font-mono text-sm bg-surface-sunken p-2 rounded">{{ currentEditing.key }}</code>
				</div>

				<div class="flex flex-col gap-1">
					<span class="text-xs text-secondary">{{ t('systemSettings.typeLabel') }}</span>
					<n-tag size="small" type="info">{{ typeLabel(currentEditing.type) }}</n-tag>
				</div>

				<div class="flex flex-col gap-1">
					<span class="text-xs text-secondary">{{ t('systemSettings.valueLabel') }}</span>

					<n-switch
						v-if="currentEditing.type === 'boolean'"
						v-model:value="editingBooleanValue"
					/>

					<n-input-number
						v-else-if="currentEditing.type === 'integer' || currentEditing.type === 'float'"
						v-model:value="editingNumberValue"
						class="w-full"
					/>

					<n-input
						v-else-if="currentEditing.type === 'json'"
						v-model:value="editingTextValue"
						type="textarea"
						:autosize="{ minRows: 4, maxRows: 12 }"
						class="font-mono text-sm"
					/>

					<n-input
						v-else
						v-model:value="editingTextValue"
						type="textarea"
						:autosize="{ minRows: 3, maxRows: 8 }"
					/>
				</div>
			</div>

			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="editModalVisible = false">{{ t("resourceCrud.form.cancel") }}</n-button>
					<n-button type="primary" :loading="isSaving" @click="saveCurrentSetting">
						{{ t("resourceCrud.form.submit") }}
					</n-button>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { SettingItem, SettingType } from "@/add-os/modules/settings/types/setting"
import { NAlert, NButton, NCard, NDataTable, NInput, NInputNumber, NModal, NSwitch, NTag, useMessage } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { settingHint, settingLabel } from "@/add-os/modules/settings/utils/settingText"
import { listSettings, updateSetting } from "@/add-os/services/settings"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t, te } = useI18n()
const message = useMessage()

const settings = ref<SettingItem[]>([])
const isLoading = ref(false)
const error = ref(false)
const searchQuery = ref("")

const editModalVisible = ref(false)
const isSaving = ref(false)
const currentEditing = ref<SettingItem | null>(null)

const editingTextValue = ref("")
const editingNumberValue = ref<number | null>(null)
const editingBooleanValue = ref(false)

/**
 * `point.rate_usd` — the USD value of one point, and the only setting here
 * that reprices the whole catalogue when it moves.
 *
 * The backend keeps it as a decimal STRING (validated `numeric|gt:0|
 * decimal:0,4`), so it arrives with `type: "string"` and edits through the
 * plain text path above. That is deliberate: routing it through the numeric
 * input would put it through a JS `number` and risk losing a digit of a value
 * every price in the system is derived from.
 */
const POINT_RATE_KEY = "point.rate_usd"

function isPointRate(row: SettingItem): boolean {
	return row.key === POINT_RATE_KEY
}

/** The setting's name in the current language; its raw key when it has none yet. */
function labelOf(key: string): string {
	return settingLabel(key, t, te)
}

function hintOf(key: string): string | null {
	return settingHint(key, t, te)
}

function typeLabel(type: SettingType): string {
	return te(`systemSettings.types.${type}`) ? t(`systemSettings.types.${type}`) : type
}

// Matches the translated name and hint too, so a setting can be found by
// what it does, in either language, not only by its key.
const filteredSettings = computed(() => {
	const q = searchQuery.value.trim().toLowerCase()
	if (!q) return settings.value
	return settings.value.filter(s =>
		[s.key, labelOf(s.key), hintOf(s.key) ?? "", String(s.value)].some(text => text.toLowerCase().includes(q))
	)
})

const columns = computed<DataTableColumns<SettingItem>>(() => [
	{
		title: t("systemSettings.nameLabel"),
		key: "key",
		render: row => {
			const hint = hintOf(row.key)
			return h("div", { class: "flex flex-col gap-0.5" }, [
				h("span", { class: "text-sm font-semibold" }, labelOf(row.key)),
				hint ? h("span", { class: "text-xs text-secondary" }, hint) : null,
				// The raw key stays visible, smaller: it is what the API and the
				// docs call the setting.
				h("code", { class: "font-mono text-xs text-primary" }, row.key)
			])
		}
	},
	{
		title: t("systemSettings.columns.type"),
		key: "type",
		width: 100,
		render: row => h(NTag, { size: "small", round: true }, { default: () => typeLabel(row.type) })
	},
	{
		title: t("systemSettings.columns.value"),
		key: "value",
		render: row => {
			if (row.type === "boolean") {
				return h(
					NTag,
					{ type: row.value ? "success" : "default", size: "small" },
					{ default: () => (row.value ? t("systemSettings.on") : t("systemSettings.off")) }
				)
			}
			if (row.type === "json") {
				return h("pre", { class: "text-xs max-w-xs truncate" }, JSON.stringify(row.value))
			}
			return h("span", { class: "text-sm max-w-sm truncate" }, String(row.value ?? "—"))
		}
	},
	{
		title: t("systemSettings.columns.actions"),
		key: "actions",
		width: 100,
		render: row =>
			h(
				NButton,
				{ size: "small", type: "primary", secondary: true, onClick: () => openEdit(row) },
				{ default: () => t("systemSettings.editButton") }
			)
	}
])

function openEdit(row: SettingItem) {
	currentEditing.value = row
	if (row.type === "boolean") {
		editingBooleanValue.value = Boolean(row.value)
	} else if (row.type === "integer" || row.type === "float") {
		editingNumberValue.value = Number(row.value)
	} else if (row.type === "json") {
		editingTextValue.value = typeof row.value === "string" ? row.value : JSON.stringify(row.value, null, 2)
	} else {
		editingTextValue.value = String(row.value ?? "")
	}
	editModalVisible.value = true
}

async function saveCurrentSetting() {
	if (!currentEditing.value) return
	isSaving.value = true
	try {
		let finalVal: unknown = editingTextValue.value
		if (currentEditing.value.type === "boolean") {
			finalVal = editingBooleanValue.value
		} else if (currentEditing.value.type === "integer") {
			finalVal = Math.round(Number(editingNumberValue.value))
		} else if (currentEditing.value.type === "float") {
			finalVal = Number(editingNumberValue.value)
		} else if (currentEditing.value.type === "json") {
			try {
				finalVal = JSON.parse(editingTextValue.value)
			} catch (parseErr) {
				message.error(t("systemSettings.invalidJson"))
				isSaving.value = false
				return
			}
		}

		await updateSetting(currentEditing.value.key, finalVal)
		message.success(t("systemSettings.saveSuccess"))
		editModalVisible.value = false
		await fetchData()
	} catch (err) {
		message.error(t("systemSettings.saveError"))
	} finally {
		isSaving.value = false
	}
}

async function fetchData() {
	isLoading.value = true
	error.value = false
	try {
		settings.value = await listSettings()
	} catch (err) {
		error.value = true
	} finally {
		isLoading.value = false
	}
}

onMounted(fetchData)
</script>

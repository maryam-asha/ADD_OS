<!-- src/add-os/modules/settings/views/SettingsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.globalSettings") }}</h1>
			<p>{{ t("settings.description") }}</p>
		</div>

		<n-alert v-if="error" type="error" :title="t('settings.loadError')" />

		<n-alert v-else-if="!canEdit" type="info" :title="t('settings.readOnlyNotice')" />

		<n-card class="add-ledger-table">
			<n-data-table v-if="data.length > 0 || isLoading" :columns :data :loading="isLoading" :bordered="false" :row-key />
			<div v-else class="py-10 text-center">{{ t("settings.empty") }}</div>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { SettingDraft } from "@/add-os/modules/settings/config/settings.config"
import type { Setting, SettingValue } from "@/add-os/modules/settings/types/setting"
import { NAlert, NCard, NDataTable, useDialog, useMessage } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { canUpdateSettings } from "@/add-os/config/permissions"
import { useSettingMutations } from "@/add-os/modules/settings/composables/useSettingMutations"
import {
	buildSettingColumns,
	draftForSetting,
	needsSaveConfirmation,
	prepareSettingValue,
	settingLabel,
	settingLabelSlug
} from "@/add-os/modules/settings/config/settings.config"
import { listSettings } from "@/add-os/services/settings"

/**
 * ADD OS — global settings.
 *
 * NOT a CRUD screen, and the shape of the file follows from that: the key set is
 * fixed by ADDCore's `SettingSeeder`, `SettingController` implements `index` and
 * `update` only, and an update only ever changes `value`. So there is no create
 * button, no delete column, and no form drawer — one row per key, edited in
 * place.
 *
 * The list is rendered from whatever `index` returns rather than from a
 * hardcoded key list. `config/settings.config.ts` holds per-key *overrides*
 * (label, description, confirm, integer floor) and falls back for anything it
 * has not heard of, so a key a future seeder adds — the S4 access-control work
 * is expected to add TTLock ones — appears here on its own.
 */

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

const { data, isLoading, error, refetch } = useResourceList<Setting>(listSettings)
const mutations = useSettingMutations(refetch)

/**
 * `n-data-table` directly rather than `ResourceTable`, for the same structural
 * reason `CurrenciesPage` documents: that component's generic is
 * `T extends { id: number }` and its `rowKey` returns `row.id`. A setting has no
 * numeric id — the dotted `key` is the primary key. Its other job is the delete
 * column, and this resource has no destroy endpoint to give it.
 */
function rowKey(row: Setting) {
	return row.key
}

/**
 * Gates the CONTROL, not the fetch. `GET /admin/settings` is readable by
 * `admin` and `operations` both and only the `PATCH` is admin-only, so an
 * operations account gets the whole table, every value, and no edit button —
 * rather than a page of buttons that can only 403. See `config/permissions.ts`.
 */
const canEdit = computed(() => canUpdateSettings())

/** `key` of the one row being edited, or null. */
const editingKey = ref<string | null>(null)
/** That row's working copy. A `json` row holds its serialised text; see `SettingDraft`. */
const draft = ref<SettingDraft>(null)

const editingSetting = computed(() => data.value.find(setting => setting.key === editingKey.value) ?? null)

/**
 * Refused for an operations account as well as being given no control to click.
 * The rule is expressed in both places for the reason `CurrenciesPage` records
 * for its base-currency switch: neither half is load-bearing alone.
 *
 * A second call while another row is open is also refused rather than switching
 * rows, so a click on a different row's (disabled) edit button cannot silently
 * discard an in-progress draft.
 */
function startEdit(row: Setting) {
	if (!canEdit.value) return
	if (editingKey.value !== null && editingKey.value !== row.key) return

	editingKey.value = row.key
	draft.value = draftForSetting(row)
}

/** Reverts to the last fetched value simply by dropping the draft — nothing was written. */
function cancelEdit() {
	editingKey.value = null
	draft.value = null
}

function setDraft(value: SettingDraft) {
	draft.value = value
}

/**
 * Sends the value and, on success, closes the row. On failure the row stays
 * open with the draft intact: `useSettingMutations` has already toasted the
 * reason, and throwing away what the operator typed on top of that would make a
 * recoverable 422 into retyped work.
 */
async function commit(key: string, value: SettingValue) {
	try {
		await mutations.update(key, value)
		editingKey.value = null
		draft.value = null
	} catch {
		// Toasted by the mutation runner. The refetch it skipped leaves the table
		// showing the server's last known state, which is correct.
	}
}

/**
 * Order matters here: VALIDATE, then confirm, then send.
 *
 * A value that cannot be saved must never pose the "are you sure?" question —
 * answering yes to a prompt and then being told the JSON was malformed is worse
 * feedback than being told the JSON was malformed.
 */
async function save() {
	const setting = editingSetting.value
	if (setting === null) return

	const prepared = prepareSettingValue(setting, draft.value)
	if (!prepared.ok) {
		message.error(t(prepared.errorKey))
		return
	}

	if (needsSaveConfirmation(setting.key)) {
		const slug = settingLabelSlug(setting.key)
		dialog.warning({
			title: settingLabel(t, setting.key),
			// Per-key copy, because the two risks are nothing alike: one rebases every
			// rendered timestamp, the other invalidates physical stickers. A generic
			// "are you sure?" would tell an operator nothing they didn't already know.
			content: slug === null ? t("settings.confirm.generic") : t(`settings.confirm.${slug}`),
			positiveText: t("settings.confirm.ok"),
			negativeText: t("settings.confirm.cancel"),
			onPositiveClick: () => commit(setting.key, prepared.value)
		})
		return
	}

	await commit(setting.key, prepared.value)
}

const columns = computed<DataTableColumns<Setting>>(() =>
	buildSettingColumns(t, {
		editingKey: editingKey.value,
		draft: draft.value,
		onDraft: setDraft,
		onEdit: startEdit,
		onSave: save,
		onCancel: cancelEdit,
		canEdit: canEdit.value,
		isSaving: mutations.isSubmitting.value
	})
)

defineExpose({ data, columns, editingKey, draft, startEdit, cancelEdit, setDraft, save })
</script>

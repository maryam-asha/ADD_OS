<!-- src/add-os/modules/hr/components/core/PeopleListModal.vue -->
<template>
	<n-modal v-model:show="show" preset="card" :title="kind === 'contacts' ? t('hr.people.contactsTitle') : t('hr.people.dependentsTitle')" closable class="max-w-2xl">
		<div class="flex flex-col gap-3">
			<p class="text-sm text-secondary">{{ kind === "contacts" ? t("hr.people.contactsHint", { n: formatNumber(max) }) : t("hr.people.dependentsHint", { n: formatNumber(max) }) }}</p>

			<div v-for="(row, index) in rows" :key="index" class="grid grid-cols-1 items-start gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
				<n-input v-model:value="row.name" :placeholder="t('hr.people.name')" :status="errorFor(index, 'name') ? 'error' : undefined" :aria-label="t('hr.people.name')" />
				<n-input
					v-model:value="row.relation"
					:placeholder="t('hr.people.relation')"
					:status="errorFor(index, 'relation') ? 'error' : undefined"
					:maxlength="50"
					:aria-label="t('hr.people.relation')"
				/>
				<n-input
					v-if="kind === 'contacts'"
					v-model:value="row.phone"
					dir="ltr"
					:placeholder="t('hr.people.phone')"
					:status="errorFor(index, 'phone') ? 'error' : undefined"
					:maxlength="32"
					:aria-label="t('hr.people.phone')"
				/>
				<n-date-picker
					v-else
					v-model:formatted-value="row.dateOfBirth"
					value-format="yyyy-MM-dd"
					type="date"
					clearable
					:placeholder="t('hr.people.dateOfBirth')"
					:is-date-disabled="(ts: number) => ts > Date.now()"
				/>
				<n-button text type="error" :aria-label="t('hr.people.remove')" :title="t('hr.people.remove')" class="mt-2" @click="rows.splice(index, 1)">
					<template #icon><Icon name="carbon:trash-can" :size="18" /></template>
				</n-button>
			</div>

			<p v-if="!rows.length" class="text-secondary">{{ kind === "contacts" ? t("hr.profile.noContacts") : t("hr.people.noDependents") }}</p>
			<p v-if="error" class="text-sm text-error">{{ error }}</p>

			<div>
				<n-button size="small" :disabled="rows.length >= max" @click="addRow">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("hr.people.add") }}
				</n-button>
			</div>
		</div>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" @click="save">
					<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
					{{ t("hr.common.save") }}
				</n-button>
			</div>
		</template>
	</n-modal>
</template>

<script setup lang="ts">
import type { ContactPayload, Dependent, DependentPayload, EmergencyContact } from "@/add-os/modules/hr/types/hr"
import type { UpdateResult } from "@/add-os/services/hr/core"
import { NButton, NDatePicker, NInput, NModal, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { ApiError } from "@/add-os/services/api"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Emergency contacts (at most 5) or dependents (at most 20). The API
 * replaces the whole list on every save, so the modal edits a copy and
 * sends all of it.
 */
const props = defineProps<{
	kind: "contacts" | "dependents"
	contacts?: EmergencyContact[]
	dependents?: Dependent[]
	saveContacts?: (rows: ContactPayload[]) => Promise<UpdateResult>
	saveDependents?: (rows: DependentPayload[]) => Promise<UpdateResult>
}>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()

interface Row {
	name: string
	relation: string
	phone: string
	dateOfBirth: string | null
}

const rows = ref<Row[]>([])
const saving = ref(false)
const error = ref("")
const fieldErrors = ref<Record<string, string[]>>({})
const max = computed(() => (props.kind === "contacts" ? 5 : 20))

watch(show, visible => {
	if (!visible) return
	error.value = ""
	fieldErrors.value = {}
	rows.value =
		props.kind === "contacts"
			? (props.contacts ?? []).map(c => ({ name: c.name, relation: c.relation, phone: c.phone, dateOfBirth: null }))
			: (props.dependents ?? []).map(d => ({ name: d.name, relation: d.relation, phone: "", dateOfBirth: d.date_of_birth }))
})

function addRow() {
	rows.value.push({ name: "", relation: "", phone: "", dateOfBirth: null })
}

/** Laravel keys a row's errors `contacts.2.phone`. */
function errorFor(index: number, field: string): boolean {
	return Boolean(fieldErrors.value[`${props.kind}.${index}.${field}`])
}

function incomplete(row: Row): boolean {
	return !row.name.trim() || !row.relation.trim() || (props.kind === "contacts" && !row.phone.trim())
}

async function save() {
	error.value = ""
	fieldErrors.value = {}
	if (rows.value.some(incomplete)) {
		error.value = t("hr.people.incomplete")
		return
	}

	saving.value = true
	try {
		const result =
			props.kind === "contacts"
				? await props.saveContacts?.(rows.value.map(r => ({ name: r.name.trim(), relation: r.relation.trim(), phone: r.phone.trim() })))
				: await props.saveDependents?.(rows.value.map(r => ({ name: r.name.trim(), relation: r.relation.trim(), date_of_birth: r.dateOfBirth })))
		message.success(serverMessage(result, t("hr.people.saved")))
		show.value = false
		emit("saved")
	} catch (e) {
		if (e instanceof ApiError && e.status === 422 && e.data?.errors) fieldErrors.value = e.data.errors
		error.value = apiErrorMessage(e, t("hr.common.saveError"))
	} finally {
		saving.value = false
	}
}
</script>

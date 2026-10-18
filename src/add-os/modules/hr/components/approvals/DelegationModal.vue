<!-- src/add-os/modules/hr/components/approvals/DelegationModal.vue -->
<template>
	<n-modal v-model:show="show" preset="card" :title="t('hrApprovals.delegations.add')" closable class="max-w-lg">
		<p class="mb-4 text-sm text-secondary">{{ t("hrApprovals.delegations.hint") }}</p>
		<n-form ref="formRef" :model="form" :rules label-placement="top">
			<n-form-item path="delegateId" :label="t('hrApprovals.delegations.delegate')" :feedback="mayFindEmployees ? undefined : t('hrApprovals.delegations.pickHint')">
				<n-select
					v-model:value="form.delegateId"
					:options="delegateOptions"
					:loading="searching"
					filterable
					:remote="mayFindEmployees"
					:placeholder="mayFindEmployees ? t('hr.hire.managerPlaceholder') : undefined"
					@search="search"
				/>
			</n-form-item>
			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item path="startsOn" :label="t('hrApprovals.delegations.startsOn')">
					<n-date-picker
						v-model:formatted-value="form.startsOn"
						value-format="yyyy-MM-dd"
						type="date"
						class="w-full"
						:is-date-disabled="(ts: number) => ts < startOfToday"
					/>
				</n-form-item>
				<n-form-item path="endsOn" :label="t('hrApprovals.delegations.endsOn')">
					<n-date-picker v-model:formatted-value="form.endsOn" value-format="yyyy-MM-dd" type="date" class="w-full" :is-date-disabled="beforeStart" />
				</n-form-item>
			</div>
			<n-form-item path="requestType" :label="t('hrApprovals.delegations.requestType')">
				<n-select v-model:value="form.requestType" :options="typeOptions" :placeholder="t('hrApprovals.delegations.allTypes')" clearable />
			</n-form-item>
		</n-form>
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
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import { NButton, NDatePicker, NForm, NFormItem, NModal, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { canViewEmployees } from "@/add-os/config/permissions"
import { KNOWN_REQUEST_TYPES } from "@/add-os/modules/hr/types/approvals"
import { requestTypeLabel } from "@/add-os/modules/hr/utils/approvalSummary"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { createDelegation } from "@/add-os/services/hr/approvals"
import { getMyProfile, listEmployees, listMyTeam } from "@/add-os/services/hr/core"
import Icon from "@/components/common/Icon.vue"

/**
 * Hands the signed-in employee's approvals to a colleague for a period, for
 * every request type or one. hr/me has no staff directory, so the choice
 * offered is the employee's own manager and team — plus a search of every
 * employee for an account that holds hr.employees.view.
 */
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const mayFindEmployees = canViewEmployees()
const startOfToday = new Date().setHours(0, 0, 0, 0)

interface DelegationForm {
	delegateId: number | null
	startsOn: string | null
	endsOn: string | null
	requestType: string | null
}

const formRef = ref<FormInst | null>(null)
const form = ref<DelegationForm>({ delegateId: null, startsOn: null, endsOn: null, requestType: null })
const saving = ref(false)
const searching = ref(false)
const nearby = ref<SelectOption[]>([])
const found = ref<SelectOption[]>([])

const delegateOptions = computed<SelectOption[]>(() => {
	const seen = new Set<unknown>()
	return [...found.value, ...nearby.value].filter(option => !seen.has(option.value) && seen.add(option.value))
})
const typeOptions = computed<SelectOption[]>(() => KNOWN_REQUEST_TYPES.map(type => ({ label: requestTypeLabel(t, type), value: type })))

const required = { required: true, message: () => t("hr.common.required"), trigger: ["blur", "change"] }
const rules: FormRules = { delegateId: { ...required, type: "number" }, startsOn: required, endsOn: required }

function beforeStart(ts: number): boolean {
	const start = form.value.startsOn ? new Date(`${form.value.startsOn}T00:00:00`).getTime() : startOfToday
	return ts < start
}

watch(show, async visible => {
	if (!visible) return
	form.value = { delegateId: null, startsOn: null, endsOn: null, requestType: null }
	found.value = []
	try {
		const [me, team] = await Promise.all([getMyProfile(), listMyTeam()])
		const manager = me.current_assignment?.manager
		nearby.value = [
			...(manager ? [{ label: `${translated(manager.name)} · ${t("hrApprovals.delegations.myManager")}`, value: manager.id }] : []),
			...team.map(member => ({ label: `${translated(member.name)} · ${member.employee_number}`, value: member.id }))
		]
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	}
})

async function search(term: string) {
	if (!mayFindEmployees || !term.trim()) return
	searching.value = true
	try {
		const result = await listEmployees({ q: term.trim() })
		found.value = result.data.filter(e => e.status !== "terminated").map(e => ({ label: `${translated(e.name)} · ${e.employee_number}`, value: e.id }))
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		searching.value = false
	}
}

async function save() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}
	const f = form.value
	saving.value = true
	try {
		await createDelegation({ delegate_employee_id: f.delegateId as number, starts_on: f.startsOn as string, ends_on: f.endsOn as string, request_type: f.requestType })
		message.success(t("hrApprovals.delegations.saved"))
		show.value = false
		emit("saved")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>

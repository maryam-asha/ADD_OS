<!-- src/add-os/modules/reception/components/RecordGuestModal.vue -->
<!--
	Records a guest of a member who is in a coworking session (POST
	reception/guest-visits). The host is picked from the coworking sessions
	open right now — the API refuses any other host — or comes preset from the
	session row the operator started on. A room's or an office's guests are
	the booking's and are never recorded here.
-->
<template>
	<FormModal :show icon="carbon:user-follow" :title="t('guestVisits.record.title')" :subtitle="t('guestVisits.record.subtitle')" size="sm" @update:show="emit('update:show', $event)">
		<n-form ref="formRef" :model="form" :rules label-placement="top">
			<n-form-item
				path="host_user_id"
				:label="t('guestVisits.record.host')"
				:feedback="fieldErrors.host_user_id?.[0]"
				:validation-status="fieldErrors.host_user_id ? 'error' : undefined"
			>
				<n-select
					v-model:value="form.host_user_id"
					:options="hostOptions"
					:loading="hostsLoading"
					:placeholder="t('guestVisits.record.hostPlaceholder')"
					filterable
				/>
			</n-form-item>
			<n-alert v-if="hostsFailed" type="error" :bordered="false" class="mb-3">{{ t("guestVisits.record.hostsFailed") }}</n-alert>
			<n-alert v-else-if="!hostsLoading && hostOptions.length === 0" type="info" :bordered="false" class="mb-3">{{ t("guestVisits.record.noHosts") }}</n-alert>

			<n-form-item
				path="phone"
				:label="t('guestVisits.record.phone')"
				:feedback="fieldErrors.phone?.[0]"
				:validation-status="fieldErrors.phone ? 'error' : undefined"
			>
				<n-input
					v-model:value="form.phone"
					dir="ltr"
					:placeholder="t('users.form.phonePlaceholder')"
					@blur="form.phone = toInternationalPhone(form.phone)"
				/>
			</n-form-item>

			<n-form-item
				path="name"
				:label="t('guestVisits.record.name')"
				:feedback="fieldErrors.name?.[0] ?? t('guestVisits.record.nameHint')"
				:validation-status="fieldErrors.name ? 'error' : undefined"
			>
				<n-input v-model:value="form.name" />
			</n-form-item>
		</n-form>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button :disabled="isSubmitting" @click="emit('update:show', false)">{{ t("resourceCrud.form.cancel") }}</n-button>
				<n-button type="primary" :loading="isSubmitting" @click="submit">
					<template #icon><Icon name="carbon:user-follow" :size="16" /></template>
					{{ t("guestVisits.record.submit") }}
				</n-button>
			</div>
		</template>
	</FormModal>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import type { FieldErrors } from "@/add-os/modules/booking/composables/useReceptionAction"
import type { GuestVisit } from "@/add-os/modules/booking/types/reception"
import { NAlert, NButton, NForm, NFormItem, NInput, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import FormModal from "@/add-os/components/page/FormModal.vue"
import { ApiError } from "@/add-os/services/api"
import { listActiveSessions, registerGuestVisit } from "@/add-os/services/reception"
import { isValidPhone, toInternationalPhone } from "@/add-os/utils/phone"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	show: boolean
	/** The host, when the operator started from their session's row. */
	hostUserId?: number | null
}>()

const emit = defineEmits<{
	"update:show": [value: boolean]
	"recorded": [visit: GuestVisit]
}>()

const { t } = useI18n()
const message = useMessage()

const formRef = ref<FormInst | null>(null)
const isSubmitting = ref(false)
const fieldErrors = ref<FieldErrors>({})
const form = ref<{ host_user_id: number | null, phone: string, name: string }>({ host_user_id: null, phone: "", name: "" })

/* ── Hosts: whoever is in a coworking session of their own right now ───────── */

interface Host {
	id: number
	name: string
	phone: string | null
}

const hosts = ref<Host[]>([])
const hostsLoading = ref(false)
const hostsFailed = ref(false)

/**
 * A coworking row only, and not a guest's session billed to its host: that
 * row's `user_id` is the host, who appears on their own row anyway. One
 * entry per member.
 */
async function loadHosts(): Promise<void> {
	hostsLoading.value = true
	hostsFailed.value = false
	try {
		const byId = new Map<number, Host>()
		for (const row of await listActiveSessions()) {
			if (row.space_type !== "co_space" || row.guest) continue
			if (!byId.has(row.user_id)) byId.set(row.user_id, { id: row.user_id, name: row.user_name, phone: row.member?.phone ?? null })
		}
		hosts.value = [...byId.values()]
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		hostsFailed.value = true
	} finally {
		hostsLoading.value = false
	}
}

const hostOptions = computed<SelectOption[]>(() =>
	hosts.value.map(host => ({ value: host.id, label: host.phone ? `${host.name} · ${host.phone}` : host.name }))
)

watch(() => props.show, (open) => {
	if (!open) return
	form.value = { host_user_id: props.hostUserId ?? null, phone: "", name: "" }
	fieldErrors.value = {}
	formRef.value?.restoreValidation()
	void loadHosts()
}, { immediate: true })

const rules = computed<FormRules>(() => ({
	host_user_id: [{ required: true, type: "number", message: t("guestVisits.record.hostRequired"), trigger: ["change", "blur"] }],
	phone: [
		{ required: true, message: t("users.validation.phoneRequired"), trigger: ["blur", "input"] },
		{ validator: (_rule, value: string) => isValidPhone(value), message: t("users.validation.phoneInvalid"), trigger: ["blur"] }
	]
}))

/**
 * A 422 naming fields lands on them; any other refusal — no name for a phone
 * with no account, the host's guest limit, no free seat, a guest already
 * inside — is the server's own sentence, which is the whole explanation.
 */
async function submit(): Promise<void> {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}
	const hostUserId = form.value.host_user_id
	if (hostUserId === null) return

	fieldErrors.value = {}
	isSubmitting.value = true
	try {
		const name = form.value.name.trim()
		const visit = await registerGuestVisit({
			host_user_id: hostUserId,
			phone: toInternationalPhone(form.value.phone),
			...(name ? { name } : {})
		})
		message.success(t("guestVisits.record.success", { name: visit.guest.name }))
		emit("recorded", visit)
		emit("update:show", false)
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		const errors = caught.status === 422 ? caught.data?.errors : undefined
		if (errors) {
			fieldErrors.value = errors
		} else if (caught.status === 403) {
			message.error(t("resourceCrud.mutations.permissionError"))
		} else {
			message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
		}
	} finally {
		isSubmitting.value = false
	}
}

defineExpose({ form, hosts, fieldErrors, submit })
</script>

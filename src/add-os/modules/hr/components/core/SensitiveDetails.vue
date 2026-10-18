<!-- src/add-os/modules/hr/components/core/SensitiveDetails.vue -->
<template>
	<n-card :title="t('hr.sensitive.title')" size="small">
		<template v-if="mayView && (hasNationalId || hasBankAccount)" #header-extra>
			<n-button size="small" :loading @click="revealed ? hide() : reveal()">
				<template #icon><Icon :name="revealed ? 'carbon:view-off' : 'carbon:view'" :size="16" /></template>
				{{ revealed ? t("hr.sensitive.hide") : t("hr.sensitive.show") }}
			</n-button>
		</template>

		<n-descriptions :column="1" label-placement="left" size="small">
			<n-descriptions-item :label="t('hr.sensitive.nationalId')">
				<span v-if="revealed" dir="ltr" class="font-mono">{{ revealed.national_id || none }}</span>
				<span v-else>{{ hasNationalId ? t("hr.sensitive.onFile") : t("hr.sensitive.notOnFile") }}</span>
			</n-descriptions-item>
			<n-descriptions-item :label="t('hr.sensitive.bankAccount')">
				<span v-if="revealed" dir="ltr" class="font-mono">{{ revealed.bank_account || none }}</span>
				<span v-else>{{ hasBankAccount ? t("hr.sensitive.onFile") : t("hr.sensitive.notOnFile") }}</span>
			</n-descriptions-item>
		</n-descriptions>
		<p v-if="revealed" class="mt-2 text-xs text-secondary">{{ t("hr.sensitive.audited") }}</p>
	</n-card>
</template>

<script setup lang="ts">
import type { EmployeeSensitive } from "@/add-os/modules/hr/types/hr"
import { NButton, NCard, NDescriptions, NDescriptionsItem, useMessage } from "naive-ui"
import { onBeforeUnmount, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canViewEmployeeSensitive } from "@/add-os/config/permissions"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { EMPTY } from "@/add-os/modules/hr/utils/translated"
import { getEmployeeSensitive } from "@/add-os/services/hr/core"
import Icon from "@/components/common/Icon.vue"

/**
 * The national ID and bank account. Only whether each is on file comes with
 * the profile; the values are fetched when asked for — every read is audited
 * on the server — held in this component alone, and dropped on hide, on
 * leaving the page, and after a minute.
 */
const props = defineProps<{ employeeId: number; hasNationalId: boolean; hasBankAccount: boolean }>()

const HIDE_AFTER_MS = 60_000

const { t } = useI18n()
const message = useMessage()
const mayView = canViewEmployeeSensitive()
const none = EMPTY
const revealed = ref<EmployeeSensitive | null>(null)
const loading = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

async function reveal() {
	loading.value = true
	try {
		revealed.value = await getEmployeeSensitive(props.employeeId)
		clearTimeout(timer)
		timer = setTimeout(hide, HIDE_AFTER_MS)
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.loadError")))
	} finally {
		loading.value = false
	}
}

function hide() {
	clearTimeout(timer)
	revealed.value = null
}

onBeforeUnmount(hide)

defineExpose({ hide })
</script>

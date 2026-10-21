<template>
	<n-button :loading="busy" :disabled @click="run">
		<template #icon><Icon name="carbon:download" :size="16" /></template>
		{{ t("hrReports.csv") }}
	</n-button>
</template>

<script setup lang="ts">
import { NButton, useMessage } from "naive-ui"
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import Icon from "@/components/common/Icon.vue"

/**
 * A report's CSV download. ADD Core writes the file — UTF-8 with a BOM so
 * spreadsheets read Arabic, labels in the reader's language — and audits
 * every export; a refusal shows the server's own words.
 */
const props = defineProps<{ download: () => Promise<void>; disabled?: boolean }>()

const { t } = useI18n()
const message = useMessage()
const busy = ref(false)

async function run() {
	busy.value = true
	try {
		await props.download()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hrReports.csvError")))
	} finally {
		busy.value = false
	}
}
</script>

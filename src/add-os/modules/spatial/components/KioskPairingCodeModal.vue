<!-- src/add-os/modules/spatial/components/KioskPairingCodeModal.vue -->
<template>
	<n-modal :show preset="card" class="max-w-lg" :title="t('kiosks.pairing.title')" @update:show="emit('update:show', $event)">
		<div v-if="kiosk && issued" class="flex flex-col gap-4">
			<p class="font-medium">{{ kiosk.name }}</p>

			<div class="flex items-center justify-center gap-3">
				<bdi dir="ltr" class="font-mono text-3xl font-bold tracking-widest select-all" data-testid="kiosk-pairing-code">{{ issued.pairing_code }}</bdi>
				<n-button
					data-testid="kiosk-pairing-copy"
					:aria-label="t('kiosks.pairing.copy')"
					:title="t('kiosks.pairing.copy')"
					@click="copy(issued.pairing_code)"
				>
					<template #icon><Icon :name="copied ? 'carbon:checkmark' : 'carbon:copy'" :size="18" /></template>
				</n-button>
			</div>

			<n-alert type="info" :title="t('kiosks.pairing.onceOnly')">
				{{ t("kiosks.pairing.instructions", { time: formatDateTime(issued.expires_at) }) }}
			</n-alert>

			<n-alert v-if="kiosk.is_paired" type="warning" data-testid="kiosk-pairing-replaces">
				{{ t("kiosks.pairing.replacesDevice") }}
			</n-alert>
		</div>
	</n-modal>
</template>

<script setup lang="ts">
import type { IssuedPairingCode, Kiosk } from "@/add-os/modules/spatial/types/kiosk"
import { useClipboard } from "@vueuse/core"
import { NAlert, NButton, NModal } from "naive-ui"
import { useI18n } from "vue-i18n"
import { formatDateTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{
	show: boolean
	kiosk: Kiosk | null
	issued: IssuedPairingCode | null
}>()

const emit = defineEmits<{ (e: "update:show", value: boolean): void }>()

const { t } = useI18n()
const { copy, copied } = useClipboard({ legacy: true })
</script>

<!-- src/add-os/modules/kitchen/components/QrPointStickerModal.vue -->
<!--
	The sticker fixed at a desk or in a room: a QR of the point's scan value,
	which a member scans to order from the kitchen. The value names the place
	and nothing else. Prints alone on a page through `printSticker`.
-->
<template>
	<FormModal v-model:show="show" :title="t('kitchen.qr.sticker.title')" size="sm">
		<div v-if="point" class="flex flex-col items-center gap-3">
			<div ref="sticker" class="rounded-lg bg-white p-4">
				<n-qr-code :value="point.scan_value" :size="220" error-correction-level="M" />
			</div>
			<p class="text-center font-semibold">{{ label }}</p>
			<p v-if="branchName" class="text-center text-xs text-secondary">{{ branchName }}</p>
			<p class="text-center text-xs text-secondary">{{ t("kitchen.qr.sticker.hint") }}</p>
			<div class="flex flex-wrap justify-center gap-2">
				<n-button type="primary" data-test="sticker-print" @click="print">
					<template #icon><Icon name="carbon:printer" :size="16" /></template>
					{{ t("kitchen.qr.sticker.print") }}
				</n-button>
				<n-button secondary data-test="sticker-download" @click="download">
					<template #icon><Icon name="carbon:download" :size="16" /></template>
					{{ t("kitchen.qr.sticker.download") }}
				</n-button>
			</div>
		</div>
	</FormModal>
</template>

<script setup lang="ts">
import type { QrPoint } from "@/add-os/modules/kitchen/types/kitchen"
import { NButton, NQrCode } from "naive-ui"
import { useTemplateRef } from "vue"
import { useI18n } from "vue-i18n"
import FormModal from "@/add-os/components/page/FormModal.vue"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { downloadSticker } from "@/add-os/utils/downloadSticker"
import { printSticker } from "@/add-os/utils/printSticker"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	point: QrPoint | null
	/** The place's name, already resolved by the page. */
	label: string
	branchName: string
}>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const sticker = useTemplateRef<HTMLElement>("sticker")

function print() {
	const canvas = sticker.value?.querySelector("canvas")
	if (!canvas || !props.point) return

	printSticker({
		qrCanvas: canvas,
		title: props.label,
		subtitle: props.branchName,
		dir: currentLocale.value === "ar" ? "rtl" : "ltr"
	})
}

/** The same sticker saved as a PNG, named after the place. */
function download() {
	const canvas = sticker.value?.querySelector("canvas")
	if (!canvas || !props.point) return

	downloadSticker({
		qrCanvas: canvas,
		title: props.label,
		dir: currentLocale.value === "ar" ? "rtl" : "ltr"
	})
}
</script>

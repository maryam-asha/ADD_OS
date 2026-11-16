<!-- src/add-os/modules/kitchen/components/ChimeMuteButton.vue -->
<template>
	<n-tooltip>
		<template #trigger>
			<n-button
				:size
				secondary
				circle
				data-test="chime-mute"
				:aria-label="label"
				:aria-pressed="muted"
				@click="toggle"
			>
				<template #icon>
					<Icon :name="muted ? 'carbon:volume-mute' : 'carbon:volume-up'" :size="16" />
				</template>
			</n-button>
		</template>
		{{ label }}
	</n-tooltip>
</template>

<script setup lang="ts">
import { NButton, NTooltip } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { useChimeMute } from "@/add-os/composables/useNewArrivalChime"
import Icon from "@/components/common/Icon.vue"

/**
 * Silences, or turns back on, the chime the reception queue and the kitchen
 * board play when a new order arrives. One switch for both screens, kept on
 * this browser; the label says what pressing it will do.
 */
withDefaults(defineProps<{ size?: "small" | "medium" }>(), { size: "medium" })

const { t } = useI18n()
const { muted, toggle } = useChimeMute()
const label = computed(() => (muted.value ? t("kitchen.chime.unmute") : t("kitchen.chime.mute")))
</script>

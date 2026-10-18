<!-- src/add-os/modules/hr/components/HrDrawer.vue -->
<template>
	<n-drawer v-model:show="show" :width :placement>
		<n-drawer-content :title closable>
			<slot />
			<template v-if="$slots.footer" #footer>
				<slot name="footer" />
			</template>
		</n-drawer-content>
	</n-drawer>
</template>

<script setup lang="ts">
import { NDrawer, NDrawerContent } from "naive-ui"
import { computed } from "vue"
import { currentLocale } from "@/add-os/lang/currentLocale"

/**
 * Every HR drawer. It slides in from the side reading ends on — the left in
 * Arabic, the right in English — and never grows past the screen, so on a
 * phone it is the whole width. `size` picks the reading width: `md` for a
 * form or a record, `lg` for one with a list inside (steps, tiers, items).
 */
const props = withDefaults(defineProps<{ title: string; size?: "md" | "lg" }>(), { size: "md" })
const show = defineModel<boolean>("show", { required: true })

const width = computed(() => (props.size === "lg" ? "min(40rem, 100vw)" : "min(35rem, 100vw)"))
const placement = computed(() => (currentLocale.value === "ar" ? "left" : "right"))
</script>

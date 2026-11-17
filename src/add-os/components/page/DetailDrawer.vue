<!-- src/add-os/components/page/DetailDrawer.vue -->
<template>
	<n-drawer v-model:show="show" :width :placement>
		<n-drawer-content :title closable>
			<template v-if="$slots.header" #header>
				<slot name="header" />
			</template>
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
 * Reading a record (never adding one — that is FormModal). It slides in from
 * the side reading ends on — the left in Arabic, the right in English — and
 * never grows past the screen, so on a phone it is the whole width. `size`
 * picks the reading width: `md` for a record, `lg` for one with a list inside
 * (steps, tiers, items). A record that is edited in place, field by field
 * (a project task), stays here too; a `header` slot replaces the title when
 * the header carries more than a title.
 */
const props = withDefaults(defineProps<{ title?: string; size?: "md" | "lg" }>(), { size: "md" })
const show = defineModel<boolean>("show", { required: true })

const width = computed(() => (props.size === "lg" ? "min(40rem, 100vw)" : "min(35rem, 100vw)"))
const placement = computed(() => (currentLocale.value === "ar" ? "left" : "right"))
</script>

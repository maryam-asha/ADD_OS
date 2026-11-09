<!-- src/add-os/modules/hr/components/ui/HrFormPage.vue -->
<template>
	<div class="@container flex flex-col gap-5">
		<div>
			<n-button text class="text-secondary" @click="goBack">
				<template #icon><Icon :name="isRtl ? 'carbon:arrow-right' : 'carbon:arrow-left'" :size="16" /></template>
				{{ backLabel }}
			</n-button>
		</div>

		<HrPageHeader :title :description :eyebrow />

		<n-alert v-if="error" type="error" :title="error" />

		<div v-if="loading" class="flex justify-center py-16">
			<n-spin />
		</div>

		<div v-else-if="!error" :class="$slots.aside ? 'grid grid-cols-1 items-start gap-5 @4xl:grid-cols-3' : 'flex flex-col gap-5'">
			<div class="@container flex min-w-0 flex-col gap-5" :class="$slots.aside ? '@4xl:col-span-2' : ''">
				<slot />
			</div>
			<aside v-if="$slots.aside" class="@container flex min-w-0 flex-col gap-5 @4xl:sticky @4xl:top-4">
				<slot name="aside" />
			</aside>
		</div>

		<footer
			v-if="$slots.actions && !loading && !error"
			class="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 rounded-add-large border border-[var(--add-border)] bg-[var(--add-surface-raised)] px-4 py-3"
		>
			<slot name="actions" />
		</footer>
	</div>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router"
import { NAlert, NButton, NSpin } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import Icon from "@/components/common/Icon.vue"

/**
 * An HR form on a page of its own, with its own address, instead of a
 * dialog over a list: a link back to where it was opened from, the page
 * header, the form's sections one under the other (each an HrPanel), and
 * the buttons in a bar that stays at the bottom of the screen while the
 * sections scroll. `aside` holds a narrow column beside the sections (a
 * summary, the record's status) and drops below them when there is no room.
 *
 * Every breakpoint here is a container query (`@4xl:`), measured on the page
 * itself, never on the screen: the sidebar takes a different width open and
 * collapsed, so a screen breakpoint would put a side column in a content area
 * too narrow for it whenever the menu is open. The sections' column and the
 * aside are containers too, so a form's own field grid (`@xl:grid-cols-2`)
 * follows the column it sits in. The bar is `sticky`, not `fixed`, so it
 * spans the content area at whatever width the sidebar leaves it.
 *
 * `loading` and `error` stand in for the form while its record is
 * fetched. Short actions (a reason, a confirmation) stay dialogs: see
 * HrFormModal.
 */
const props = defineProps<{
	title: string
	backTo: RouteLocationRaw
	backLabel: string
	description?: string
	eyebrow?: string
	loading?: boolean
	error?: string | null
}>()

const { locale } = useI18n()
const router = useRouter()
const isRtl = computed(() => locale.value === "ar")

function goBack() {
	void router.push(props.backTo)
}
</script>

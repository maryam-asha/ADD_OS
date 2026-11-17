<!-- src/add-os/components/page/RowActions.vue -->
<template>
	<!-- A queue's decisions: every action as a labelled button, nothing folded away -->
	<div v-if="labelled && actions.length" class="inline-flex flex-wrap items-center justify-center gap-2">
		<n-tooltip v-for="action in actions" :key="action.key" :disabled="!action.hint" :delay="300">
			<template #trigger>
				<n-button
					size="small"
					:type="action.danger ? 'error' : action.primary ? 'primary' : 'default'"
					:secondary="!action.primary && !action.danger"
					:ghost="action.danger"
					:aria-label="action.label"
					:disabled="action.disabled"
					:loading="action.loading"
					:data-test="action.testId"
					@click="run(action)"
				>
					<template #icon><Icon :name="action.icon" :size="16" /></template>
					{{ action.label }}
				</n-button>
			</template>
			{{ action.hint }}
		</n-tooltip>
	</div>

	<!-- A record's actions: two icons, the rest (and anything destructive) under "⋯" -->
	<div v-else-if="actions.length" class="inline-flex items-center justify-center gap-1">
		<n-tooltip v-for="action in split.inline" :key="action.key" :delay="300">
			<template #trigger>
				<n-button
					quaternary
					size="small"
					class="add-row-action"
					:aria-label="action.label"
					:disabled="action.disabled"
					:loading="action.loading"
					:data-test="action.testId"
					@click="run(action)"
				>
					<template #icon><Icon :name="action.icon" :size="18" /></template>
				</n-button>
			</template>
			{{ action.hint ? `${action.label} — ${action.hint}` : action.label }}
		</n-tooltip>

		<n-dropdown v-if="split.menu.length" trigger="click" placement="bottom-end" :options="menuOptions" @select="onSelect">
			<n-button quaternary size="small" class="add-row-action" :aria-label="t('common.moreActions')">
				<template #icon><Icon name="carbon:overflow-menu-horizontal" :size="18" /></template>
			</n-button>
		</n-dropdown>
	</div>
</template>

<script setup lang="ts">
import type { DropdownOption } from "naive-ui"
import type { RowAction } from "./row-actions"
import { NButton, NDropdown, NTooltip } from "naive-ui"
import { computed, h } from "vue"
import { useI18n } from "vue-i18n"
import Icon from "@/components/common/Icon.vue"
import { splitRowActions } from "./row-actions"
import { optionalDialog } from "./useConfirm"

/**
 * A table row's actions, laid out the same on every table (docs/UI-PATTERNS.md).
 *
 * A record's actions (edit, view, manage, delete): up to two icon buttons with
 * a tooltip, the rest in a "⋯" menu, and a destructive one always last in that
 * menu, in the danger colour, behind a centred confirm.
 *
 * `labelled` — a queue's decisions (approve, reject, check in, end a session),
 * decided 2026-11-17: the desk acts on these all day, so each stays a labelled
 * button and nothing folds away. One `primary` action is filled; a `danger`
 * one is outlined in the danger colour; the rest are secondary.
 *
 * Confirms are `useDialog()`, never `n-popconfirm` (RTL-REPORT.md §2). The
 * buttons are `small` (28px), clearing the 24px minimum target.
 */
const props = defineProps<{ actions: RowAction[]; labelled?: boolean }>()

const { t } = useI18n()
const dialog = optionalDialog()

const split = computed(() => splitRowActions(props.actions))

const menuOptions = computed<DropdownOption[]>(() =>
	split.value.menu.map(action => ({
		key: action.key,
		label: action.label,
		disabled: action.disabled,
		icon: () => h(Icon, { name: action.icon, size: 16 }),
		props: { ...(action.danger ? { class: "add-row-action--danger" } : {}), ...(action.testId ? { "data-test": action.testId } : {}) }
	}))
)

function onSelect(key: string | number) {
	const action = split.value.menu.find(item => item.key === key)
	if (action) run(action)
}

function run(action: RowAction) {
	if (action.disabled || action.loading) return
	if (!action.confirm || !dialog) {
		void action.onClick()
		return
	}
	dialog.warning({
		title: action.label,
		content: action.confirm,
		positiveText: action.label,
		negativeText: t("resourceCrud.table.deleteConfirmCancel"),
		onPositiveClick: () => action.onClick()
	})
}
</script>

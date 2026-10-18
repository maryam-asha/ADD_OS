<!-- src/add-os/modules/hr/components/ui/EmployeeHero.vue -->
<template>
	<section class="flex flex-wrap items-center justify-between gap-4 rounded-add-large border border-[var(--add-border)] bg-[var(--add-surface-raised)] p-4">
		<div class="flex min-w-0 items-center gap-4">
			<EmployeeAvatar :name size="lg" />
			<div class="flex min-w-0 flex-col gap-1">
				<div class="flex flex-wrap items-center gap-2">
					<h1 class="text-xl font-bold">{{ translated(name) }}</h1>
					<EmployeeStatusTag :status />
				</div>
				<span v-if="role" class="text-sm text-secondary">{{ role }}</span>
				<span class="font-mono text-xs text-secondary" dir="ltr">{{ employeeNumber }}</span>
			</div>
		</div>
		<div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
			<slot name="actions" />
		</div>
	</section>
</template>

<script setup lang="ts">
import type { Assignment, EmployeeStatus, Translatable } from "@/add-os/modules/hr/types/hr"
import { computed } from "vue"
import EmployeeStatusTag from "@/add-os/modules/hr/components/EmployeeStatusTag.vue"
import EmployeeAvatar from "@/add-os/modules/hr/components/ui/EmployeeAvatar.vue"
import { translated } from "@/add-os/modules/hr/utils/translated"

/**
 * Whose file this is, at the top of it: initials, name and status, the job
 * and unit they hold now, and the employee number — with the file's own
 * actions on the far side.
 */
const props = defineProps<{ name: Translatable; employeeNumber: string; status: EmployeeStatus; assignment: Assignment | null }>()

const role = computed(() =>
	[translated(props.assignment?.job_title), translated(props.assignment?.org_unit?.name)].filter(Boolean).join(" · ")
)
</script>

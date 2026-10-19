<!-- src/add-os/modules/hr/views/timesheets/CostCentersPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrCostCenters')" />
		<HrResourcePanel
			:api
			:columns
			:fields
			:empty-form="emptyCostCenterForm"
			:to-form
			:to-payload
			:can-manage="mayManage"
			:description="t('hrTimesheets.centers.description')"
			:labels="{
				add: t('hrTimesheets.centers.add'),
				createTitle: t('hrTimesheets.centers.add'),
				editTitle: t('hrTimesheets.centers.edit'),
				created: t('hrTimesheets.centers.created'),
				updated: t('hrTimesheets.centers.updated'),
				deleted: t('hrTimesheets.centers.deleted'),
				deleteWarning: t('hrTimesheets.centers.deleteWarning')
			}"
		/>
	</div>
</template>

<script setup lang="ts">
import type { CostCenterForm } from "@/add-os/modules/hr/config/timesheets.config"
import type { CostCenter, CostCenterPayload } from "@/add-os/modules/hr/types/timesheets"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { canManageHrSettings } from "@/add-os/config/permissions"
import HrResourcePanel from "@/add-os/modules/hr/components/core/HrResourcePanel.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { buildCostCenterColumns, buildCostCenterFields, emptyCostCenterForm } from "@/add-os/modules/hr/config/timesheets.config"
import { toBilingual, toTranslatable } from "@/add-os/modules/hr/utils/forms"
import { createCostCenter, deleteCostCenter, listCostCenters, updateCostCenter } from "@/add-os/services/hr/timesheets"

/**
 * What staff time is charged to — a project, a grant, a department.
 * Employees log their hours against the active ones, and each employee's
 * cost split points at them. Read with hr.timesheets.view, changed with
 * hr.settings.manage. One with hours or splits charged to it cannot be
 * deleted (409); deactivate it instead.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const mayManage = canManageHrSettings()

const api = { list: listCostCenters, create: createCostCenter, update: updateCostCenter, remove: deleteCostCenter }
const columns = computed(() => buildCostCenterColumns(t))
const fields = computed(() => buildCostCenterFields(t))

function toForm(row: CostCenter): CostCenterForm {
	return { code: row.code, name: toBilingual(row.name), is_active: row.is_active }
}

function toPayload(f: CostCenterForm): CostCenterPayload {
	return { code: f.code.trim(), name: toTranslatable(f.name), is_active: f.is_active }
}
</script>

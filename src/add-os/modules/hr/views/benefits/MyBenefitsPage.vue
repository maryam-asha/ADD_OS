<!-- src/add-os/modules/hr/views/benefits/MyBenefitsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrMyBenefits')" :description="t('hrBenefits.mine.description')" />

		<n-alert v-if="loadError" type="error" :title="loadError" />
		<n-skeleton v-else-if="loading" text :repeat="4" />

		<template v-else-if="data">
			<div v-if="data.benefits.length" class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
				<HrPanel v-for="benefit in data.benefits" :key="benefit.code" :title="translated(benefit.name)" :subtitle="t(`hrBenefits.kind.${benefit.kind}`)" icon="carbon:gift">
					<div class="flex flex-col gap-2">
						<span class="add-numeric text-2xl font-bold">{{ benefitValue(t, benefit.amount, benefit.currency, benefit.unit) }}</span>
						<span class="text-sm text-secondary">{{ t(`hrBenefits.frequency.${benefit.frequency}`) }}</span>
						<p v-if="translated(benefit.description)" class="text-sm">{{ translated(benefit.description) }}</p>
					</div>
				</HrPanel>
			</div>
			<n-empty v-else :description="t('hrBenefits.mine.none')" />

			<HrPanel :title="t('hrBenefits.mine.grants')" icon="carbon:delivery-parcel" flush class="add-ledger-table">
				<n-data-table :columns :data="data.grants" :bordered="false" size="small" :scroll-x="560">
					<template #empty>
						<span class="text-secondary">{{ t("hrBenefits.grants.empty") }}</span>
					</template>
				</n-data-table>
			</HrPanel>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { MyBenefits } from "@/add-os/modules/hr/types/benefits"
import { NAlert, NDataTable, NEmpty, NSkeleton } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import GrantStatusTag from "@/add-os/modules/hr/components/benefits/GrantStatusTag.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { benefitValue, grantPeriodLabel } from "@/add-os/modules/hr/utils/benefits"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { myBenefits } from "@/add-os/services/hr/benefits"
import { formatDate } from "@/add-os/utils/format"

/**
 * The signed-in employee's benefits today, with what each is worth for
 * them, and what they have been granted (cancelled grants left out by the
 * server). Wallet points land on their own member wallet.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const data = ref<MyBenefits | null>(null)
const loading = ref(true)
const loadError = ref("")

onMounted(async () => {
	try {
		data.value = await myBenefits()
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
})

type Grant = MyBenefits["grants"][number]

const columns = computed<DataTableColumns<Grant>>(() => [
	{ title: t("hrBenefits.benefit"), key: "benefit", minWidth: 170, render: row => translated(row.benefit.name) },
	{ title: t("hrBenefits.grants.period"), key: "period", minWidth: 130, render: row => grantPeriodLabel(t, row.period) },
	{ title: t("hrBenefits.grants.grantedOn"), key: "granted_on", minWidth: 110, render: row => formatDate(row.granted_on) },
	{ title: t("hrBenefits.amount"), key: "amount", minWidth: 120, render: row => h("span", { class: "add-numeric" }, benefitValue(t, row.amount, row.currency, row.unit)) },
	{ title: t("hr.common.status"), key: "status", minWidth: 120, render: row => h(GrantStatusTag, { status: row.status }) }
])
</script>

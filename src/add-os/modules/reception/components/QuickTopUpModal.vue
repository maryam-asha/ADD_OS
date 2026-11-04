<!-- src/add-os/modules/reception/components/QuickTopUpModal.vue -->
<!--
	Topping up a member's wallet from the reception desk: the desk picks the
	member, and the top-up itself is the one dialog every other screen opens
	(WalletTopUpDialog — the same cards as the Wallet Top-up page), so the
	desk never meets a second top-up form with its own rules.
-->
<template>
	<n-modal
		:show="show && member === null"
		preset="card"
		:title="t('members.topUp.title')"
		class="max-w-md rounded-2xl shadow-xl"
		closable
		@update:show="open => { if (!open) close() }"
	>
		<n-form-item :label="t('walletTopUps.searchMember')" :show-feedback="false">
			<n-select
				v-model:value="memberId"
				:options="memberOptions"
				:loading="isLoading"
				filterable
				clearable
				:placeholder="t('walletTopUps.searchMemberPlaceholder')"
			/>
		</n-form-item>
	</n-modal>

	<WalletTopUpDialog v-if="member" v-model:show="dialogShown" :member @success="emit('success')" />
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { Member } from "@/add-os/modules/members/types/member"
import { NFormItem, NModal, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import WalletTopUpDialog from "@/add-os/modules/members/components/WalletTopUpDialog.vue"
import { ApiError } from "@/add-os/services/api"
import { listMembers } from "@/add-os/services/members"

const props = defineProps<{
	show: boolean
	preselectedUserId?: number | null
}>()

const emit = defineEmits<{
	"update:show": [value: boolean]
	"success": []
}>()

const { t } = useI18n()
const message = useMessage()

const members = ref<Member[]>([])
const isLoading = ref(false)
const memberId = ref<number | null>(null)

/** The member picked: once there is one, the top-up dialog takes over. */
const member = computed(() => members.value.find(candidate => candidate.id === memberId.value) ?? null)

const memberOptions = computed<SelectOption[]>(() =>
	members.value.map(candidate => ({ label: `${candidate.name} — ${candidate.phone}`, value: candidate.id }))
)

/** Closing the top-up dialog, after a top-up or without one, closes the whole flow. */
const dialogShown = computed({
	get: () => props.show && member.value !== null,
	set: (visible: boolean) => {
		if (!visible) close()
	}
})

function close(): void {
	memberId.value = null
	emit("update:show", false)
}

watch(() => props.show, async (open) => {
	if (!open) return
	memberId.value = null
	isLoading.value = true
	try {
		members.value = await listMembers()
		if (props.preselectedUserId) memberId.value = props.preselectedUserId
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
	} finally {
		isLoading.value = false
	}
})
</script>

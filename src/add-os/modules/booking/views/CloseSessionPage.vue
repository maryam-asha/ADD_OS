<!-- src/add-os/modules/booking/views/CloseSessionPage.vue -->
<!--
	The members waiting on the desk to end their session: everyone who pressed
	"end session" in the app, oldest first, with how they chose to pay. Each
	opens the session's own page, where the desk sees the bill and ends it.
-->
<template>
	<div class="flex flex-col gap-6 max-w-5xl mx-auto p-4 sm:p-6">
		<div class="flex items-center justify-between flex-wrap gap-3 border-b border-stone-200/80 pb-4">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold text-stone-900">{{ t("closeSession.title") }}</h1>
				<span class="text-xs text-stone-500">{{ t("closeSession.subtitle") }}</span>
			</div>
			<n-button secondary round :loading="isLoading" @click="load">
				<template #icon><Icon name="carbon:renew" :size="18" /></template>
				{{ t("closeSession.refresh") }}
			</n-button>
		</div>

		<n-spin :show="isLoading && requests.length === 0">
			<div v-if="!isLoading && requests.length === 0" class="py-10 text-center text-sm text-stone-500">
				{{ t("closeSession.empty") }}
			</div>

			<div class="flex flex-col gap-3">
				<n-card v-for="session in requests" :key="`${session.type}-${session.id}`" size="small" class="shadow-sm border border-stone-200">
					<div class="flex items-center justify-between flex-wrap gap-3">
						<div class="flex items-center gap-3">
							<n-avatar round :size="44" :src="session.member?.avatar_url ?? undefined" class="bg-amber-700 text-white font-bold">
								{{ initials(session.member?.name ?? session.user_name) }}
							</n-avatar>
							<div class="flex flex-col gap-0.5">
								<span class="font-bold text-stone-900">{{ session.member?.name ?? session.user_name }}</span>
								<span class="text-xs text-stone-500">
									{{ t("closeSession.requestedAt", { time: formatTime(session.end_request!.requested_at!) }) }}
									<template v-if="session.member?.phone"> · <bdi dir="ltr">{{ session.member.phone }}</bdi></template>
								</span>
							</div>
						</div>

						<div class="flex items-center gap-2 flex-wrap">
							<n-tag v-if="session.is_overdue" type="error" size="small" round>{{ t("closeSession.overdue") }}</n-tag>
							<n-tag :type="session.end_request!.payment_method ? 'success' : 'default'" size="small" round>
								{{ t(`closeSession.paymentMethods.${methodKey(session.end_request!.payment_method)}`) }}
							</n-tag>
							<n-button type="primary" size="small" @click="openDetail(session)">
								{{ t("closeSession.details") }}
							</n-button>
						</div>
					</div>
				</n-card>
			</div>
		</n-spin>
	</div>
</template>

<script setup lang="ts">
import type { ActiveSession } from "@/add-os/modules/booking/types/reception"
import { NAvatar, NButton, NCard, NSpin, NTag, useMessage } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { ApiError } from "@/add-os/services/api"
import { listActiveSessions } from "@/add-os/services/reception"
import { formatTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

const { t } = useI18n()
const router = useRouter()
const message = useMessage()

const sessions = ref<ActiveSession[]>([])
const isLoading = ref(false)

/** The sessions whose member is waiting to end, oldest press first. */
const requests = computed(() =>
	sessions.value
		.filter(session => session.end_request?.status === "pending")
		.sort((a, b) => (a.end_request!.requested_at ?? "").localeCompare(b.end_request!.requested_at ?? ""))
)

function methodKey(method: string | null): string {
	return method === "wallet" || method === "cash" || method === "paymera" ? method : "none"
}

function initials(name: string | null | undefined): string {
	return (name ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase()
}

function openDetail(session: ActiveSession): void {
	router.push({ name: "bookings.closeSessionDetail", params: { type: session.type, id: session.id } })
}

async function load(): Promise<void> {
	isLoading.value = true
	try {
		sessions.value = await listActiveSessions()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (caught.data?.message) message.error(caught.data.message)
	} finally {
		isLoading.value = false
	}
}

onMounted(load)

defineExpose({ requests, load })
</script>

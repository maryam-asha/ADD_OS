<template>
	<div class="min-h-screen flex items-center justify-center p-4 bg-[var(--add-surface-sunken)]">
		<n-card class="max-w-md w-full text-center shadow-lg rounded-2xl p-6" :bordered="false">
			<div class="flex flex-col items-center gap-4">
				<div class="w-16 h-16 rounded-full bg-[color-mix(in_srgb,var(--add-warning)_10%,transparent)] flex items-center justify-center text-[var(--add-warning-text)]">
					<Icon name="carbon:warning-alt" :size="36" />
				</div>

				<PageHeader :title="t('providerPortal.suspended.title', 'حساب المزوّد موقوف، يرجى التواصل مع الإدارة')" :description="t('providerPortal.suspended.message', 'حساب المزوّد هذا غير فعّال. يرجى التواصل مع إدارة لوحة التحكم لتفعيل الحساب.')" />

				<div class="pt-4 w-full">
					<n-button
						type="primary"
						size="large"
						class="w-full"
						:loading="isLoggingOut"
						@click="handleLogout"
					>
						<template #icon>
							<Icon name="carbon:logout" :size="18" />
						</template>
						{{ t("providerPortal.suspended.logout", "تسجيل الخروج") }}
					</n-button>
				</div>
			</div>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import { NButton, NCard } from "naive-ui"
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import PageHeader from "@/add-os/components/page/PageHeader.vue"
import { logout } from "@/add-os/services/auth"
import Icon from "@/components/common/Icon.vue"
import { useAuthStore } from "@/stores/auth"

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const isLoggingOut = ref(false)

async function handleLogout() {
	isLoggingOut.value = true
	try {
		await logout()
	} catch {
		/* ignore network logout error */
	} finally {
		authStore.setLogout()
		isLoggingOut.value = false
		router.push({ path: "/login", replace: true })
	}
}
</script>

<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.roles") }}</h1>
			<p>{{ t("roles.description") }}</p>
		</div>

		<n-alert v-if="loadError" type="error" :title="t('roles.loadError')" />

		<n-spin :show="loading">
			<div class="flex min-h-24 flex-wrap gap-3">
				<n-tag v-for="role in roles" :key="role" size="large" round>
					{{ t(`roles.names.${role}`) }}
				</n-tag>
				<n-empty v-if="!loading && !loadError && roles.length === 0" :description="t('roles.empty')" />
			</div>
		</n-spin>
	</div>
</template>

<script setup lang="ts">
import type { UserRole } from "@/add-os/modules/system/types/user"
import { NAlert, NEmpty, NSpin, NTag } from "naive-ui"
import { onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"
import { listRoles } from "@/add-os/services/roles"

/**
 * ADD OS — read-only: `RoleController::index()`'s own comment is "no granular
 * permissions yet", so there is nothing here to create, edit or delete.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const roles = ref<UserRole[]>([])
const loading = ref(true)
const loadError = ref(false)

onMounted(async () => {
	try {
		roles.value = await listRoles()
	} catch (error) {
		loadError.value = true
		if (!(error instanceof ApiError)) throw error
	} finally {
		loading.value = false
	}
})
</script>

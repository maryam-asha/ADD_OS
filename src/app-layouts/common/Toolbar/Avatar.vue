<template>
	<n-dropdown :options placement="bottom-end" trigger="click" @select="handleSelect">
		<n-avatar round :size="32" src="/images/avatar-64.jpg" class="cursor-pointer" :img-props="{ alt: 'avatar' }" />
	</n-dropdown>
</template>

<script lang="ts" setup>
import { NAvatar, NDropdown, useMessage } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { logout } from "@/add-os/services/auth"
import { useAuthStore } from "@/stores/auth"
import { renderIcon } from "@/utils"

/**
 * ADD OS: two entries were removed from this menu.
 *
 * "Documentation" was a third live link to the template vendor's docs site — the
 * same leak removed from MainFooter (VENDOR-MANIFEST §3.13) and SidebarFooter
 * (§3.18), on a network that cannot reach it in any case.
 *
 * "Profile" pointed at `name: "Profile"`, the Pinx demo profile page, whose route
 * was removed with the rest of the demo routes. Left in place it would have
 * thrown a router warning and navigated nowhere. ADD OS has no profile screen
 * yet; the entry returns when one exists.
 *
 * The label is now an i18n key and lives in a computed, so it follows the language.
 */
const LogoutIcon = "ion:log-out-outline"
const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const message = useMessage()

const options = computed(() => [
	{
		label: t("common.logout"),
		key: "route-Logout",
		icon: renderIcon(LogoutIcon)
	}
])
async function handleSelect(key: string) {
	if (key.indexOf("route-") === 0) {
		const path = key.split("route-")[1]
		if (path === "Logout") {
			try {
				await logout()
			} catch {
				/* swallow — still proceed to clear client state */
			}
			authStore.setLogout()
			message.success(t("common.logged_out"))
			router.push({ name: "Login" })
			return
		}
		router.push({ name: path })
	}
}
</script>

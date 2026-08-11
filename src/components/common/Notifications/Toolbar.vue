<template>
	<div
		class="notifications-toolbar flex"
		:class="{ 'justify-between': hasNotifications, 'justify-end': !hasNotifications }"
	>
		<n-button v-if="hasNotifications" quaternary @click="deleteAll()">{{ t("common.clear") }}</n-button>
		<n-button strong secondary type="primary" :disabled="!hasUnread" @click="setAllRead()">
			{{ t("notifications.markAllAsRead") }}
		</n-button>
	</div>
</template>

<script lang="ts" setup>
import { NButton } from "naive-ui"
import { useI18n } from "vue-i18n"
import { useNotifications } from "@/composables/useNotifications"

const { t } = useI18n()
const hasUnread = useNotifications().hasUnread
const hasNotifications = useNotifications().hasNotifications

function setAllRead() {
	useNotifications().setAllRead()
}

function deleteAll() {
	useNotifications().deleteAll()
}
</script>

<style>
.notifications-toolbar {
	width: 100%;
}
</style>

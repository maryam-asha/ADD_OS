<!-- src/add-os/modules/pm/views/MyTasksPage.vue -->
<template>
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-bold">{{ t("pm.myTasks.title") }}</h1>
		<p>{{ t("pm.myTasks.description") }}</p>
	</div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n"

const { t } = useI18n()
</script>

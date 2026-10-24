<!-- src/add-os/modules/inventory/components/AssetStatusTag.vue -->
<template>
	<n-tag size="small" round :type="TYPES[status]">{{ t(`inventory.assetStatus.${status}`) }}</n-tag>
</template>

<script setup lang="ts">
import type { AssetStatus } from "@/add-os/modules/inventory/types/inventory"
import { NTag } from "naive-ui"
import { useI18n } from "vue-i18n"

defineProps<{ status: AssetStatus }>()

const { t } = useI18n()

const TYPES: Record<AssetStatus, "success" | "warning" | "default" | "error" | "info"> = {
	in_service: "success",
	in_maintenance: "warning",
	retired: "default",
	lost: "error",
	disposed: "info"
}
</script>

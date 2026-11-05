<!-- src/add-os/modules/inventory/components/StaffSelect.vue -->
<template>
	<n-select v-model:value="value" :options :loading :placeholder="placeholder" filterable clearable />
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { User } from "@/add-os/modules/system/types/user"
import { NSelect } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { quietly } from "@/add-os/modules/hr/utils/errors"
import { listUsers } from "@/add-os/services/users"

/**
 * Choosing a dashboard account — anyone holding a role other than member
 * or provider — such as the person responsible for a warehouse. Clearing
 * it means "no one".
 */
defineProps<{ placeholder?: string }>()
const value = defineModel<number | null>("value", { required: true })
const users = ref<User[]>([])
const loading = ref(true)

const OUTSIDE = new Set(["member", "provider"])

const options = computed<SelectOption[]>(() => users.value.filter(user => user.roles.some(role => !OUTSIDE.has(role))).map(user => ({ label: user.name, value: user.id })))

onMounted(async () => {
	await quietly(() => listUsers(), rows => (users.value = rows))
	loading.value = false
})
</script>

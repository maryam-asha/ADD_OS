<!-- src/add-os/modules/operations/components/ServiceTypeFieldsDrawer.vue -->
<!--
	A service type's request fields. Shares FormFieldsBuilder with Events, so
	editing, per-field validation errors and bilingual labels arrive here
	without a second implementation — this screen previously could only add
	and delete.
-->
<template>
	<FormFieldsBuilder
		v-model:show="show"
		:owner-id="serviceType?.id ?? null"
		:api
		:title="`${t('operationsRequests.catalog.fields')}${serviceType ? `: ${serviceType.name}` : ''}`"
	/>
</template>

<script setup lang="ts">
import type { ServiceType } from "../types/service"
import { useI18n } from "vue-i18n"
import FormFieldsBuilder from "@/add-os/components/resource/FormFieldsBuilder.vue"
import {
	createServiceTypeField,
	listServiceTypeFields,
	removeServiceTypeField,
	updateServiceTypeField
} from "@/add-os/services/service-types"

defineProps<{
	serviceType: ServiceType | null
}>()

const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()

const api = {
	list: listServiceTypeFields,
	create: createServiceTypeField,
	update: updateServiceTypeField,
	remove: removeServiceTypeField
}
</script>

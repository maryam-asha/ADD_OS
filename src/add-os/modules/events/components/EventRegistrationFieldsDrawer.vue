<!-- src/add-os/modules/events/components/EventRegistrationFieldsDrawer.vue -->
<!--
	An event's registration questions. The builder itself is shared with
	Services (FormFieldsBuilder); what belongs to Events is the wording —
	above all the note that identity is never asked for, which is an Events
	rule, not a form-engine one.
-->
<template>
	<FormFieldsBuilder
		v-model:show="show"
		:owner-id="eventId"
		:api="(api as any)"
		:title="t('events.fields.title')"
		:empty-text="t('events.fields.empty')"
		:reserved-key-note="t('events.fields.reservedKeyNote')"
		:delete-confirm="t('events.fields.deleteConfirm')"
		@changed="(hasFields: boolean) => emit('changed', hasFields)"
	/>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n"
import FormFieldsBuilder from "@/add-os/components/resource/FormFieldsBuilder.vue"
import {
	createRegistrationField,
	listRegistrationFields,
	removeRegistrationField,
	updateRegistrationField
} from "@/add-os/services/events"

defineProps<{ eventId: number | null }>()
const emit = defineEmits<{ changed: [hasFields: boolean] }>()

const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()

const api = {
	list: listRegistrationFields,
	create: createRegistrationField,
	update: updateRegistrationField,
	remove: removeRegistrationField
}
</script>

<!-- src/add-os/modules/pm/components/ProjectFormModal.vue -->
<template>
	<FormModal v-model:show="show" :title="project ? t('pm.form.editTitle') : t('pm.form.newTitle')" :mask-closable="!saving" size="md">
		<n-form label-placement="top" @submit.prevent="save">
			<n-alert v-if="serverError" type="error" class="mb-4" data-test="form-error">{{ serverError }}</n-alert>

			<n-form-item :label="t('pm.form.name')" :feedback="nameError ?? undefined" :validation-status="nameError ? 'error' : undefined">
				<n-input v-model:value="name" :maxlength="120" data-test="name" />
			</n-form-item>

			<n-form-item :label="t('pm.form.description')">
				<n-input v-model:value="description" type="textarea" :autosize="{ minRows: 2, maxRows: 6 }" />
			</n-form-item>

			<n-form-item :label="t('pm.form.tone')">
				<div class="flex flex-wrap gap-2" role="radiogroup">
					<button
						v-for="option in PROJECT_TONES"
						:key="option"
						type="button"
						role="radio"
						:aria-checked="tone === option"
						:data-tone="option"
						class="border-border-subtle inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm"
						:class="tone === option ? 'border-border-strong font-bold' : ''"
						@click="tone = option"
					>
						<span class="inline-block size-3 rounded-full" :style="{ backgroundColor: toneVar(option) }" />
						{{ t(`pm.tone.${option}`) }}
					</button>
				</div>
			</n-form-item>

			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item :label="t('pm.form.startsOn')">
					<n-date-picker :formatted-value="startsOn" type="date" value-format="yyyy-MM-dd" clearable class="w-full" @update:formatted-value="startsOn = $event" />
				</n-form-item>
				<n-form-item :label="t('pm.form.endsOn')" :feedback="datesError ?? undefined" :validation-status="datesError ? 'error' : undefined">
					<n-date-picker :formatted-value="endsOn" type="date" value-format="yyyy-MM-dd" clearable class="w-full" @update:formatted-value="endsOn = $event" />
				</n-form-item>
			</div>

			<n-form-item :label="t('pm.form.members')">
				<PeopleSelect v-model="members" v-model:people="chosen" :known="project?.members ?? []" data-test="members" />
			</n-form-item>

			<n-form-item :label="t('pm.form.lead')">
				<n-select v-model:value="lead" :options="leadOptions" clearable :placeholder="t('pm.form.leadPlaceholder')" data-test="lead" />
			</n-form-item>

			<n-form-item v-if="project" :show-label="false">
				<n-checkbox v-model:checked="archived" data-test="archived">{{ t("pm.form.archived") }}</n-checkbox>
			</n-form-item>

			<div class="flex justify-end gap-2">
				<n-button :disabled="saving" @click="show = false">{{ t("pm.form.cancel") }}</n-button>
				<n-button type="primary" attr-type="submit" :loading="saving" data-test="save">{{ t("pm.form.save") }}</n-button>
			</div>
		</n-form>
	</FormModal>
</template>

<script setup lang="ts">
import type { Person, Project, ProjectPayload, ProjectTone } from "@/add-os/modules/pm/types/pm"
import { NAlert, NButton, NCheckbox, NDatePicker, NForm, NFormItem, NInput, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import FormModal from "@/add-os/components/page/FormModal.vue"
import PeopleSelect from "@/add-os/modules/pm/components/PeopleSelect.vue"
import { PROJECT_TONES } from "@/add-os/modules/pm/types/pm"
import { refusalText } from "@/add-os/modules/pm/utils/display"
import { toneVar } from "@/add-os/modules/pm/utils/pm"
import { createProject, replaceMembers, updateProject } from "@/add-os/services/pm"

/**
 * Creating a project, or editing one. Only `pm.projects.manage` reaches this
 * (the page and the header gate the buttons). The team goes with the create
 * request; on an existing project it is `replaceMembers`, sent only when it
 * changed, and before the rest so a new member can be made lead in one go. A refusal shows its translated sentence in the form.
 */
const props = defineProps<{ project?: Project | null }>()
const emit = defineEmits<{ saved: [project: Project] }>()

const show = defineModel<boolean>("show", { default: false })

const { t } = useI18n()
const message = useMessage()

const name = ref("")
const description = ref("")
const tone = ref<ProjectTone>("teal")
const startsOn = ref<string | null>(null)
const endsOn = ref<string | null>(null)
const lead = ref<number | null>(null)
const members = ref<number[]>([])
const chosen = ref<Person[]>([])
const archived = ref(false)

const saving = ref(false)
const serverError = ref<string | null>(null)
const nameError = ref<string | null>(null)
const datesError = ref<string | null>(null)

function fill() {
	const source = props.project
	name.value = source?.name ?? ""
	description.value = source?.description ?? ""
	tone.value = source?.tone ?? "teal"
	startsOn.value = source?.starts_on ?? null
	endsOn.value = source?.ends_on ?? null
	lead.value = source?.lead?.id ?? null
	members.value = source?.members.map(person => person.id) ?? []
	archived.value = source?.is_archived ?? false
	serverError.value = null
	nameError.value = null
	datesError.value = null
}

// The lead is one of the team: only the chosen members are offered, and one who leaves the team stops being lead.
const leadOptions = computed(() => chosen.value.map(person => ({ label: person.name, value: person.id })))

watch(members, ids => {
	if (lead.value !== null && !ids.includes(lead.value)) lead.value = null
})

watch(show, open => {
	if (open) fill()
}, { immediate: true })

function sameIds(a: number[], b: number[]): boolean {
	return a.length === b.length && [...a].sort().join() === [...b].sort().join()
}

function validate(): boolean {
	nameError.value = name.value.trim() === "" ? t("pm.form.nameRequired") : null
	datesError.value = startsOn.value && endsOn.value && endsOn.value < startsOn.value ? t("pm.form.endsBeforeStart") : null
	return !nameError.value && !datesError.value
}

async function save() {
	if (saving.value || !validate()) return
	saving.value = true
	serverError.value = null
	const payload: ProjectPayload = {
		name: name.value.trim(),
		description: description.value.trim() === "" ? null : description.value.trim(),
		tone: tone.value,
		starts_on: startsOn.value,
		ends_on: endsOn.value,
		lead_user_id: lead.value
	}
	// A call that went through before a later one failed: the page still has to read the project again.
	let partial: Project | null = null
	try {
		let saved: Project
		if (props.project) {
			// The team first: the server checks the lead against the team it already has.
			const before = props.project.members.map(person => person.id)
			if (!sameIds(before, members.value)) {
				partial = await replaceMembers(props.project.id, members.value)
			}
			saved = await updateProject(props.project.id, { ...payload, is_archived: archived.value })
		} else {
			saved = await createProject({ ...payload, members: members.value })
		}
		message.success(t(props.project ? "pm.form.updated" : "pm.form.created"))
		show.value = false
		emit("saved", saved)
	} catch (caught) {
		serverError.value = refusalText(caught, t, t("pm.form.saveError"))
		if (partial) emit("saved", partial)
	} finally {
		saving.value = false
	}
}
</script>

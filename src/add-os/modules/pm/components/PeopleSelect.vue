<!-- src/add-os/modules/pm/components/PeopleSelect.vue -->
<template>
	<n-select
		v-model:value="selected"
		:options
		:multiple
		:placeholder="placeholder ?? t('pm.people.placeholder')"
		:loading
		:disabled
		:max-tag-count="multiple ? 4 : undefined"
		filterable
		clearable
		remote
		:clear-filter-after-select="false"
		:consistent-menu-width="false"
		@search="search"
		@update:show="onShow"
	>
		<template #empty>{{ t("pm.people.empty") }}</template>
	</n-select>
</template>

<script setup lang="ts">
import type { Person } from "@/add-os/modules/pm/types/pm"
import { NSelect } from "naive-ui"
import { computed, onBeforeUnmount, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { searchPeople } from "@/add-os/services/pm"

/**
 * People from ADD Core's directory, found by name as the person types. The
 * value is the ids; `known` names the ones already chosen so their labels show
 * before any search. With `multiple` off the model holds at most one id.
 */
const props = withDefaults(defineProps<{
	known?: Person[]
	multiple?: boolean
	placeholder?: string
	disabled?: boolean
}>(), { known: () => [], multiple: true, placeholder: undefined })

const model = defineModel<number[]>({ default: () => [] })
/** The chosen ones with their names, for a form that has to offer them elsewhere (the lead among the team). */
const people = defineModel<Person[]>("people", { default: () => [] })

const { t } = useI18n()

const found = ref<Person[]>([])
const remembered = new Map<number, Person>()
const loading = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
let latest = 0

const selected = computed<number | number[] | null>({
	get: () => (props.multiple ? model.value : (model.value[0] ?? null)),
	set: value => {
		if (Array.isArray(value)) model.value = value
		else model.value = value === null || value === undefined ? [] : [value]
	}
})

const everyone = computed(() => {
	const byId = new Map<number, Person>()
	for (const person of props.known) byId.set(person.id, person)
	for (const person of remembered.values()) byId.set(person.id, person)
	for (const person of found.value) byId.set(person.id, person)
	return byId
})

const options = computed(() => [...everyone.value.values()].map(person => ({ label: person.name, value: person.id })))

watch([model, everyone], () => {
	const chosen = model.value.map(id => everyone.value.get(id)).filter((person): person is Person => person !== undefined)
	const same = chosen.length === people.value.length && chosen.every((person, index) => person.id === people.value[index].id)
	if (!same) people.value = chosen
}, { immediate: true })

async function run(query: string) {
	const mine = ++latest
	loading.value = true
	try {
		const people = await searchPeople(query)
		if (mine !== latest) return
		found.value = people
		for (const person of people) remembered.set(person.id, person)
	} catch {
		if (mine === latest) found.value = []
	} finally {
		if (mine === latest) loading.value = false
	}
}

function search(query: string) {
	clearTimeout(timer)
	timer = setTimeout(() => void run(query), 250)
}

function onShow(open: boolean) {
	if (open && found.value.length === 0) void run("")
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

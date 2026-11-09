<template>
	<n-modal v-model:show="show" :auto-focus="false" @after-enter="focusInput">
		<n-card
			class="w-full! max-w-xl!"
			content-class="p-0!"
			:bordered="false"
			role="dialog"
			aria-modal="true"
			:aria-label="t('pageSearch.placeholder')"
		>
			<div class="flex items-center gap-3 px-4 py-3">
				<Icon name="carbon:search" :size="16" class="text-muted" />
				<n-input
					ref="inputRef"
					v-model:value="query"
					:bordered="false"
					:placeholder="t('pageSearch.placeholder')"
					class="grow"
					@keydown="onKeydown"
				/>
				<n-button quaternary circle size="small" :aria-label="t('common.close')" @click="close">
					<template #icon><Icon name="carbon:close" :size="16" /></template>
				</n-button>
			</div>
			<n-divider class="m-0!" />
			<n-scrollbar class="max-h-96">
				<div v-if="groups.length" class="px-2 pt-2 pb-4">
					<div v-for="group of groups" :key="group.key" class="mt-2">
						<div class="text-muted px-3 pb-1 text-xs">{{ group.heading }}</div>
						<button
							v-for="item of group.items"
							:id="itemId(item)"
							:key="item.name"
							type="button"
							class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start"
							:class="{ 'bg-primary-fill/10': item.name === activeName }"
							@mousemove="activeName = item.name"
							@click="open(item)"
						>
							<span class="bg-surface-sunken flex size-7 shrink-0 items-center justify-center rounded-full">
								<Icon :name="item.icon" :size="16" />
							</span>
							<span class="grow font-semibold">
								<Highlighter :search-words="highlightWords" auto-escape :text-to-highlight="t(item.titleKey)" />
							</span>
							<n-tag v-if="item.comingSoon" size="tiny" round :bordered="false">{{ t("common.comingSoon") }}</n-tag>
						</button>
					</div>
				</div>
				<div v-else class="text-muted px-4 py-10 text-center">{{ t("pageSearch.empty", { query }) }}</div>
			</n-scrollbar>
			<n-divider class="m-0!" />
			<div class="text-muted flex items-center justify-center gap-5 py-2 text-xs">
				<span>{{ t("pageSearch.hints.open") }}</span>
				<span>{{ t("pageSearch.hints.move") }}</span>
				<span>{{ t("pageSearch.hints.close") }}</span>
			</div>
		</n-card>
	</n-modal>
</template>

<script setup lang="ts">
import type { InputInst } from "naive-ui"
import type { PageSearchEntry } from "@/add-os/navigation/pageSearch"
import { useEventListener } from "@vueuse/core"
import { NButton, NCard, NDivider, NInput, NModal, NScrollbar, NTag } from "naive-ui"
import { computed, nextTick, onMounted, ref, watch } from "vue"
import Highlighter from "vue-highlight-words"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { filterPages, searchablePages } from "@/add-os/navigation/pageSearch"
import Icon from "@/components/common/Icon.vue"
import { useSearchDialog } from "@/composables/useSearchDialog"

/**
 * ADD OS — the toolbar search (Ctrl/⌘ K): finds a page of the dashboard and
 * opens it. Replaces the Pinx `components/common/SearchDialog.vue`, whose list
 * was fixed demo entries pointing at routes ADD OS never registered; what it
 * lists now is `navigation/pageSearch.ts`'s, i.e. the pages this account's
 * sidebar and avatar menu offer.
 *
 * The toolbar button (`Toolbar/Search.vue`) opens it through the vendor's
 * `useSearchDialog()` bridge, which this component registers with on mount.
 */

interface Group {
	key: string
	heading: string
	items: PageSearchEntry[]
}

const { t } = useI18n()
const router = useRouter()

const show = ref(false)
const query = ref("")
const activeName = ref<string | null>(null)
const inputRef = ref<InputInst | null>(null)
/** Read on each opening: who may see what changes when the account does. */
const pages = ref<PageSearchEntry[]>([])

const results = computed(() => filterPages(pages.value, query.value))

const groups = computed<Group[]>(() => {
	const bySection = new Map<string, Group>()
	for (const item of results.value) {
		const key = item.sectionTitleKey
		if (!bySection.has(key)) {
			const heading = item.groupTitleKey ? `${t(item.groupTitleKey)} · ${t(key)}` : t(key)
			bySection.set(key, { key, heading, items: [] })
		}
		bySection.get(key)?.items.push(item)
	}
	return [...bySection.values()]
})

/** What is highlighted in a title: the query's words as typed. */
const highlightWords = computed(() => query.value.split(/\s+/).filter(Boolean))

function itemId(item: PageSearchEntry): string {
	return `page-search-${item.name}`
}

function openDialog() {
	pages.value = searchablePages()
	query.value = ""
	activeName.value = pages.value[0]?.name ?? null
	show.value = true
}

function close() {
	show.value = false
}

function focusInput() {
	inputRef.value?.focus()
}

function open(item: PageSearchEntry) {
	close()
	router.push({ name: item.name })
}

function move(step: 1 | -1) {
	const list = results.value
	if (!list.length) return
	const index = list.findIndex(item => item.name === activeName.value)
	const next = index === -1 ? (step === 1 ? 0 : list.length - 1) : (index + step + list.length) % list.length
	activeName.value = list[next].name
	nextTick(() => document.getElementById(itemId(list[next]))?.scrollIntoView({ block: "nearest" }))
}

function onKeydown(event: KeyboardEvent) {
	if (event.key === "ArrowDown") {
		event.preventDefault()
		move(1)
	} else if (event.key === "ArrowUp") {
		event.preventDefault()
		move(-1)
	} else if (event.key === "Enter") {
		event.preventDefault()
		const item = results.value.find(candidate => candidate.name === activeName.value) ?? results.value[0]
		if (item) open(item)
	}
}

// Typing narrows the list: the first match is the one Enter opens.
watch(query, () => {
	activeName.value = results.value[0]?.name ?? null
})

useEventListener(window, "keydown", (event: KeyboardEvent) => {
	// `code`, not `key`: on an Arabic layout the K key reports "ن".
	if ((event.ctrlKey || event.metaKey) && event.code === "KeyK") {
		event.preventDefault()
		if (show.value) close()
		else openDialog()
	}
})

onMounted(() => {
	useSearchDialog().trigger(openDialog)
})
</script>

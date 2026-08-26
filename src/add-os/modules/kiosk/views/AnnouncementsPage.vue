<!-- src/add-os/modules/kiosk/views/AnnouncementsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.announcements") }}</h1>
			<p>{{ t("announcements.description") }}</p>
		</div>

		<n-alert v-if="error" type="error" :title="t('announcements.loadError')" />

		<div class="flex justify-end">
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("announcements.create.button") }}
			</n-button>
		</div>

		<ResourceTable
			:columns
			:data
			:loading="isLoading"
			:on-edit="openEdit"
			:on-delete="async row => { await mutations.remove(row.id) }"
		/>

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields
			:title="mode === 'create' ? t('announcements.create.title') : t('announcements.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { Announcement, AnnouncementPayload } from "@/add-os/modules/kiosk/types/announcement"
import { NAlert, NButton } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import {
	buildAnnouncementColumns,
	buildAnnouncementFields,
	emptyAnnouncementPayload
} from "@/add-os/modules/kiosk/config/announcements.config"
import { createAnnouncement, listAnnouncements, removeAnnouncement, updateAnnouncement } from "@/add-os/services/announcements"
import Icon from "@/components/common/Icon.vue"

/**
 * Banner content for the reception kiosk display — a standard CRUD screen,
 * built the same way `PlansPage` is.
 *
 * No pagination and no `ResourceStatCards`, both deliberately:
 *
 *  - `AdminResourceController::index()` paginates only when the request fills
 *    `per_page`, and this one never does, so the response is a plain array and
 *    `ResourceTable`'s own `pageSize: 10` does the display paging.
 *  - A "live now" tile would have to re-derive `is_active && now ∈ [starts_at,
 *    ends_at]` on the client — the liveness rule the backend owns for the public
 *    kiosk read. Two implementations of one rule is one too many, so the tile is
 *    omitted rather than approximated.
 *
 * This screen has no translatable field. `type` is a plain open string, not an
 * `{ar, en}` object, so nothing here touches the bilingual-label path.
 */

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data, isLoading, error, refetch } = useResourceList<Announcement>(listAnnouncements)
const columns = computed(() => buildAnnouncementColumns(t))

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref<AnnouncementPayload>(emptyAnnouncementPayload())

/**
 * `form` is handed to the field builder, not just `t`: the `ends_at >=
 * starts_at` rule is cross-field, and a `FormItemRule.validator` only ever
 * receives its own field's value. Closing over the ref is what lets it read
 * `starts_at`. Kept in a `computed` so the rules pick up a language change.
 */
const fields = computed(() => buildAnnouncementFields(t, form))

const mutations = useResourceMutations({ create: createAnnouncement, update: updateAnnouncement, remove: removeAnnouncement }, refetch, {
	createSuccess: t("announcements.create.success"),
	updateSuccess: t("announcements.edit.success"),
	deleteSuccess: t("announcements.delete.success")
})

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyAnnouncementPayload()
	drawerVisible.value = true
}

/**
 * Wire shape in, form shape out — the inbound half of the conversion
 * `services/announcements.ts` owns on the way back out.
 *
 * `starts_at`/`ends_at` arrive as Laravel's UTC ISO and become epoch millis,
 * which is what the `datetime` picker binds; `new Date(iso)` resolves the offset
 * correctly, so the picker shows local wall clock. `link_url` arrives as
 * `null` and becomes `""`, because that is what an empty text input holds.
 *
 * Assigning a brand-new object rather than mutating the existing one is what
 * signals a new drawer session to `ResourceFormDrawer` — it watches the model's
 * identity to clear the previous session's 422 feedback and validation state.
 */
function openEdit(row: Announcement) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = {
		type: row.type,
		image_url: row.image_url,
		link_url: row.link_url ?? "",
		sort_order: row.sort_order,
		starts_at: row.starts_at === null ? null : new Date(row.starts_at).getTime(),
		ends_at: row.ends_at === null ? null : new Date(row.ends_at).getTime(),
		is_active: row.is_active
	}
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as AnnouncementPayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as unknown as AnnouncementPayload)
	}
}

defineExpose({ openCreate, openEdit, submit, form, fields, mode, editingId, drawerVisible, data })
</script>

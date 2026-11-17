import { useDialog } from "naive-ui"
import { useI18n } from "vue-i18n"

export interface ConfirmOptions {
	/** Already translated; also the confirm button's label unless `positiveText` says otherwise. */
	title: string
	/** Already translated: what will happen. */
	content: string
	positiveText?: string
	onConfirm: () => unknown
}

/**
 * `useDialog()`, or null where no `<n-dialog-provider>` sits above — which in
 * the app never happens (Provider.vue wraps every page), only in a spec that
 * mounts a page bare. There a confirm cannot be shown, so the action runs.
 */
export function optionalDialog(): ReturnType<typeof useDialog> | null {
	try {
		return useDialog()
	} catch {
		return null
	}
}

/**
 * The one way a page asks before doing something (docs/UI-PATTERNS.md): a
 * centred warning dialog with the action named on its button and Cancel
 * beside it. Never `n-popconfirm` — its anchored placement was never verified
 * in RTL (theme-overrides/RTL-REPORT.md §2). RowActions confirms through the
 * same dialog.
 */
export function useConfirm() {
	const dialog = optionalDialog()
	const { t } = useI18n()

	return (options: ConfirmOptions) => {
		if (!dialog) {
			void options.onConfirm()
			return
		}
		dialog.warning({
			title: options.title,
			content: options.content,
			positiveText: options.positiveText ?? options.title,
			negativeText: t("resourceCrud.table.deleteConfirmCancel"),
			onPositiveClick: () => options.onConfirm()
		})
	}
}

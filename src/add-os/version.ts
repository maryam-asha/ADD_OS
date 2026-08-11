/**
 * ADD OS — product identity, in one place.
 *
 * Deliberately NOT read from `package.json`: that file still carries the Pinx
 * template's own name and version (`pinx-vue` 1.23.0), which are the upstream's
 * to bump, not ours. Renaming the package belongs to the visual-identity task.
 *
 * Not an i18n key on purpose. "ADD OS" is a product name and the version is a
 * pure identifier — neither is translated, and the bilingual parity guard rightly
 * rejects Arabic entries that carry no Arabic text.
 */
export const ADD_OS_NAME = "ADD OS"

export const ADD_OS_VERSION = "0.1.0"

/** Short form for the collapsed sidebar, where ~64px is all the room there is. */
export const ADD_OS_VERSION_SHORT = `v${ADD_OS_VERSION}`

export const ADD_OS_VERSION_LABEL = `${ADD_OS_NAME} ${ADD_OS_VERSION_SHORT}`

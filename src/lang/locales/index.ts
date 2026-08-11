// ADD OS: both bundles are assembled under `src/add-os/lang/` (our code) and are
// only re-exported here, because vue-i18n's `MessageSchema` is derived from this file.
//
// ADD OS is bilingual. The template's de / es / fr / it / jp bundles were removed
// on purpose: every key an ADD OS module adds would otherwise have to be duplicated
// into all of them just to keep the type intact.
//
// `en.json` still lives in this folder (it is Pinx's own English copy) and is
// consumed as the base of `@/add-os/lang/en`.
export { default as ar } from "@/add-os/lang/ar"
export { default as en } from "@/add-os/lang/en"

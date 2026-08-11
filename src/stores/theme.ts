import type { GlobalThemeOverrides, ThemeCommonVars } from "naive-ui"
import type { BuiltInGlobalTheme } from "naive-ui/es/themes/interface"
import type { Layout, RouterTransition } from "@/types/theme.d"
import { useWindowSize } from "@vueuse/core"
import _get from "lodash/get"
import _set from "lodash/set"
import { darkTheme, lightTheme } from "naive-ui"
import { acceptHMRUpdate, defineStore } from "pinia"
import { watch } from "vue"
// ADD OS: page direction is derived from the locale, never set independently.
import { bindDirectionToLocale } from "@/add-os/lang/bindDirectionToLocale"
import { getCssVars, getDefaultState, getThemeOverrides } from "@/theme"
import { ThemeNameEnum } from "@/types/theme.d"

export const useThemeStore = defineStore("theme", {
	state: () => getDefaultState(),
	actions: {
		setLayout(layout: Layout): void {
			this.layout = layout
		},
		setRTL(rtl: boolean): void {
			this.rtl = rtl
		},
		setBoxed(boxed: boolean): void {
			this.boxed.enabled = boxed
		},
		setFooterShow(show: boolean): void {
			this.footer.show = show
		},
		setToolbarBoxed(boxed: boolean): void {
			this.boxed.toolbar = boxed
		},
		setRouterTransition(routerTransition: RouterTransition): void {
			this.routerTransition = routerTransition
		},
		// ADD OS: `setTheme()` · `setThemeLight()` · `setThemeDark()` · `toggleTheme()`
		// ALL REMOVED — every runtime write path to `themeName`.
		//
		// Pinning the default and dropping it from `persist.pick` stopped dark mode
		// being REACHED at boot, but left it reachable at RUNTIME: three surfaces
		// still called these — the toolbar `ThemeSwitch`, `useThemeSwitch()`, and a
		// command-palette action in `SearchDialog` with no visual presence at all.
		// Any one of them would have handed naive-ui's `darkTheme` to our light-only
		// overrides, which is the half-themed screen the guards exist to prevent.
		//
		// Same lesson as `setColor()` below: deleting a control does not remove a
		// capability. `themeName` is now read-only — the getters (`isThemeDark`,
		// `isThemeLight`, `naiveTheme`) remain, since plenty of code legitimately
		// asks which mode is active.
		//
		// Restore all four when a full dark palette lands in add-os/theme/tokens.ts.
		//
		// ADD OS: `setColor()` REMOVED — the only runtime write path into the token
		// palette. It was:
		//
		//   setColor(theme, colorName, color) {
		//     (this.colors[theme] as Record<string, string>)[colorName] = color
		//   }
		//
		// Deleting the UI that called it would not have been enough. The capability
		// would have survived the control and come back with the first settings
		// screen someone builds.
		//
		// Why it cannot exist: every ratio this project asserts — primary 4.72,
		// danger 4.52, success 4.61, borderStrong 4.20/3.12, both focus-ring bands —
		// is tested against `add-os/theme/tokens.ts`. A runtime override makes those
		// assertions VACUOUS: green in CI, false in the product. A test that cannot
		// fail for the case it exists to catch is worse than no test, because it
		// manufactures confidence.
		//
		// Two more reasons: the Brand Guideline assigns #007F91 its role, so a
		// user-swappable primary makes brand compliance a per-session accident; and
		// a user setting primary to a red collides it with `danger` on screens
		// carrying force-unlock and revoke-access. Same safety argument that keeps
		// pillar colour out of chrome.
		//
		// Colour changes belong in tokens.ts, behind `npm run tokens` and the WCAG
		// invariants. Guarded by add-os/theme/__tests__/tokens.spec.ts.
		toggleSidebar(): void {
			this.sidebar.collapsed = !this.sidebar.collapsed
		},
		refreshSidebar(): void {
			// this is useful in context like NUXT
			this.sidebar.collapsed = !this.sidebar.collapsed
			setTimeout(() => {
				this.sidebar.collapsed = !this.sidebar.collapsed
			}, 10)
		},
		openSidebar(): void {
			this.sidebar.collapsed = false
		},
		closeSidebar(): void {
			this.sidebar.collapsed = true
		},
		updateResponsiveVars() {
			for (const key in this.responsive.override) {
				if (_get(this, key) && key in this.responsive.override) {
					_set(
						this,
						key,
						window.innerWidth <= this.responsive.breakpoint
							? this.responsive.override[key as keyof typeof this.responsive.override].mobile
							: this.responsive.override[key as keyof typeof this.responsive.override].desk
					)
				}
			}
		},
		ensureSidebarState() {
			// auto close sidebar on resize
			if (this.sidebar.autoClose) {
				if (!this.sidebar.collapsed && window.innerWidth <= this.sidebar.autoCloseBreakpoint) {
					this.sidebar.collapsed = true
				}
			}
		},
		setDocumentThemeName(val: ThemeNameEnum, old?: ThemeNameEnum) {
			if (document) {
				const html = document.children[0] as HTMLElement
				if (old) {
					html.classList.remove(`theme-${old}`)
				}
				html.classList.add(`theme-${val}`)
			}
		},
		// This function allows you to utilize the values in the style object as variables within your CSS/SCSS code like: var(--bg-default-color)
		setCssGlobalVars() {
			if (document) {
				const html = document.children[0] as HTMLElement
				const body = document.getElementsByTagName("body")?.[0]
				if (body) {
					if (this.isRTL) {
						body.classList.add("direction-rtl")
						body.classList.remove("direction-ltr")
					} else {
						body.classList.remove("direction-rtl")
						body.classList.add("direction-ltr")
					}
				}
				// ADD OS: enabled. The template shipped this commented out and relied on the
				// `.direction-rtl` body class alone. We keep BOTH: the class drives our SCSS
				// overrides, while the native `dir` attribute drives the browser's own
				// bidi behaviour (text selection, caret movement, scrollbar side, form fields).
				html.dir = this.isRTL ? "rtl" : "ltr"
				const { style: htmlStyle } = html
				for (const key in this.style) {
					htmlStyle.setProperty(`--${key}`, this.style[key] || "")
				}
			}
		},
		startWatchers() {
			const { width } = useWindowSize()

			// ADD OS: locale → direction. Runs immediately, then on every language change.
			bindDirectionToLocale(this)

			watch([() => this.isRTL, () => this.style], () => {
				this.setCssGlobalVars()
			})

			watch(
				() => this.themeName,
				(val, old) => {
					this.setDocumentThemeName(val, old)
				}
			)

			watch(width, () => {
				this.updateResponsiveVars()
				this.ensureSidebarState()
			})
		},
		initTheme() {
			this.updateResponsiveVars()
			this.ensureSidebarState()
			this.setCssGlobalVars()
			this.setDocumentThemeName(this.themeName)
			this.startWatchers()
		}
	},
	getters: {
		naiveTheme(state): BuiltInGlobalTheme {
			return state.themeName === ThemeNameEnum.Dark ? darkTheme : lightTheme
		},
		themeOverrides(state): GlobalThemeOverrides {
			return getThemeOverrides(state)
		},
		darkPrimaryColor(state): string {
			return state.colors.dark.primary
		},
		lightPrimaryColor(state): string {
			return state.colors.light.primary
		},
		naiveCommon(): ThemeCommonVars {
			return { ...this.naiveTheme.common, ...this.themeOverrides.common }
		},
		style(state): { [key: string]: string } {
			return getCssVars(state, this)
		},
		isThemeDark(state): boolean {
			return state.themeName === ThemeNameEnum.Dark
		},
		isThemeLight(state): boolean {
			return state.themeName === ThemeNameEnum.Light
		},
		isBoxed(state): boolean {
			return state.boxed.enabled
		},
		isRTL(state): boolean {
			return state.rtl
		},
		isFooterShown(state): boolean {
			return state.footer.show
		},
		isToolbarBoxed(state): boolean {
			return state.boxed.toolbar && state.boxed.enabled
		}
	},
	persist: {
		// use this param to save specific state chunk on localStorage
		// ADD OS: "rtl" added so the direction survives a reload.
		//
		// ADD OS: "themeName" REMOVED. Dark mode is out of scope for v1 (decision Q7)
		// and the default is pinned to Light in theme/index.ts. Persisting the name
		// would let a value stored before that pin — or by any future dev toggle —
		// restore a dark theme we have no palette for. Re-add it when dark ships.
		//
		// ADD OS: "layout" and "routerTransition" REMOVED with their controls.
		// `layout` is the load-bearing one: a value persisted as HorizontalNav would
		// survive with no UI left to correct it, leaving a user stuck in a layout the
		// ADD nav has never been reviewed in. `routerTransition` follows for the same
		// reason — persisting state nothing can set is how stale state hides.
		pick: ["rtl", "boxed", "sidebar.collapsed"]
	}
})

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useThemeStore, import.meta.hot))
}

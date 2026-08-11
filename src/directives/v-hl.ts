import hljs from "highlight.js/lib/core"
import css from "highlight.js/lib/languages/css"
import javascript from "highlight.js/lib/languages/javascript"
import scss from "highlight.js/lib/languages/scss"
import typescript from "highlight.js/lib/languages/typescript"
import html from "highlight.js/lib/languages/xml"
// import "highlight.js/styles/monokai.css"
import "highlight.js/styles/atom-one-dark.css"

hljs.registerLanguage("javascript", javascript)
hljs.registerLanguage("typescript", typescript)
hljs.registerLanguage("html", html)
hljs.registerLanguage("scss", scss)
hljs.registerLanguage("css", css)

const LEADING_WHITESPACE_REGEX = /^\s+/
const TAB_REGEX = /\t/g

const vHl = {
	created: (el: HTMLElement, binding: { arg: string }) => {
		if (el.children[0]?.innerHTML) {
			if (binding.arg) {
				el.innerHTML = hljs.highlight(el.children[0].innerHTML, { language: binding.arg }).value
			} else {
				el.innerHTML = hljs.highlightAuto(el.children[0].innerHTML).value
			}
		}
		resetIndent(el)
	}
}

function resetIndent(el: HTMLElement) {
	if (el) {
		let lines: string[] = el.innerHTML?.split("\n")

		if (lines?.length) {
			if (lines[0] === "") {
				lines.shift()
			}

			const matches = LEADING_WHITESPACE_REGEX.exec(lines[0] || "")
			const indentation = matches !== null ? matches[0] : null
			if (indentation) {
				lines = lines.map(line => {
					line = line.replace(indentation, "")
					return line.replace(TAB_REGEX, "    ")
				})

				el.innerHTML = lines.join("\n").trim()
			}
		}
	}
}

export { hljs, resetIndent }

export default vHl

import { describe, expect, it } from "vitest"
import { renderMarkdown, stripMarkdown } from "../markdown"

describe("markdown utils", () => {
	describe("renderMarkdown", () => {
		it("returns empty string for null, undefined, or whitespace", () => {
			expect(renderMarkdown(null)).toBe("")
			expect(renderMarkdown(undefined)).toBe("")
			expect(renderMarkdown("")).toBe("")
			expect(renderMarkdown("   ")).toBe("")
		})

		it("renders basic formatting (bold, italic, headings)", () => {
			const md = "# Title\n\n**bold text** and *italic text*"
			const html = renderMarkdown(md)
			expect(html).toContain("<h1>Title</h1>")
			expect(html).toContain("<strong>bold text</strong>")
			expect(html).toContain("<em>italic text</em>")
		})

		it("renders GFM strikethrough and tables", () => {
			const md = "~~deleted~~\n\n| Col A | Col B |\n| --- | --- |\n| 1 | 2 |"
			const html = renderMarkdown(md)
			expect(html).toContain("<del>deleted</del>")
			expect(html).toContain("<table>")
			expect(html).toContain("<th>Col A</th>")
			expect(html).toContain("<td>1</td>")
		})

		it("renders task lists", () => {
			const md = "- [x] Done\n- [ ] Todo"
			const html = renderMarkdown(md)
			expect(html).toContain('type="checkbox"')
		})
	})

	describe("stripMarkdown", () => {
		it("strips common markdown formatting into clean plain text", () => {
			const md = "### Aleppo **Digital** District: [link](/about) and `code`"
			const plain = stripMarkdown(md)
			expect(plain).toBe("Aleppo Digital District: link and code")
		})

		it("returns empty string for empty input", () => {
			expect(stripMarkdown("")).toBe("")
			expect(stripMarkdown(null)).toBe("")
			expect(stripMarkdown(undefined)).toBe("")
		})
	})
})

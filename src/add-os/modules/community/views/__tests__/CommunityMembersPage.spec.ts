import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const FILE = path.resolve(__dirname, "..", "CommunityMembersPage.vue")
const source = readFileSync(FILE, "utf8")

describe("communityMembersPage wiring", () => {
	it("uses the community-members service methods and config", () => {
		expect(source).toContain('from "@/add-os/services/community-members"')
		expect(source).toContain('from "@/add-os/modules/community/config/community-members.config"')
		expect(source).toContain("createCommunityMember")
		expect(source).toContain("updateCommunityMember")
		expect(source).toContain("removeCommunityMember")
		expect(source).toContain("listCommunityMembers")
	})

	it("renders ResourceStatCards, ResourceTable and ResourceFormDrawer", () => {
		expect(source).toContain("<ResourceStatCards")
		expect(source).toContain("<ResourceTable")
		expect(source).toContain("<ResourceFormDrawer")
	})

	it("translates titles and operations via vue-i18n", () => {
		expect(source).toContain('t("communityMembers.create.button")')
		expect(source).toContain("t('communityMembers.create.title')")
		expect(source).toContain("t('communityMembers.edit.title')")
	})
})

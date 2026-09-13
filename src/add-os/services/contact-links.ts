import type { ContactLink, ContactLinkPayload } from "@/add-os/modules/cms/types/contact-link"
import { createResourceApi } from "./resource-factory"

const api = createResourceApi<ContactLink, ContactLinkPayload, ContactLinkPayload>(
	"/api/v1/admin/contact-links"
)

export const listContactLinks = api.list
export const getContactLink = api.getById
export const createContactLink = api.create
export const updateContactLink = api.update
export const removeContactLink = api.remove

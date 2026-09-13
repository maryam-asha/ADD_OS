import { uploadFile } from "./api"

export interface UploadMediaResponse {
	url: string
	path: string
	name?: string
	size?: number
	mime?: string
}

export async function uploadMedia(file: File, folder?: string): Promise<UploadMediaResponse> {
	const extra = folder ? { folder } : undefined
	return uploadFile<UploadMediaResponse>("/api/v1/admin/media/upload", file, "file", extra)
}

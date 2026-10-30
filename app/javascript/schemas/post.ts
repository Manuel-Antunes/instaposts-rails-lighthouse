import { z } from 'zod'

// A picked file, and the square crop of it when the user made one.
export type PickedMedia = { file: File; cropped?: File }

// As Post::MAX_ASSETS and PostAsset::MAX_SIZE.
export const MAX_MEDIA_FILES = 10
export const MAX_MEDIA_SIZE = 50 * 1024 * 1024

export const postSchema = z.object({
  name: z.string().trim().min(1, 'Give the post a title.').max(255, 'The title has at most 255 characters.'),
  content: z.string().trim().min(1, 'Write a caption.'),
  media: z.array(z.custom<PickedMedia>((value) => value instanceof Object && (value as PickedMedia).file instanceof File)).max(MAX_MEDIA_FILES, `A post has at most ${MAX_MEDIA_FILES} files.`),
})

export type PostValues = z.infer<typeof postSchema>

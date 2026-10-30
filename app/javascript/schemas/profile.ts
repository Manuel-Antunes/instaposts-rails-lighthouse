import { z } from 'zod'

// As User::AVATAR_MAX_SIZE.
export const AVATAR_MAX_SIZE = 5 * 1024 * 1024

export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Your name cannot be blank.').max(255, 'Your name has at most 255 characters.'),
  // As User::USERNAME_FORMAT, Instagram's: always lowercase, no two periods in a row, none at the end.
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Pick a username.')
    .max(30, 'A username has at most 30 characters.')
    .regex(/^(?!.*\.\.)(?!.*\.$)[a-z0-9_][a-z0-9_.]*$/, 'Use letters, numbers, underscores and periods: never two periods in a row, or one at the end.'),
  // The new picture, already cropped; left out to keep the current one.
  avatar: z
    .custom<File>((value) => value instanceof File)
    .refine((file) => file.type.startsWith('image/'), 'The picture must be an image.')
    .refine((file) => file.size <= AVATAR_MAX_SIZE, 'The picture must be smaller than 5 MB.')
    .optional(),
})

export type ProfileValues = z.infer<typeof profileSchema>

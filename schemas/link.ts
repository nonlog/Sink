import { z } from 'zod'

const { slugRegex } = useAppConfig()

export const LinkSchema = z.object({
  id: z.string().trim().max(26).default(nanoid(10)),
  slug: z.string().trim().regex(new RegExp(slugRegex)).max(2048).default(nanoid(+useRuntimeConfig().slugDefaultLength)),
  url: z.string().trim().url().max(2048),
  createdAt: z.number().int().safe().default(() => Math.floor(Date.now() / 1000)),
  updatedAt: z.number().int().safe().default(() => Math.floor(Date.now() / 1000)),
  expiration: z.number().int().safe().optional(),
  title: z.string().trim().max(2048).optional(),
  description: z.string().trim().max(2048).optional(),
  image: z.string().trim().url().max(2048).optional(),
  comment: z.string().trim().max(2048).optional(),
})
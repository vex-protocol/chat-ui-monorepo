import { z } from 'zod'

/** A single one-time key as uploaded by a client device. */
export const OTKPayloadSchema = z.object({
  publicKey: z.string(),
  signature: z.string(),
  index: z.number().int().nonnegative(),
})

/** The key bundle returned to a sender during X3DH key exchange. */
export const KeyBundleSchema = z.object({
  signKey: z.string(),
  preKey: z.object({
    publicKey: z.string(),
    signature: z.string(),
    index: z.number(),
  }),
  otk: z
    .object({
      publicKey: z.string(),
      signature: z.string(),
      index: z.number(),
    })
    .nullable(),
})

export type OTKPayload = z.infer<typeof OTKPayloadSchema>
export type KeyBundle = z.infer<typeof KeyBundleSchema>

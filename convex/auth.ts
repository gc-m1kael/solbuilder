import { query } from "./_generated/server"

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      return null
    }

    return {
      subject: identity.subject,
      name: identity.name ?? null,
      email: identity.email ?? null,
      pictureUrl: identity.pictureUrl ?? null,
    }
  },
})

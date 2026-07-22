import { ConvexError } from "convex/values"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import type { Doc, Id } from "../_generated/dataModel"

type Ctx = QueryCtx | MutationCtx

export type AuthIdentity = {
  subject: string
  name: string | null
  email: string | null
  pictureUrl: string | null
}

export async function requireIdentity(ctx: Ctx): Promise<AuthIdentity> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "Authentication required",
    })
  }

  return {
    subject: identity.subject,
    name: identity.name ?? null,
    email: identity.email ?? null,
    pictureUrl: identity.pictureUrl ?? null,
  }
}

export async function getAppMembership(
  ctx: Ctx,
  appId: Id<"apps">,
  userId: string
): Promise<Doc<"appMembers"> | null> {
  return await ctx.db
    .query("appMembers")
    .withIndex("by_app_user", (q) => q.eq("appId", appId).eq("userId", userId))
    .unique()
}

export async function requireAppMember(
  ctx: Ctx,
  appId: Id<"apps">,
  userId?: string
): Promise<{ identity: AuthIdentity; app: Doc<"apps">; membership: Doc<"appMembers"> }> {
  const identity = await requireIdentity(ctx)
  const subject = userId ?? identity.subject
  if (subject !== identity.subject) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "User mismatch",
    })
  }

  const app = await ctx.db.get(appId)
  if (!app) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "App not found",
    })
  }

  const membership = await getAppMembership(ctx, appId, identity.subject)
  if (!membership) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Not a member of this app",
    })
  }

  return { identity, app, membership }
}

export async function requireAppOwner(
  ctx: Ctx,
  appId: Id<"apps">
): Promise<{ identity: AuthIdentity; app: Doc<"apps">; membership: Doc<"appMembers"> }> {
  const result = await requireAppMember(ctx, appId)
  if (result.membership.role !== "owner") {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Owner access required",
    })
  }
  return result
}

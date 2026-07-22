import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { optionalEnv } from "./lib/env"

/**
 * Optional Cursor webhook endpoint.
 * Primary Cursor completion tracking is workflow polling; webhook is best-effort.
 */
const http = httpRouter()

http.route({
  path: "/cursor-webhook",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    const secret = optionalEnv("CURSOR_WEBHOOK_SECRET")
    if (secret) {
      const headerSecret =
        request.headers.get("x-webhook-secret") ??
        request.headers.get("x-cursor-webhook-secret")
      if (headerSecret !== secret) {
        return new Response("Unauthorized", { status: 401 })
      }
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return new Response("Invalid JSON", { status: 400 })
    }

    // Persist for debugging; polling remains the source of truth for v1.
    console.log("[cursor-webhook]", JSON.stringify(body).slice(0, 2000))

    return new Response(null, { status: 204 })
  }),
})

export default http

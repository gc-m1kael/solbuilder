import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ClerkProvider, useAuth } from "@clerk/react"
import { ConvexProviderWithClerk } from "convex/react-clerk"
import { ConvexReactClient } from "convex/react"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in your .env file")
}

if (!CONVEX_URL) {
  throw new Error("Missing VITE_CONVEX_URL in your .env file")
}

const convex = new ConvexReactClient(CONVEX_URL)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <App />
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </ThemeProvider>
  </StrictMode>
)

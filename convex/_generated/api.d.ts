/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_provision from "../actions/provision.js";
import type * as adapters_convexPlatform from "../adapters/convexPlatform.js";
import type * as adapters_cursor from "../adapters/cursor.js";
import type * as adapters_github from "../adapters/github.js";
import type * as adapters_vercel from "../adapters/vercel.js";
import type * as apps from "../apps.js";
import type * as auth from "../auth.js";
import type * as generation from "../generation.js";
import type * as generationInternal from "../generationInternal.js";
import type * as generationJobs from "../generationJobs.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_env from "../lib/env.js";
import type * as lib_slugify from "../lib/slugify.js";
import type * as lib_status from "../lib/status.js";
import type * as threads from "../threads.js";
import type * as workflow_generateApp from "../workflow/generateApp.js";
import type * as workflow_index from "../workflow/index.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/provision": typeof actions_provision;
  "adapters/convexPlatform": typeof adapters_convexPlatform;
  "adapters/cursor": typeof adapters_cursor;
  "adapters/github": typeof adapters_github;
  "adapters/vercel": typeof adapters_vercel;
  apps: typeof apps;
  auth: typeof auth;
  generation: typeof generation;
  generationInternal: typeof generationInternal;
  generationJobs: typeof generationJobs;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/env": typeof lib_env;
  "lib/slugify": typeof lib_slugify;
  "lib/status": typeof lib_status;
  threads: typeof threads;
  "workflow/generateApp": typeof workflow_generateApp;
  "workflow/index": typeof workflow_index;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
};

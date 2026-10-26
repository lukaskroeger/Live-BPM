# AGENTS.md — Global Standards

This file is the single source of truth for how code is written in this project. Every agent and every human follows these rules.

## Architecture

LiveBPM is a **frontend-only** application. Everything runs in the browser as a Blazor WebAssembly app — there is no backend API, no database, and no server-side projects.

| Project | Responsibility | May reference |
|---|---|---|
| `LiveBPM.Web` | Blazor WebAssembly UI + all application logic. | nothing (other than NuGet packages) |

**Rules:**

- All business logic lives client-side inside `LiveBPM.Web`. There are no external HTTP calls.
- Audio processing is implemented in JavaScript (`wwwroot/bpmDetector.js`) and driven from Blazor through `IJSRuntime`. The JS side is the single source of truth for the DSP; the Blazor side owns state and rendering.
- `.razor` pages hold their own local state and controls. Shared presentation components live in `Shared/`.
- Never add a project or package reference that reintroduces a backend. No `HttpClient`-backed services, no controllers, no `DbContext`.

## Conventions

- Pages live directly in `Pages/`, shared UI components in `Shared/`, and layout in `Layout/`.
- C# code that must interoperate with browser APIs goes through `IJSRuntime` calling into `wwwroot/bpmDetector.js`.
- `Bpm.razor` is the primary feature (real-time tempo detection). Keep its `BpmOptions` / `BpmUpdate` records and the JS `defaults` object in sync when adding parameters.

## Styling

- Tailwind CSS (via the Tailwind CLI) with a custom `livebpm` theme defined in `tailwind.css`. The full design tokens are documented in `DESIGN.md`.
- Rebuild CSS with `npm run build-css` (see `package.json`); the compiled output is `wwwroot/tailwindStyles.css`.

## Commit & PR Conventions

- Every PR references a user story (GitHub issue) ID.
- User stories flow through labels: `draft` → `ready` → `in-progress` → `review` → `deployed`.
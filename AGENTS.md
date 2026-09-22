# AGENTS.md — Global Standards

This file is the single source of truth for how code is written in this project. Every agent and every human follows these rules. Tool-specific behavior lives in `.agents/skills/` — this file defines the architecture.

## Architecture — Clean Architecture Layering

```
Domain     ←  Application  ←  Infrastructure
Contracts  ←  Application  ←  Api
Contracts  ←  Web (talks HTTP to the Api only)
```

| Project | Responsibility | May reference |
|---|---|---|
| `LiveBPM.Domain` | Entities, value objects, enums, domain exceptions. Pure data model — no business logic. | nothing |
| `LiveBPM.Contracts` | The API surface: CQRS commands, queries, and response DTOs. Primitives only — no Domain types. | nothing (`MediatR.Contracts` package only) |
| `LiveBPM.Application` | Use cases: MediatR handlers, FluentValidation validators, repository interfaces (persistence ports). | Contracts, Domain |
| `LiveBPM.Infrastructure` | EF Core `AppDbContext`, repository implementations, migrations. | Application, Domain |
| `LiveBPM.Api` | Thin controllers, wiring (`Program.cs`), Serilog, OpenAPI, CORS. | Application, Contracts, Infrastructure |
| `LiveBPM.Web` | Blazor WebAssembly UI. | Contracts |

**Rules:**

- Dependencies point inward only. Never add a reference that breaks the table above.
- `LiveBPM.Api` defines **no request or response types of its own**. Endpoint inputs are the commands/queries from `LiveBPM.Contracts`; endpoint outputs are the response DTOs from `LiveBPM.Contracts`.
- `LiveBPM.Application` defines **no DTOs**. It consumes the contract types and maps them to/from Domain entities inside handlers.
- `LiveBPM.Web` defines **no view models**. Pages and services use the contract commands, queries, and DTOs directly — Web talks HTTP to the Api and binds the same contract types the Api exposes.
- Domain entities never appear on the API surface directly; only contract DTOs cross the wire.
- **Contract types are primitives only** (`string`, `int`, `decimal`, `DateTimeOffset`, ...). Categorical values travel as `string` — handlers map Domain enums with `.ToString()`. Never put a Domain enum in a contract DTO: it breaks JSON deserialization in the Web client and couples Contracts to Domain.

## CQRS / MediatR Conventions

- Commands mutate state, queries read state — never mix.
- Every use case = one `sealed record` request (`IRequest<TResponse>`) in `LiveBPM.Contracts/Features/<Feature>/` + one `sealed class` handler (`IRequestHandler`) in `LiveBPM.Application/Features/<Feature>/`.
- Response DTOs are `sealed record`s living in `LiveBPM.Contracts` — in the same file as their command/query; DTOs shared by multiple requests (e.g. `TodoItemDto`) get their own file.
- Every command gets a FluentValidation `AbstractValidator` in the same Application feature folder. Registration is automatic via `AddApplication()`.
- Handlers depend on `I<Entity>Repository` interfaces in `Application/Common/Interfaces/` — never on `DbContext` directly. Implementations live in `Infrastructure/Repositories/`.
- Controllers are thin: bind the command/query (as `[FromBody]` for writes, route/query parameters for reads), `sender.Send(...)`, return the contract response. No mapping, no logic.
- Flat feature folders: all files of a feature live directly in `Features/<FeatureName>/` — no `Commands/`/`Queries/` subfolders.
- Living example: the `Todos` and `Ping` slices end-to-end.

## Naming Rules

- Commands: `<Action><Entity>Command` / response: `<Action><Entity>Response` (e.g. `CreateTodoItemCommand` → `CreateTodoItemResponse`).
- Queries: `Get<Entity>ByIdQuery`, `List<Entities>Query` / shared DTO: `<Entity>Dto`.
- Handlers: `<RequestName>Handler`; validators: `<CommandName>Validator`.
- Controllers: `<Feature>Controller`, route `api/<feature>`.

## Testing Rules

- `verify.ps1` is the contract: build + smoke tests + acceptance-criteria tests, one exit code. No merge without it green — locally, in CI, and in every agent runner.
- Every user story ships with tests for its acceptance criteria.
- Smoke tests cover `/health`, sample endpoints, and OpenAPI generation.

## Commit & PR Conventions

- Every PR references a user story (GitHub issue) ID.
- User stories flow through labels: `draft` → `ready` → `in-progress` → `review` → `deployed`.

## Meta-Rule

Every agent incident reveals a gap: add a smoke test, sharpen a skill in `.agents/skills/`, or — if architectural — update this file and the livebpm.

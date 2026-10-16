# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Implementation follows the existing tier boundaries; routes translate HTTP requests and responses, services own business rules, and Mongoose schemas enforce persisted-data requirements.

- Presentation tier decision: Keep the four React routes focused on API-backed lists and workout lookup. Use the shared API client, show accessible loading, empty, and error states, and let users request suggestions by email. Activity and team creation remain API capabilities for this exercise.
- Logic tier decision: Keep `/api/*` handlers thin and put validation and business behavior in explicit service functions. Return deliberate 4xx responses for malformed input, missing references, and unknown users; do not add authentication.
- Data tier decision: Require meaningful user, team, activity, and workout fields in Mongoose. Keep team members as user references with an empty-array default. Seed stable demo records with upserts and preserve unrelated data.
- Activity tracking approach: Accept `userId`, `teamId`, `type`, and positive `minutes`; validate IDs and confirm both references exist before writing. Compute one point per minute and set `occurredAt` on the server.
- Team management approach: Require a non-empty name and mascot, validate each supplied member as an existing user, and default omitted members to an empty list.
- Leaderboard approach: Aggregate activity points by team, sort highest total first, and return `teamName`, `totalPoints`, and 1-based rank. Use team name as a stable tie-breaker.
- Workout suggestions approach: Find users by normalized email; rank workouts matching the user's fitness goal ahead of recent activity focus, include an explanatory reason, and return 404 for an unknown email.

## Test plan

Run focused tests in dependency order, then both builds:

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend` — failures indicate model validation, references/defaults, or seed integrity/idempotency problems.
- API command: `npm run test:api --prefix octofit-tracker/backend` — failures indicate request validation, persistence/response shape, leaderboard aggregation, or recommendation behavior problems.
- Frontend command: `npm test --prefix octofit-tracker/frontend` — failures indicate incorrect API requests, rendered data, or missing accessible loading/empty/error states.
- Backend build command: `npm run build --prefix octofit-tracker/backend` — failures indicate TypeScript errors in the API or data tier.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend` — failures indicate TypeScript errors or a production Vite bundle problem.

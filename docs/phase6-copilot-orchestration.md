# Travelia — Phase 6: Copilot Reasoning & Orchestration Layer

## Overview & Core Principle

In Phase 6, Gemini was transformed from a conversational text generator into the **reasoning and orchestration layer** over Travelia's authoritative backend services.

```
==================================================
CORE PRINCIPLE:
GEMINI REASONS. TRAVELIA SERVICES VERIFY AND CALCULATE.
==================================================
```

Gemini evaluates user intents, identifies constraints, determines trade-offs, and selects tools. Deterministic backend services calculate numbers, query verified places, evaluate road routes, compute health metrics, and verify budgets. If an AI approximation conflicts with an authoritative service result, **the deterministic service always wins**.

---

## 1. System Architecture

```
User
  ↓
Gemini Reasoning & Intent Classification
  ↓
Tool Selection (12 Authoritative Backend Capabilities)
  ↓
Travelia Authoritative Service Execution
(Places, Routes, Weather, Budget, Health Score, Flights, FX)
  ↓
Deterministic Validation & Hallucination Defense
(Service truth overrides model drafts)
  ↓
User Approval Gating (if action is change-producing)
  ↓
Structured Explanation & Provenance Attribution
  ↓
User
```

---

## 2. The 12 Authoritative Backend Tools

All backend tools expose structured JSON schemas compatible with function calling:

| Tool Name | Service Owner | Responsibility | Provenance / Status |
| :--- | :--- | :--- | :--- |
| `search_places` | `placesService` | Search verified attractions, dining, and stays using Places Data Layer | `'live'` \| `'demo'` \| `'unavailable'` |
| `get_place_details` | `placesService` | Retrieve verified coordinates, hours, ratings, and addresses | `'live'` \| `'demo'` \| `'unavailable'` |
| `get_weather` | `weatherService` | Multi-day forecast, rain probability, wind, disruption warnings | `'live'` \| `'cached'` \| `'unavailable'` |
| `calculate_route` | `routeIntelligenceService` | Road distance (km) and driving/walking time (mins) | `'live'` \| `'cached'` \| `'fallback'` |
| `calculate_route_matrix` | `routeIntelligenceService` | Pairwise origin-destination transit matrices | `'live'` \| `'cached'` \| `'fallback'` |
| `calculate_budget` | `tripCostService` | Exact budget breakdown (lodging, flights, activities, food, transit) | `'calculated'` |
| `calculate_health_score`| `healthScoreService` | 6-dimension Trip Health Score (0–100) | `'calculated'` |
| `optimize_itinerary` | `itineraryOptimizer` | Backtracking elimination, schedule balancing, factual savings | `'calculated'` |
| `simulate_what_if` | `whatIfSimulator` | Hypothetical projection without mutating trip state | `'calculated'` |
| `search_flights` | `flightService` | Authentic roundtrip flight schedules and real provider fares | `'live'` \| `'demo'` \| `'unavailable'` |
| `convert_currency` | `currencyService` | Live FX conversion with rate timestamps | `'live'` \| `'cached'` |
| `get_trip_context` | `tripRepository` | Verified snapshot of active itinerary, bookings, and constraints | `'verified'` |

---

## 3. Factual Rules & Hallucination Defense

Travelia Copilot operates under strict anti-hallucination protocols:

1. **Zero Fabrication Guarantee**:
   Gemini must never independently invent:
   - Places or landmarks
   - Coordinates (latitude/longitude)
   - Ratings or review counts
   - Weather forecasts or rain percentages
   - Travel times or road distances
   - Activity or hotel prices
   - Flight schedules or airlines
   - Foreign exchange rates
   - Health score metrics

2. **Deterministic Truth Enforcement (`validateAndEnforceDeterministicTruth`)**:
   Post-execution validation checks the model's textual draft against tool results:
   - If the model says *"travel is 30 minutes"*, but the route service says `42 minutes`, the text is automatically corrected to `42 minutes`.
   - If the model says *"cost is ₹12,000"*, but the budget tool calculates `₹18,500`, the figure is corrected to `₹18,500`.
   - If the model says *"health score is 95/100"*, but the health score engine calculates `82/100`, the score is corrected to `82/100`.
   - Audit corrections are logged in the response metadata.

3. **Honest Handling of Missing Data**:
   - For unpriced hotels: Google Places provides identity and metadata, NOT room tariffs. The price is strictly `null` and displayed as `"Price unavailable"`. Travelia never converts Google `priceLevel` (0–4) into an estimated room price.
   - For unserviced flight routes: Returns `outboundFlights: []` with status `'unavailable'`. Never synthesizes imaginary airline schedules.

---

## 4. Multi-Step Reasoning Workflow

When handling complex optimization questions such as:
> *"Can I replace the beach with another activity and still stay under budget?"*

The orchestrator executes a 9-step reasoning pipeline:
1. **Identify Activity**: Locates the beach activity on Day 1 (`Baga Water Sports`, cost: ₹2,200).
2. **Search Verified Alternatives**: Calls `search_places` in destination for verified cultural/sightseeing landmarks (`Reis Magos Fort Heritage Center`, cost: ₹150).
3. **Check Operating Hours & Details**: Validates opening hours and entrance tariffs.
4. **Calculate Route**: Calls `calculate_route` from previous stop to alternative (~25 mins, 9.2 km road distance).
5. **Calculate Cost**: Calls `calculate_budget` to compute net savings (₹2,050 savings; new trip total ₹16,450).
6. **Calculate Health**: Calls `calculate_health_score` to measure pacing delta (+4 points).
7. **Compare**: Formulates before vs. after comparison table.
8. **Explain**: Generates natural language summary explaining trade-offs.
9. **Gated Approval**: Returns `requiresApproval: true` and a structured `approvalAction` (`modify_itinerary`). The trip is NOT mutated until the user explicitly confirms.

---

## 5. Structured Response Schema

All copilot responses adhere to the structured schema:

```typescript
export interface StructuredCopilotResponse {
  answer: string;                  // Natural language response
  reply: string;                   // Backward-compatible alias
  intent: AIIntent;                // Classified user intent
  facts: FactItem[];               // Factual claims backed by tools with provenance
  recommendations: string[];       // Actionable suggestions
  toolResults: ToolExecutionResult[]; // Audit trail of all tool executions
  assumptions: string[];           // Explicit assumptions made
  warnings: string[];              // Weather, budget, or transit warnings
  requiresApproval: boolean;       // True if action is change-producing
  approvalAction?: CopilotApprovalAction; // Action payload for user confirmation
  actionProposal?: AIActionProposal; // Backward-compatible action proposal
  confidence: number;              // Confidence score (0.0 - 1.0)
  suggestedFollowUps: string[];    // Suggested next questions
}
```

---

## 6. User Approval Enforcement

Any destructive or change-producing operation MUST require explicit user confirmation:
- `modify_itinerary` (swapping activities or changing times)
- `delete_activity` (removing stops to cut budget or relieve fatigue)
- `change_hotel` (switching accommodations)
- `change_flight` (selecting alternate flights)
- `change_budget` (adjusting budget caps)
- `apply_weather_replan` (replacing outdoor stops with indoor alternatives)

Non-destructive inquiries (such as "Is this trip over budget?" or "What is the travel distance from Panaji to Calangute?") set `requiresApproval: false`.

---

## 7. Improved AI Prompts

Three specialized prompts enforce verified data and zero-fabrication standards:
- `server/prompts/chatPrompt.ts`: Main copilot system prompt incorporating active trip context, tool declarations, deterministic baselines, and structured JSON output.
- `server/prompts/travelPlannerPrompt.ts`: Itinerary creation prompt grounded in Places Data Layer, road routing, and health score pacing.
- `server/prompts/optimizerPrompt.ts`: Optimizer reasoning prompt emphasizing constraint preservation (`preserveKeywords`, target budget), deterministic calculation primacy, and approval gating.

---

## 8. Verification & Test Results

The Phase 6 automated test suite (`server/test_phase6_copilot.ts`) verifies all 10 mandatory scenarios:

| # | Scenario | Test Objective | Result |
| :--- | :--- | :--- | :--- |
| 1 | **Normal Trip Question** | Validates structured summary, verified facts, and tool execution | **PASS** |
| 2 | **Weather Question** | Validates rain probability, indoor contingency, and approval gating | **PASS** |
| 3 | **Route Question** | Validates road distance and travel time from route provider | **PASS** |
| 4 | **Budget Question** | Validates exact cost breakdown against declared budget | **PASS** |
| 5 | **Place Recommendation** | Validates verified places from Places Data Layer with authentic ratings | **PASS** |
| 6 | **What-If** | Validates 9-step tool chaining (places -> route -> cost -> health) | **PASS** |
| 7 | **Impossible Request** | Validates strict refusal of impossible destinations/fares | **PASS** |
| 8 | **Missing Data** | Validates unpriced stay handling (price null, no priceLevel conversion) | **PASS** |
| 9 | **Provider Failure** | Validates graceful error handling and unavailable status | **PASS** |
| 10 | **Conflicting Information** | Validates hallucination defense (deterministic service overrides model draft) | **PASS** |

**Scorecard**: **82 / 82 assertions passed** across Phase 6.  
**Full Repository Test Suite**: **390+ total assertions passed** across 7 test suites with 0 failures.  
**Build & Lint**: `npm run lint` and `npm run build` completed with 0 errors.

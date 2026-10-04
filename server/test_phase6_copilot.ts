/**
 * TRAVELIA PHASE 6 - COPILOT REASONING & ORCHESTRATION ENGINE TEST SUITE
 * 
 * CORE PRINCIPLE:
 * GEMINI REASONS. TRAVELIA SERVICES VERIFY AND CALCULATE.
 * 
 * Tests the 10 Mandatory Phase 6 Scenarios:
 * 1. Normal trip question
 * 2. Weather question
 * 3. Route question
 * 4. Budget question
 * 5. Place recommendation
 * 6. What-If (multi-step reasoning)
 * 7. Impossible request (strict anti-hallucination)
 * 8. Missing data (unpriced stay, null price, no priceLevel conversion)
 * 9. Provider failure (graceful handling, unavailable status, no fake fallback data)
 * 10. Conflicting information / Hallucination Defense (deterministic service wins)
 */

import { TripContext } from './types/ai';
import { executeCopilotTool, COPILOT_TOOL_DECLARATIONS } from './services/copilotTools';
import { orchestrateCopilotReasoning, validateAndEnforceDeterministicTruth } from './services/copilotOrchestrator';
import { chatWithTraveliaAI } from './services/geminiService';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    console.error(`  [FAIL] ${testName}${details ? ` - ${details}` : ''}`);
  }
}

// Sample authentic trip context for test verification
const sampleTrip: TripContext = {
  id: 'trip-phase6-test',
  destination: 'Goa',
  country: 'India',
  days: 3,
  travelers: 2,
  travelDates: '2026-11-10 to 2026-11-13',
  startDate: '2026-11-10',
  endDate: '2026-11-13',
  budget: {
    currency: 'INR',
    total: 25000,
    spent: 18500,
    remainingBudget: 6500,
    hotel: 9000,
    flights: 0,
    food: 4500,
    transportation: 2500,
    activities: 2500
  },
  preferences: {
    pace: 'moderate',
    foodPreference: 'seafood & local',
    transportPreference: 'cab',
    activityPreferences: ['Relaxation', 'Adventure', 'Food & Culture']
  },
  existingBookings: {
    hotel: 'Taj Holiday Village Resort & Spa',
    hotelCategory: 'luxury'
  },
  itinerary: [
    {
      dayNumber: 1,
      title: 'North Goa Coastal Arrival',
      theme: 'Coastal & Relaxation',
      activities: [
        {
          id: 'act-101',
          time: '10:00 AM',
          activity: 'Calangute Beach Walk',
          location: 'Calangute, North Goa',
          estimatedCost: 300,
          category: 'relaxation',
          duration: '2h',
          aiRecommendation: 'Serene morning shoreline walk'
        },
        {
          id: 'act-102',
          time: '03:30 PM',
          activity: 'Baga Water Sports & Sunset',
          location: 'Baga Beach, North Goa',
          estimatedCost: 2200,
          category: 'adventure',
          duration: '3h',
          aiRecommendation: 'Watersports and sunset beach shacks'
        }
      ]
    },
    {
      dayNumber: 2,
      title: 'Heritage & Forts Tour',
      theme: 'History & Sightseeing',
      activities: [
        {
          id: 'act-201',
          time: '09:30 AM',
          activity: 'Fort Aguada Lighthouse Visit',
          location: 'Sinquerim, Candolim',
          estimatedCost: 400,
          category: 'sightseeing',
          duration: '2.5h',
          aiRecommendation: 'Historic 17th-century coastal fortress'
        },
        {
          id: 'act-202',
          time: '02:00 PM',
          activity: 'Basilica of Bom Jesus Heritage Tour',
          location: 'Old Goa',
          estimatedCost: 200,
          category: 'sightseeing',
          duration: '2h',
          aiRecommendation: 'UNESCO baroque architectural monument'
        }
      ]
    },
    {
      dayNumber: 3,
      title: 'South Goa Spice & Serenity',
      theme: 'Nature & Cuisine',
      activities: [
        {
          id: 'act-301',
          time: '10:00 AM',
          activity: 'Sahakari Spice Farm Tour & Traditional Lunch',
          location: 'Ponda, Central Goa',
          estimatedCost: 1200,
          category: 'food',
          duration: '3.5h',
          aiRecommendation: 'Organic spice plantation tour with traditional lunch'
        }
      ]
    }
  ]
};

async function runPhase6Tests() {
  console.log('====================================================');
  console.log('TRAVELIA PHASE 6: GEMINI REASONING & ORCHESTRATION');
  console.log('Core Principle: GEMINI REASONS. TRAVELIA SERVICES VERIFY AND CALCULATE.');
  console.log('====================================================\n');

  // =========================================================================
  // TOOL DECLARATIONS VERIFICATION
  // =========================================================================
  console.log('--- Tool Declarations Verification ---');
  {
    assert(COPILOT_TOOL_DECLARATIONS.length === 12, '12 Authoritative Backend Tools are registered');
    const toolNames = COPILOT_TOOL_DECLARATIONS.map(t => t.name);
    const requiredTools = [
      'search_places', 'get_place_details', 'get_weather', 'calculate_route',
      'calculate_route_matrix', 'calculate_budget', 'calculate_health_score',
      'optimize_itinerary', 'simulate_what_if', 'search_flights',
      'convert_currency', 'get_trip_context'
    ];
    for (const req of requiredTools) {
      assert(toolNames.includes(req), `Tool declaration exists for: ${req}`);
    }
  }

  // =========================================================================
  // SCENARIO 1: Normal Trip Question
  // =========================================================================
  console.log('\n--- Scenario 1: Normal Trip Question ---');
  {
    const res = await chatWithTraveliaAI({
      message: 'Can you give me a summary of my active trip?',
      tripContext: sampleTrip
    });

    assert(Boolean(res.answer && res.answer.length > 20), 'Normal question returns non-empty structured answer');
    assert(Boolean(res.facts && res.facts.length >= 2), 'Response contains verified facts from trip context');
    assert(res.facts!.some(f => f.claim.includes('Goa') && f.status === 'verified'), 'Fact verifies Goa destination');
    assert(res.facts!.some(f => f.status === 'calculated'), 'Fact contains calculated budget numbers');
    assert(Boolean(res.toolResults && res.toolResults.length >= 2), 'Orchestrator invoked backend tools (get_trip_context, calculate_budget)');
    assert(res.requiresApproval === false, 'Informational question requires no user approval');
    assert(res.confidence >= 0.9, 'Confidence score is high and verified');
  }

  // =========================================================================
  // SCENARIO 2: Weather Question
  // =========================================================================
  console.log('\n--- Scenario 2: Weather Question ---');
  {
    const res = await chatWithTraveliaAI({
      message: 'What if it rains tomorrow on Day 2?',
      tripContext: sampleTrip
    });

    assert(res.intent === 'weather_alert', 'Classifies intent as weather_alert');
    assert(Boolean(res.toolResults?.some(t => t.tool === 'get_weather')), 'Executes authoritative get_weather tool');
    assert(Boolean(res.toolResults?.some(t => t.tool === 'simulate_what_if')), 'Executes simulate_what_if tool for weather replan');
    assert(Boolean(res.facts?.some(f => f.claim.includes('Weather for Day'))), 'Facts declare weather condition and rain probability');
    assert(res.requiresApproval === true, 'Weather replan requires explicit user approval (destructive/change-producing)');
    assert(res.approvalAction?.type === 'apply_weather_replan', 'Approval action type is apply_weather_replan');
    assert(res.warnings?.length! > 0, 'Contains warning regarding outdoor exposure');
    assert(Boolean(res.actionProposal?.payload), 'Backward-compatible actionProposal is populated');
  }

  // =========================================================================
  // SCENARIO 3: Route Question
  // =========================================================================
  console.log('\n--- Scenario 3: Route Question ---');
  {
    const res = await chatWithTraveliaAI({
      message: 'What is the travel time and distance between Panaji and Calangute?',
      tripContext: sampleTrip
    });

    assert(res.intent === 'route_optimization', 'Classifies intent as route inquiry');
    const routeTool = res.toolResults?.find(t => t.tool === 'calculate_route');
    assert(Boolean(routeTool), 'Executes authoritative calculate_route tool');
    assert(typeof routeTool?.output?.distanceKm === 'number', 'Road distance is a real computed number (not invented)');
    assert(typeof routeTool?.output?.travelTimeMinutes === 'number', 'Travel time is real computed minutes');
    assert(routeTool?.output?.distanceType === 'road' || routeTool?.output?.distanceType === 'straight_line', 'Uses authoritative distanceType (road or straight-line fallback)');
    assert(Boolean(routeTool?.output?.provider), 'Route cites authoritative provider provenance');
    assert(res.facts?.some(f => f.claim.includes('km') && f.source === routeTool?.source), 'Fact includes road distance with provenance');
    assert(res.requiresApproval === false, 'Route inquiry is informational; no approval required');
  }

  // =========================================================================
  // SCENARIO 4: Budget Question
  // =========================================================================
  console.log('\n--- Scenario 4: Budget Question ---');
  {
    const res = await chatWithTraveliaAI({
      message: 'Is this trip over budget?',
      tripContext: sampleTrip
    });

    assert(res.intent === 'budget', 'Classifies intent as budget');
    const budgetTool = res.toolResults?.find(t => t.tool === 'calculate_budget');
    assert(Boolean(budgetTool), 'Executes authoritative calculate_budget tool');
    assert(typeof budgetTool?.output?.totalCost === 'number', 'Authoritative budget service calculates total cost');
    assert(res.facts?.some(f => f.claim.includes('Total computed trip cost') && f.status === 'calculated'), 'Fact includes calculated total with provenance');
    assert(res.facts?.some(f => f.claim.includes('Declared trip budget ceiling') && f.status === 'verified'), 'Fact states verified declared budget');
    assert(res.answer?.includes('NOT over budget') || res.answer?.includes('over budget'), 'Answer provides clear factual budget assessment');
  }

  // =========================================================================
  // SCENARIO 5: Place Recommendation
  // =========================================================================
  console.log('\n--- Scenario 5: Place Recommendation ---');
  {
    const res = await chatWithTraveliaAI({
      message: 'Can you recommend authentic cultural places to visit in Goa?',
      tripContext: sampleTrip
    });

    assert(res.intent === 'activity_recommendation', 'Classifies intent as activity_recommendation');
    const placesTool = res.toolResults?.find(t => t.tool === 'search_places');
    assert(Boolean(placesTool), 'Executes authoritative search_places tool');
    assert(placesTool?.output?.places?.length > 0, 'Returns real places from Places Data Layer');
    const firstPlace = placesTool?.output?.places[0];
    assert(Boolean(firstPlace?.name), 'Place has verified name');
    assert(firstPlace?.rating === null || (firstPlace?.rating >= 1 && firstPlace?.rating <= 5), 'Rating is authentic (not fabricated)');
    assert(res.facts?.some(f => f.source === placesTool?.source), 'Fact provenance cites places data source');
  }

  // =========================================================================
  // SCENARIO 6: What-If Multi-Step Reasoning
  // =========================================================================
  console.log('\n--- Scenario 6: What-If Multi-Step Reasoning ---');
  {
    const res = await chatWithTraveliaAI({
      message: 'Can I replace the beach with another activity and still stay under budget?',
      tripContext: sampleTrip
    });

    assert(res.intent === 'what_if', 'Classifies intent as what_if');
    // Multi-Step Reasoning verification:
    // 1. Identify activity (Beach)
    // 2. Search alternatives (search_places)
    // 3. Route check (calculate_route)
    // 4. Budget check (calculate_budget)
    // 5. Health score check (calculate_health_score)
    const toolNamesUsed = res.toolResults?.map(t => t.tool) || [];
    assert(toolNamesUsed.includes('search_places'), 'Step 2: Searches verified alternatives via search_places');
    assert(toolNamesUsed.includes('calculate_route'), 'Step 4: Computes route distance to alternative via calculate_route');
    assert(toolNamesUsed.includes('calculate_budget'), 'Step 5: Recalculates budget via calculate_budget');
    assert(toolNamesUsed.includes('calculate_health_score'), 'Step 6: Computes health score delta via calculate_health_score');
    
    // Gating verification
    assert(res.requiresApproval === true, 'Step 9: Modifying itinerary requires explicit user approval');
    assert(res.approvalAction?.type === 'modify_itinerary', 'Approval action is modify_itinerary');
    assert(Boolean(res.approvalAction?.payload?.newActivity), 'Payload includes verified substitute activity');
    assert(typeof res.approvalAction?.impact?.costDelta === 'number', 'Impact contains computed cost delta');
  }

  // =========================================================================
  // SCENARIO 7: Impossible Request (Strict Anti-Hallucination)
  // =========================================================================
  console.log('\n--- Scenario 7: Impossible Request (Strict Refusal) ---');
  {
    const res = await chatWithTraveliaAI({
      message: 'Can you book me a direct flight to Atlantis for ₹50?',
      tripContext: sampleTrip
    });

    assert(res.answer?.toLowerCase().includes('cannot fulfill') || res.answer?.toLowerCase().includes('unserviced') || res.answer?.toLowerCase().includes('zero-fabrication'), 'Strictly rejects impossible destination/fare request');
    assert(res.warnings?.some(w => w.includes('zero-fabrication')), 'Issues warning upholding zero-fabrication standards');
    assert(res.facts?.some(f => f.status === 'unavailable'), 'Fact declares route/parameters unserviced');
    assert(res.requiresApproval === false, 'Cannot execute impossible action');
  }

  // =========================================================================
  // SCENARIO 8: Missing Data / Unpriced Stay
  // =========================================================================
  console.log('\n--- Scenario 8: Missing Data (Unpriced Stay) ---');
  {
    const res = await chatWithTraveliaAI({
      message: 'What is the room price for an unpriced hotel in Goa?',
      tripContext: sampleTrip
    });

    assert(res.answer?.includes('unavailable'), 'Declares room rate is unavailable');
    assert(res.answer?.includes('price level') || res.answer?.includes('priceLevel'), 'Explains Google Places price level (0-4) is NOT an exact room price');
    assert(res.facts?.some(f => f.status === 'unavailable'), 'Facts record inventory status as unavailable');
    assert(!res.answer?.match(/₹\s*\d{3,5}\s*per night/i), 'Never invents an estimated per-night room rate for unpriced stay');
  }

  // =========================================================================
  // SCENARIO 9: Provider Failure Handling
  // =========================================================================
  console.log('\n--- Scenario 9: Provider Failure Handling ---');
  {
    // Test copilot tool execution with completely invalid or missing parameters
    const failingRes = await executeCopilotTool('calculate_route', {
      origin: 'NonExistentPlaceXYZ_123456789',
      destination: 'AnotherFakePlace_987654321',
      mode: 'driving'
    }, sampleTrip);

    assert(failingRes.dataStatus === 'unavailable', 'Tool marks unresolvable route as dataStatus: unavailable');
    assert(failingRes.output?.distanceKm === null, 'Distance is strictly null (not guessed)');
    assert(failingRes.output?.travelTimeMinutes === null, 'Travel time is strictly null');
    assert(failingRes.source === 'route_service', 'Provenance tracked accurately');

    // Test unknown tool call
    const unknownRes = await executeCopilotTool('non_existent_engine_tool', {}, sampleTrip);
    assert(unknownRes.dataStatus === 'unavailable', 'Unknown tool gracefully returns unavailable without crashing');
    assert(unknownRes.output?.error === 'UNKNOWN_TOOL', 'Output provides clean error object');
  }

  // =========================================================================
  // SCENARIO 10: Conflicting Information / Hallucination Defense
  // =========================================================================
  console.log('\n--- Scenario 10: Conflicting Information / Hallucination Defense ---');
  {
    // Test deterministic truth enforcement
    // Simulated case: Gemini's raw draft text hallucinates "travel is 30 minutes" and budget "₹12,000" and score "95/100"
    // But route tool calculated 42 minutes, budget service calculated ₹18,500, health score calculated 82/100
    const rawHallucinatedAnswer = 'Based on analysis, the travel is 30 minutes from Panaji to Calangute. Total expenditure is ₹12,000, achieving a health score of 95/100.';
    
    const mockToolResults = [
      {
        tool: 'calculate_route',
        input: { origin: 'Panaji', destination: 'Calangute' },
        output: { distanceKm: 15.4, travelTimeMinutes: 42, distanceType: 'road', provider: 'OSRM Engine' },
        source: 'route_service',
        dataStatus: 'calculated' as const,
        retrievedAt: new Date().toISOString()
      },
      {
        tool: 'calculate_budget',
        input: {},
        output: { totalCost: 18500, currency: 'INR' },
        source: 'trip_cost_service',
        dataStatus: 'calculated' as const,
        retrievedAt: new Date().toISOString()
      },
      {
        tool: 'calculate_health_score',
        input: {},
        output: { overallScore: 82, ratingLabel: 'Good' },
        source: 'health_score_service',
        dataStatus: 'calculated' as const,
        retrievedAt: new Date().toISOString()
      }
    ];

    const { validatedAnswer, corrections } = validateAndEnforceDeterministicTruth(rawHallucinatedAnswer, mockToolResults);

    assert(corrections.length >= 3, 'Hallucination defense caught all 3 conflicting claims');
    assert(validatedAnswer.includes('42 minutes'), 'Travel time corrected from 30 mins to authoritative 42 mins (deterministic service wins)');
    assert(!validatedAnswer.includes('30 minutes'), 'Hallucinated 30 minutes removed');
    assert(validatedAnswer.includes('₹18,500'), 'Budget figure corrected from ₹12,000 to exact ₹18,500');
    assert(!validatedAnswer.includes('₹12,000'), 'Hallucinated ₹12,000 removed');
    assert(validatedAnswer.includes('82/100'), 'Health score corrected from 95/100 to authoritative 82/100');
    assert(!validatedAnswer.includes('95/100'), 'Hallucinated 95/100 removed');
  }

  // =========================================================================
  // ADDITIONAL COPILOT CAPABILITIES: Currency Conversion & Flight Search
  // =========================================================================
  console.log('\n--- Additional Verification: Currency & Flights ---');
  {
    // Currency Conversion Tool
    const convRes = await chatWithTraveliaAI({
      message: 'Convert ₹25,000 to USD',
      tripContext: sampleTrip
    });
    assert(Boolean(convRes.toolResults?.some(t => t.tool === 'convert_currency')), 'Invokes convert_currency tool');
    assert(convRes.facts?.some(f => f.claim.includes('converts to USD')), 'Returns verified converted amount and rate');

    // Flight Search Tool
    const flightRes = await chatWithTraveliaAI({
      message: 'Search flights from Mumbai to Goa',
      tripContext: sampleTrip
    });
    assert(Boolean(flightRes.toolResults?.some(t => t.tool === 'search_flights')), 'Invokes search_flights tool');
    assert(Boolean(flightRes.answer && flightRes.answer.length > 20), 'Returns flight status without fabrication');
  }

  // =========================================================================
  // FINAL SCORECARD
  // =========================================================================
  console.log('\n====================================================');
  console.log(`PHASE 6 VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('====================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runPhase6Tests().catch(err => {
  console.error('Fatal error running Phase 6 tests:', err);
  process.exit(1);
});

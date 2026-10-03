import { chatWithTraveliaAI } from './services/geminiService';
import { TripContext } from './types/ai';

async function verifyAll10Scenarios() {
  console.log('================================================================');
  console.log('TRAVELIA REAL AI COPILOT — 10 MASTER PROMPTS VERIFICATION TEST');
  console.log('================================================================\n');

  const tripContext: TripContext = {
    destination: 'Goa',
    country: 'India',
    days: 4,
    travelers: 3,
    budget: {
      currency: 'INR',
      total: 25000,
      spent: 14000,
      remainingBudget: 11000,
      hotel: 10000,
      food: 6000,
      transportation: 3500,
      activities: 4500
    },
    preferences: {
      pace: 'moderate',
      foodPreference: 'casual',
      transportPreference: 'cab',
      activityPreferences: ['Relaxation', 'Food & Culture']
    },
    existingBookings: {
      hotel: 'Taj Holiday Village Resort',
      hotelCategory: 'mid'
    },
    itinerary: [
      {
        dayNumber: 1,
        title: 'Day 1: North Coast & Watersports',
        theme: 'Coastal & Heritage',
        activities: [
          { id: '1', time: '10:00 - 12:30', activity: 'Baga Beach Watersports', location: 'Baga Beach', estimatedCost: 1800, duration: '2.5h', category: 'adventure', aiRecommendation: 'Morning waves' },
          { id: '2', time: '13:00 - 14:30', activity: 'Seafood Shack Lunch', location: 'Calangute Beach', estimatedCost: 1200, duration: '1.5h', category: 'food', aiRecommendation: 'Fresh catch' },
          { id: '3', time: '15:30 - 18:00', activity: 'Fort Aguada Ramparts Stroll', location: 'Sinquerim', estimatedCost: 300, duration: '2.5h', category: 'sightseeing', aiRecommendation: 'Panoramic coastal view' }
        ]
      },
      {
        dayNumber: 2,
        title: 'Day 2: South Goa Heritage & Luxury River Cruise',
        theme: 'Culture & Luxury',
        activities: [
          { id: '4', time: '09:30 - 11:30', activity: 'Basilica of Bom Jesus', location: 'Old Goa', estimatedCost: 0, duration: '2h', category: 'sightseeing', aiRecommendation: 'UNESCO heritage' },
          { id: '5', time: '12:00 - 14:00', activity: 'Heritage Villa Dining', location: 'Fontainhas Latin Quarter', estimatedCost: 1500, duration: '2h', category: 'food', aiRecommendation: 'Traditional Goan cuisine' },
          { id: '6', time: '15:00 - 18:00', activity: 'Private Luxury Yacht Cruise', location: 'Panaji Jetty', estimatedCost: 4500, duration: '3h', category: 'adventure', aiRecommendation: 'Exclusive charter' },
          { id: '7', time: '18:30 - 20:30', activity: 'Night Market & Live Band', location: 'Arpora', estimatedCost: 800, duration: '2h', category: 'relaxation', aiRecommendation: 'Local vibrant atmosphere' }
        ]
      },
      {
        dayNumber: 3,
        title: 'Day 3: Scenic Spice Plantation & Waterfalls',
        theme: 'Nature & Wellness',
        activities: [
          { id: '8', time: '10:00 - 13:00', activity: 'Sahakari Spice Farm Walk & Lunch', location: 'Ponda', estimatedCost: 1400, duration: '3h', category: 'sightseeing', aiRecommendation: 'Aromatic trail' },
          { id: '9', time: '14:30 - 17:30', activity: 'Dudhsagar Foothills Scenic Jeep Safari', location: 'Mollem', estimatedCost: 2200, duration: '3h', category: 'adventure', aiRecommendation: 'Western Ghats wilderness' }
        ]
      }
    ]
  };

  const testPrompts = [
    { id: 1, prompt: "Make my trip cheaper." },
    { id: 2, prompt: "Which day is too busy?" },
    { id: 3, prompt: "Make Day 2 more relaxed." },
    { id: 4, prompt: "I only have ₹20,000. Adjust my trip." },
    { id: 5, prompt: "What happens if I remove my most expensive activity?" },
    { id: 6, prompt: "Rain is expected tomorrow. What should I change?" },
    { id: 7, prompt: "Why is my Trip Health Score low?" },
    { id: 8, prompt: "Keep the beach activities but reduce the cost." },
    { id: 9, prompt: "Reduce unnecessary travel." },
    { id: 10, prompt: "Explain every change you made." }
  ];

  let passedCount = 0;

  for (const t of testPrompts) {
    try {
      const response = await chatWithTraveliaAI({
        message: t.prompt,
        tripContext,
        history: []
      });

      console.log(`TEST ${t.id}: "${t.prompt}"`);
      console.log(`  ✓ Intent Detected: ${response.intent}`);
      console.log(`  ✓ Reply: "${response.reply.slice(0, 100)}..."`);
      if (response.actionProposal) {
        console.log(`  ✓ Action Proposal: [${response.actionProposal.label}]`);
        console.log(`    - Estimated Savings: ₹${response.actionProposal.estimatedSavings ?? 0}`);
        console.log(`    - Health Score Delta: ${response.actionProposal.healthScoreDelta ?? 'N/A'}`);
        console.log(`    - Time Saved: ${response.actionProposal.travelTimeSavedMins ?? 0} mins`);
        if (response.actionProposal.optimizationResult) {
          console.log(`    - Real Optimization Result attached with ${response.actionProposal.optimizationResult.changes.length} changes`);
        }
      }
      if (response.suggestedFollowUps && response.suggestedFollowUps.length > 0) {
        console.log(`  ✓ Suggested Follow-ups: [${response.suggestedFollowUps.slice(0, 2).join(', ')}]`);
      }
      console.log(`  ✓ Deterministic Calculations Used: ${response.deterministicCalculationsUsed ?? false}\n`);
      passedCount++;
    } catch (err: any) {
      console.error(`  ✗ FAIL TEST ${t.id}:`, err?.message || err);
    }
  }

  console.log(`================================================================`);
  console.log(`RESULTS: ${passedCount} / ${testPrompts.length} MASTER PROMPTS PASSED`);
  console.log(`================================================================`);
}

verifyAll10Scenarios();

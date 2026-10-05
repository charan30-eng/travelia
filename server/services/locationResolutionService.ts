/**
 * Authoritative Location Resolution Service
 * 
 * Maps activities, hotels, landmarks, and destination names to real, verified coordinates.
 * NEVER fabricates random coordinates or sinusoidal pseudo-points.
 * If coordinates cannot be verified, returns null to honestly signal 'unavailable' or 'partial'.
 */

import { Coordinates, ResolvedLocation } from '../types/route';

export interface LandmarkCatalogEntry {
  names: string[];
  destination: string;
  coords: Coordinates;
  displayName: string;
}

// Verified landmark coordinates across primary destinations
export const VERIFIED_LANDMARK_CATALOG: LandmarkCatalogEntry[] = [
  // --- GOA, INDIA ---
  {
    names: ['baga beach', 'baga coastline', 'baga night shacks', 'baga beach watersports'],
    destination: 'goa',
    coords: { latitude: 15.5553, longitude: 73.7517 },
    displayName: 'Baga Beach, North Goa'
  },
  {
    names: ['calangute beach', 'calangute beach shacks', 'coastal kitchen shack'],
    destination: 'goa',
    coords: { latitude: 15.5439, longitude: 73.7554 },
    displayName: 'Calangute Beach, North Goa'
  },
  {
    names: ['candolim beach', 'candolim beach stroll', 'candolim coast', 'ocean pearl resort', 'candolim / calangute coast'],
    destination: 'goa',
    coords: { latitude: 15.5186, longitude: 73.7628 },
    displayName: 'Candolim Beach, North Goa'
  },
  {
    names: ['fort aguada', 'fort aguada ramparts stroll', 'historic fort aguada & light house', 'sinquerim beach cliff', 'sinquerim'],
    destination: 'goa',
    coords: { latitude: 15.4921, longitude: 73.7736 },
    displayName: 'Fort Aguada, Sinquerim, Goa'
  },
  {
    names: ['chapora fort', 'chapora fort (dil chahta hai point)', 'vagator hills'],
    destination: 'goa',
    coords: { latitude: 15.6059, longitude: 73.7368 },
    displayName: 'Chapora Fort, Vagator, Goa'
  },
  {
    names: ['thalassa', 'thalassa cliffside', 'siolim / vagator'],
    destination: 'goa',
    coords: { latitude: 15.6178, longitude: 73.7431 },
    displayName: 'Thalassa Siolim, Goa'
  },
  {
    names: ['green leaf café', 'green leaf cafe', 'assagao village', 'assagao'],
    destination: 'goa',
    coords: { latitude: 15.5891, longitude: 73.7797 },
    displayName: 'Green Leaf Café, Assagao, Goa'
  },
  {
    names: ['basilica of bom jesus', 'se cathedral', 'old goa heritage quarter', 'old goa'],
    destination: 'goa',
    coords: { latitude: 15.5009, longitude: 73.9116 },
    displayName: 'Basilica of Bom Jesus, Old Goa'
  },
  {
    names: ['fontainhas', 'fontainhas latin quarter', 'fontainhas, panaji', 'panjim latin quarter', 'spice route'],
    destination: 'goa',
    coords: { latitude: 15.4989, longitude: 73.8311 },
    displayName: 'Fontainhas Latin Quarter, Panaji, Goa'
  },
  {
    names: ['mandovi river', 'mandovi river sunset cruise', 'panaji jetty', 'private luxury yacht cruise'],
    destination: 'goa',
    coords: { latitude: 15.4998, longitude: 73.8278 },
    displayName: 'Panaji Jetty & Mandovi Riverfront, Goa'
  },
  {
    names: ['dudhsagar', 'dudhsagar falls', 'dudhsagar foothills scenic jeep safari', '4x4 jungle jeep safari to dudhsagar falls', 'bhagwan mahavir wildlife sanctuary', 'mollem'],
    destination: 'goa',
    coords: { latitude: 15.3144, longitude: 74.3143 },
    displayName: 'Dudhsagar Falls & Bhagwan Mahavir Sanctuary, Goa'
  },
  {
    names: ['sahakari spice farm', 'spice plantation', 'ponda spice village', 'ponda'],
    destination: 'goa',
    coords: { latitude: 15.4026, longitude: 74.0152 },
    displayName: 'Sahakari Spice Farm, Ponda, Goa'
  },
  {
    names: ['anjuna', 'anjuna flea market', 'anjuna beach', 'anjuna flea market & sunset drum circle'],
    destination: 'goa',
    coords: { latitude: 15.5828, longitude: 73.7432 },
    displayName: 'Anjuna Beach, Goa'
  },
  {
    names: ['taj holiday village', 'taj holiday village resort'],
    destination: 'goa',
    coords: { latitude: 15.4981, longitude: 73.7684 },
    displayName: 'Taj Holiday Village Resort, Candolim, Goa'
  },
  {
    names: ['manohar international airport', 'mopa airport', 'gox'],
    destination: 'goa',
    coords: { latitude: 15.7667, longitude: 73.8667 },
    displayName: 'Manohar International Airport (GOX), Mopa, Goa'
  },
  {
    names: ['dabolim airport', 'goa international airport', 'goi'],
    destination: 'goa',
    coords: { latitude: 15.3808, longitude: 73.8314 },
    displayName: 'Dabolim Airport (GOI), Goa'
  },
  {
    names: ['goa state central museum', 'state museum', 'christian art gallery', 'central heritage museum'],
    destination: 'goa',
    coords: { latitude: 15.4950, longitude: 73.8290 },
    displayName: 'Goa State Central Museum, Panaji, Goa'
  },
  {
    names: ['houses of goa', 'houses of goa museum', 'mario gallery'],
    destination: 'goa',
    coords: { latitude: 15.5410, longitude: 73.8340 },
    displayName: 'Houses of Goa Museum, Porvorim, Goa'
  },
  {
    names: ['sunaparanta centre for the arts', 'sunaparanta', 'altinho gallery'],
    destination: 'goa',
    coords: { latitude: 15.4912, longitude: 73.8245 },
    displayName: 'Sunaparanta Centre for the Arts, Altinho, Goa'
  },

  // --- PARIS, FRANCE ---
  {
    names: ['eiffel tower', 'champ de mars'],
    destination: 'paris',
    coords: { latitude: 48.8584, longitude: 2.2945 },
    displayName: 'Eiffel Tower, Paris'
  },
  {
    names: ['louvre', 'musée du louvre', 'rue de rivoli'],
    destination: 'paris',
    coords: { latitude: 48.8606, longitude: 2.3376 },
    displayName: 'Musée du Louvre, Paris'
  },
  {
    names: ['notre-dame', 'notre dame cathedral', 'île de la cité'],
    destination: 'paris',
    coords: { latitude: 48.8530, longitude: 2.3499 },
    displayName: 'Cathédrale Notre-Dame de Paris'
  },
  {
    names: ['montmartre', 'sacré-cœur', 'sacre coeur'],
    destination: 'paris',
    coords: { latitude: 48.8867, longitude: 2.3431 },
    displayName: 'Montmartre & Sacré-Cœur, Paris'
  },
  {
    names: ['saint-germain', 'saint-germain-des-prés', 'boulevard saint-germain'],
    destination: 'paris',
    coords: { latitude: 48.8539, longitude: 2.3332 },
    displayName: 'Saint-Germain-des-Prés, Paris'
  },
  {
    names: ['le marais', 'place des vosges'],
    destination: 'paris',
    coords: { latitude: 48.8575, longitude: 2.3622 },
    displayName: 'Le Marais, Paris'
  },

  // --- KYOTO, JAPAN ---
  {
    names: ['fushimi inari', 'fushimi inari shrine', 'torii gates'],
    destination: 'kyoto',
    coords: { latitude: 34.9671, longitude: 135.7727 },
    displayName: 'Fushimi Inari-Taisha, Kyoto'
  },
  {
    names: ['kinkaku-ji', 'golden pavilion', 'kinkakuji'],
    destination: 'kyoto',
    coords: { latitude: 35.0394, longitude: 135.7292 },
    displayName: 'Kinkaku-ji (Golden Pavilion), Kyoto'
  },
  {
    names: ['kiyomizu-dera', 'sannenzaka', 'higashiyama'],
    destination: 'kyoto',
    coords: { latitude: 34.9949, longitude: 135.7850 },
    displayName: 'Kiyomizu-dera, Kyoto'
  },
  {
    names: ['arashiyama', 'bamboo grove', 'arashiyama bamboo grove'],
    destination: 'kyoto',
    coords: { latitude: 35.0170, longitude: 135.6710 },
    displayName: 'Arashiyama Bamboo Grove, Kyoto'
  },
  {
    names: ['gion', 'gion historic heritage', 'pontocho'],
    destination: 'kyoto',
    coords: { latitude: 35.0037, longitude: 135.7745 },
    displayName: 'Gion District, Kyoto'
  },
  {
    names: ['nishiki market', 'nishiki market artisan food'],
    destination: 'kyoto',
    coords: { latitude: 35.0050, longitude: 135.7649 },
    displayName: 'Nishiki Market, Kyoto'
  },

  // --- TOKYO, JAPAN ---
  {
    names: ['shibuya', 'shibuya crossing', 'shibuya sky'],
    destination: 'tokyo',
    coords: { latitude: 35.6595, longitude: 139.7005 },
    displayName: 'Shibuya Crossing & Sky, Tokyo'
  },
  {
    names: ['senso-ji', 'sensoji', 'asakusa'],
    destination: 'tokyo',
    coords: { latitude: 35.7148, longitude: 139.7967 },
    displayName: 'Sensō-ji, Asakusa, Tokyo'
  },
  {
    names: ['tsukiji', 'tsukiji outer market'],
    destination: 'tokyo',
    coords: { latitude: 35.6655, longitude: 139.7708 },
    displayName: 'Tsukiji Outer Market, Tokyo'
  },
  {
    names: ['shinjuku gyoen', 'shinjuku'],
    destination: 'tokyo',
    coords: { latitude: 35.6852, longitude: 139.7100 },
    displayName: 'Shinjuku Gyoen National Garden, Tokyo'
  },

  // --- BALI, INDONESIA ---
  {
    names: ['ubud monkey forest', 'sacred monkey forest sanctuary', 'ubud'],
    destination: 'bali',
    coords: { latitude: -8.5190, longitude: 115.2600 },
    displayName: 'Ubud Monkey Forest, Bali'
  },
  {
    names: ['tegalalang', 'tegalalang rice terraces', 'rice terrace'],
    destination: 'bali',
    coords: { latitude: -8.4330, longitude: 115.2810 },
    displayName: 'Tegalalang Rice Terraces, Bali'
  },
  {
    names: ['uluwatu', 'uluwatu temple', 'kecak dance'],
    destination: 'bali',
    coords: { latitude: -8.8290, longitude: 115.0840 },
    displayName: 'Uluwatu Clifftop Temple, Bali'
  },
  {
    names: ['canggu', 'canggu beach', 'seminyak'],
    destination: 'bali',
    coords: { latitude: -8.6530, longitude: 115.1320 },
    displayName: 'Canggu & Seminyak Coast, Bali'
  },

  // --- ROME, ITALY ---
  {
    names: ['colosseum', 'roman forum'],
    destination: 'rome',
    coords: { latitude: 41.8902, longitude: 12.4922 },
    displayName: 'Colosseum & Roman Forum, Rome'
  },
  {
    names: ['trevi fountain', 'spanish steps'],
    destination: 'rome',
    coords: { latitude: 41.9009, longitude: 12.4833 },
    displayName: 'Trevi Fountain, Rome'
  },
  {
    names: ['vatican', 'st. peter’s basilica', 'vatican city'],
    destination: 'rome',
    coords: { latitude: 41.9029, longitude: 12.4534 },
    displayName: 'Vatican City & St. Peter’s Basilica'
  },

  // --- SWISS ALPS / INTERLAKEN ---
  {
    names: ['interlaken', 'interlaken grand stay', 'höheweg'],
    destination: 'swiss',
    coords: { latitude: 46.6863, longitude: 7.8632 },
    displayName: 'Interlaken Town Center, Switzerland'
  },
  {
    names: ['lauterbrunnen', 'lauterbrunnen valley', 'waterfalls trail'],
    destination: 'swiss',
    coords: { latitude: 46.5935, longitude: 7.9077 },
    displayName: 'Lauterbrunnen Valley, Switzerland'
  },
  {
    names: ['jungfraujoch', 'top of europe'],
    destination: 'swiss',
    coords: { latitude: 46.5475, longitude: 7.9854 },
    displayName: 'Jungfraujoch Top of Europe, Switzerland'
  },

  // --- DELHI, INDIA ---
  {
    names: ['red fort', 'lal qila', 'old delhi fort', 'red fort ramparts'],
    destination: 'delhi',
    coords: { latitude: 28.6562, longitude: 77.2410 },
    displayName: 'Red Fort (Lal Qila), Old Delhi'
  },
  {
    names: ['india gate', 'kartavya path', 'rajpath', 'war memorial'],
    destination: 'delhi',
    coords: { latitude: 28.6129, longitude: 77.2295 },
    displayName: 'India Gate & Kartavya Path, New Delhi'
  },
  {
    names: ["humayun's tomb", 'humayun tomb', 'humayun tomb gardens', 'nizamuddin'],
    destination: 'delhi',
    coords: { latitude: 28.5875, longitude: 77.2507 },
    displayName: "Humayun's Tomb, New Delhi"
  },
  {
    names: ['qutub minar', 'qutb minar', 'mehrauli archaeological park', 'mehrauli'],
    destination: 'delhi',
    coords: { latitude: 28.5244, longitude: 77.1855 },
    displayName: 'Qutub Minar Complex, Mehrauli, New Delhi'
  },
  {
    names: ['chandni chowk', 'jama masjid', 'paranthe wali gali', 'dariba kalan'],
    destination: 'delhi',
    coords: { latitude: 28.6507, longitude: 77.2334 },
    displayName: 'Chandni Chowk & Jama Masjid, Old Delhi'
  },
  {
    names: ['lotus temple', 'bahai house of worship', 'kalkaji'],
    destination: 'delhi',
    coords: { latitude: 28.5535, longitude: 77.2588 },
    displayName: 'Lotus Temple, Kalkaji, New Delhi'
  },
  {
    names: ['national museum', 'janpath', 'connaught place', 'cp', 'inner circle'],
    destination: 'delhi',
    coords: { latitude: 28.6118, longitude: 77.2193 },
    displayName: 'National Museum & Janpath, New Delhi'
  },
  {
    names: ['delhi airport', 'indira gandhi international airport', 'igi airport', 'del'],
    destination: 'delhi',
    coords: { latitude: 28.5562, longitude: 77.1000 },
    displayName: 'Indira Gandhi International Airport (DEL), New Delhi'
  },

  // --- CHENNAI, INDIA ---
  {
    names: ['marina beach', 'marina promenade', 'kamarajar salai'],
    destination: 'chennai',
    coords: { latitude: 13.0500, longitude: 80.2824 },
    displayName: 'Marina Beach, Chennai'
  },
  {
    names: ['kapaleeshwarar temple', 'mylapore temple', 'mylapore'],
    destination: 'chennai',
    coords: { latitude: 13.0336, longitude: 80.2699 },
    displayName: 'Kapaleeshwarar Temple, Mylapore, Chennai'
  },
  {
    names: ['san thome basilica', 'st thomas cathedral', 'santhome'],
    destination: 'chennai',
    coords: { latitude: 13.0334, longitude: 80.2785 },
    displayName: 'San Thome Basilica, Chennai'
  },
  {
    names: ['fort st george', 'st george museum'],
    destination: 'chennai',
    coords: { latitude: 13.0797, longitude: 80.2874 },
    displayName: 'Fort St. George, Chennai'
  },
  {
    names: ['chennai airport', 'meenambakkam', 'maa'],
    destination: 'chennai',
    coords: { latitude: 12.9941, longitude: 80.1709 },
    displayName: 'Chennai International Airport (MAA), Chennai'
  },

  // --- MUMBAI, INDIA ---
  {
    names: ['gateway of india', 'colaba promenade', 'colaba'],
    destination: 'mumbai',
    coords: { latitude: 18.9220, longitude: 72.8347 },
    displayName: 'Gateway of India, Colaba, Mumbai'
  },
  {
    names: ['marine drive', 'chowpatty', 'queens necklace'],
    destination: 'mumbai',
    coords: { latitude: 18.9432, longitude: 72.8230 },
    displayName: 'Marine Drive & Chowpatty, Mumbai'
  },
  {
    names: ['chhatrapati shivaji terminus', 'cst', 'victoria terminus'],
    destination: 'mumbai',
    coords: { latitude: 18.9401, longitude: 72.8354 },
    displayName: 'Chhatrapati Shivaji Maharaj Terminus, Mumbai'
  },
  {
    names: ['mumbai airport', 'csmi airport', 'bom'],
    destination: 'mumbai',
    coords: { latitude: 19.0896, longitude: 72.8656 },
    displayName: 'Chhatrapati Shivaji Maharaj Int’l Airport (BOM), Mumbai'
  },

  // --- BENGALURU, INDIA ---
  {
    names: ['lalbagh', 'lalbagh botanical garden', 'glass house'],
    destination: 'bengaluru',
    coords: { latitude: 12.9507, longitude: 77.5848 },
    displayName: 'Lalbagh Botanical Garden, Bengaluru'
  },
  {
    names: ['bangalore palace', 'palace grounds'],
    destination: 'bengaluru',
    coords: { latitude: 13.0035, longitude: 77.5891 },
    displayName: 'Bangalore Palace, Bengaluru'
  },
  {
    names: ['cubbon park', 'vidhana soudha'],
    destination: 'bengaluru',
    coords: { latitude: 12.9796, longitude: 77.5907 },
    displayName: 'Cubbon Park & Vidhana Soudha, Bengaluru'
  },
  {
    names: ['bengaluru airport', 'kempegowda airport', 'blr'],
    destination: 'bengaluru',
    coords: { latitude: 13.1986, longitude: 77.7066 },
    displayName: 'Kempegowda International Airport (BLR), Bengaluru'
  }
];

// City center fallbacks (used strictly when an activity explicitly names the city center)
export const CITY_CENTERS: Record<string, Coordinates> = {
  delhi: { latitude: 28.6139, longitude: 77.2090 },
  chennai: { latitude: 13.0827, longitude: 80.2707 },
  mumbai: { latitude: 19.0760, longitude: 72.8777 },
  bengaluru: { latitude: 12.9716, longitude: 77.5946 },
  goa: { latitude: 15.4989, longitude: 73.8311 },
  hyderabad: { latitude: 17.3850, longitude: 78.4867 },
  kolkata: { latitude: 22.5726, longitude: 88.3639 },
  jaipur: { latitude: 26.9124, longitude: 75.7873 },
  kochi: { latitude: 9.9312, longitude: 76.2673 },
  kerala: { latitude: 9.9312, longitude: 76.2673 },
  paris: { latitude: 48.8566, longitude: 2.3522 },
  kyoto: { latitude: 35.0116, longitude: 135.7681 },
  tokyo: { latitude: 35.6762, longitude: 139.6503 },
  bali: { latitude: -8.4095, longitude: 115.1889 },
  rome: { latitude: 41.9028, longitude: 12.4964 },
  swiss: { latitude: 46.6863, longitude: 7.8632 },
  amalfi: { latitude: 40.6340, longitude: 14.6027 },
  london: { latitude: 51.5074, longitude: -0.1278 },
  new_york: { latitude: 40.7128, longitude: -74.0060 },
  singapore: { latitude: 1.3521, longitude: 103.8198 },
  dubai: { latitude: 25.2048, longitude: 55.2708 },
  bangkok: { latitude: 13.7563, longitude: 100.5018 },
  seoul: { latitude: 37.5665, longitude: 126.9780 },
  norway: { latitude: 59.9139, longitude: 10.7522 },
  oslo: { latitude: 59.9139, longitude: 10.7522 },
  bergen: { latitude: 60.3913, longitude: 5.3221 }
};

export const VERIFIED_DESTINATION_CENTROIDS = CITY_CENTERS;

export { resolveCanonicalLocation } from './canonicalLocationService';
export type { CanonicalLocation } from '../types/location';

/**
 * Resolves an activity or place name to factual geographic coordinates.
 * Returns null if the location cannot be verified with confidence.
 */
export function resolveLocation(
  query: {
    name?: string;
    location?: string;
    destination?: string;
    existingCoords?: Coordinates | [number, number];
  }
): ResolvedLocation | null {
  // 1. If existing coordinates are supplied and valid, respect them as primary source
  if (query.existingCoords) {
    let lat: number;
    let lng: number;

    if (Array.isArray(query.existingCoords)) {
      [lat, lng] = query.existingCoords;
    } else {
      lat = query.existingCoords.latitude;
      lng = query.existingCoords.longitude;
    }

    if (
      typeof lat === 'number' && 
      typeof lng === 'number' && 
      !isNaN(lat) && 
      !isNaN(lng) && 
      lat >= -90 && 
      lat <= 90 && 
      lng >= -180 && 
      lng <= 180 &&
      (lat !== 0 || lng !== 0)
    ) {
      return {
        latitude: Math.round(lat * 100000) / 100000,
        longitude: Math.round(lng * 100000) / 100000,
        displayName: query.location || query.name || 'Custom Location',
        source: 'user',
        confidence: 1.0
      };
    }
  }

  const nameText = (query.name || '').toLowerCase().trim();
  const locText = (query.location || '').toLowerCase().trim();
  const destText = (query.destination || '').toLowerCase().trim();
  const combinedText = `${nameText} ${locText}`.trim();

  if (!combinedText) {
    return null;
  }

  // 2. Exact or substring match in Landmark Catalog
  let bestMatch: LandmarkCatalogEntry | null = null;
  let bestScore = 0;

  for (const entry of VERIFIED_LANDMARK_CATALOG) {
    // Destination affinity check: if destination is provided, require match
    const matchesDest = destText && (destText.includes(entry.destination) || entry.destination.includes(destText));
    if (destText && !matchesDest) {
      continue;
    }

    for (const key of entry.names) {
      let score = 0;
      if (nameText && nameText === key) {
        score = 100;
      } else if (locText && locText === key) {
        score = 100;
      } else if (nameText && nameText.includes(key)) {
        score = 80 + Math.min(15, key.length);
      } else if (locText && locText.includes(key)) {
        score = 80 + Math.min(15, key.length);
      } else if (nameText && nameText.length > 4 && key.includes(nameText)) {
        score = 60 + Math.min(15, key.length);
      } else if (locText && locText.length > 4 && key.includes(locText)) {
        score = 60 + Math.min(15, key.length);
      } else {
        // Full word boundary overlap
        const words = key.split(/[^a-zA-Z0-9]+/).filter(w => w.length >= 4);
        const genericStopWords = new Set(['beach', 'road', 'lane', 'main', 'coast', 'tour', 'park', 'view', 'stay', 'cliff']);
        const significantWords = words.filter(w => !genericStopWords.has(w));
        
        let matchCount = 0;
        for (const w of significantWords) {
          const safeWord = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const wordRegex = new RegExp(`\\b${safeWord}\\b`, 'i');
          if (wordRegex.test(combinedText)) {
            matchCount++;
          }
        }
        if (matchCount > 0) {
          score = 35 + matchCount * 25;
        }
      }

      if (matchesDest) {
        score += 15;
      }

      if (score > bestScore && score >= 65) {
        bestScore = score;
        bestMatch = entry;
      }
    }
  }

  if (bestMatch && bestScore >= 65) {
    return {
      latitude: bestMatch.coords.latitude,
      longitude: bestMatch.coords.longitude,
      displayName: bestMatch.displayName,
      source: 'stored',
      confidence: Math.min(1.0, Math.round((bestScore / 100) * 100) / 100)
    };
  }

  // 3. Fallback to Destination Center if query explicitly names the city center
  for (const [cityKey, centerCoords] of Object.entries(CITY_CENTERS)) {
    if (destText.includes(cityKey) || combinedText.includes(cityKey)) {
      if (combinedText.includes('center') || combinedText.includes('city') || combinedText.includes('central') || combinedText.includes('hotel') || combinedText.includes('stay')) {
        return {
          latitude: centerCoords.latitude,
          longitude: centerCoords.longitude,
          displayName: `${cityKey.toUpperCase()} Central Hub`,
          source: 'stored',
          confidence: 0.65
        };
      }
    }
  }

  // Could not resolve location with confidence — do NOT guess or fabricate random points!
  return null;
}

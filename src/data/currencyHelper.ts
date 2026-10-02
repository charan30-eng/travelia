// International Country Currency Data & Dual-Currency Conversion Engine

export interface CountryCurrencyInfo {
  countryCode: string;
  countryName: string;
  flag: string;
  currencyCode: string;
  currencySymbol: string;
  currencyName: string;
  /** Exchange rate: How many units of foreign currency for 1 Indian Rupee (INR) */
  ratePerINR: number;
  popularCities: string[];
}

export const SUPPORTED_DESTINATION_COUNTRIES: CountryCurrencyInfo[] = [
  {
    countryCode: 'KR',
    countryName: 'South Korea',
    flag: '🇰🇷',
    currencyCode: 'KRW',
    currencySymbol: '₩',
    currencyName: 'South Korean Won',
    ratePerINR: 16.0,
    popularCities: ['Seoul', 'Busan', 'Jeju Island', 'Incheon', 'Gyeongju']
  },
  {
    countryCode: 'JP',
    countryName: 'Japan',
    flag: '🇯🇵',
    currencyCode: 'JPY',
    currencySymbol: '¥',
    currencyName: 'Japanese Yen',
    ratePerINR: 1.80,
    popularCities: ['Tokyo', 'Kyoto', 'Osaka', 'Sapporo', 'Hiroshima', 'Fukuoka']
  },
  {
    countryCode: 'FR',
    countryName: 'France (Eurozone)',
    flag: '🇫🇷',
    currencyCode: 'EUR',
    currencySymbol: '€',
    currencyName: 'Euro',
    ratePerINR: 0.011,
    popularCities: ['Paris', 'Nice', 'Lyon', 'Marseille', 'Bordeaux']
  },
  {
    countryCode: 'US',
    countryName: 'United States',
    flag: '🇺🇸',
    currencyCode: 'USD',
    currencySymbol: '$',
    currencyName: 'US Dollar',
    ratePerINR: 0.012,
    popularCities: ['New York', 'Los Angeles', 'San Francisco', 'Miami', 'Las Vegas', 'Hawaii']
  },
  {
    countryCode: 'AE',
    countryName: 'United Arab Emirates',
    flag: '🇦🇪',
    currencyCode: 'AED',
    currencySymbol: 'د.إ',
    currencyName: 'UAE Dirham',
    ratePerINR: 0.044,
    popularCities: ['Dubai', 'Abu Dhabi', 'Sharjah']
  },
  {
    countryCode: 'TH',
    countryName: 'Thailand',
    flag: '🇹🇭',
    currencyCode: 'THB',
    currencySymbol: '฿',
    currencyName: 'Thai Baht',
    ratePerINR: 0.43,
    popularCities: ['Bangkok', 'Phuket', 'Pattaya', 'Chiang Mai', 'Krabi']
  },
  {
    countryCode: 'ID',
    countryName: 'Indonesia (Bali)',
    flag: '🇮🇩',
    currencyCode: 'IDR',
    currencySymbol: 'Rp',
    currencyName: 'Indonesian Rupiah',
    ratePerINR: 190.0,
    popularCities: ['Bali', 'Ubud', 'Jakarta', 'Seminyak', 'Lombok']
  },
  {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    flag: '🇬🇧',
    currencyCode: 'GBP',
    currencySymbol: '£',
    currencyName: 'British Pound',
    ratePerINR: 0.0094,
    popularCities: ['London', 'Edinburgh', 'Manchester', 'Oxford']
  },
  {
    countryCode: 'SG',
    countryName: 'Singapore',
    flag: '🇸🇬',
    currencyCode: 'SGD',
    currencySymbol: 'S$',
    currencyName: 'Singapore Dollar',
    ratePerINR: 0.016,
    popularCities: ['Singapore', 'Sentosa', 'Marina Bay']
  },
  {
    countryCode: 'CH',
    countryName: 'Switzerland',
    flag: '🇨🇭',
    currencyCode: 'CHF',
    currencySymbol: 'Fr.',
    currencyName: 'Swiss Franc',
    ratePerINR: 0.0105,
    popularCities: ['Zurich', 'Interlaken', 'Lucerne', 'Geneva', 'Zermatt']
  },
  {
    countryCode: 'AU',
    countryName: 'Australia',
    flag: '🇦🇺',
    currencyCode: 'AUD',
    currencySymbol: 'A$',
    currencyName: 'Australian Dollar',
    ratePerINR: 0.018,
    popularCities: ['Sydney', 'Melbourne', 'Gold Coast', 'Brisbane', 'Perth']
  },
  {
    countryCode: 'CA',
    countryName: 'Canada',
    flag: '🇨🇦',
    currencyCode: 'CAD',
    currencySymbol: 'C$',
    currencyName: 'Canadian Dollar',
    ratePerINR: 0.0163,
    popularCities: ['Toronto', 'Vancouver', 'Montreal', 'Banff']
  },
  {
    countryCode: 'VN',
    countryName: 'Vietnam',
    flag: '🇻🇳',
    currencyCode: 'VND',
    currencySymbol: '₫',
    currencyName: 'Vietnamese Dong',
    ratePerINR: 300.0,
    popularCities: ['Hanoi', 'Da Nang', 'Ho Chi Minh City', 'Hoi An']
  },
  {
    countryCode: 'MY',
    countryName: 'Malaysia',
    flag: '🇲🇾',
    currencyCode: 'MYR',
    currencySymbol: 'RM',
    currencyName: 'Malaysian Ringgit',
    ratePerINR: 0.055,
    popularCities: ['Kuala Lumpur', 'Penang', 'Langkawi', 'Malacca']
  },
  {
    countryCode: 'TR',
    countryName: 'Turkey',
    flag: '🇹🇷',
    currencyCode: 'TRY',
    currencySymbol: '₺',
    currencyName: 'Turkish Lira',
    ratePerINR: 0.41,
    popularCities: ['Istanbul', 'Cappadocia', 'Antalya', 'Bodrum']
  },
  {
    countryCode: 'MV',
    countryName: 'Maldives',
    flag: '🇲🇻',
    currencyCode: 'MVR',
    currencySymbol: 'Rf',
    currencyName: 'Maldivian Rufiyaa',
    ratePerINR: 0.185,
    popularCities: ['Male', 'Maafushi', 'Baa Atoll']
  },
  {
    countryCode: 'IT',
    countryName: 'Italy',
    flag: '🇮🇹',
    currencyCode: 'EUR',
    currencySymbol: '€',
    currencyName: 'Euro',
    ratePerINR: 0.011,
    popularCities: ['Rome', 'Venice', 'Florence', 'Milan', 'Amalfi Coast']
  },
  {
    countryCode: 'ES',
    countryName: 'Spain',
    flag: '🇪🇸',
    currencyCode: 'EUR',
    currencySymbol: '€',
    currencyName: 'Euro',
    ratePerINR: 0.011,
    popularCities: ['Barcelona', 'Madrid', 'Seville', 'Ibiza', 'Valencia']
  },
  {
    countryCode: 'IN',
    countryName: 'India',
    flag: '🇮🇳',
    currencyCode: 'INR',
    currencySymbol: '₹',
    currencyName: 'Indian Rupee',
    ratePerINR: 1.0,
    popularCities: ['Goa', 'Kerala', 'Rajasthan', 'Jaipur', 'Kashmir', 'Ladakh', 'Mumbai', 'Delhi', 'Bengaluru', 'Varanasi', 'Andaman']
  },
  {
    countryCode: 'DE',
    countryName: 'Germany',
    flag: '🇩🇪',
    currencyCode: 'EUR',
    currencySymbol: '€',
    currencyName: 'Euro',
    ratePerINR: 0.011,
    popularCities: ['Frankfurt', 'Munich', 'Berlin', 'Hamburg', 'Cologne']
  },
  {
    countryCode: 'NL',
    countryName: 'Netherlands',
    flag: '🇳🇱',
    currencyCode: 'EUR',
    currencySymbol: '€',
    currencyName: 'Euro',
    ratePerINR: 0.011,
    popularCities: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht']
  },
  {
    countryCode: 'GR',
    countryName: 'Greece',
    flag: '🇬🇷',
    currencyCode: 'EUR',
    currencySymbol: '€',
    currencyName: 'Euro',
    ratePerINR: 0.011,
    popularCities: ['Athens', 'Santorini', 'Mykonos', 'Crete', 'Rhodes']
  },
  {
    countryCode: 'AT',
    countryName: 'Austria',
    flag: '🇦🇹',
    currencyCode: 'EUR',
    currencySymbol: '€',
    currencyName: 'Euro',
    ratePerINR: 0.011,
    popularCities: ['Vienna', 'Salzburg', 'Innsbruck', 'Hallstatt']
  },
  {
    countryCode: 'PT',
    countryName: 'Portugal',
    flag: '🇵🇹',
    currencyCode: 'EUR',
    currencySymbol: '€',
    currencyName: 'Euro',
    ratePerINR: 0.011,
    popularCities: ['Lisbon', 'Porto', 'Algarve', 'Faro', 'Madeira']
  },
  {
    countryCode: 'EG',
    countryName: 'Egypt',
    flag: '🇪🇬',
    currencyCode: 'EGP',
    currencySymbol: 'E£',
    currencyName: 'Egyptian Pound',
    ratePerINR: 0.58,
    popularCities: ['Cairo', 'Giza', 'Luxor', 'Aswan', 'Sharm El Sheikh', 'Hurghada']
  },
  {
    countryCode: 'LK',
    countryName: 'Sri Lanka',
    flag: '🇱🇰',
    currencyCode: 'LKR',
    currencySymbol: 'Rs',
    currencyName: 'Sri Lankan Rupee',
    ratePerINR: 3.55,
    popularCities: ['Colombo', 'Kandy', 'Galle', 'Bentota', 'Ella', 'Sigiriya']
  },
  {
    countryCode: 'NZ',
    countryName: 'New Zealand',
    flag: '🇳🇿',
    currencyCode: 'NZD',
    currencySymbol: 'NZ$',
    currencyName: 'New Zealand Dollar',
    ratePerINR: 0.0195,
    popularCities: ['Auckland', 'Queenstown', 'Christchurch', 'Wellington', 'Rotorua']
  },
  {
    countryCode: 'ZA',
    countryName: 'South Africa',
    flag: '🇿🇦',
    currencyCode: 'ZAR',
    currencySymbol: 'R',
    currencyName: 'South African Rand',
    ratePerINR: 0.22,
    popularCities: ['Cape Town', 'Johannesburg', 'Durban', 'Kruger Park']
  },
  {
    countryCode: 'BR',
    countryName: 'Brazil',
    flag: '🇧🇷',
    currencyCode: 'BRL',
    currencySymbol: 'R$',
    currencyName: 'Brazilian Real',
    ratePerINR: 0.065,
    popularCities: ['Rio de Janeiro', 'Sao Paulo', 'Salvador', 'Brasilia']
  },
  {
    countryCode: 'MX',
    countryName: 'Mexico',
    flag: '🇲🇽',
    currencyCode: 'MXN',
    currencySymbol: 'Mex$',
    currencyName: 'Mexican Peso',
    ratePerINR: 0.24,
    popularCities: ['Cancun', 'Mexico City', 'Tulum', 'Playa del Carmen', 'Oaxaca']
  },
  {
    countryCode: 'QA',
    countryName: 'Qatar',
    flag: '🇶🇦',
    currencyCode: 'QAR',
    currencySymbol: 'QR',
    currencyName: 'Qatari Riyal',
    ratePerINR: 0.044,
    popularCities: ['Doha', 'Al Wakrah', 'Lusail']
  },
  {
    countryCode: 'SA',
    countryName: 'Saudi Arabia',
    flag: '🇸🇦',
    currencyCode: 'SAR',
    currencySymbol: 'SR',
    currencyName: 'Saudi Riyal',
    ratePerINR: 0.045,
    popularCities: ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'AlUla']
  },
  {
    countryCode: 'MU',
    countryName: 'Mauritius',
    flag: '🇲🇺',
    currencyCode: 'MUR',
    currencySymbol: 'Rs',
    currencyName: 'Mauritian Rupee',
    ratePerINR: 0.55,
    popularCities: ['Port Louis', 'Grand Baie', 'Flic en Flac']
  },
  {
    countryCode: 'NP',
    countryName: 'Nepal',
    flag: '🇳🇵',
    currencyCode: 'NPR',
    currencySymbol: 'Rs',
    currencyName: 'Nepalese Rupee',
    ratePerINR: 1.60,
    popularCities: ['Kathmandu', 'Pokhara', 'Lumbini', 'Chitwan']
  },
  {
    countryCode: 'HK',
    countryName: 'Hong Kong',
    flag: '🇭🇰',
    currencyCode: 'HKD',
    currencySymbol: 'HK$',
    currencyName: 'Hong Kong Dollar',
    ratePerINR: 0.093,
    popularCities: ['Hong Kong', 'Kowloon', 'Lantau']
  },
  {
    countryCode: 'PH',
    countryName: 'Philippines',
    flag: '🇵🇭',
    currencyCode: 'PHP',
    currencySymbol: '₱',
    currencyName: 'Philippine Peso',
    ratePerINR: 0.68,
    popularCities: ['Manila', 'Boracay', 'Cebu', 'Palawan']
  },
  {
    countryCode: 'IE',
    countryName: 'Ireland',
    flag: '🇮🇪',
    currencyCode: 'EUR',
    currencySymbol: '€',
    currencyName: 'Euro',
    ratePerINR: 0.011,
    popularCities: ['Dublin', 'Galway', 'Cork']
  },
  {
    countryCode: 'NO',
    countryName: 'Norway',
    flag: '🇳🇴',
    currencyCode: 'NOK',
    currencySymbol: 'kr',
    currencyName: 'Norwegian Krone',
    ratePerINR: 0.13,
    popularCities: ['Oslo', 'Bergen', 'Tromso', 'Fjords']
  },
  {
    countryCode: 'SE',
    countryName: 'Sweden',
    flag: '🇸🇪',
    currencyCode: 'SEK',
    currencySymbol: 'kr',
    currencyName: 'Swedish Krona',
    ratePerINR: 0.125,
    popularCities: ['Stockholm', 'Gothenburg']
  },
  {
    countryCode: 'DK',
    countryName: 'Denmark',
    flag: '🇩🇰',
    currencyCode: 'DKK',
    currencySymbol: 'kr.',
    currencyName: 'Danish Krone',
    ratePerINR: 0.082,
    popularCities: ['Copenhagen', 'Aarhus']
  },
  {
    countryCode: 'IS',
    countryName: 'Iceland',
    flag: '🇮🇸',
    currencyCode: 'ISK',
    currencySymbol: 'kr',
    currencyName: 'Icelandic Krona',
    ratePerINR: 1.65,
    popularCities: ['Reykjavik', 'Akureyri', 'Vik']
  },
  {
    countryCode: 'CZ',
    countryName: 'Czech Republic',
    flag: '🇨🇿',
    currencyCode: 'CZK',
    currencySymbol: 'Kč',
    currencyName: 'Czech Koruna',
    ratePerINR: 0.28,
    popularCities: ['Prague', 'Brno', 'Cesky Krumlov']
  },
  {
    countryCode: 'HU',
    countryName: 'Hungary',
    flag: '🇭🇺',
    currencyCode: 'HUF',
    currencySymbol: 'Ft',
    currencyName: 'Hungarian Forint',
    ratePerINR: 4.40,
    popularCities: ['Budapest', 'Debrecen']
  },
  {
    countryCode: 'KE',
    countryName: 'Kenya',
    flag: '🇰🇪',
    currencyCode: 'KES',
    currencySymbol: 'KSh',
    currencyName: 'Kenyan Shilling',
    ratePerINR: 1.55,
    popularCities: ['Nairobi', 'Mombasa', 'Maasai Mara']
  },
  {
    countryCode: 'PE',
    countryName: 'Peru',
    flag: '🇵🇪',
    currencyCode: 'PEN',
    currencySymbol: 'S/',
    currencyName: 'Peruvian Sol',
    ratePerINR: 0.045,
    popularCities: ['Lima', 'Cusco', 'Machu Picchu']
  },
  {
    countryCode: 'FJ',
    countryName: 'Fiji',
    flag: '🇫🇯',
    currencyCode: 'FJD',
    currencySymbol: 'FJ$',
    currencyName: 'Fijian Dollar',
    ratePerINR: 0.027,
    popularCities: ['Nadi', 'Suva']
  },
  {
    countryCode: 'SC',
    countryName: 'Seychelles',
    flag: '🇸🇨',
    currencyCode: 'SCR',
    currencySymbol: 'SR',
    currencyName: 'Seychellois Rupee',
    ratePerINR: 0.17,
    popularCities: ['Victoria', 'Mahe', 'Praslin']
  }
];

/**
 * Intelligent country detector from a destination string
 * E.g., 'Korea 5 Days', 'Seoul, South Korea', 'Tokyo, Japan', 'Paris', 'Bali', 'Goa', 'USA'
 */
export function detectCountryFromDestination(destination: string = '', fallbackCountry?: string): CountryCurrencyInfo {
  const query = `${destination} ${fallbackCountry || ''}`.toLowerCase();

  // 1. India Domestic Check
  if (
    query.includes('india') ||
    query.includes('goa') ||
    query.includes('kerala') ||
    query.includes('rajasthan') ||
    query.includes('jaipur') ||
    query.includes('udaipur') ||
    query.includes('jaisalmer') ||
    query.includes('kashmir') ||
    query.includes('srinagar') ||
    query.includes('ladakh') ||
    query.includes('leh') ||
    query.includes('manali') ||
    query.includes('himachal') ||
    query.includes('shimla') ||
    query.includes('mumbai') ||
    query.includes('delhi') ||
    query.includes('bengaluru') ||
    query.includes('bangalore') ||
    query.includes('varanasi') ||
    query.includes('andaman') ||
    query.includes('port blair') ||
    query.includes('ooty') ||
    query.includes('munnar')
  ) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'IN')!;
  }

  // 2. Specific Country Matches
  if (query.includes('korea') || query.includes('seoul') || query.includes('busan') || query.includes('jeju') || query.includes('incheon')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'KR')!;
  }
  if (query.includes('japan') || query.includes('tokyo') || query.includes('kyoto') || query.includes('osaka') || query.includes('sapporo') || query.includes('fukuoka') || query.includes('hiroshima')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'JP')!;
  }
  if (query.includes('france') || query.includes('paris') || query.includes('nice') || query.includes('lyon') || query.includes('marseille') || query.includes('bordeaux')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'FR')!;
  }
  if (query.includes('italy') || query.includes('rome') || query.includes('venice') || query.includes('florence') || query.includes('milan') || query.includes('amalfi') || query.includes('naples')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'IT')!;
  }
  if (query.includes('spain') || query.includes('barcelona') || query.includes('madrid') || query.includes('seville') || query.includes('ibiza') || query.includes('valencia')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'ES')!;
  }
  if (query.includes('usa') || query.includes('united states') || query.includes('america') || query.includes('york') || query.includes('vegas') || query.includes('california') || query.includes('hawaii') || query.includes('angeles') || query.includes('francisco') || query.includes('miami') || query.includes('chicago')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'US')!;
  }
  if (query.includes('uk') || query.includes('united kingdom') || query.includes('london') || query.includes('scotland') || query.includes('england') || query.includes('edinburgh') || query.includes('manchester')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'GB')!;
  }
  if (query.includes('dubai') || query.includes('uae') || query.includes('emirates') || query.includes('abu dhabi') || query.includes('sharjah')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'AE')!;
  }
  if (query.includes('thai') || query.includes('bangkok') || query.includes('phuket') || query.includes('pattaya') || query.includes('krabi') || query.includes('samui') || query.includes('chiang mai')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'TH')!;
  }
  if (query.includes('bali') || query.includes('indonesia') || query.includes('ubud') || query.includes('jakarta') || query.includes('lombok') || query.includes('denpasar')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'ID')!;
  }
  if (query.includes('singapore') || query.includes('sentosa') || query.includes('changi')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'SG')!;
  }
  if (query.includes('swiss') || query.includes('switzerland') || query.includes('alps') || query.includes('interlaken') || query.includes('zurich') || query.includes('geneva') || query.includes('lucerne') || query.includes('zermatt')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'CH')!;
  }
  if (query.includes('australia') || query.includes('sydney') || query.includes('melbourne') || query.includes('brisbane') || query.includes('perth') || query.includes('gold coast')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'AU')!;
  }
  if (query.includes('canada') || query.includes('toronto') || query.includes('vancouver') || query.includes('banff') || query.includes('montreal') || query.includes('calgary')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'CA')!;
  }
  if (query.includes('germany') || query.includes('frankfurt') || query.includes('munich') || query.includes('berlin') || query.includes('hamburg')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'DE')!;
  }
  if (query.includes('netherlands') || query.includes('amsterdam') || query.includes('holland')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'NL')!;
  }
  if (query.includes('greece') || query.includes('athens') || query.includes('santorini') || query.includes('mykonos') || query.includes('crete')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'GR')!;
  }
  if (query.includes('austria') || query.includes('vienna') || query.includes('salzburg')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'AT')!;
  }
  if (query.includes('portugal') || query.includes('lisbon') || query.includes('porto') || query.includes('algarve')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'PT')!;
  }
  if (query.includes('vietnam') || query.includes('hanoi') || query.includes('da nang') || query.includes('ho chi minh') || query.includes('saigon')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'VN')!;
  }
  if (query.includes('malaysia') || query.includes('kuala lumpur') || query.includes('penang') || query.includes('langkawi')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'MY')!;
  }
  if (query.includes('turkey') || query.includes('istanbul') || query.includes('cappadocia') || query.includes('antalya')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'TR')!;
  }
  if (query.includes('maldives') || query.includes('male') || query.includes('atoll')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'MV')!;
  }
  if (query.includes('egypt') || query.includes('cairo') || query.includes('luxor') || query.includes('giza') || query.includes('sharm')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'EG')!;
  }
  if (query.includes('sri lanka') || query.includes('colombo') || query.includes('kandy') || query.includes('galle')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'LK')!;
  }
  if (query.includes('new zealand') || query.includes('auckland') || query.includes('queenstown')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'NZ')!;
  }
  if (query.includes('south africa') || query.includes('cape town') || query.includes('johannesburg')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'ZA')!;
  }
  if (query.includes('brazil') || query.includes('rio') || query.includes('sao paulo')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'BR')!;
  }
  if (query.includes('mexico') || query.includes('cancun') || query.includes('tulum')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'MX')!;
  }
  if (query.includes('qatar') || query.includes('doha')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'QA')!;
  }
  if (query.includes('saudi') || query.includes('riyadh') || query.includes('jeddah')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'SA')!;
  }
  if (query.includes('mauritius')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'MU')!;
  }
  if (query.includes('nepal') || query.includes('kathmandu')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'NP')!;
  }
  if (query.includes('hong kong')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'HK')!;
  }
  if (query.includes('philippines') || query.includes('manila') || query.includes('boracay')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'PH')!;
  }
  if (query.includes('ireland') || query.includes('dublin')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'IE')!;
  }
  if (query.includes('norway') || query.includes('oslo') || query.includes('bergen')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'NO')!;
  }
  if (query.includes('sweden') || query.includes('stockholm')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'SE')!;
  }
  if (query.includes('denmark') || query.includes('copenhagen')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'DK')!;
  }
  if (query.includes('iceland') || query.includes('reykjavik')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'IS')!;
  }
  if (query.includes('prague') || query.includes('czech')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'CZ')!;
  }
  if (query.includes('budapest') || query.includes('hungary')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'HU')!;
  }
  if (query.includes('kenya') || query.includes('nairobi')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'KE')!;
  }
  if (query.includes('peru') || query.includes('lima') || query.includes('cusco')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'PE')!;
  }
  if (query.includes('fiji')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'FJ')!;
  }
  if (query.includes('seychelles')) {
    return SUPPORTED_DESTINATION_COUNTRIES.find(c => c.countryCode === 'SC')!;
  }

  // 3. Fallback: Dynamically generate clean CountryCurrencyInfo for any custom entered country/destination
  const cleanDest = destination.trim() || 'Global';
  const parts = cleanDest.split(/[,–-]/);
  const detectedName = parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
  const countryCode = detectedName.slice(0, 2).toUpperCase() || 'GL';

  return {
    countryCode,
    countryName: detectedName,
    flag: '🌍',
    currencyCode: 'USD',
    currencySymbol: '$',
    currencyName: 'US Dollar',
    ratePerINR: 0.012,
    popularCities: [cleanDest]
  };
}

/**
 * Format Indian Rupee (INR) amount with standard Indian numbering format (e.g. ₹50,800)
 */
export function formatINR(amount: number): string {
  const rounded = Math.round(amount);
  return `₹${rounded.toLocaleString('en-IN')}`;
}

/**
 * Format foreign currency with appropriate decimal places and symbols
 */
export function formatForeign(amountInINR: number, country: CountryCurrencyInfo): string {
  const rawConverted = amountInINR * country.ratePerINR;
  
  // High unit currencies (KRW, JPY, IDR, VND) don't use decimals
  if (country.ratePerINR >= 1) {
    const rounded = Math.round(rawConverted);
    return `${country.currencySymbol}${rounded.toLocaleString('en-US')} ${country.currencyCode}`;
  }

  // Currencies with cents/pence (USD, EUR, GBP, AED, SGD, CHF, AUD, CAD)
  // If amount is small, show 2 decimal places; if large (>1000), round cleanly
  if (rawConverted < 100) {
    return `${country.currencySymbol}${rawConverted.toFixed(2)} ${country.currencyCode}`;
  }
  const rounded = Math.round(rawConverted);
  return `${country.currencySymbol}${rounded.toLocaleString('en-US')} ${country.currencyCode}`;
}

/**
 * Format foreign currency in compact notation (e.g. ₩812.8K)
 */
export function formatForeignCompact(amountInINR: number, country: CountryCurrencyInfo): string {
  const rawConverted = amountInINR * country.ratePerINR;
  if (rawConverted >= 1_000_000) {
    return `${country.currencySymbol}${(rawConverted / 1_000_000).toFixed(1)}M ${country.currencyCode}`;
  }
  if (rawConverted >= 10_000) {
    return `${country.currencySymbol}${(rawConverted / 1_000).toFixed(0)}K ${country.currencyCode}`;
  }
  return formatForeign(amountInINR, country);
}

/**
 * Combined Dual Currency Object
 */
export interface DualCurrencyDisplay {
  inr: string;
  foreign: string;
  foreignCompact: string;
  exchangeRateText: string;
  reverseExchangeText: string;
  fullBadge: string;
}

export function getDualCurrency(amountInINR: number, country: CountryCurrencyInfo): DualCurrencyDisplay {
  const inr = formatINR(amountInINR);
  const foreign = formatForeign(amountInINR, country);
  const foreignCompact = formatForeignCompact(amountInINR, country);

  // Rate text: e.g. 1 INR = 16.00 KRW
  const rateText = `1 INR (₹) = ${country.ratePerINR < 1 ? country.ratePerINR.toFixed(4) : country.ratePerINR.toFixed(2)} ${country.currencyCode} (${country.currencySymbol})`;

  // Reverse rate: e.g. 1,000 KRW = ₹62.50
  let reverseRateText = '';
  if (country.ratePerINR >= 100) {
    const costOf1000 = (1000 / country.ratePerINR).toFixed(2);
    reverseRateText = `1,000 ${country.currencyCode} ≈ ₹${costOf1000}`;
  } else if (country.ratePerINR >= 1) {
    const costOf100 = (100 / country.ratePerINR).toFixed(2);
    reverseRateText = `100 ${country.currencyCode} ≈ ₹${costOf100}`;
  } else {
    const costOf1 = (1 / country.ratePerINR).toFixed(2);
    reverseRateText = `1 ${country.currencyCode} ≈ ₹${costOf1}`;
  }

  return {
    inr,
    foreign,
    foreignCompact,
    exchangeRateText: rateText,
    reverseExchangeText: reverseRateText,
    fullBadge: `${inr} (${foreign})`
  };
}

/**
 * Smart Search & Synonym Expansion Engine for Indian Government Schemes
 * Handles misspellings, transliterations, related terms, and multi-word queries.
 */

// Common synonyms and transliteration maps
const SYNONYM_MAP: Record<string, string[]> = {
  // Gruha Jyothi & Electricity
  'jyoti': ['jyothi', 'electricity', 'power', '200', 'units', 'bescom', 'escom', 'light'],
  'jyothi': ['jyoti', 'electricity', 'power', '200', 'units', 'bescom', 'escom', 'light'],
  'electricity': ['jyothi', 'jyoti', 'power', '200', 'units', 'bescom', 'energy'],
  'power': ['jyothi', 'jyoti', 'electricity', '200', 'units'],
  'light': ['jyothi', 'jyoti', 'electricity', 'power'],

  // Women, Female & Gender-specific Schemes
  'women': ['female', 'woman', 'shakti', 'lakshmi', 'mahila', 'mother', 'girl', 'maternity'],
  'woman': ['female', 'women', 'shakti', 'lakshmi', 'mahila', 'mother'],
  'female': ['women', 'woman', 'girl', 'mahila', 'shakti'],
  'mahila': ['women', 'female', 'woman', 'lakshmi', 'shakti'],

  // Gruha Lakshmi & Women Cash Assistance
  'lakshmi': ['laxmi', 'gruhalakshmi', 'gruhalaxmi', '2000', 'female', 'women', 'head'],
  'laxmi': ['lakshmi', 'gruhalakshmi', 'gruhalaxmi', '2000', 'female', 'women', 'head'],
  'gruhalakshmi': ['gruha lakshmi', 'lakshmi', 'laxmi', '2000'],
  'gruhalaxmi': ['gruha lakshmi', 'lakshmi', 'laxmi', '2000'],

  // Shakti & Free Bus Travel
  'shakti': ['sakthi', 'bus', 'travel', 'ksrtc', 'bmtc', 'women bus'],
  'sakthi': ['shakti', 'bus', 'travel', 'ksrtc', 'bmtc'],
  'bus': ['shakti', 'travel', 'ksrtc', 'bmtc', 'pass'],

  // Yuva Nidhi & Unemployment
  'yuva': ['youth', 'nidhi', 'unemployed', 'unemployment', 'graduate', 'diploma', 'stipend'],
  'nidhi': ['yuva', 'stipend', 'unemployed', 'allowance'],
  'unemployment': ['yuva nidhi', 'stipend', 'graduate', 'allowance'],
  'unemployed': ['yuva nidhi', 'stipend', 'graduate', 'allowance'],

  // Anna Bhagya & Food/Ration
  'anna': ['bhagya', 'rice', 'ration', 'food', 'grain', 'bpl', 'antyodaya'],
  'bhagya': ['anna', 'rice', 'ration', 'food', 'grains'],
  'ration': ['anna bhagya', 'rice', 'food', 'bpl', 'ration card'],
  'rice': ['anna bhagya', 'ration', 'food'],

  // Farmers & PM-KISAN
  'kisan': ['farmer', 'agriculture', 'krishi', '6000', 'pm-kisan', 'pmkisan', 'cultivator'],
  'farmer': ['kisan', 'agriculture', 'krishi', 'fasal', 'bima', 'crop'],
  'agriculture': ['kisan', 'farmer', 'krishi', 'crop', 'fasal'],
  'crop': ['fasal', 'bima', 'pmfby', 'farmer', 'kisan'],

  // Health & Ayushman Bharat
  'ayushman': ['pmjay', 'health', 'hospital', '5 lakh', 'arogya', 'medical', 'card'],
  'pmjay': ['ayushman', 'health', 'hospital', '5 lakh', 'arogya'],
  'health': ['ayushman', 'pmjay', 'medical', 'hospital', 'arogya'],
  'medical': ['ayushman', 'pmjay', 'health', 'hospital', 'treatment'],

  // Business, MSME & MUDRA
  'mudra': ['loan', 'business', 'msme', 'shishu', 'kishore', 'tarun', 'entrepreneur'],
  'loan': ['mudra', 'stand-up', 'msme', 'business', 'credit'],
  'business': ['mudra', 'msme', 'stand-up', 'enterprise', 'entrepreneur'],

  // Housing & PMAY
  'housing': ['awas', 'pmay', 'home', 'shelter', 'house'],
  'awas': ['housing', 'pmay', 'home', 'shelter'],
  'pmay': ['awas', 'housing', 'urban', 'rural'],

  // Scholarships & Education
  'scholarship': ['ssp', 'nsp', 'student', 'post-matric', 'pre-matric', 'fee', 'education', 'college'],
  'ssp': ['scholarship', 'post-matric', 'pre-matric', 'karnataka scholarship', 'student'],
  'nsp': ['national scholarship', 'central sector', 'college scholarship'],
  'student': ['scholarship', 'ssp', 'nsp', 'education', 'college', 'matric'],

  // Railways, KEA & Government Jobs / Recruitments
  'job': ['recruitment', 'employment', 'vacancy', 'vacancies', 'post', 'posts', 'exam', 'examination', 'hiring', 'rrb', 'kea', 'officer', 'technician', 'pilot', 'apprentice'],
  'jobs': ['recruitment', 'employment', 'vacancy', 'vacancies', 'post', 'posts', 'exam', 'examination', 'hiring', 'rrb', 'kea', 'officer', 'technician', 'pilot', 'apprentice'],
  'recruitment': ['job', 'jobs', 'vacancy', 'vacancies', 'employment', 'exam', 'rrb', 'kea', 'officer', 'technician', 'pilot'],
  'vacancy': ['job', 'jobs', 'recruitment', 'employment', 'post', 'rrb', 'kea'],
  'vacancies': ['job', 'jobs', 'recruitment', 'employment', 'post', 'rrb', 'kea'],
  'employment': ['job', 'jobs', 'recruitment', 'vacancy', 'yuva nidhi', 'apprentice'],
  'railway': ['rrb', 'loco pilot', 'alp', 'technician', 'train', 'central recruitment'],
  'rrb': ['railway', 'loco pilot', 'alp', 'technician', 'recruitment', 'cen'],
  'pilot': ['loco pilot', 'alp', 'rrb', 'railway', 'assistant loco pilot'],
  'alp': ['assistant loco pilot', 'rrb', 'railway', 'pilot'],
  'technician': ['rrb', 'railway', 'grade-1', 'grade-3', 'signal', 'technician grade'],
  'kea': ['karnataka examinations authority', 'recruitment', 'exam', 'vao', 'kset', 'village administrative officer'],
  'vao': ['village administrative officer', 'kea', 'revenue department', 'recruitment'],
  'kset': ['assistant professorship', 'lectureship', 'kea', 'karnataka state eligibility test', 'exam'],
};

// Conversational stop words to ignore when extracting search tokens
export const SEARCH_STOP_WORDS = new Set([
  'the', 'and', 'for', 'any', 'all', 'scheme', 'yojana', 'in', 'of', 'to', 'is', 'a', 'an',
  'tell', 'me', 'about', 'what', 'which', 'who', 'how', 'can', 'i', 'get', 'give', 'show',
  'details', 'detail', 'info', 'information', 'please', 'know', 'find', 'want', 'need',
  'with', 'from', 'this', 'that', 'there', 'are', 'were', 'was', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'some', 'any'
]);

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Checks whether text contains a word or phrase, using word boundary for short tokens
 */
function containsTerm(text: string, term: string): boolean {
  if (!text || !term) return false;
  if (term.length <= 4) {
    const rx = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i');
    return rx.test(text);
  }
  return text.toLowerCase().includes(term.toLowerCase());
}

/**
 * Gets synonyms and transliterations for a specific token
 */
export function getSynonymsForToken(token: string): string[] {
  const result = new Set<string>();
  result.add(token);

  const lower = token.toLowerCase();

  for (const [key, synonyms] of Object.entries(SYNONYM_MAP)) {
    if (lower === key) {
      synonyms.forEach((s) => result.add(s));
    }
  }

  // Handle joined/unjoined variations
  if (lower === 'gruha' || lower === 'griha') {
    result.add('gruha');
    result.add('griha');
  }
  if (lower === 'jyoti' || lower === 'jyothi') {
    result.add('jyothi');
    result.add('jyoti');
    result.add('electricity');
    result.add('200 units');
  }
  if (lower === 'lakshmi' || lower === 'laxmi') {
    result.add('lakshmi');
    result.add('laxmi');
    result.add('2000');
  }
  if (lower === 'shakti' || lower === 'sakthi') {
    result.add('shakti');
    result.add('sakthi');
    result.add('bus');
  }

  return Array.from(result);
}

/**
 * Builds an elastic MongoDB search query for partial terms, synonyms, and multi-word phrases.
 * Enforces token intersection (AND) for multi-word queries so unrelated schemes are NOT returned.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildSmartSearchFilter(queryString: string): any {
  const clean = queryString.trim();
  if (!clean) return {};

  const lower = clean.toLowerCase();

  // 1. Direct exact phrase conditions (matches full query phrase anywhere in key fields)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const directPhraseClauses: any[] = [
    { name: { $regex: escapeRegExp(clean), $options: 'i' } },
    { summary: { $regex: escapeRegExp(clean), $options: 'i' } },
    { description: { $regex: escapeRegExp(clean), $options: 'i' } },
    { ministry: { $regex: escapeRegExp(clean), $options: 'i' } },
    { category: { $regex: escapeRegExp(clean), $options: 'i' } },
    { benefits: { $in: [new RegExp(escapeRegExp(clean), 'i')] } },
    { beneficiaryGroups: { $in: [new RegExp(escapeRegExp(clean), 'i')] } },
  ];

  // 2. Tokenize words (ignore conversational stop words)
  const tokens = lower
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !SEARCH_STOP_WORDS.has(w));

  // If no substantive tokens, fall back to exact direct phrase
  if (tokens.length === 0) {
    return { $or: directPhraseClauses };
  }

  // 3. For single-word query: match token or any of its synonyms
  if (tokens.length === 1) {
    const singleToken = tokens[0];
    const expandedTerms = getSynonymsForToken(singleToken);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orClauses: any[] = [...directPhraseClauses];
    expandedTerms.forEach((term) => {
      const regexPattern = term.length <= 4 ? `\\b${escapeRegExp(term)}\\b` : escapeRegExp(term);
      orClauses.push({ name: { $regex: regexPattern, $options: 'i' } });
      orClauses.push({ summary: { $regex: regexPattern, $options: 'i' } });
      orClauses.push({ description: { $regex: regexPattern, $options: 'i' } });
      orClauses.push({ category: { $regex: regexPattern, $options: 'i' } });
      orClauses.push({ benefits: { $in: [new RegExp(regexPattern, 'i')] } });
      orClauses.push({ beneficiaryGroups: { $in: [new RegExp(regexPattern, 'i')] } });
    });

    return { $or: orClauses };
  }

  // 4. For multi-word queries:
  // Must match either the exact phrase OR satisfy each token concept (token intersection with AND)
  // This prevents returning unrelated schemes if only one random word matched!
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const andClauses: any[] = [];

  tokens.forEach((token) => {
    const synonyms = getSynonymsForToken(token);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokenOrClauses: any[] = [];

    synonyms.forEach((term) => {
      const regexPattern = term.length <= 4 ? `\\b${escapeRegExp(term)}\\b` : escapeRegExp(term);
      tokenOrClauses.push({ name: { $regex: regexPattern, $options: 'i' } });
      tokenOrClauses.push({ summary: { $regex: regexPattern, $options: 'i' } });
      tokenOrClauses.push({ description: { $regex: regexPattern, $options: 'i' } });
      tokenOrClauses.push({ category: { $regex: regexPattern, $options: 'i' } });
      tokenOrClauses.push({ benefits: { $in: [new RegExp(regexPattern, 'i')] } });
      tokenOrClauses.push({ beneficiaryGroups: { $in: [new RegExp(regexPattern, 'i')] } });
    });

    andClauses.push({ $or: tokenOrClauses });
  });

  return {
    $or: [
      ...directPhraseClauses,
      { $and: andClauses }
    ]
  };
}

/**
 * Scores and sorts schemes by semantic and textual relevance to a user query.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rankSchemesByRelevance<T extends Record<string, any>>(schemes: T[], queryString: string): T[] {
  const clean = queryString.trim().toLowerCase();
  if (!clean || schemes.length <= 1) return schemes;

  const tokens = clean
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !SEARCH_STOP_WORDS.has(w));

  // If all words were stop words, fallback to raw clean
  if (tokens.length === 0) {
    tokens.push(...clean.split(/\s+/).filter((w) => w.length >= 2));
  }

  // Collect synonyms for all tokens
  const matchTerms = new Set<string>();
  tokens.forEach((t) => {
    matchTerms.add(t);
    for (const [key, synonyms] of Object.entries(SYNONYM_MAP)) {
      if (t === key || t.includes(key) || key.includes(t)) {
        synonyms.forEach((s) => matchTerms.add(s.toLowerCase()));
      }
    }
  });

  // Check condensed phrase (e.g. "gruhalakshmi" -> "gruha lakshmi")
  const cleanCompressed = clean.replace(/\s+/g, '');

  return [...schemes].sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    const aName = (a.name || '').toLowerCase();
    const bName = (b.name || '').toLowerCase();
    const aSummary = (a.summary || '').toLowerCase();
    const bSummary = (b.summary || '').toLowerCase();
    const aBenefits = (Array.isArray(a.benefits) ? a.benefits.join(' ') : '').toLowerCase();
    const bBenefits = (Array.isArray(b.benefits) ? b.benefits.join(' ') : '').toLowerCase();

    const aNameCompressed = aName.replace(/\s+/g, '');
    const bNameCompressed = bName.replace(/\s+/g, '');

    // 1. Exact query match in title
    if (aName.includes(clean) || aNameCompressed.includes(cleanCompressed)) scoreA += 150;
    if (bName.includes(clean) || bNameCompressed.includes(cleanCompressed)) scoreB += 150;

    if (aSummary.includes(clean)) scoreA += 60;
    if (bSummary.includes(clean)) scoreB += 60;

    // 2. Multi-token intersection matching in title/summary
    let aTokenHits = 0;
    let bTokenHits = 0;
    tokens.forEach((tok) => {
      const aMatched = containsTerm(aName, tok) || containsTerm(aSummary, tok) || containsTerm(aBenefits, tok);
      const bMatched = containsTerm(bName, tok) || containsTerm(bSummary, tok) || containsTerm(bBenefits, tok);
      if (aMatched) aTokenHits++;
      if (bMatched) bTokenHits++;
    });
    scoreA += aTokenHits * 40;
    scoreB += bTokenHits * 40;

    if (tokens.length > 1) {
      if (aTokenHits >= tokens.length) scoreA += 100;
      if (bTokenHits >= tokens.length) scoreB += 100;
    }

    // 3. Synonym and expanded terms matching
    matchTerms.forEach((term) => {
      if (term.length >= 2) {
        if (containsTerm(aName, term)) scoreA += 30;
        if (containsTerm(bName, term)) scoreB += 30;

        if (containsTerm(aSummary, term)) scoreA += 15;
        if (containsTerm(bSummary, term)) scoreB += 15;

        if (containsTerm(aBenefits, term)) scoreA += 20;
        if (containsTerm(bBenefits, term)) scoreB += 20;
      }
    });

    return scoreB - scoreA;
  });
}

import Groq from 'groq-sdk';
import { ExtractedSchemeSchema, ExtractedSchemeType } from '../validation/schemeSchema';
import { IScheme } from '../../models/Scheme';

export type { ExtractedSchemeType };

const groqApiKey = process.env.GROQ_API_KEY || '';
const defaultModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY || groqApiKey;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not defined in environment variables');
  }
  return new Groq({ apiKey });
}

function getGroqModel(): string {
  return process.env.GROQ_MODEL || defaultModel || 'openai/gpt-oss-120b';
}

/**
 * Resilient completion helper with automatic fallback across models on 429 rate limits.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createChatCompletionWithFallback(params: any): Promise<any> {
  const groq = getGroqClient();
  const models = [
    getGroqModel(),
    'openai/gpt-oss-20b',
    'qwen/qwen3.8-27b',
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastError: any = null;
  for (const model of models) {
    try {
      const res = await groq.chat.completions.create({
        ...params,
        model,
      });
      return res;
    } catch (err: unknown) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const status = (err as any)?.status;
      if (status === 429 || errMsg.includes('Rate limit') || errMsg.includes('TPD')) {
        console.warn(`[Groq AI] Rate limit on model ${model}, falling back to next available model...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

/**
 * Classifies whether a user prompt is a general question (Mode A)
 * or a government scheme question (Mode B).
 */
export async function classifyIntent(prompt: string): Promise<'GENERAL' | 'SCHEME'> {
  try {
    const systemPrompt = `You are a query intent classifier for SchemeSathi AI.
Determine whether the user is asking about:
- SCHEME: Indian government schemes, scholarships, subsidies, welfare programmes, farmer aid, student benefits, civil service or government entrance exams (e.g. KCET, NEET, KSET), or government job applications, recruitments, vacancies, employment notifications, public sector openings (e.g. Railway RRB, KEA Village Administrative Officer, SSC, UPSC, state PSCs, apprenticeships, government hiring).
- GENERAL: General coding, science, mathematics, generic private software companies, casual greetings, or topics completely unrelated to Indian government opportunities.

Output ONLY a JSON object with a single key "intent" whose value is either "SCHEME" or "GENERAL". Do not include markdown or explanations.
Example: {"intent": "SCHEME"}`;

    const completion = await createChatCompletionWithFallback({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const text = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(text);
    return parsed.intent === 'SCHEME' ? 'SCHEME' : 'GENERAL';
  } catch (error) {
    console.error('Groq classifyIntent error, defaulting based on keywords:', error);
    // Safe keyword fallback
    const lower = prompt.toLowerCase();
    const schemeKeywords = [
      'scheme', 'yojana', 'scholarship', 'subsidy', 'grant', 'pension', 
      'farmer', 'ration', 'kisan', 'student', 'eligibility', 'apply', 'government',
      'karnataka', 'central', 'pm', 'modi', 'bima', 'ayushman', 'mudra',
      'job', 'jobs', 'vacancy', 'vacancies', 'recruitment', 'recruit', 'post', 'posts',
      'railway', 'rrb', 'kea', 'upsc', 'ssc', 'apprentice', 'employment', 'exam'
    ];
    const isScheme = schemeKeywords.some((kw) => lower.includes(kw));
    return isScheme ? 'SCHEME' : 'GENERAL';
  }
}

/**
 * Mode A: General Conversational Assistant
 */
export async function answerGeneralQuestion(
  message: string,
  history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = []
): Promise<string> {
  const systemMessage = {
    role: 'system' as const,
    content: `You are SchemeSathi AI, a polite, helpful, and highly organized AI assistant.
Answer general questions clearly, accurately, and with excellent visual structure:
- Use clean Markdown with bold section headings (###), organized bullet points, and clean tables when comparing multiple items.
- If a user asks about career platforms or applications, provide organized tables with clear columns (Platform/Service, Best For, How to Apply).
- Keep responses readable, beautifully structured, and concise.`,
  };

  const formattedHistory = history.slice(-6).map((h) => ({
    role: h.role,
    content: h.content,
  }));

  const completion = await createChatCompletionWithFallback({
    messages: [systemMessage, ...formattedHistory, { role: 'user', content: message }],
    temperature: 0.6,
    max_tokens: 1000,
  });

  return completion.choices[0]?.message?.content || 'I could not generate an answer at this time.';
}

/**
 * Mode B: Government Scheme Assistant using RAG
 * Grounds responses in retrieved MongoDB scheme records.
 */
export async function answerSchemeQuestion(
  question: string,
  schemes: IScheme[],
  history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = []
): Promise<{ answer: string; citedSchemes: Array<{ schemeId: string; title: string; slug: string; url?: string }> }> {
  // Prepare context from retrieved schemes
  const contextText = schemes.map((s, index) => {
    const startDate = s.applicationStartDate ? new Date(s.applicationStartDate).toLocaleDateString('en-IN') : 'Continuous / Open';
    const endDate = s.applicationEndDate ? new Date(s.applicationEndDate).toLocaleDateString('en-IN') : 'Ongoing / No fixed cutoff';
    return `[Scheme / Recruitment ${index + 1}]
Name: ${s.name}
Slug: ${s.slug}
Category: ${s.category}
Government Level: ${s.governmentLevel} ${s.state ? `(${s.state})` : ''}
Ministry / Department: ${s.ministry || 'N/A'}
Summary: ${s.summary}
Application Start Date: ${startDate}
Application Deadline (End Date): ${endDate}
Benefits / Post Details: ${s.benefits?.join('; ') || 'N/A'}
Eligibility: ${s.eligibility ? JSON.stringify(s.eligibility) : 'N/A'}
Required Documents: ${s.requiredDocuments?.join('; ') || 'N/A'}
Application Process: ${s.applicationSteps?.join(' -> ') || 'N/A'}
Official URL: ${s.officialSourceUrl || s.applicationUrl || 'N/A'}
Verification Status: ${s.verificationStatus}`;
  }).join('\n\n---\n\n');

  const systemMessage = {
    role: 'system' as const,
    content: `You are SchemeSathi AI, an official and authoritative advisor for Indian Government Welfare Schemes, Scholarships, and Public Sector Recruitment / Job Applications.

ORGANIZATION & PRESENTATION RULES:
1. Always present information in a clean, visually structured, and easy-to-read view using Markdown:
   - Use concise headings (e.g. "### Active Government Recruitments & Opportunities").
   - When listing or comparing multiple schemes/job applications, ALWAYS present a structured summary table first:
     | Recruitment / Scheme | Authority / Dept | Key Dates & Deadline | Key Eligibility | Official Portal / Link |
   - Follow with structured details for each item using clear bullet points:
     • **Authority / Ministry**: ...
     • **Key Benefits / Post Details**: ...
     • **Eligibility Requirements**: ...
     • **Application Timeline**: Start Date: [Date] | Last Date: [Date]
     • **How to Apply**: [Step-by-step or Portal Link]
2. Ground your answers strictly in the provided Scheme Context below.
3. DO NOT invent eligibility rules, grant amounts, deadlines, or websites that are not in the context.
4. If deadlines or dates are available in the context, highlight them prominently.
5. If the context does not have enough information to answer definitively, explicitly state "Based on the verified official records currently available, this detail is not specified."
6. Always cite official .gov.in / .nic.in portals and direct application links provided in the context.
7. Never output raw HTML tags like <br> or <br/> or <div>. Use standard Markdown line breaks and bullet points.

SCHEME CONTEXT:
${contextText || 'No specific scheme records found for this query in the database.'}`,
  };

  const formattedHistory = history.slice(-6).map((h) => ({
    role: h.role,
    content: h.content,
  }));

  const completion = await createChatCompletionWithFallback({
    messages: [systemMessage, ...formattedHistory, { role: 'user', content: question }],
    temperature: 0.3,
    max_tokens: 1200,
  });

  const answer = completion.choices[0]?.message?.content || 'Unable to retrieve scheme details.';

  const citedSchemes = schemes.map((s) => ({
    schemeId: String(s._id),
    title: s.name,
    slug: s.slug,
    url: (s.officialSourceUrl || s.applicationUrl) || undefined,
  }));

  return { answer, citedSchemes };
}

/**
 * Extracts structured scheme and job recruitment applications from raw scraped webpage/document text.
 * Can extract multiple schemes or job recruitments from portals and listing pages.
 */
export async function extractSchemesWithGroq(
  rawText: string,
  sourceUrl: string
): Promise<ExtractedSchemeType[]> {
  const prompt = `You are a precision data extraction engine for Indian government portals, welfare schemes, admissions, and recruitment/job applications.
Analyze the following text extracted from an official government web page, PDF, or portal (${sourceUrl}).
Identify all distinct government schemes, citizen welfare programs, educational entrance/scholarship schemes (like KCET, SNQ quota, SSP), or government employment/recruitment/apprentice applications (like Railway RRB notifications, KEA recruitment notices) described or announced in the text.

For each scheme or recruitment application, extract structured details conforming to this exact schema:
{
  "schemes": [
    {
      "name": "Full official scheme / recruitment notification name",
      "summary": "Brief 2-3 sentence overview of the scheme or recruitment",
      "description": "Comprehensive explanation of objectives, post details, or scope",
      "category": "EDUCATION" | "AGRICULTURE" | "HEALTHCARE" | "HOUSING" | "FINANCIAL_SERVICES" | "WOMEN_AND_CHILD" | "EMPLOYMENT" | "BUSINESS_MSME" | "SOCIAL_WELFARE" | "OTHER",
      "governmentLevel": "CENTRAL" | "STATE",
      "state": "State name (e.g. Karnataka) or null if Central",
      "ministry": "Ministry/Department or null",
      "benefits": ["Array of specific financial benefits, stipends, pay scale, or fee waivers"],
      "eligibility": ["Array of specific eligibility rules (educational qualifications like 10th/ITI/degree, age limits, domicile)"],
      "requiredDocuments": ["List of official documents needed to apply"],
      "applicationSteps": ["Sequential steps to apply"],
      "beneficiaryGroups": ["e.g. Job Seekers, Students, Farmers, Women, Youth"],
      "ageCriteria": { "minAge": number or null, "maxAge": number or null },
      "incomeCriteria": { "maxAnnualIncome": number or null, "description": "text or null" },
      "applicationUrl": "Valid URL to apply/register or null",
      "officialSourceUrl": "${sourceUrl}",
      "applicationStartDate": "YYYY-MM-DD or null",
      "applicationEndDate": "YYYY-MM-DD or null",
      "evidence": ["Direct sentences from the source text verifying the facts"],
      "needsReview": boolean
    }
  ]
}

CRITICAL RULES:
- WHAT IS NOT A SCHEME (DO NOT EXTRACT THESE - RETURN EMPTY ARRAY):
  * DO NOT extract vague flash tickers or alerts like "Upcoming recruitment examination notification" that lack full educational criteria and benefits.
  * DO NOT extract answer key objection links, provisional score lists, seat allocation notices, stray vacancy rounds, or counseling schedules.
  * DO NOT extract project profiles, internal portal documentation, or generic government vendor notices.
  * ONLY extract genuine, substantive welfare schemes or verified recruitment job notifications that include clear qualifications, age criteria, and benefits/pay scale.
  * If a text has no complete scheme or recruitment conforming to these standards, return {"schemes": []}.
- NO DUPLICATES OR FRAGMENTS:
  * Do NOT generate multiple near-identical items for the same recruitment (e.g. "VAO Recruitment" vs "VAO Recruitment Examination"). Pick the single authoritative title.
- If the text mentions 1 or more schemes or job recruitments, extract up to 5 distinct items in the "schemes" array.
- For job/apprentice recruitments (such as RRB ALP, Technician, KEA recruitment), set category to "EMPLOYMENT", extract the post/qualification details in eligibility, and stipends/salary/travel concession in benefits.
- CRUCIAL DATES ANALYSIS: Analyze every single detail for application registration dates:
  * "applicationStartDate": Convert registration start date to "YYYY-MM-DD" or null if not specified.
  * "applicationEndDate": Convert the closing deadline/last date to apply to "YYYY-MM-DD". If it is a continuous year-round citizen benefit (like PM-KISAN, Ayushman, Gruha Lakshmi, SSY), leave as null.
- FOCUS ON ONGOING SCHEMES & ACCURACY:
  * Prioritize active and currently open schemes and recruitments.
  * Check the true year of the notification (e.g. 2024 vs 2025 vs 2026). NEVER invent a future year if the notification is for an earlier recruitment cycle (such as CEN 02/2024 or VAO 2024).
  * If the notice indicates that applications are closed, or if the deadline has passed, or if the exam is already conducted, extract the real historical dates and note in summary: "Applications for this notification are closed / exam concluded."
  * NEVER invent or guess dates. If a deadline is not explicitly written in the source text, set "applicationEndDate": null.
- SPECIFIC DOMAIN ACCURACY FOR KARNATAKA GUARANTEE SCHEMES:
  * Gruha Jyothi: STRICTLY for up to 200 units of FREE domestic electricity to households. Category is SOCIAL_WELFARE (Energy Department). It is NEVER for house construction, housing loans, or building improvements.
  * Gruha Lakshmi: STRICTLY provides ₹2,000 monthly cash assistance via DBT to the woman head of eligible families. Category is WOMEN_AND_CHILD. It is NEVER for house construction or building improvement.
  * Shakti Scheme: Free bus travel in Karnataka state-run road transport corporation buses (KSRTC/BMTC/NWKRTC/KKRTC) for women and transgender persons.
  * Anna Bhagya: 10 kg food grains / cash equivalent for BPL/Antyodaya ration card holders.
  * Yuva Nidhi: Monthly unemployment allowance of ₹3,000 for degree holders and ₹1,500 for diploma holders who graduated in 2023 or later and are unemployed.
- PORTAL COUNTERS & STATISTICS:
  * Do NOT confuse application count statistics or generic website counters (e.g. '1,50,00,000 applications submitted') with loan amounts or scheme benefits!
- Do NOT hallucinate. Only extract stated facts.
- Return ONLY valid JSON.

EXTRACTED TEXT:
${rawText.slice(0, 12000)}`;

  try {
    const response = await createChatCompletionWithFallback({
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    if (parsed.error === 'NOT_A_SCHEME') {
      return [];
    }

    const rawList = Array.isArray(parsed.schemes) 
      ? parsed.schemes 
      : parsed.name ? [parsed] : [];

    const validSchemes: ExtractedSchemeType[] = [];
    for (const item of rawList) {
      item.officialSourceUrl = item.officialSourceUrl || sourceUrl;
      const validated = ExtractedSchemeSchema.safeParse(item);
      if (validated.success) {
        validSchemes.push(validated.data);
      } else {
        console.warn('Groq extraction item validation warning:', validated.error.issues);
      }
    }

    return validSchemes;
  } catch (err) {
    console.error('Groq extraction failure:', err);
    return [];
  }
}

/**
 * Single scheme extraction wrapper for backward compatibility.
 */
export async function extractSchemeWithGroq(
  rawText: string,
  sourceUrl: string
): Promise<ExtractedSchemeType | null> {
  const schemes = await extractSchemesWithGroq(rawText, sourceUrl);
  return schemes.length > 0 ? schemes[0] : null;
}

/**
 * Explains eligibility match or discrepancy for a citizen profile
 */
export async function explainEligibility(
  userProfile: {
    state?: string;
    age?: number;
    education?: string;
    occupation?: string;
    annualIncome?: number;
    category?: string;
  },
  scheme: IScheme
): Promise<string> {
  const prompt = `You are an eligibility advisor on SchemeSathi AI.
Given the citizen profile and scheme criteria, provide a transparent, 2-3 sentence assessment.
Citizen Profile:
- State: ${userProfile.state || 'Not specified'}
- Age: ${userProfile.age || 'Not specified'}
- Education: ${userProfile.education || 'Not specified'}
- Occupation: ${userProfile.occupation || 'Not specified'}
- Annual Family Income: ₹${userProfile.annualIncome?.toLocaleString('en-IN') || 'Not specified'}
- Category: ${userProfile.category || 'General/Not specified'}

Scheme Details:
- Name: ${scheme.name}
- Eligibility Criteria: ${Array.isArray(scheme.eligibility) ? scheme.eligibility.join('; ') : JSON.stringify(scheme.eligibility || 'N/A')}
- Age Criteria: Min ${scheme.ageCriteria?.minAge ?? 'N/A'}, Max ${scheme.ageCriteria?.maxAge ?? 'N/A'}
- Income Limit: ₹${scheme.incomeCriteria?.maxAnnualIncome?.toLocaleString('en-IN') ?? 'N/A'}

Provide:
1. Match Assessment (Likely Match, Potential Match, or Unlikely Match)
2. Concrete reason why they qualify or what information is missing.
Keep it encouraging, objective, and remind them that official verification occurs during application.`;

  try {
    const response = await createChatCompletionWithFallback({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 300,
    });
    return response.choices[0]?.message?.content || 'Assessment could not be generated.';
  } catch {
    return 'Based on the published rules, please verify your documents and apply on the official portal.';
  }
}

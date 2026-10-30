import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Scheme, IScheme } from '@/models/Scheme';
import { explainEligibility } from '@/lib/ai/groq';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      state,
      age,
      education,
      occupation,
      annualIncome,
      category,
      gender: _gender,
      disability: _disability,
    } = body;

    // Reject if sensitive identifiers are provided
    if (body.aadhaar || body.bankAccount || body.otp || body.password) {
      return NextResponse.json(
        { error: 'Sensitive identifiers (Aadhaar, Bank details, OTP) must never be submitted.' },
        { status: 400 }
      );
    }

    await connectDB();

    // Query active verified schemes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = { verificationStatus: 'VERIFIED' };

    if (state && state !== 'All States') {
      filter.$or = [
        { governmentLevel: 'CENTRAL' },
        { state: new RegExp(`^${state}$`, 'i') },
      ];
    }

    const schemes: IScheme[] = await Scheme.find(filter).lean();

    // Matching logic
    const matchedResults = await Promise.all(
      schemes.slice(0, 15).map(async (scheme) => {
        let matchScore = 0;
        const reasons: string[] = [];
        const missingInfo: string[] = [];

        // State check
        if (scheme.governmentLevel === 'CENTRAL') {
          matchScore += 2;
          reasons.push('Open to citizens nationwide (Central Government Scheme).');
        } else if (state && scheme.state?.toLowerCase() === state.toLowerCase()) {
          matchScore += 3;
          reasons.push(`Designated for residents of ${scheme.state}.`);
        } else if (scheme.state) {
          return null; // Not applicable for citizen's state
        }

        // Age check
        const numAge = typeof age === 'number' ? age : parseInt(age, 10);
        if (!isNaN(numAge) && scheme.ageCriteria) {
          const { minAge, maxAge } = scheme.ageCriteria;
          if (minAge != null && numAge < minAge) {
            return null; // Disqualified by age
          }
          if (maxAge != null && numAge > maxAge) {
            return null; // Disqualified by age
          }
          if (minAge != null || maxAge != null) {
            matchScore += 2;
            reasons.push(`Applicant age (${numAge}) falls within required range [${minAge ?? 0} - ${maxAge ?? 'No limit'}].`);
          }
        } else if (scheme.ageCriteria?.minAge || scheme.ageCriteria?.maxAge) {
          missingInfo.push('Age verification required');
        }

        // Income check
        const numIncome = typeof annualIncome === 'number' ? annualIncome : parseInt(annualIncome, 10);
        if (!isNaN(numIncome) && scheme.incomeCriteria?.maxAnnualIncome) {
          if (numIncome > scheme.incomeCriteria.maxAnnualIncome) {
            return null; // Income exceeds limit
          }
          matchScore += 2;
          reasons.push(`Annual income (₹${numIncome.toLocaleString('en-IN')}) is within the scheme ceiling of ₹${scheme.incomeCriteria.maxAnnualIncome.toLocaleString('en-IN')}.`);
        } else if (scheme.incomeCriteria?.maxAnnualIncome) {
          missingInfo.push('Income documentation required');
        }

        // Occupation / Beneficiary alignment
        if (occupation) {
          const occLower = occupation.toLowerCase();
          const matchesGroup = scheme.beneficiaryGroups?.some((bg) =>
            bg.toLowerCase().includes(occLower) || occLower.includes(bg.toLowerCase())
          );
          if (matchesGroup) {
            matchScore += 3;
            reasons.push(`Tailored for ${occupation} applicants.`);
          }
        }

        // Category check
        if (category && scheme.beneficiaryGroups?.some((bg) => bg.toLowerCase().includes(category.toLowerCase()))) {
          matchScore += 2;
          reasons.push(`Provides reserved benefit for ${category} category.`);
        }

        let classification: 'LIKELY_MATCH' | 'POTENTIAL_MATCH' | 'UNLIKELY_MATCH' = 'POTENTIAL_MATCH';
        if (matchScore >= 5 && missingInfo.length === 0) {
          classification = 'LIKELY_MATCH';
        } else if (matchScore >= 2) {
          classification = 'POTENTIAL_MATCH';
        } else {
          classification = 'UNLIKELY_MATCH';
        }

        return {
          scheme: {
            _id: scheme._id,
            name: scheme.name,
            slug: scheme.slug,
            summary: scheme.summary,
            category: scheme.category,
            governmentLevel: scheme.governmentLevel,
            state: scheme.state,
            benefits: scheme.benefits,
            eligibility: scheme.eligibility,
            requiredDocuments: scheme.requiredDocuments,
            applicationUrl: scheme.applicationUrl,
            officialSourceUrl: scheme.officialSourceUrl,
          },
          classification,
          matchScore,
          reasons,
          missingInfo,
        };
      })
    );

    const validMatches = matchedResults.filter((m) => m !== null);
    validMatches.sort((a, b) => b!.matchScore - a!.matchScore);

    // Optional Groq explanation for top match if available
    let topExplanation = '';
    if (validMatches.length > 0 && validMatches[0]) {
      const top = validMatches[0];
      topExplanation = await explainEligibility(
        { state, age, education, occupation, annualIncome, category },
        top.scheme as unknown as IScheme
      );
    }

    return NextResponse.json({
      totalEvaluated: schemes.length,
      matches: validMatches,
      topExplanation,
      disclaimer: 'Official eligibility is determined solely by government issuing authorities during formal verification.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error in eligibility engine';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

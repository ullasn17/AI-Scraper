import mongoose from 'mongoose';
import connectDB from '../src/lib/mongodb';
import { Scheme } from '../src/models/Scheme';
import { Source } from '../src/models/Source';
import { buildSmartSearchFilter, rankSchemesByRelevance } from '../src/lib/search/smartSearch';

async function testSearchQueries() {
  await connectDB();

  const enabledSources = await Source.find({ isEnabled: true }, { _id: 1 }).lean();
  const enabledSourceIds = enabledSources.map((s) => s._id);

  const testQueries = [
    'tell me about gruhalakshmi',
    'gruha jyoti',
    '200 units electricity',
    'gruhalakshmi',
    '2000 rupees women head',
    'free bus for women',
    'unemployed graduate stipend',
    'railway jobs',
    'kea'
  ];

  console.log('--- TESTING SMART SEARCH & RANKING ---');

  for (const q of testQueries) {
    const filter = buildSmartSearchFilter(q);
    const rawMatches = await Scheme.find({
      verificationStatus: 'VERIFIED',
      sourceId: { $in: enabledSourceIds },
      ...(filter.$or ? { $or: filter.$or } : {})
    }).limit(60).lean();

    const ranked = rankSchemesByRelevance(rawMatches, q).slice(0, 3);
    console.log(`\nQuery: "${q}" -> Total Matches: ${rawMatches.length}`);
    ranked.forEach((r, idx) => {
      console.log(`  ${idx + 1}. [${r.category}] ${r.name}`);
      console.log(`     Summary: ${r.summary.slice(0, 100)}...`);
    });
  }

  await mongoose.disconnect();
}

testSearchQueries().catch((e) => {
  console.error(e);
  process.exit(1);
});

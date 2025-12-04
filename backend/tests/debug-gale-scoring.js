import { scoreAgentMatch, scoreAgentWithAgency, scoreMatch } from '../src/utils/scoring.js';

// Test data matching the terminal output
const agents = [
  { firstname: 'Josh', lastname: 'Gale' },
  { firstname: 'Harry', lastname: 'Gale' },
  { firstname: 'Julian', lastname: 'Gale' }
];

const agency = {
  id: '181867435460',
  name: 'Gale & Co',
  address: '',
  email: 'steve@ngu.com'
};

const agentSearchTerm = 'Gale';
const agencySearchTerm = 'G';
const suburbSearchTerm = null;

console.log('=== Debugging Gale Agent Scoring ===\n');
console.log(`Search: Agent="${agentSearchTerm}", Agency="${agencySearchTerm}"\n`);

agents.forEach((agent, index) => {
  const fullName = `${agent.firstname} ${agent.lastname}`;
  
  // Test agent name scoring
  const agentScore = scoreAgentMatch(agentSearchTerm, agent.firstname, agent.lastname);
  
  // Test agency name scoring
  const agencyScore = scoreMatch(agencySearchTerm, agency.name);
  
  // Test combined score
  const combinedScore = scoreAgentWithAgency(
    agent,
    agency,
    agentSearchTerm,
    agencySearchTerm,
    suburbSearchTerm
  );
  
  console.log(`${index + 1}. ${fullName}:`);
  console.log(`   Full Name: "${fullName}"`);
  console.log(`   Agent Score (70%): ${(agentScore * 100).toFixed(2)}% (raw: ${agentScore.toFixed(4)})`);
  console.log(`   Agency Score (20%): ${(agencyScore * 100).toFixed(2)}% (raw: ${agencyScore.toFixed(4)})`);
  console.log(`   Combined Score: ${(combinedScore * 100).toFixed(2)}%`);
  console.log(`   Breakdown:`);
  console.log(`     - Agent component: ${(agentScore * 0.7 * 100).toFixed(2)}%`);
  console.log(`     - Agency component: ${(agencyScore * 0.2 * 100).toFixed(2)}%`);
  console.log(`     - Suburb component: 0.00% (not provided)`);
  console.log('');
});

// Debug scoreMatch function for agent names
console.log('\n=== Detailed scoreMatch Analysis ===\n');
agents.forEach((agent) => {
  const fullName = `${agent.firstname} ${agent.lastname}`;
  const searchNorm = agentSearchTerm.toLowerCase();
  const candidateNorm = fullName.toLowerCase();
  
  console.log(`Matching "${agentSearchTerm}" against "${fullName}":`);
  console.log(`   Search length: ${searchNorm.length}`);
  console.log(`   Candidate length: ${candidateNorm.length}`);
  console.log(`   Length difference: ${Math.abs(searchNorm.length - candidateNorm.length)}`);
  
  // Check substring match
  const hasSubstring = candidateNorm.includes(searchNorm);
  console.log(`   Substring match: ${hasSubstring}`);
  
  // Check word token match
  const searchWords = searchNorm.split(/\s+/).filter(Boolean);
  const candidateWords = candidateNorm.split(/\s+/).filter(Boolean);
  let matchedWords = 0;
  for (const searchWord of searchWords) {
    for (const candidateWord of candidateWords) {
      if (searchWord === candidateWord) {
        matchedWords++;
        break;
      }
    }
  }
  console.log(`   Word token match: ${matchedWords}/${searchWords.length} words`);
  
  const finalScore = scoreMatch(agentSearchTerm, fullName);
  console.log(`   Final scoreMatch result: ${(finalScore * 100).toFixed(2)}%`);
  console.log('');
});

// Debug agency scoring
console.log('\n=== Agency Name Scoring ===\n');
console.log(`Matching "${agencySearchTerm}" against "${agency.name}":`);
const agencyScore = scoreMatch(agencySearchTerm, agency.name);
console.log(`   Final scoreMatch result: ${(agencyScore * 100).toFixed(2)}%`);
console.log('');


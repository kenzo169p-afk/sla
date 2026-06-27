// fetch_fifa_players_24.js
// Generates FIFA rankings JSON with at least 24 player names per nation.

import fs from 'fs';
import path from 'path';

// Helper: random integer inclusive
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Load rankings extracted earlier (scratchpad file)
const scratchPath = path.resolve('C:/Users/gordo/.gemini/antigravity/brain/ad5e9e63-c89e-4232-8381-f0d24497678e/browser/scratchpad_3ealls0h.md');
const scratchContent = fs.readFileSync(scratchPath, 'utf-8');
const rankingsMatch = scratchContent.match(/\[\s*([\s\S]*?)\]/);
if (!rankingsMatch) {
  console.error('Rankings JSON not found in scratchpad');
  process.exit(1);
}
const rankings = JSON.parse('[' + rankingsMatch[1] + ']');

// Load data.js to extract STAR_PLAYERS and NATIONAL_NAMES
const dataJsPath = path.resolve('c:/Users/gordo/Desktop/teste/sla/data.js');
const dataJs = fs.readFileSync(dataJsPath, 'utf-8');

// Extract STAR_PLAYERS object
let STAR_PLAYERS = {};
const starMatch = dataJs.match(/const STAR_PLAYERS\s*=\s*\{([\s\S]*?)\n\};/);
if (starMatch) {
  const objStr = '{' + starMatch[1] + '\n}';
  // eslint-disable-next-line no-eval
  STAR_PLAYERS = eval('(' + objStr + ')');
}

// Extract NATIONAL_NAMES (demonym -> name banks)
let NATIONAL_NAMES = {};
const natMatch = dataJs.match(/const NATIONAL_NAMES\s*=\s*\{([\s\S]*?)\n\};/);
if (natMatch) {
  const objStr = '{' + natMatch[1] + '\n}';
  // eslint-disable-next-line no-eval
  NATIONAL_NAMES = eval('(' + objStr + ')');
}

// Build map: demonym -> array of player names from STAR_PLAYERS
const playersByNat = {};
for (const club of Object.keys(STAR_PLAYERS)) {
  for (const player of STAR_PLAYERS[club]) {
    const nat = player.nat; // e.g., "Brazilian"
    if (!playersByNat[nat]) playersByNat[nat] = [];
    playersByNat[nat].push(player.name);
  }
}

// Helper to generate a random name for a demonym using the name banks
function generateRandomName(demonym) {
  const banks = NATIONAL_NAMES[demonym];
  if (!banks) return 'Anonymous';
  const first = banks.first[randInt(0, banks.first.length - 1)];
  const last = banks.last[randInt(0, banks.last.length - 1)];
  return `${first} ${last}`;
}

// Manual mapping for country names to demonyms where needed
const manualMap = {
  'USA': 'American',
  'EUA': 'American',
  'United States': 'American',
  'Brasil': 'Brazilian',
  'Brazil': 'Brazilian',
  'Espanha': 'Spanish',
  'Spain': 'Spanish',
  'França': 'French',
  'France': 'French',
  'Alemanha': 'German',
  'Germany': 'German',
  'Itália': 'Italian',
  'Italy': 'Italian',
  'Portugal': 'Portuguese',
  'Netherlands': 'Dutch',
  'Holanda': 'Dutch',
  'Argentina': 'Argentinian',
  'Uruguay': 'Uruguayan',
  'Inglaterra': 'English',
  'England': 'English',
  'Croatia': 'Croatian',
  'Serbia': 'Serbian',
  'Turkey': 'Turkish',
  'Saudi Arabia': 'Saudi',
  // add more as needed
};

// For each ranking entry, assemble a list of at least 24 players
const enriched = rankings.map(entry => {
  const country = entry.country;
  const demonym = manualMap[country] || country; // fallback to country name itself
  const basePlayers = (playersByNat[demonym] || []).slice();
  const unique = new Set();
  // Add existing star players first
  for (const p of basePlayers) {
    if (unique.size >= 24) break;
    unique.add(p);
  }
  // Fill with generated names until we have 24
  while (unique.size < 24) {
    unique.add(generateRandomName(demonym));
  }
  return {
    position: entry.rank,
    country: country,
    points: entry.points,
    players: Array.from(unique)
  };
});

// Write output JSON
const outPath = path.resolve('c:/Users/gordo/Desktop/teste/sla/fifa_rankings_24_players.json');
fs.writeFileSync(outPath, JSON.stringify({ rankings: enriched }, null, 2), 'utf-8');
console.log('Generated', outPath);

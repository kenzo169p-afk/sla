// fetch_fifa_players_20.js
// Generates FIFA rankings JSON with at least 20 player names per country.

import fs from 'fs';
import path from 'path';

// ---------- Helper: random integer ----------
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Load the rankings array extracted earlier (scratchpad file).
const scratchPath = path.resolve('C:/Users/gordo/.gemini/antigravity/brain/ad5e9e63-c89e-4232-8381-f0d24497678e/browser/scratchpad_3ealls0h.md');
const scratchContent = fs.readFileSync(scratchPath, 'utf-8');
const rankingsMatch = scratchContent.match(/\[\s*([\s\S]*?)\]/);
if (!rankingsMatch) {
  console.error('Rankings JSON not found in scratchpad');
  process.exit(1);
}
const rankings = JSON.parse('[' + rankingsMatch[1] + ']');

// Load data.js to get STAR_PLAYERS and NATIONAL_NAMES.
const dataJsPath = path.resolve('c:/Users/gordo/Desktop/teste/sla/data.js');
const dataJs = fs.readFileSync(dataJsPath, 'utf-8');

// Extract STAR_PLAYERS object.
const starPlayersMatch = dataJs.match(/const STAR_PLAYERS\s*=\s*\{([\s\S]*?)\n\};/);
let STAR_PLAYERS = {};
if (starPlayersMatch) {
  const objString = '{' + starPlayersMatch[1] + '\n}';
  // eslint-disable-next-line no-eval
  STAR_PLAYERS = eval('(' + objString + ')');
}

// Extract NATIONAL_NAMES (demonym -> name banks).
const nationalNamesMatch = dataJs.match(/const NATIONAL_NAMES\s*=\s*\{([\s\S]*?)\n\};/);
let NATIONAL_NAMES = {};
if (nationalNamesMatch) {
  const objString = '{' + nationalNamesMatch[1] + '\n}';
  // eslint-disable-next-line no-eval
  NATIONAL_NAMES = eval('(' + objString + ')');
}

// Build a map: nationality (demonym) -> array of player names from STAR_PLAYERS.
const playersByNat = {};
for (const club of Object.keys(STAR_PLAYERS)) {
  for (const player of STAR_PLAYERS[club]) {
    const nat = player.nat; // e.g., "Brazilian"
    if (!playersByNat[nat]) playersByNat[nat] = [];
    playersByNat[nat].push(player.name);
  }
}

// Helper to generate a random name for a given demonym using the name banks.
function generateRandomName(demonym) {
  const banks = NATIONAL_NAMES[demonym];
  if (!banks) return 'Anonymous';
  const first = banks.first[randInt(0, banks.first.length - 1)];
  const last = banks.last[randInt(0, banks.last.length - 1)];
  return `${first} ${last}`;
}

// For each ranking entry, build a list of at least 20 player names.
const enriched = rankings.map(entry => {
  const country = entry.country;
  // Try to find a demonym that matches the country name.
  // Some entries use native names (e.g., "EUA" for USA). We'll handle a few common cases manually.
  let demonym = country;
  const manualMap = {
    'USA': 'American',
    'EUA': 'American',
    'United States': 'American',
    'Brasil': 'Brazilian',
    'Brasil': 'Brazilian',
    'Brasil': 'Brazilian',
    'Brasil': 'Brazilian',
    'España': 'Spanish',
    'Espanha': 'Spanish',
    'France': 'French',
    'França': 'French',
    'Germany': 'German',
    'Alemanha': 'German',
    'Italy': 'Italian',
    'Itália': 'Italian',
    'Portugal': 'Portuguese',
    'Netherlands': 'Dutch',
    'Holanda': 'Dutch',
    'Argentina': 'Argentinian',
    'Uruguay': 'Uruguayan',
    'England': 'English',
    'Inglaterra': 'English',
    'Croatia': 'Croatian',
    'Serbia': 'Serbian',
    'Turkey': 'Turkish',
    'Saudi Arabia': 'Saudi',
    // Add more as needed.
  };
  if (manualMap[country]) demonym = manualMap[country];

  // Start with any known star players for that demonym.
  const basePlayers = (playersByNat[demonym] || []).slice();
  const uniquePlayers = new Set();
  // Add existing star players first (up to 20).
  for (const p of basePlayers) {
    if (uniquePlayers.size >= 20) break;
    uniquePlayers.add(p);
  }
  // Fill up to 20 with generated names.
  while (uniquePlayers.size < 20) {
    const name = generateRandomName(demonym);
    uniquePlayers.add(name);
  }
  return {
    position: entry.rank,
    country: country,
    points: entry.points,
    players: Array.from(uniquePlayers)
  };
});

// Write the enriched data to a JSON file.
const outPath = path.resolve('c:/Users/gordo/Desktop/teste/sla/fifa_rankings_20_players.json');
fs.writeFileSync(outPath, JSON.stringify({ rankings: enriched }, null, 2), 'utf-8');
console.log('Generated', outPath);

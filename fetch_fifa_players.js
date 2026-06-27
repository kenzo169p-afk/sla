// fetch_fifa_players.js
// This script reads data.js, extracts STAR_PLAYERS, groups players by nationality,
// then merges with the FIFA rankings extracted earlier (saved in scratchpad).

import fs from 'fs';
import path from 'path';

// Load rankings JSON from scratchpad file
const rankingsPath = path.resolve('C:/Users/gordo/.gemini/antigravity/brain/ad5e9e63-c89e-4232-8381-f0d24497678e/browser/scratchpad_3ealls0h.md');
const rankingsContent = fs.readFileSync(rankingsPath, 'utf-8');
const rankingsJsonMatch = rankingsContent.match(/\[\s*([\s\S]*?)\]/);
if (!rankingsJsonMatch) {
  console.error('Could not find rankings JSON in scratchpad');
  process.exit(1);
}
const rankings = JSON.parse('[' + rankingsJsonMatch[1] + ']');

// Load data.js and extract STAR_PLAYERS object
const dataJsPath = path.resolve('c:/Users/gordo/Desktop/teste/sla/data.js');
let dataJs = fs.readFileSync(dataJsPath, 'utf-8');
// Find the STAR_PLAYERS definition
const starPlayersMatch = dataJs.match(/const STAR_PLAYERS\s*=\s*\{([\s\S]*?)\n\};/);
if (!starPlayersMatch) {
  console.error('STAR_PLAYERS not found');
  process.exit(1);
}
const starPlayersString = '{' + starPlayersMatch[1] + '\n}';
// Evaluate safely – we replace " with ' to avoid syntax issues and remove trailing commas
const safeString = starPlayersString.replace(/\n/g, '\n').replace(/\r/g, '');
let STAR_PLAYERS = {};
try {
  // eslint-disable-next-line no-eval
  STAR_PLAYERS = eval('(' + safeString + ')');
} catch (e) {
  console.error('Failed to eval STAR_PLAYERS', e);
  process.exit(1);
}

// Build a map nationality -> array of player names
const playersByNat = {};
for (const club of Object.keys(STAR_PLAYERS)) {
  for (const player of STAR_PLAYERS[club]) {
    const nat = player.nat;
    if (!playersByNat[nat]) playersByNat[nat] = [];
    playersByNat[nat].push(player.name);
  }
}

// Helper to get up to 3 players for a given country name. We use the demonym mapping
// defined earlier in data.js (the object that maps "Brazilian" etc). We'll reuse it.
const demonymMapMatch = dataJs.match(/const NATIONAL_NAMES\s*=\s*\{([\s\S]*?)\n\};/);
let demonymMap = {};
if (demonymMapMatch) {
  const mapString = '{' + demonymMapMatch[1] + '\n}';
  try {
    // eslint-disable-next-line no-eval
    demonymMap = eval(mapString);
  } catch (_) {}
}

function getPlayersForCountry(country) {
  // Try direct match on nationality first
  if (playersByNat[country]) return playersByNat[country].slice(0, 3);
  // Try to find demonym that maps to a nationality (e.g., "Brazilian" -> "Brazilian")
  const demonym = Object.keys(demonymMap).find(key => demonymMap[key] === country);
  if (demonym && playersByNat[demonym]) return playersByNat[demonym].slice(0, 3);
  // Fallback: empty array
  return [];
}

// Merge rankings with players
const merged = rankings.map(entry => {
  const country = entry.country;
  const players = getPlayersForCountry(country);
  return { ...entry, players };
});

// Write result to JSON file
const outPath = path.resolve('c:/Users/gordo/Desktop/teste/sla/fifa_rankings_full_with_players.json');
fs.writeFileSync(outPath, JSON.stringify({ rankings: merged }, null, 2), 'utf-8');
console.log('Generated', outPath);

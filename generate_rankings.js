// generate_rankings.js
// Reads live rankings scraped from FIFA website and generates a complete
// JSON containing all 211 countries, each with at least 24 players (real ones first,
// then generated according to name banks and nationality mappings).

import fs from 'fs';
import path from 'path';

// Helper for random choice
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 1. Read live rankings from scratchpad_klq3tja8.md
const scratchpadPath = 'C:/Users/gordo/.gemini/antigravity/brain/ad5e9e63-c89e-4232-8381-f0d24497678e/browser/scratchpad_klq3tja8.md';
const scratchContent = fs.readFileSync(scratchpadPath, 'utf-8');
const rankingsMatch = scratchContent.match(/\[\s*([\s\S]*?)\]/);
if (!rankingsMatch) {
  console.error('Could not find live rankings JSON in scratchpad');
  process.exit(1);
}
const liveRankings = JSON.parse('[' + rankingsMatch[1] + ']');

// 2. Read data.js to extract STAR_PLAYERS, NATIONAL_NAMES and mappings
const dataJsPath = 'c:/Users/gordo/Desktop/teste/sla/data.js';
const dataJs = fs.readFileSync(dataJsPath, 'utf-8');

// Extract STAR_PLAYERS
const starPlayersMatch = dataJs.match(/const STAR_PLAYERS\s*=\s*\{([\s\S]*?)\n\};/);
if (!starPlayersMatch) {
  console.error('STAR_PLAYERS not found in data.js');
  process.exit(1);
}
const starPlayers = eval('(' + '{' + starPlayersMatch[1] + '\n}' + ')');

// Extract NATIONAL_NAMES
const nationalNamesMatch = dataJs.match(/const NATIONAL_NAMES\s*=\s*\{([\s\S]*?)\n\};/);
if (!nationalNamesMatch) {
  console.error('NATIONAL_NAMES not found in data.js');
  process.exit(1);
}
const nationalNames = eval('(' + '{' + nationalNamesMatch[1] + '\n}' + ')');

// Extract mappings from generatePlayerName
const mappingsMatch = dataJs.match(/const mappings\s*=\s*\{([\s\S]*?)\n\s*\};/);
let mappings = {};
if (mappingsMatch) {
  mappings = eval('(' + '{' + mappingsMatch[1] + '\n}' + ')');
}

// 3. Group real star players by nationality
const starPlayersByNat = {};
for (const club in starPlayers) {
  for (const player of starPlayers[club]) {
    const nat = player.nat;
    if (!starPlayersByNat[nat]) {
      starPlayersByNat[nat] = [];
    }
    // Only add unique player names
    if (!starPlayersByNat[nat].includes(player.name)) {
      starPlayersByNat[nat].push(player.name);
    }
  }
}

// 4. Country name to demonym mapping
const countryToDemonym = {
  "France": "French",
  "Argentina": "Argentinian",
  "Spain": "Spanish",
  "England": "English",
  "Brazil": "Brazilian",
  "Morocco": "Moroccan",
  "Netherlands": "Dutch",
  "Portugal": "Portuguese",
  "Mexico": "Mexican",
  "Belgium": "Belgian",
  "Colombia": "Colombian",
  "Germany": "German",
  "Croatia": "Croatian",
  "Italy": "Italian",
  "USA": "American",
  "Switzerland": "Swiss",
  "Japan": "Japanese",
  "Senegal": "Senegalese",
  "Uruguay": "Uruguayan",
  "Denmark": "Danish",
  "IR Iran": "Iranian",
  "Austria": "Austrian",
  "Norway": "Norwegian",
  "Ecuador": "Ecuadorian",
  "Nigeria": "Nigerian",
  "Egypt": "Egyptian",
  "Türkiye": "Turkish",
  "Australia": "Australian",
  "Algeria": "Algerian",
  "Côte d'Ivoire": "Ivorian",
  "Korea Republic": "Korean",
  "Canada": "Canadian",
  "Ukraine": "Ukrainian",
  "Russia": "Russian",
  "Poland": "Polish",
  "Sweden": "Swedish",
  "Paraguay": "Paraguayan",
  "Wales": "Welsh",
  "Hungary": "Hungarian",
  "Serbia": "Serbian",
  "Scotland": "Scottish",
  "Panama": "Panamanian",
  "Cameroon": "Cameroonian",
  "Slovakia": "Slovak",
  "Greece": "Greek",
  "Congo DR": "Congolese",
  "Venezuela": "Venezuelan",
  "Czechia": "Czech",
  "Chile": "Chilean",
  "Peru": "Peruvian",
  "Costa Rica": "CostaRican",
  "Romania": "Romanian",
  "Mali": "Malian",
  "South Africa": "SouthAfrican",
  "Republic of Ireland": "Irish",
  "Slovenia": "Slovenian",
  "Uzbekistan": "Uzbek",
  "Tunisia": "Tunisian",
  "Saudi Arabia": "Saudi",
  "Qatar": "Qatari",
  "Bosnia and Herzegovina": "Bosnian",
  "Burkina Faso": "Burkinabé",
  "Iraq": "Iraqi",
  "Cabo Verde": "CapeVerdean",
  "Ghana": "Ghanaian",
  "Honduras": "Honduran",
  "Albania": "Albanian",
  "United Arab Emirates": "UAE",
  "North Macedonia": "Macedonian",
  "Northern Ireland": "NorthernIrish",
  "Jamaica": "Jamaican",
  "Jordan": "Jordanian",
  "Georgia": "Georgian",
  "Iceland": "Icelandic",
  "Finland": "Finnish",
  "Israel": "Israeli",
  "Bolivia": "Bolivian",
  "Kosovo": "Kosovar",
  "Oman": "Omani",
  "Montenegro": "Montenegrin",
  "Guinea": "Guinean",
  "Curaçao": "Dutch",
  "Syria": "Syrian",
  "New Zealand": "Kiwi",
  "Gabon": "Gabonese",
  "Bulgaria": "Bulgarian",
  "Angola": "Angolan",
  "Haiti": "Haitian",
  "Uganda": "Ugandan",
  "Zambia": "Zambian",
  "China PR": "Chinese",
  "Bahrain": "Bahraini",
  "Benin": "Beninese",
  "Thailand": "Thai",
  "Palestine": "Palestinian",
  "Belarus": "Belarussian",
  "Guatemala": "Guatemalan",
  "Luxembourg": "Luxembourger",
  "Vietnam": "Vietnamese",
  "El Salvador": "Salvadoran",
  "Tajikistan": "Tajik",
  "Trinidad and Tobago": "Trinidadian",
  "Mozambique": "Mozambican",
  "Madagascar": "Malagasy",
  "Equatorial Guinea": "Equatoguinean",
  "Kyrgyz Republic": "Kyrgyz",
  "Armenia": "Armenian",
  "Comoros": "Comorian",
  "Kenya": "Kenyan",
  "Libya": "Libyan",
  "Kazakhstan": "Kazakh",
  "Tanzania": "Tanzanian",
  "Mauritania": "Mauritanian",
  "Niger": "Nigerien",
  "Lebanon": "Lebanese",
  "The Gambia": "Gambian",
  "Sudan": "Sudanese",
  "Indonesia": "Indonesian",
  "Togo": "Togolese",
  "DPR Korea": "NorthKorean",
  "Namibia": "Namibian",
  "Sierra Leone": "SierraLeonean",
  "Faroe Islands": "Faroese",
  "Cyprus": "Cypriot",
  "Suriname": "Surinamese",
  "Azerbaijan": "Azerbaijani",
  "Estonia": "Estonian",
  "Rwanda": "Rwandan",
  "Malawi": "Malawian",
  "Zimbabwe": "Zimbabwean",
  "Nicaragua": "Nicaraguan",
  "Guinea-Bissau": "Bissau-Guinean",
  "Kuwait": "Kuwaiti",
  "Congo": "Congolese",
  "Philippines": "Filipino",
  "Malaysia": "Malaysian",
  "Latvia": "Latvian",
  "India": "Indian",
  "Central African Republic": "CentralAfrican",
  "Liberia": "Liberian",
  "Turkmenistan": "Turkmen",
  "Burundi": "Burundian",
  "Ethiopia": "Ethiopian",
  "Dominican Republic": "Dominican",
  "Yemen": "Yemeni",
  "Lesotho": "Lesothan",
  "Botswana": "Botswanan",
  "Singapore": "Singaporean",
  "Lithuania": "Lithuanian",
  "Guyana": "Guyanese",
  "New Caledonia": "Caledonian",
  "St. Kitts and Nevis": "Kittitian",
  "Solomon Islands": "SolomonIslander",
  "Puerto Rico": "PuertoRican",
  "Fiji": "Fijian",
  "Hong Kong": "HongKonger",
  "Tahiti": "Tahitian",
  "Myanmar": "Burmese",
  "Moldova": "Moldovan",
  "Vanuatu": "Vanuatuan",
  "Malta": "Maltese",
  "Antigua and Barbuda": "Antiguan",
  "Grenada": "Grenadian",
  "Cuba": "Cuban",
  "Eswatini": "Swazi",
  "St. Lucia": "SaintLucian",
  "Bermuda": "Bermudian",
  "Papua New Guinea": "Papuan",
  "South Sudan": "SouthSudanese",
  "St. Vincent / Grenadines": "Vincentian",
  "Afghanistan": "Afghan",
  "Andorra": "Andorran",
  "Maldives": "Maldivian",
  "Chinese Taipei": "Taiwanese",
  "Cambodia": "Cambodian",
  "Montserrat": "Montserratian",
  "Nepal": "Nepalese",
  "Mauritius": "Mauritian",
  "Barbados": "Barbadian",
  "Belize": "Belizean",
  "Bangladesh": "Bangladeshi",
  "Dominica": "Dominican",
  "Chad": "Chadian",
  "Eritrea": "Eritrean",
  "Laos": "Laotian",
  "Cook Islands": "CookIslander",
  "Sri Lanka": "SriLankan",
  "Samoa": "Samoan",
  "Aruba": "Aruban",
  "Mongolia": "Mongolian",
  "American Samoa": "AmericanSamoan",
  "Bhutan": "Bhutanese",
  "Macau": "Macanese",
  "Brunei": "Bruneian",
  "São Tomé and Príncipe": "Santomean",
  "Djibouti": "Djiboutian",
  "Cayman Islands": "Caymanian",
  "Pakistan": "Pakistani",
  "Somalia": "Somalian",
  "Tonga": "Tongan",
  "Timor-Leste": "Timorese",
  "Gibraltar": "Gibraltarian",
  "Guam": "Guamanian",
  "Seychelles": "Seychellois",
  "Turks and Caicos Islands": "TurksIslander",
  "Liechtenstein": "Liechtensteiner",
  "Bahamas": "Bahamian",
  "US Virgin Islands": "VirginIslander",
  "British Virgin Islands": "VirginIslander",
  "Anguilla": "Anguillan",
  "San Marino": "SanMarinese"
};

// 5. Generate player names using data.js name generator logic
function generatePlayerNameForNat(nat) {
  let targetNat = nat;
  if (mappings[nat]) {
    targetNat = mappings[nat];
  }
  const bank = nationalNames[targetNat] || nationalNames["Brazilian"];
  const f = pickRandom(bank.first);
  const l = pickRandom(bank.last);
  return `${f} ${l}`;
}

const finalRankings = [];

for (const countryObj of liveRankings) {
  const country = countryObj.country;
  const rank = countryObj.rank;
  const points = countryObj.points;

  // Determine demonym
  const demonym = countryToDemonym[country] || country;

  // Get real star players for this demonym
  const realPlayers = starPlayersByNat[demonym] || [];

  // Generate unique list of 24 players
  const playerNames = new Set(realPlayers);

  // Fill up to 24 players
  while (playerNames.size < 24) {
    const generatedName = generatePlayerNameForNat(demonym);
    playerNames.add(generatedName);
  }

  finalRankings.push({
    position: rank,
    country: country,
    points: points,
    players: Array.from(playerNames)
  });
}

// Write to fifa_rankings_with_players.json
const outputFilePath = 'c:/Users/gordo/Desktop/teste/sla/fifa_rankings_with_players.json';
fs.writeFileSync(outputFilePath, JSON.stringify({ rankings: finalRankings }, null, 2), 'utf-8');

console.log(`Successfully generated rankings with players for ${finalRankings.length} countries!`);

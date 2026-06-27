# generate_rankings.py
import json
import re
import random
import os

# Helper to load scratchpad file
scratchpad_path = r'C:\Users\gordo\.gemini\antigravity\brain\ad5e9e63-c89e-4232-8381-f0d24497678e\browser\scratchpad_klq3tja8.md'
with open(scratchpad_path, 'r', encoding='utf-8') as f:
    scratch_content = f.read()

# Find the JSON array starting with [\n  {
start_idx = scratch_content.find('[\n  {')
if start_idx == -1:
    start_idx = scratch_content.find('[\n    {')
if start_idx == -1:
    # fallback to first [ after ## Extracted Data
    header_idx = scratch_content.find('## Extracted Data')
    start_idx = scratch_content.find('[', header_idx)

end_idx = scratch_content.find(']', start_idx) + 1

if start_idx != -1 and end_idx != 0:
    json_str = scratch_content[start_idx:end_idx]
    live_rankings = json.loads(json_str)
else:
    print("Could not find rankings JSON brackets in scratchpad")
    exit(1)

# Read data.js
data_js_path = r'c:\Users\gordo\Desktop\teste\sla\data.js'
with open(data_js_path, 'r', encoding='utf-8') as f:
    data_js = f.read()

# Extract STAR_PLAYERS
star_players_match = re.search(r'const STAR_PLAYERS\s*=\s*(\{[\s\S]*?\n\s*\});', data_js)
if not star_players_match:
    print("STAR_PLAYERS not found in data.js")
    exit(1)

js_star_players_str = star_players_match.group(1)
star_players = {}
current_club = None
for line in js_star_players_str.split('\n'):
    line = line.strip()
    if not line:
        continue
    club_match = re.match(r'^["\']([^"\']+)["\']\s*:\s*\[', line)
    if club_match:
        current_club = club_match.group(1)
        star_players[current_club] = []
    elif line == "]," or line == "]":
        current_club = None
    elif current_club and line.startswith('{'):
        name_m = re.search(r'name:\s*["\']([^"\']+)["\']', line)
        pos_m = re.search(r'pos:\s*["\']([^"\']+)["\']', line)
        rating_m = re.search(r'rating:\s*(\d+)', line)
        age_m = re.search(r'age:\s*(\d+)', line)
        nat_m = re.search(r'nat:\s*["\']([^"\']+)["\']', line)
        traits_m = re.search(r'traits:\s*\[([^\]]+)\]', line)
        
        if name_m and nat_m:
            player = {
                "name": name_m.group(1),
                "pos": pos_m.group(1) if pos_m else "",
                "rating": int(rating_m.group(1)) if rating_m else 80,
                "age": int(age_m.group(1)) if age_m else 25,
                "nat": nat_m.group(1),
                "traits": [t.strip().strip('"').strip("'") for t in traits_m.group(1).split(',')] if traits_m else []
            }
            star_players[current_club].append(player)

# Group star players by nationality
star_players_by_nat = {}
for club, players in star_players.items():
    for p in players:
        nat = p["nat"]
        if nat not in star_players_by_nat:
            star_players_by_nat[nat] = []
        if p["name"] not in star_players_by_nat[nat]:
            star_players_by_nat[nat].append(p["name"])

# Extract NATIONAL_NAMES
national_names_match = re.search(r'const NATIONAL_NAMES\s*=\s*(\{[\s\S]*?\n\s*\});', data_js)
if not national_names_match:
    print("NATIONAL_NAMES not found in data.js")
    exit(1)

js_national_names_str = national_names_match.group(1)
national_names = {}
current_nat = None
for line in js_national_names_str.split('\n'):
    line = line.strip()
    if not line:
        continue
    nat_header_match = re.match(r'^["\']([^"\']+)["\']\s*:\s*\{', line)
    if nat_header_match:
        current_nat = nat_header_match.group(1)
        national_names[current_nat] = {"first": [], "last": []}
    elif line == "}," or line == "}":
        current_nat = None
    elif current_nat:
        first_match = re.search(r'first:\s*\[([^\]]+)\]', line)
        last_match = re.search(r'last:\s*\[([^\]]+)\]', line)
        if first_match:
            names = [n.strip().strip('"').strip("'") for n in first_match.group(1).split(',')]
            national_names[current_nat]["first"] = names
        elif last_match:
            names = [n.strip().strip('"').strip("'") for n in last_match.group(1).split(',')]
            national_names[current_nat]["last"] = names

# Extract mappings from generatePlayerName
mappings_match = re.search(r'const mappings\s*=\s*\{([\s\S]*?)\n\s*\};', data_js)
mappings = {}
if mappings_match:
    js_mappings_str = mappings_match.group(1)
    for line in js_mappings_str.split('\n'):
        line = line.strip()
        m = re.match(r'^["\']([^"\']+)["\']\s*:\s*["\']([^"\']+)["\']', line)
        if m:
            mappings[m.group(1)] = m.group(2)

# Demonym mapping
country_to_demonym = {
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
}

def generate_player_name_for_nat(nat):
    target_nat = nat
    if nat in mappings:
        target_nat = mappings[nat]
    bank = national_names.get(target_nat, national_names.get("Brazilian"))
    if not bank or not bank.get("first") or not bank.get("last"):
        bank = national_names.get("Brazilian")
    f = random.choice(bank["first"])
    l = random.choice(bank["last"])
    return f"{f} {l}"

final_rankings = []

for country_obj in live_rankings:
    country = country_obj["country"]
    rank = country_obj["rank"]
    points = country_obj["points"]
    
    demonym = country_to_demonym.get(country, country)
    real_players = star_players_by_nat.get(demonym, [])
    
    player_names = set(real_players)
    
    # Try generating names
    while len(player_names) < 24:
        player_names.add(generate_player_name_for_nat(demonym))
        
    final_rankings.append({
        "position": rank,
        "country": country,
        "points": points,
        "players": list(player_names)
    })

# Write to file
output_path = r'c:\Users\gordo\Desktop\teste\sla\fifa_rankings_with_players.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump({"rankings": final_rankings}, f, ensure_ascii=False, indent=2)

print(f"Generated rankings with players for {len(final_rankings)} countries.")

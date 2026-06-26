// data.js - Database and Generator for Brasfoot Global

const LEAGUES_DATA = [
  {
    id: "br_a",
    name: "Campeonato Brasileiro - Série A",
    country: "Brasil",
    nationality: "Brazilian",
    reputation: 4.0,
    teams: [
      { name: "Palmeiras", colors: ["#006437", "#ffffff"], reputation: 4.5 },
      { name: "Flamengo", colors: ["#d30a13", "#111111"], reputation: 4.5 },
      { name: "Botafogo", colors: ["#111111", "#ffffff"], reputation: 4.2 },
      { name: "Atlético-MG", colors: ["#111111", "#ffffff"], reputation: 4.2 },
      { name: "São Paulo", colors: ["#ffffff", "#d30a13"], reputation: 4.2 },
      { name: "Fluminense", colors: ["#800020", "#006437"], reputation: 4.0 },
      { name: "Grêmio", colors: ["#0d8cd5", "#ffffff"], reputation: 4.0 },
      { name: "Athletico-PR", colors: ["#d30a13", "#111111"], reputation: 3.8 },
      { name: "Internacional", colors: ["#d30a13", "#ffffff"], reputation: 4.0 },
      { name: "Fortaleza", colors: ["#0056b3", "#d30a13"], reputation: 3.9 },
      { name: "Corinthians", colors: ["#ffffff", "#111111"], reputation: 4.1 },
      { name: "Bahia", colors: ["#0056b3", "#ffffff"], reputation: 3.8 },
      { name: "Vasco da Gama", colors: ["#111111", "#ffffff"], reputation: 3.8 },
      { name: "Cruzeiro", colors: ["#0033a0", "#ffffff"], reputation: 3.9 },
      { name: "Red Bull Bragantino", colors: ["#ffffff", "#d30a13"], reputation: 3.7 },
      { name: "Juventude", colors: ["#006437", "#ffffff"], reputation: 3.2 },
      { name: "Criciúma", colors: ["#ffcc00", "#111111"], reputation: 3.2 },
      { name: "Vitória", colors: ["#d30a13", "#111111"], reputation: 3.3 },
      { name: "Atlético-GO", colors: ["#d30a13", "#111111"], reputation: 3.1 },
      { name: "Cuiabá", colors: ["#006437", "#ffcc00"], reputation: 3.2 }
    ]
  },
  {
    id: "br_b",
    name: "Campeonato Brasileiro - Série B",
    country: "Brasil",
    nationality: "Brazilian",
    reputation: 2.8,
    teams: [
      { name: "Santos", colors: ["#ffffff", "#111111"], reputation: 3.8 },
      { name: "Coritiba", colors: ["#006437", "#ffffff"], reputation: 3.3 },
      { name: "América-MG", colors: ["#006437", "#111111"], reputation: 3.2 },
      { name: "Goiás", colors: ["#006437", "#ffffff"], reputation: 3.2 },
      { name: "Sport Recife", colors: ["#d30a13", "#ffcc00"], reputation: 3.3 },
      { name: "Ceará", colors: ["#111111", "#ffffff"], reputation: 3.3 },
      { name: "Novorizontino", colors: ["#ffcc00", "#111111"], reputation: 3.0 },
      { name: "Vila Nova", colors: ["#d30a13", "#ffffff"], reputation: 2.9 },
      { name: "Mirassol", colors: ["#ffcc00", "#006437"], reputation: 2.8 },
      { name: "Operário-PR", colors: ["#ffffff", "#111111"], reputation: 2.7 },
      { name: "Avaí", colors: ["#0056b3", "#ffffff"], reputation: 2.9 },
      { name: "Amazonas FC", colors: ["#ffcc00", "#111111"], reputation: 2.6 },
      { name: "CRB", colors: ["#d30a13", "#ffffff"], reputation: 2.8 },
      { name: "Ponte Preta", colors: ["#ffffff", "#111111"], reputation: 2.8 },
      { name: "Chapecoense", colors: ["#006437", "#ffffff"], reputation: 2.8 },
      { name: "Paysandu", colors: ["#5cbbf6", "#ffffff"], reputation: 2.8 },
      { name: "Botafogo-SP", colors: ["#d30a13", "#ffffff"], reputation: 2.6 },
      { name: "Brusque", colors: ["#ffcc00", "#006437"], reputation: 2.5 },
      { name: "Guarani", colors: ["#006437", "#ffffff"], reputation: 2.7 },
      { name: "Ituano", colors: ["#111111", "#d30a13"], reputation: 2.5 }
    ]
  },
  {
    id: "en_a",
    name: "Premier League (Inglaterra)",
    country: "Inglaterra",
    nationality: "English",
    reputation: 4.8,
    teams: [
      { name: "Manchester City", colors: ["#6cabdd", "#1c2c5b"], reputation: 5.0 },
      { name: "Arsenal", colors: ["#ef0107", "#ffffff"], reputation: 4.8 },
      { name: "Liverpool", colors: ["#c8102e", "#f6eb61"], reputation: 4.8 },
      { name: "Aston Villa", colors: ["#95bfe5", "#670e36"], reputation: 4.3 },
      { name: "Tottenham Hotspur", colors: ["#ffffff", "#132257"], reputation: 4.4 },
      { name: "Chelsea", colors: ["#034694", "#ffffff"], reputation: 4.5 },
      { name: "Manchester United", colors: ["#da291c", "#ffffff"], reputation: 4.6 },
      { name: "Newcastle United", colors: ["#111111", "#ffffff"], reputation: 4.3 },
      { name: "West Ham United", colors: ["#7a263a", "#1bb1e7"], reputation: 4.0 },
      { name: "Brighton & Hove Albion", colors: ["#0057b8", "#ffffff"], reputation: 4.0 },
      { name: "Wolverhampton", colors: ["#fdb913", "#231f20"], reputation: 3.7 },
      { name: "Bournemouth", colors: ["#b50e12", "#111111"], reputation: 3.6 },
      { name: "Crystal Palace", colors: ["#1b458f", "#c4122e"], reputation: 3.7 },
      { name: "Fulham", colors: ["#ffffff", "#111111"], reputation: 3.7 },
      { name: "Everton", colors: ["#003399", "#ffffff"], reputation: 3.8 },
      { name: "Brentford", colors: ["#e30613", "#ffffff"], reputation: 3.6 },
      { name: "Nottingham Forest", colors: ["#dd0000", "#ffffff"], reputation: 3.6 },
      { name: "Leicester City", colors: ["#003090", "#fdbb30"], reputation: 3.7 },
      { name: "Ipswich Town", colors: ["#0000ff", "#ffffff"], reputation: 3.3 },
      { name: "Southampton", colors: ["#d71920", "#ffffff"], reputation: 3.4 }
    ]
  },
  {
    id: "en_b",
    name: "EFL Championship (Inglaterra)",
    country: "Inglaterra",
    nationality: "English",
    reputation: 3.4,
    teams: [
      { name: "Leeds United", colors: ["#ffffff", "#ffcd00"], reputation: 3.8 },
      { name: "Burnley", colors: ["#6c1d45", "#99d6ea"], reputation: 3.6 },
      { name: "Luton Town", colors: ["#f78e1e", "#002d62"], reputation: 3.5 },
      { name: "Sheffield United", colors: ["#e30613", "#ffffff"], reputation: 3.5 },
      { name: "West Bromwich Albion", colors: ["#12294b", "#ffffff"], reputation: 3.4 },
      { name: "Norwich City", colors: ["#fff200", "#00a651"], reputation: 3.4 },
      { name: "Coventry City", colors: ["#7fc6ec", "#ffffff"], reputation: 3.3 },
      { name: "Hull City", colors: ["#ff9900", "#111111"], reputation: 3.3 },
      { name: "Middlesbrough", colors: ["#e20e0e", "#ffffff"], reputation: 3.3 },
      { name: "Bristol City", colors: ["#e30613", "#ffffff"], reputation: 3.2 },
      { name: "Cardiff City", colors: ["#0000ff", "#ffffff"], reputation: 3.2 },
      { name: "Millwall", colors: ["#003366", "#ffffff"], reputation: 3.1 },
      { name: "Swansea City", colors: ["#ffffff", "#111111"], reputation: 3.2 },
      { name: "Watford", colors: ["#ffee00", "#111111"], reputation: 3.3 },
      { name: "Sunderland", colors: ["#ff0000", "#ffffff"], reputation: 3.4 },
      { name: "Queens Park Rangers", colors: ["#0000ff", "#ffffff"], reputation: 3.1 },
      { name: "Preston North End", colors: ["#ffffff", "#000033"], reputation: 3.1 },
      { name: "Blackburn Rovers", colors: ["#0099ff", "#ffffff"], reputation: 3.2 },
      { name: "Stoke City", colors: ["#ff0000", "#ffffff"], reputation: 3.2 },
      { name: "Plymouth Argyle", colors: ["#005234", "#ffffff"], reputation: 2.9 },
      { name: "Portsmouth", colors: ["#0000ff", "#ffffff"], reputation: 3.0 },
      { name: "Derby County", colors: ["#ffffff", "#111111"], reputation: 3.2 },
      { name: "Oxford United", colors: ["#ffff00", "#0000ff"], reputation: 2.8 },
      { name: "Sheffield Wednesday", colors: ["#0000ff", "#ffffff"], reputation: 3.1 }
    ]
  },
  {
    id: "es_a",
    name: "La Liga (Espanha)",
    country: "Espanha",
    nationality: "Spanish",
    reputation: 4.6,
    teams: [
      { name: "Real Madrid", colors: ["#ffffff", "#febe10"], reputation: 5.0 },
      { name: "Barcelona", colors: ["#004d98", "#a50044"], reputation: 4.9 },
      { name: "Atlético de Madrid", colors: ["#cb3524", "#0f2146"], reputation: 4.7 },
      { name: "Girona FC", colors: ["#e20e0e", "#ffffff"], reputation: 4.2 },
      { name: "Athletic Bilbao", colors: ["#e30613", "#ffffff"], reputation: 4.3 },
      { name: "Real Sociedad", colors: ["#0000ff", "#ffffff"], reputation: 4.3 },
      { name: "Real Betis", colors: ["#00b050", "#ffffff"], reputation: 4.1 },
      { name: "Villarreal", colors: ["#ffcc00", "#000099"], reputation: 4.1 },
      { name: "Valencia CF", colors: ["#ffffff", "#ff6600"], reputation: 4.0 },
      { name: "Osasuna", colors: ["#9b0000", "#000080"], reputation: 3.7 },
      { name: "Getafe CF", colors: ["#0000ff", "#ffffff"], reputation: 3.7 },
      { name: "Celta de Vigo", colors: ["#87baf2", "#ffffff"], reputation: 3.7 },
      { name: "Sevilla FC", colors: ["#ffffff", "#d30a13"], reputation: 4.0 },
      { name: "RCD Mallorca", colors: ["#ff0000", "#111111"], reputation: 3.7 },
      { name: "Las Palmas", colors: ["#ffff00", "#0000ff"], reputation: 3.5 },
      { name: "Rayo Vallecano", colors: ["#ffffff", "#ff0000"], reputation: 3.5 },
      { name: "Deportivo Alavés", colors: ["#0000ff", "#ffffff"], reputation: 3.5 },
      { name: "Leganés", colors: ["#0000ff", "#ffffff"], reputation: 3.3 },
      { name: "Real Valladolid", colors: ["#7d2181", "#ffffff"], reputation: 3.3 },
      { name: "Espanyol", colors: ["#0000ff", "#ffffff"], reputation: 3.4 }
    ]
  },
  {
    id: "it_a",
    name: "Serie A (Itália)",
    country: "Itália",
    nationality: "Italian",
    reputation: 4.5,
    teams: [
      { name: "Inter de Milão", colors: ["#002f6c", "#111111"], reputation: 4.8 },
      { name: "Milan", colors: ["#d30a13", "#111111"], reputation: 4.6 },
      { name: "Juventus", colors: ["#ffffff", "#111111"], reputation: 4.7 },
      { name: "Atalanta", colors: ["#0000ff", "#111111"], reputation: 4.4 },
      { name: "Roma", colors: ["#7a1515", "#eab308"], reputation: 4.4 },
      { name: "Lazio", colors: ["#87ceff", "#ffffff"], reputation: 4.3 },
      { name: "Fiorentina", colors: ["#4b0082", "#ffffff"], reputation: 4.2 },
      { name: "Napoli", colors: ["#12a0d3", "#ffffff"], reputation: 4.5 },
      { name: "Bologna", colors: ["#003366", "#cc0000"], reputation: 4.1 },
      { name: "Torino", colors: ["#800000", "#ffffff"], reputation: 3.9 },
      { name: "Genoa", colors: ["#990000", "#002b49"], reputation: 3.7 },
      { name: "Monza", colors: ["#e30613", "#ffffff"], reputation: 3.6 },
      { name: "Verona", colors: ["#003399", "#ffff00"], reputation: 3.6 },
      { name: "Lecce", colors: ["#cc0000", "#ffff00"], reputation: 3.5 },
      { name: "Udinese", colors: ["#ffffff", "#111111"], reputation: 3.7 },
      { name: "Cagliari", colors: ["#990000", "#000066"], reputation: 3.6 },
      { name: "Empoli", colors: ["#0000ff", "#ffffff"], reputation: 3.5 },
      { name: "Parma", colors: ["#ffffff", "#000080"], reputation: 3.5 },
      { name: "Como", colors: ["#0055a5", "#ffffff"], reputation: 3.5 },
      { name: "Venezia", colors: ["#111111", "#ff6600"], reputation: 3.3 }
    ]
  },
  {
    id: "de_a",
    name: "Bundesliga (Alemanha)",
    country: "Alemanha",
    nationality: "German",
    reputation: 4.5,
    teams: [
      { name: "Bayern de Munique", colors: ["#dc052d", "#ffffff"], reputation: 4.9 },
      { name: "Bayer Leverkusen", colors: ["#e32219", "#111111"], reputation: 4.7 },
      { name: "Borussia Dortmund", colors: ["#fde100", "#111111"], reputation: 4.6 },
      { name: "RB Leipzig", colors: ["#ffffff", "#d30a13"], reputation: 4.5 },
      { name: "VfB Stuttgart", colors: ["#ffffff", "#e30613"], reputation: 4.3 },
      { name: "Eintracht Frankfurt", colors: ["#e30613", "#111111"], reputation: 4.2 },
      { name: "Hoffenheim", colors: ["#1c63b7", "#ffffff"], reputation: 3.9 },
      { name: "Freiburg", colors: ["#d30a13", "#ffffff"], reputation: 3.9 },
      { name: "Heidenheim", colors: ["#e30613", "#0000ff"], reputation: 3.7 },
      { name: "Werder Bremen", colors: ["#098343", "#ffffff"], reputation: 3.9 },
      { name: "Augsburg", colors: ["#ffffff", "#008754"], reputation: 3.6 },
      { name: "VfL Wolfsburg", colors: ["#60b236", "#ffffff"], reputation: 3.9 },
      { name: "Borussia M'gladbach", colors: ["#ffffff", "#00a63f"], reputation: 3.8 },
      { name: "Mainz 05", colors: ["#c31218", "#ffffff"], reputation: 3.7 },
      { name: "Union Berlin", colors: ["#ff0000", "#ffffff"], reputation: 3.7 },
      { name: "VfL Bochum", colors: ["#005ca9", "#ffffff"], reputation: 3.4 },
      { name: "FC St. Pauli", colors: ["#5e3c23", "#ffffff"], reputation: 3.4 },
      { name: "Holstein Kiel", colors: ["#004e9c", "#ffffff"], reputation: 3.2 }
    ]
  },
  {
    id: "fr_a",
    name: "Ligue 1 (França)",
    country: "França",
    nationality: "French",
    reputation: 4.2,
    teams: [
      { name: "Paris Saint-Germain", colors: ["#0052b4", "#e30613"], reputation: 4.8 },
      { name: "Monaco", colors: ["#e30613", "#ffffff"], reputation: 4.3 },
      { name: "Lille", colors: ["#d30a13", "#002b49"], reputation: 4.2 },
      { name: "Marseille", colors: ["#ffffff", "#00a6ff"], reputation: 4.3 },
      { name: "Nice", colors: ["#d30a13", "#111111"], reputation: 4.0 },
      { name: "Lens", colors: ["#ffcc00", "#cc0000"], reputation: 4.0 },
      { name: "Lyon", colors: ["#ffffff", "#0000ff"], reputation: 4.2 },
      { name: "Brest", colors: ["#ff0000", "#ffffff"], reputation: 4.0 },
      { name: "Reims", colors: ["#ff0000", "#ffffff"], reputation: 3.7 },
      { name: "Rennes", colors: ["#d30a13", "#111111"], reputation: 3.9 },
      { name: "Toulouse", colors: ["#5d2e8f", "#ffffff"], reputation: 3.7 },
      { name: "Montpellier", colors: ["#002b49", "#ff6600"], reputation: 3.6 },
      { name: "Strasbourg", colors: ["#0055a5", "#ffffff"], reputation: 3.7 },
      { name: "Le Havre", colors: ["#8bc5ff", "#002a54"], reputation: 3.4 },
      { name: "Nantes", colors: ["#ffff00", "#00aa00"], reputation: 3.6 },
      { name: "Auxerre", colors: ["#ffffff", "#0055ff"], reputation: 3.4 },
      { name: "Saint-Étienne", colors: ["#009944", "#ffffff"], reputation: 3.5 },
      { name: "Angers", colors: ["#111111", "#ffffff"], reputation: 3.3 }
    ]
  },
  {
    id: "pt_a",
    name: "Primeira Liga (Portugal)",
    country: "Portugal",
    nationality: "Portuguese",
    reputation: 3.8,
    teams: [
      { name: "Sporting CP", colors: ["#008000", "#ffffff"], reputation: 4.4 },
      { name: "Benfica", colors: ["#ff0000", "#ffffff"], reputation: 4.4 },
      { name: "FC Porto", colors: ["#0000ff", "#ffffff"], reputation: 4.4 },
      { name: "SC Braga", colors: ["#ff0000", "#ffffff"], reputation: 3.9 },
      { name: "Vitória de Guimarães", colors: ["#ffffff", "#111111"], reputation: 3.7 },
      { name: "Moreirense", colors: ["#008000", "#ffffff"], reputation: 3.4 },
      { name: "Arouca", colors: ["#ffff00", "#0000ff"], reputation: 3.3 },
      { name: "Famalicão", colors: ["#0000ff", "#ffffff"], reputation: 3.3 },
      { name: "Gil Vicente", colors: ["#ff0000", "#ffffff"], reputation: 3.2 },
      { name: "Farense", colors: ["#ffffff", "#111111"], reputation: 3.1 },
      { name: "Rio Ave", colors: ["#008000", "#ffffff"], reputation: 3.2 },
      { name: "Estoril Praia", colors: ["#ffff00", "#0000ff"], reputation: 3.1 },
      { name: "Boavista", colors: ["#111111", "#ffffff"], reputation: 3.2 },
      { name: "Estrela da Amadora", colors: ["#ff0000", "#008000"], reputation: 3.0 },
      { name: "Casa Pia", colors: ["#111111", "#ffffff"], reputation: 3.1 },
      { name: "Santa Clara", colors: ["#ff0000", "#ffffff"], reputation: 3.2 },
      { name: "Nacional da Madeira", colors: ["#111111", "#ffffff"], reputation: 3.0 },
      { name: "AVS Futebol SAD", colors: ["#ff0000", "#ffffff"], reputation: 2.9 }
    ]
  },
  {
    id: "sa_a",
    name: "Saudi Pro League (Arábia)",
    country: "Arábia Saudita",
    nationality: "Saudi",
    reputation: 3.8,
    teams: [
      { name: "Al-Hilal", colors: ["#0055ff", "#ffffff"], reputation: 4.6 },
      { name: "Al-Nassr", colors: ["#ffff00", "#0000ff"], reputation: 4.4 },
      { name: "Al-Ahli", colors: ["#008000", "#ffffff"], reputation: 4.2 },
      { name: "Al-Ittihad", colors: ["#ffff00", "#111111"], reputation: 4.3 },
      { name: "Al-Taawoun", colors: ["#ffff00", "#0000ff"], reputation: 3.5 },
      { name: "Al-Ettifaq", colors: ["#008000", "#ff0000"], reputation: 3.6 },
      { name: "Al-Shabab", colors: ["#ffffff", "#111111"], reputation: 3.7 },
      { name: "Al-Fateh", colors: ["#0000ff", "#00ff00"], reputation: 3.3 },
      { name: "Al-Damac", colors: ["#ff0000", "#ffff00"], reputation: 3.2 },
      { name: "Al-Khaleej", colors: ["#008000", "#ffff00"], reputation: 3.1 },
      { name: "Al-Raed", colors: ["#ff0000", "#ffffff"], reputation: 3.1 },
      { name: "Al-Wehda", colors: ["#ff0000", "#ffffff"], reputation: 3.1 },
      { name: "Al-Riyadh", colors: ["#ff0000", "#111111"], reputation: 3.0 },
      { name: "Al-Okhdood", colors: ["#0000ff", "#ffffff"], reputation: 2.9 },
      { name: "Al-Orubah", colors: ["#0000ff", "#ffff00"], reputation: 2.9 },
      { name: "Al-Qadsiah", colors: ["#7a1515", "#ffff00"], reputation: 3.4 },
      { name: "Al-Kholood", colors: ["#008000", "#ff0000"], reputation: 2.9 },
      { name: "Al-Fayha", colors: ["#ff6600", "#0000ff"], reputation: 3.1 }
    ]
  },
  {
    id: "us_a",
    name: "Major League Soccer (EUA)",
    country: "EUA",
    nationality: "American",
    reputation: 3.5,
    teams: [
      { name: "Inter Miami CF", colors: ["#ffb6c1", "#111111"], reputation: 4.1 },
      { name: "Columbus Crew", colors: ["#ffff00", "#111111"], reputation: 3.8 },
      { name: "LA Galaxy", colors: ["#ffffff", "#000080"], reputation: 3.8 },
      { name: "Los Angeles FC", colors: ["#111111", "#d4af37"], reputation: 3.9 },
      { name: "FC Cincinnati", colors: ["#0000ff", "#ff6600"], reputation: 3.6 },
      { name: "Real Salt Lake", colors: ["#b30838", "#082040"], reputation: 3.5 },
      { name: "Seattle Sounders FC", colors: ["#5d9732", "#004f80"], reputation: 3.6 },
      { name: "Houston Dynamo", colors: ["#ff6600", "#111111"], reputation: 3.4 },
      { name: "Orlando City SC", colors: ["#4b0082", "#ffff00"], reputation: 3.5 },
      { name: "New York City FC", colors: ["#6cabdd", "#00285e"], reputation: 3.5 },
      { name: "New York Red Bulls", colors: ["#ffffff", "#ff0000"], reputation: 3.5 },
      { name: "Charlotte FC", colors: ["#008ed6", "#111111"], reputation: 3.4 },
      { name: "Portland Timbers", colors: ["#004812", "#eed316"], reputation: 3.4 },
      { name: "Vancouver Whitecaps", colors: ["#ffffff", "#00285e"], reputation: 3.3 },
      { name: "Colorado Rapids", colors: ["#800020", "#8bc5ff"], reputation: 3.3 },
      { name: "Minnesota United FC", colors: ["#87cef8", "#111111"], reputation: 3.3 },
      { name: "Austin FC", colors: ["#00ff00", "#111111"], reputation: 3.2 },
      { name: "Sporting Kansas City", colors: ["#a1b4c7", "#00285e"], reputation: 3.3 },
      { name: "Nashville SC", colors: ["#ece81a", "#1b1d3d"], reputation: 3.4 },
      { name: "Atlanta United FC", colors: ["#800020", "#111111"], reputation: 3.5 }
    ]
  },
  {
    id: "ar_a",
    name: "Primera División (Argentina)",
    country: "Argentina",
    nationality: "Argentinian",
    reputation: 3.7,
    teams: [
      { name: "River Plate", colors: ["#ffffff", "#ff0000"], reputation: 4.4 },
      { name: "Boca Juniors", colors: ["#000080", "#ffff00"], reputation: 4.4 },
      { name: "Racing Club", colors: ["#8bc5ff", "#ffffff"], reputation: 4.1 },
      { name: "Independiente", colors: ["#ff0000", "#ffffff"], reputation: 4.0 },
      { name: "San Lorenzo", colors: ["#000080", "#ff0000"], reputation: 4.0 },
      { name: "Talleres de Córdoba", colors: ["#000080", "#ffffff"], reputation: 3.9 },
      { name: "Estudiantes de La Plata", colors: ["#ff0000", "#ffffff"], reputation: 3.9 },
      { name: "Lanús", colors: ["#800020", "#ffffff"], reputation: 3.7 },
      { name: "Defensa y Justicia", colors: ["#008000", "#ffff00"], reputation: 3.6 },
      { name: "Godoy Cruz", colors: ["#0000ff", "#ffffff"], reputation: 3.6 },
      { name: "Argentinos Juniors", colors: ["#ff0000", "#ffffff"], reputation: 3.7 },
      { name: "Vélez Sarsfield", colors: ["#ffffff", "#0000ff"], reputation: 3.8 },
      { name: "Newell's Old Boys", colors: ["#111111", "#ff0000"], reputation: 3.6 },
      { name: "Rosario Central", colors: ["#000080", "#ffff00"], reputation: 3.7 },
      { name: "Huracán", colors: ["#ffffff", "#ff0000"], reputation: 3.6 },
      { name: "Atlético Tucumán", colors: ["#8bc5ff", "#ffffff"], reputation: 3.5 },
      { name: "Belgrano", colors: ["#87cef8", "#ffffff"], reputation: 3.5 },
      { name: "Unión de Santa Fe", colors: ["#ff0000", "#ffffff"], reputation: 3.4 },
      { name: "Platense", colors: ["#ffffff", "#5e3c23"], reputation: 3.3 },
      { name: "Banfield", colors: ["#008000", "#ffffff"], reputation: 3.4 }
    ]
  }
];

// Star Players definitions to pre-populate and give authenticity
const STAR_PLAYERS = {
  "Real Madrid": [
    { name: "Kylian Mbappé", pos: "ATA", rating: 96, age: 27, nat: "French", traits: ["Finalização", "Velocidade"] },
    { name: "Vinícius Júnior", pos: "ATA", rating: 95, age: 25, nat: "Brazilian", traits: ["Drible", "Velocidade"] },
    { name: "Jude Bellingham", pos: "MEI", rating: 94, age: 22, nat: "English", traits: ["Armação", "Finalização"] },
    { name: "Thibaut Courtois", pos: "GOL", rating: 92, age: 34, nat: "Belgian", traits: ["Reflexo", "Elasticidade"] },
    { name: "Fede Valverde", pos: "MEI", rating: 90, age: 27, nat: "Uruguayan", traits: ["Velocidade", "Passe"] },
    { name: "Rodrygo", pos: "ATA", rating: 89, age: 25, nat: "Brazilian", traits: ["Drible", "Velocidade"] },
    { name: "Eduardo Camavinga", pos: "MEI", rating: 88, age: 23, nat: "French", traits: ["Marcação", "Passe"] },
    { name: "Endrick", pos: "ATA", rating: 82, age: 19, nat: "Brazilian", traits: ["Finalização", "Força"] }
  ],
  "Manchester City": [
    { name: "Erling Haaland", pos: "ATA", rating: 96, age: 25, nat: "Norwegian", traits: ["Finalização", "Cabeceio"] },
    { name: "Kevin De Bruyne", pos: "MEI", rating: 94, age: 34, nat: "Belgian", traits: ["Passe", "Armação"] },
    { name: "Rodri", pos: "MEI", rating: 95, age: 29, nat: "Spanish", traits: ["Marcação", "Passe"] },
    { name: "Phil Foden", pos: "MEI", rating: 90, age: 26, nat: "English", traits: ["Drible", "Finalização"] },
    { name: "Ederson", pos: "GOL", rating: 89, age: 32, nat: "Brazilian", traits: ["Passe", "Reflexo"] },
    { name: "Bernardo Silva", pos: "MEI", rating: 88, age: 31, nat: "Portuguese", traits: ["Drible", "Passe"] },
    { name: "Rúben Dias", pos: "ZAG", rating: 90, age: 29, nat: "Portuguese", traits: ["Marcação", "Cabeceio"] },
    { name: "Savinho", pos: "ATA", rating: 84, age: 22, nat: "Brazilian", traits: ["Drible", "Velocidade"] }
  ],
  "Barcelona": [
    { name: "Robert Lewandowski", pos: "ATA", rating: 91, age: 37, nat: "Polish", traits: ["Finalização", "Cabeceio"] },
    { name: "Lamine Yamal", pos: "ATA", rating: 90, age: 18, nat: "Spanish", traits: ["Drible", "Velocidade"] },
    { name: "Pedri", pos: "MEI", rating: 89, age: 23, nat: "Spanish", traits: ["Passe", "Armação"] },
    { name: "Raphinha", pos: "ATA", rating: 88, age: 29, nat: "Brazilian", traits: ["Velocidade", "Finalização"] },
    { name: "Marc-André ter Stegen", pos: "GOL", rating: 89, age: 34, nat: "German", traits: ["Reflexo", "Elasticidade"] },
    { name: "Dani Olmo", pos: "MEI", rating: 87, age: 28, nat: "Spanish", traits: ["Drible", "Armação"] },
    { name: "Gavi", pos: "MEI", rating: 86, age: 21, nat: "Spanish", traits: ["Marcação", "Força"] }
  ],
  "Atlético de Madrid": [
    { name: "Antoine Griezmann", pos: "ATA", rating: 89, age: 35, nat: "French", traits: ["Armação", "Finalização"] },
    { name: "Julián Álvarez", pos: "ATA", rating: 88, age: 26, nat: "Argentinian", traits: ["Finalização", "Velocidade"] },
    { name: "Conor Gallagher", pos: "MEI", rating: 84, age: 26, nat: "English", traits: ["Marcação", "Força"] },
    { name: "Jan Oblak", pos: "GOL", rating: 88, age: 33, nat: "Slovenian", traits: ["Reflexo", "Elasticidade"] },
    { name: "Rodrigo De Paul", pos: "MEI", rating: 85, age: 32, nat: "Argentinian", traits: ["Passe", "Força"] }
  ],
  "Arsenal": [
    { name: "Bukayo Saka", pos: "ATA", rating: 91, age: 24, nat: "English", traits: ["Drible", "Finalização"] },
    { name: "Martin Ødegaard", pos: "MEI", rating: 91, age: 27, nat: "Norwegian", traits: ["Armação", "Passe"] },
    { name: "Declan Rice", pos: "MEI", rating: 90, age: 27, nat: "English", traits: ["Marcação", "Força"] },
    { name: "William Saliba", pos: "ZAG", rating: 90, age: 25, nat: "French", traits: ["Marcação", "Desarme"] },
    { name: "David Raya", pos: "GOL", rating: 87, age: 30, nat: "Spanish", traits: ["Reflexo", "Saída de Gol"] },
    { name: "Kai Havertz", pos: "ATA", rating: 85, age: 27, nat: "German", traits: ["Finalização", "Cabeceio"] }
  ],
  "Liverpool": [
    { name: "Mohamed Salah", pos: "ATA", rating: 92, age: 34, nat: "Egyptian", traits: ["Finalização", "Velocidade"] },
    { name: "Virgil van Dijk", pos: "ZAG", rating: 91, age: 34, nat: "Dutch", traits: ["Marcação", "Cabeceio"] },
    { name: "Alisson Becker", pos: "GOL", rating: 90, age: 33, nat: "Brazilian", traits: ["Reflexo", "Elasticidade"] },
    { name: "Alexis Mac Allister", pos: "MEI", rating: 87, age: 27, nat: "Argentinian", traits: ["Passe", "Armação"] },
    { name: "Luis Díaz", pos: "ATA", rating: 86, age: 29, nat: "Colombian", traits: ["Drible", "Velocidade"] },
    { name: "Trent Alexander-Arnold", pos: "LAT", rating: 88, age: 27, nat: "English", traits: ["Cruzamento", "Passe"] }
  ],
  "Chelsea": [
    { name: "Cole Palmer", pos: "MEI", rating: 90, age: 24, nat: "English", traits: ["Armação", "Finalização"] },
    { name: "Nicolas Jackson", pos: "ATA", rating: 84, age: 24, nat: "Senegalese", traits: ["Velocidade", "Finalização"] },
    { name: "Enzo Fernández", pos: "MEI", rating: 86, age: 25, nat: "Argentinian", traits: ["Passe", "Armação"] },
    { name: "Moisés Caicedo", pos: "MEI", rating: 86, age: 24, nat: "Ecuadorian", traits: ["Marcação", "Desarme"] },
    { name: "Christopher Nkunku", pos: "ATA", rating: 85, age: 28, nat: "French", traits: ["Drible", "Finalização"] },
    { name: "João Félix", pos: "ATA", rating: 83, age: 26, nat: "Portuguese", traits: ["Drible", "Passe"] }
  ],
  "Manchester United": [
    { name: "Bruno Fernandes", pos: "MEI", rating: 89, age: 31, nat: "Portuguese", traits: ["Armação", "Passe"] },
    { name: "Marcus Rashford", pos: "ATA", rating: 84, age: 28, nat: "English", traits: ["Velocidade", "Finalização"] },
    { name: "Kobbie Mainoo", pos: "MEI", rating: 83, age: 21, nat: "English", traits: ["Passe", "Drible"] },
    { name: "Alejandro Garnacho", pos: "ATA", rating: 83, age: 21, nat: "Argentinian", traits: ["Drible", "Velocidade"] },
    { name: "André Onana", pos: "GOL", rating: 85, age: 30, nat: "Cameroonian", traits: ["Reflexo", "Passe"] },
    { name: "Matthijs de Ligt", pos: "ZAG", rating: 84, age: 26, nat: "Dutch", traits: ["Marcação", "Cabeceio"] }
  ],
  "Paris Saint-Germain": [
    { name: "Ousmane Dembélé", pos: "ATA", rating: 88, age: 29, nat: "French", traits: ["Drible", "Velocidade"] },
    { name: "Achraf Hakimi", pos: "LAT", rating: 88, age: 27, nat: "Moroccan", traits: ["Cruzamento", "Velocidade"] },
    { name: "Bradley Barcola", pos: "ATA", rating: 86, age: 23, nat: "French", traits: ["Velocidade", "Drible"] },
    { name: "João Neves", pos: "MEI", rating: 85, age: 21, nat: "Portuguese", traits: ["Passe", "Marcação"] },
    { name: "Gianluigi Donnarumma", pos: "GOL", rating: 89, age: 27, nat: "Italian", traits: ["Reflexo", "Elasticidade"] }
  ],
  "Bayern de Munique": [
    { name: "Harry Kane", pos: "ATA", rating: 93, age: 32, nat: "English", traits: ["Finalização", "Cabeceio"] },
    { name: "Jamal Musiala", pos: "MEI", rating: 91, age: 23, nat: "German", traits: ["Drible", "Armação"] },
    { name: "Michael Olise", pos: "ATA", rating: 86, age: 24, nat: "French", traits: ["Drible", "Cruzamento"] },
    { name: "Joshua Kimmich", pos: "MEI", rating: 88, age: 31, nat: "German", traits: ["Passe", "Marcação"] },
    { name: "Manuel Neuer", pos: "GOL", rating: 86, age: 40, nat: "German", traits: ["Reflexo", "Elasticidade"] }
  ],
  "Bayer Leverkusen": [
    { name: "Florian Wirtz", pos: "MEI", rating: 92, age: 23, nat: "German", traits: ["Armação", "Drible"] },
    { name: "Alex Grimaldo", pos: "LAT", rating: 86, age: 30, nat: "Spanish", traits: ["Cruzamento", "Passe"] },
    { name: "Jeremie Frimpong", pos: "LAT", rating: 86, age: 25, nat: "Dutch", traits: ["Velocidade", "Drible"] },
    { name: "Granit Xhaka", pos: "MEI", rating: 86, age: 33, nat: "Swiss", traits: ["Passe", "Marcação"] },
    { name: "Victor Boniface", pos: "ATA", rating: 85, age: 25, nat: "Nigerian", traits: ["Finalização", "Força"] }
  ],
  "Inter de Milão": [
    { name: "Lautaro Martínez", pos: "ATA", rating: 91, age: 28, nat: "Argentinian", traits: ["Finalização", "Cabeceio"] },
    { name: "Nicolò Barella", pos: "MEI", rating: 89, age: 29, nat: "Italian", traits: ["Marcação", "Passe"] },
    { name: "Hakan Calhanoglu", pos: "MEI", rating: 88, age: 32, nat: "Turkish", traits: ["Passe", "Armação"] },
    { name: "Alessandro Bastoni", pos: "ZAG", rating: 88, age: 27, nat: "Italian", traits: ["Marcação", "Desarme"] },
    { name: "Yann Sommer", pos: "GOL", rating: 86, age: 37, nat: "Swiss", traits: ["Reflexo", "Elasticidade"] }
  ],
  "Juventus": [
    { name: "Dusan Vlahovic", pos: "ATA", rating: 87, age: 26, nat: "Serbian", traits: ["Finalização", "Força"] },
    { name: "Teun Koopmeiners", pos: "MEI", rating: 86, age: 28, nat: "Dutch", traits: ["Armação", "Passe"] },
    { name: "Gleison Bremer", pos: "ZAG", rating: 86, age: 29, nat: "Brazilian", traits: ["Marcação", "Força"] },
    { name: "Kenan Yildiz", pos: "ATA", rating: 81, age: 21, nat: "Turkish", traits: ["Drible", "Velocidade"] }
  ],
  "Milan": [
    { name: "Rafael Leão", pos: "ATA", rating: 89, age: 26, nat: "Portuguese", traits: ["Drible", "Velocidade"] },
    { name: "Christian Pulisic", pos: "MEI", rating: 85, age: 27, nat: "American", traits: ["Drible", "Velocidade"] },
    { name: "Theo Hernández", pos: "LAT", rating: 88, age: 28, nat: "French", traits: ["Velocidade", "Cruzamento"] },
    { name: "Mike Maignan", pos: "GOL", rating: 87, age: 30, nat: "French", traits: ["Reflexo", "Elasticidade"] }
  ],
  "Sporting CP": [
    { name: "Viktor Gyökeres", pos: "ATA", rating: 90, age: 28, nat: "Swedish", traits: ["Finalização", "Força"] },
    { name: "Morten Hjulmand", pos: "MEI", rating: 84, age: 27, nat: "Danish", traits: ["Marcação", "Passe"] },
    { name: "Pedro Gonçalves", pos: "MEI", rating: 83, age: 27, nat: "Portuguese", traits: ["Armação", "Finalização"] },
    { name: "Gonçalo Inácio", pos: "ZAG", rating: 83, age: 24, nat: "Portuguese", traits: ["Marcação", "Desarme"] }
  ],
  "Benfica": [
    { name: "Ángel Di María", pos: "MEI", rating: 83, age: 38, nat: "Argentinian", traits: ["Drible", "Armação"] },
    { name: "Vangelis Pavlidis", pos: "ATA", rating: 82, age: 27, nat: "Greek", traits: ["Finalização", "Cabeceio"] },
    { name: "Orkun Kökçü", pos: "MEI", rating: 82, age: 25, nat: "Turkish", traits: ["Passe", "Armação"] }
  ],
  "FC Porto": [
    { name: "Samu Omorodion", pos: "ATA", rating: 83, age: 22, nat: "Spanish", traits: ["Força", "Finalização"] },
    { name: "Galeno", pos: "ATA", rating: 81, age: 28, nat: "Brazilian", traits: ["Velocidade", "Drible"] },
    { name: "Diogo Costa", pos: "GOL", rating: 85, age: 26, nat: "Portuguese", traits: ["Reflexo", "Elasticidade"] }
  ],
  "Al-Hilal": [
    { name: "Neymar Jr", pos: "MEI", rating: 89, age: 34, nat: "Brazilian", traits: ["Drible", "Armação"] },
    { name: "Aleksandar Mitrovic", pos: "ATA", rating: 86, age: 31, nat: "Serbian", traits: ["Cabeceio", "Finalização"] },
    { name: "Sergej Milinkovic-Savic", pos: "MEI", rating: 86, age: 31, nat: "Serbian", traits: ["Cabeceio", "Armação"] },
    { name: "Rúben Neves", pos: "MEI", rating: 84, age: 29, nat: "Portuguese", traits: ["Passe", "Marcação"] },
    { name: "João Cancelo", pos: "LAT", rating: 85, age: 32, nat: "Portuguese", traits: ["Cruzamento", "Drible"] },
    { name: "Yassine Bounou", pos: "GOL", rating: 86, age: 35, nat: "Moroccan", traits: ["Reflexo", "Elasticidade"] }
  ],
  "Al-Nassr": [
    { name: "Cristiano Ronaldo", pos: "ATA", rating: 90, age: 41, nat: "Portuguese", traits: ["Finalização", "Cabeceio"] },
    { name: "Sadio Mané", pos: "ATA", rating: 84, age: 34, nat: "Senegalese", traits: ["Velocidade", "Drible"] },
    { name: "Aymeric Laporte", pos: "ZAG", rating: 85, age: 32, nat: "Spanish", traits: ["Marcação", "Cabeceio"] },
    { name: "Bento", pos: "GOL", rating: 82, age: 26, nat: "Brazilian", traits: ["Reflexo", "Elasticidade"] },
    { name: "Otávio", pos: "MEI", rating: 83, age: 31, nat: "Portuguese", traits: ["Passe", "Armação"] }
  ],
  "Inter Miami CF": [
    { name: "Lionel Messi", pos: "MEI", rating: 93, age: 38, nat: "Argentinian", traits: ["Drible", "Armação"] },
    { name: "Luis Suárez", pos: "ATA", rating: 84, age: 39, nat: "Uruguayan", traits: ["Finalização", "Cabeceio"] },
    { name: "Sergio Busquets", pos: "MEI", rating: 81, age: 37, nat: "Spanish", traits: ["Marcação", "Passe"] },
    { name: "Jordi Alba", pos: "LAT", rating: 81, age: 37, nat: "Spanish", traits: ["Cruzamento", "Velocidade"] }
  ],
  "Flamengo": [
    { name: "Pedro", pos: "ATA", rating: 83, age: 29, nat: "Brazilian", traits: ["Finalização", "Cabeceio"] },
    { name: "Giorgian de Arrascaeta", pos: "MEI", rating: 83, age: 32, nat: "Uruguayan", traits: ["Armação", "Passe"] },
    { name: "Gerson", pos: "MEI", rating: 82, age: 29, nat: "Brazilian", traits: ["Passe", "Drible"] },
    { name: "Nicolás de la Cruz", pos: "MEI", rating: 82, age: 29, nat: "Uruguayan", traits: ["Velocidade", "Passe"] },
    { name: "Rossi", pos: "GOL", rating: 78, age: 31, nat: "Argentinian", traits: ["Reflexo", "Elasticidade"] },
    { name: "Gabigol", pos: "ATA", rating: 80, age: 29, nat: "Brazilian", traits: ["Finalização", "Velocidade"] }
  ],
  "Palmeiras": [
    { name: "Raphael Veiga", pos: "MEI", rating: 82, age: 31, nat: "Brazilian", traits: ["Finalização", "Armação"] },
    { name: "Estêvão", pos: "ATA", rating: 83, age: 19, nat: "Brazilian", traits: ["Drible", "Velocidade"] },
    { name: "Felipe Anderson", pos: "MEI", rating: 80, age: 33, nat: "Brazilian", traits: ["Drible", "Passe"] },
    { name: "Gustavo Gómez", pos: "ZAG", rating: 80, age: 33, nat: "Paraguayan", traits: ["Marcação", "Cabeceio"] },
    { name: "Weverton", pos: "GOL", rating: 78, age: 38, nat: "Brazilian", traits: ["Reflexo", "Elasticidade"] },
    { name: "Richard Ríos", pos: "MEI", rating: 79, age: 26, nat: "Colombian", traits: ["Drible", "Força"] }
  ],
  "Botafogo": [
    { name: "Luiz Henrique", pos: "ATA", rating: 83, age: 25, nat: "Brazilian", traits: ["Drible", "Velocidade"] },
    { name: "Igor Jesus", pos: "ATA", rating: 81, age: 25, nat: "Brazilian", traits: ["Finalização", "Cabeceio"] },
    { name: "Thiago Almada", pos: "MEI", rating: 82, age: 25, nat: "Argentinian", traits: ["Drible", "Armação"] },
    { name: "Alex Telles", pos: "LAT", rating: 78, age: 33, nat: "Brazilian", traits: ["Cruzamento", "Passe"] },
    { name: "John", pos: "GOL", rating: 78, age: 30, nat: "Brazilian", traits: ["Reflexo", "Elasticidade"] }
  ],
  "Atlético-MG": [
    { name: "Hulk", pos: "ATA", rating: 82, age: 39, nat: "Brazilian", traits: ["Finalização", "Força"] },
    { name: "Paulinho", pos: "ATA", rating: 81, age: 25, nat: "Brazilian", traits: ["Velocidade", "Finalização"] },
    { name: "Gustavo Scarpa", pos: "MEI", rating: 79, age: 32, nat: "Brazilian", traits: ["Cruzamento", "Armação"] },
    { name: "Guilherme Arana", pos: "LAT", rating: 79, age: 29, nat: "Brazilian", traits: ["Cruzamento", "Marcação"] }
  ],
  "São Paulo": [
    { name: "Lucas Moura", pos: "MEI", rating: 81, age: 33, nat: "Brazilian", traits: ["Drible", "Velocidade"] },
    { name: "Jonathan Calleri", pos: "ATA", rating: 80, age: 32, nat: "Argentinian", traits: ["Cabeceio", "Finalização"] },
    { name: "Luciano", pos: "MEI", rating: 78, age: 33, nat: "Brazilian", traits: ["Finalização", "Passe"] },
    { name: "Rafael", pos: "GOL", rating: 77, age: 36, nat: "Brazilian", traits: ["Reflexo", "Saída de Gol"] }
  ],
  "Boca Juniors": [
    { name: "Edinson Cavani", pos: "ATA", rating: 80, age: 39, nat: "Uruguayan", traits: ["Finalização", "Cabeceio"] },
    { name: "Kevin Zenón", pos: "MEI", rating: 78, age: 24, nat: "Argentinian", traits: ["Armação", "Passe"] },
    { name: "Sergio Romero", pos: "GOL", rating: 76, age: 39, nat: "Argentinian", traits: ["Reflexo", "Elasticidade"] },
    { name: "Miguel Merentiel", pos: "ATA", rating: 78, age: 30, nat: "Uruguayan", traits: ["Finalização", "Velocidade"] }
  ],
  "River Plate": [
    { name: "Miguel Borja", pos: "ATA", rating: 80, age: 33, nat: "Colombian", traits: ["Finalização", "Cabeceio"] },
    { name: "Marcos Acuña", pos: "LAT", rating: 80, age: 34, nat: "Argentinian", traits: ["Marcação", "Cruzamento"] },
    { name: "Franco Armani", pos: "GOL", rating: 77, age: 39, nat: "Argentinian", traits: ["Reflexo", "Elasticidade"] },
    { name: "Franco Mastantuono", pos: "MEI", rating: 78, age: 18, nat: "Argentinian", traits: ["Drible", "Armação"] }
  ],
  "Santos": [
    { name: "Guilherme", pos: "ATA", rating: 76, age: 31, nat: "Brazilian", traits: ["Velocidade", "Drible"] },
    { name: "Giuliano", pos: "MEI", rating: 75, age: 36, nat: "Brazilian", traits: ["Passe", "Armação"] },
    { name: "João Paulo", pos: "GOL", rating: 76, age: 30, nat: "Brazilian", traits: ["Reflexo", "Elasticidade"] }
  ]
};

// National Name Banks for Procedural Generation
const NATIONAL_NAMES = {
  "Brazilian": {
    first: ["Gabriel", "Lucas", "Matheus", "Pedro", "Vinícius", "Rodrigo", "Igor", "Bruno", "Felipe", "Marcos", "Thiago", "Rafael", "Gustavo", "João", "Diego", "Marcelo", "André", "Victor", "Luiz", "Eduardo", "Guilherme", "Renato", "Alex", "Roberto", "Allan", "Douglas", "Ruan", "Yago", "Caio", "Luan", "Dudu", "Kenedy", "Everton", "Rony", "Alison", "Murilo", "Fabricio", "Cleiton"],
    last: ["Silva", "Santos", "Souza", "Oliveira", "Pereira", "Lima", "Costa", "Rodrigues", "Almeida", "Nascimento", "Araujo", "Junior", "Gomes", "Martins", "Barbosa", "Cardoso", "Melo", "Rocha", "Ribeiro", "Teixeira", "Carvalho", "Moreira", "Pinto", "Batista", "Neves", "Coelho", "Mendes", "Freitas", "Vieira", "Brandão", "Tavares", "Dias"]
  },
  "English": {
    first: ["Harry", "Jack", "John", "George", "Arthur", "Thomas", "Oliver", "James", "William", "Charles", "Henry", "Edward", "Mason", "Declan", "Jude", "Marcus", "Bukayo", "Trent", "Jordan", "Conor", "Harvey", "Kieran", "Ben", "Kyle", "Reece", "Luke", "Aaron", "Phil", "Callum", "Ollie", "Dominic", "Jarrod", "Joe", "Danny", "Adam", "Cole", "Kobbie", "Lewis"],
    last: ["Smith", "Jones", "Taylor", "Williams", "Brown", "Davies", "Evans", "Wilson", "Thomas", "Roberts", "Walker", "Johnson", "White", "Green", "Harris", "Martin", "Clarke", "James", "Phillips", "Alexander", "Palmer", "Foden", "Rice", "Kane", "Saka", "Shaw", "Trippier", "Pickford", "Henderson", "Mainoo", "Gallagher", "Bowen"]
  },
  "Spanish": {
    first: ["Mateo", "Santiago", "Matías", "Juan", "Lucas", "Lautaro", "Thiago", "Nicolás", "Alejandro", "Francisco", "Alvaro", "Daniel", "Pablo", "David", "Adrian", "Sergio", "Marc", "Gerard", "Koke", "Gavi", "Pedri", "Ansu", "Nico", "Iñaki", "Mikel", "Unai", "Robin", "Aymeric", "Alex", "Ferran", "Dani", "Martin", "Lamine", "Pau", "Rodri", "Jose", "Jesus"],
    last: ["González", "Rodríguez", "Gómez", "Fernández", "López", "Díaz", "Martínez", "Pérez", "Romero", "Alvarez", "Torres", "Ruiz", "Ramos", "Sánchez", "Hernández", "García", "Martin", "Carvajal", "Yamal", "Cubarsí", "Merino", "Simón", "Oyarzabal", "Zubimendi", "Navas", "Morata", "Williams", "Pino", "Baena", "Joselu"]
  },
  "Argentinian": {
    first: ["Mateo", "Santiago", "Matías", "Juan", "Lucas", "Lautaro", "Thiago", "Nicolás", "Alejandro", "Francisco", "Enzo", "Alexis", "Julián", "Lionel", "Rodrigo", "Leandro", "Cristian", "Marcos", "Lisandro", "Nahuel", "Gonzalo", "Angel", "Giovani", "Exequiel", "Valentin", "Franco", "Emiliano", "Gerónimo", "Walter", "Bautista", "Federico", "Joaquín"],
    last: ["González", "Rodríguez", "Gómez", "Fernández", "López", "Díaz", "Martínez", "Pérez", "Romero", "Alvarez", "Otamendi", "De Paul", "Mac Allister", "Fernández", "Molina", "Tagliafico", "Pezzella", "Montiel", "Acuña", "Palacios", "Lo Celso", "Di María", "Garnacho", "Martínez", "Scaloni", "Armani", "Rulli", "Dybala"]
  },
  "Italian": {
    first: ["Francesco", "Alessandro", "Lorenzo", "Mattia", "Andrea", "Leonardo", "Davide", "Giovanni", "Federico", "Gianluigi", "Nicolò", "Alessandro", "Giorgio", "Gianluca", "Giacomo", "Moise", "Mateo", "Bryan", "Manuel", "Stephan", "Lorenzo", "Destiny", "Raoul", "Michael", "Riccardo", "Samuele", "Filippo", "Marco", "Matteo", "Salvatore"],
    last: ["Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo", "Ricci", "Donnarumma", "Bastoni", "Barella", "Dimarco", "Chiesa", "Scamacca", "Retegui", "Frattesi", "Cristante", "Pellegrini", "Locatelli", "Gatti", "Mancini", "Darmian", "Vicario", "Meret", "Calafiori", "Bellanova", "Raspadori"]
  },
  "German": {
    first: ["Lukas", "Maximilian", "Leon", "Jonas", "Paul", "Felix", "Ben", "Tim", "Noah", "Florian", "Jamal", "Kai", "Thomas", "Leroy", "Serge", "İlkay", "Joshua", "Antonio", "Jonathan", "Waldemar", "David", "Maximilian", "Nico", "Chris", "Emre", "Pascal", "Robert", "Marc", "Oliver", "Alexander", "Benjamin", "Robin", "Denis", "Maxim"],
    last: ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Schulz", "Becker", "Hoffmann", "Kimmich", "Wirtz", "Musiala", "Havertz", "Gündoğan", "Sané", "Gnabry", "Rüdiger", "Tah", "Mittelstädt", "Raum", "Schlotterbeck", "Anton", "Kroos", "Andrich", "Gross", "Füllkrug", "Undav", "Neuer", "ter Stegen", "Baumann"]
  },
  "French": {
    first: ["Enzo", "Lucas", "Mathis", "Hugo", "Arthur", "Noah", "Leo", "Antoine", "Kylian", "Ousmane", "Aurélien", "Eduardo", "Youssouf", "Warren", "Kingsley", "Marcus", "Olivier", "Randal", "Bradley", "Mike", "Brice", "Alphonse", "William", "Ibrahima", "Dayot", "Jules", "Theo", "Benjamin", "Ferland", "Jonathan", "N'Golo", "Adrien"],
    last: ["Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand", "Mbappé", "Griezmann", "Dembélé", "Tchouaméni", "Camavinga", "Fofana", "Zaïre-Emery", "Coman", "Thuram", "Giroud", "Kolo Muani", "Barcola", "Maignan", "Samba", "Areola", "Saliba", "Konaté", "Upamecano", "Koundé", "Hernández", "Pavard", "Mendy", "Clauss", "Kanté", "Rabiot"]
  },
  "Portuguese": {
    first: ["João", "Francisco", "Rodrigo", "Martim", "Afonso", "Tomás", "Miguel", "Bernardo", "Bruno", "Rúben", "Diogo", "Rafael", "Vitinha", "Gonçalo", "Cristiano", "Pedro", "Nelson", "Danilo", "António", "Pepe", "Matheus", "Joãozinho", "Otávio", "Fábio", "José", "Rui", "Francisco", "Jota", "Tiago", "Renato"],
    last: ["Silva", "Santos", "Ferreira", "Pereira", "Oliveira", "Costa", "Rodrigues", "Fernandes", "Dias", "Neves", "Dalot", "Cancelo", "Mendes", "Palhinha", "Vitinha", "Nunes", "Ronaldo", "Félix", "Leão", "Ramos", "Neto", "Semedo", "Inácio", "Patrício", "Sá", "Jota", "Conceição", "Gouveia", "Araújo"]
  },
  "Saudi": {
    first: ["Mohammed", "Ali", "Abdullah", "Salem", "Fahad", "Yasir", "Salman", "Abdulrahman", "Saud", "Sultan", "Abdulelah", "Hassan", "Firas", "Saleh", "Riyad", "Moteb", "Ayman", "Faisal", "Nasser", "Hattan", "Ziyad", "Sami", "Raghed", "Ahmed", "Khalid", "Waleed", "Nawaf", "Talal", "Bandar", "Saad"],
    last: ["Al-Dawsari", "Al-Shahrani", "Al-Faraj", "Al-Muwallad", "Al-Shehri", "Al-Ghamdi", "Al-Ghanam", "Al-Tambakti", "Al-Boleahi", "Al-Khaibari", "Al-Malki", "Al-Najei", "Al-Buraikan", "Al-Shehri", "Al-Aqidi", "Al-Yami", "Al-Kassar", "Al-Saluli", "Al-Hassan", "Al-Ghamdi", "Al-Juwayr", "Al-Johani"]
  },
  "American": {
    first: ["Christian", "Brandon", "Tyler", "Weston", "Walker", "Miles", "DeAndre", "Matt", "Sean", "Drake", "Chris", "Tim", "Mark", "Cameron", "Caleb", "Aidan", "Josh", "Jack", "Ben", "Luca", "Gianluca", "Duncan", "Cole", "Alex", "Patrick", "Gaga", "Ethan", "Sergino", "Antonee", "Joe", "Malik", "Johnny", "Ricardo", "Folarin", "Timothy"],
    last: ["Smith", "Robinson", "Carter", "Adams", "Morris", "Turner", "Steffen", "Sargent", "Weah", "Balogun", "Pepi", "Cardoso", "Tillman", "Scally", "Jedwin", "Ream", "Richards", "McKenzie", "Trusty", "Wiley", "Musah", "Reyna", "De la Torre", "Aaronson", "Pulisic", "Cowell", "Zendejas", "Celentano", "Callender"]
  },
  "Moroccan": {
    first: ["Achraf", "Youssef", "Hakim", "Sofyan", "Nayef", "Amine", "Abderrazak", "Tarid", "Selim", "Munir", "Walid", "Bilal", "Azzedine", "Ayoub", "Noussair", "Oussama", "Anass", "Zakaria", "Ismael", "Yahya"],
    last: ["Saïss", "En-Nesyri", "Ziyech", "Amrabat", "Aguerd", "Harit", "Hamdallah", "Tissoudali", "Amallah", "El Haddadi", "Cheddira", "Sabiri", "Ounahi", "El Kaabi", "Mazraoui", "Idrissi", "Zaroury", "Aboukhlal", "Bennacer", "Attiyat Allah"]
  },
  "Dutch": {
    first: ["Virgil", "Frenkie", "Memphis", "Cody", "Nathan", "Denzel", "Matthijs", "Stefan", "Teun", "Xavi", "Tijjani", "Jeremie", "Georginio", "Daley", "Steven", "Donny", "Luuk", "Ryan", "Justin", "Wout"],
    last: ["van Dijk", "de Jong", "Depay", "Gakpo", "Aké", "Dumfries", "de Ligt", "de Vrij", "Koopmeiners", "Simons", "Reijnders", "Frimpong", "Wijnaldum", "Blind", "Bergwijn", "van de Beek", "de Jong", "Gravenberch", "Kluivert", "Weghorst"]
  },
  "Belgian": {
    first: ["Kevin", "Romelu", "Thibaut", "Yannick", "Youri", "Leandro", "Lois", "Jérémy", "Timothy", "Wout", "Charles", "Arthur", "Amadou", "Orel", "Zeno", "Koen", "Thomas", "Dodi", "Alexis", "Michy"],
    last: ["De Bruyne", "Lukaku", "Courtois", "Carrasco", "Tielemans", "Trossard", "Openda", "Doku", "Castagne", "Faes", "De Ketelaere", "Vermeeren", "Onana", "Mangala", "Debast", "Casteels", "Meunier", "Lukebakio", "Saelemaekers", "Batshuayi"]
  },
  "Croatian": {
    first: ["Luka", "Mateo", "Ivan", "Marcelo", "Joško", "Andrej", "Mario", "Lovro", "Borna", "Josip", "Dominik", "Martin", "Nikola", "Kristijan", "Domagoj", "Bruno", "Ante", "Petar", "Marco", "Dion"],
    last: ["Modrić", "Kovačić", "Perišić", "Brozović", "Gvardiol", "Kramarić", "Pašalić", "Majer", "Barišić", "Šutalo", "Livaković", "Baturina", "Vlašić", "Jakić", "Vida", "Petković", "Budimir", "Musa", "Pasalic", "Drena Beljo"]
  },
  "Colombian": {
    first: ["James", "Luis", "Davinson", "Jefferson", "Mateus", "Jhon", "Daniel", "Santiago", "Rafael", "Yerry", "Wilmar", "Juan", "David", "Camilo", "Richard", "Jorge", "Kevin", "Alvaro", "Jader", "Johan"],
    last: ["Rodríguez", "Díaz", "Sánchez", "Lerma", "Uribe", "Arias", "Muñoz", "Borré", "Mina", "Barrios", "Cuadrado", "Ospina", "Vargas", "Ríos", "Carrascal", "Castaño", "Mojica", "Durán", "Lucumí", "Asprilla"]
  },
  "Uruguayan": {
    first: ["Federico", "Darwin", "Luis", "Giorgian", "Ronald", "Manuel", "José", "Rodrigo", "Facundo", "Mathías", "Sergio", "Nahitan", "Edinson", "Lucas", "Miguel", "Maximiliano", "Brian", "Nicolás", "Santiago", "Sebastian"],
    last: ["Valverde", "Núñez", "Suárez", "de Arrascaeta", "Araújo", "Ugarte", "Giménez", "Bentancur", "Pellistri", "Olivera", "Rochet", "Nández", "Cavani", "Torreira", "Merentiel", "Gómez", "Rodríguez", "de la Cruz", "Bueno", "Coates"]
  },
  "Japanese": {
    first: ["Shuto", "Hiroki", "Daiki", "Yuto", "Koki", "Takumi", "Kenta", "Ryotaro", "Shoya", "Keisuke", "Kyogo", "Kaoru", "Wataru", "Ao", "Takefusa", "Ritsu", "Ko", "Yukinari", "Daichi", "Reo"],
    last: ["Tanaka", "Sato", "Suzuki", "Takahashi", "Watanabe", "Ito", "Nakamura", "Kobayashi", "Yamamoto", "Asano", "Mitoma", "Endo", "Kubo", "Doan", "Itakura", "Sugawara", "Kamada", "Hatate", "Maeda", "Furuhashi"]
  },
  "Korean": {
    first: ["Min-jae", "Heung-min", "Kang-in", "Hee-chan", "Gue-sung", "Jae-sung", "Woo-yeong", "In-beom", "Hyun-woo", "Young-woo", "Seol", "Ji-sung"],
    last: ["Kim", "Lee", "Park", "Choi", "Jung", "Kang", "Cho", "Hwang", "Son", "Hong", "Seo", "Han"]
  },
  "Iranian": {
    first: ["Mehdi", "Sardar", "Alireza", "Saman", "Ehsan", "Milad", "Hossein", "Shoja", "Ramin", "Saeid", "Ali", "Karim", "Amir", "Payam", "Majid"],
    last: ["Taremi", "Azmoun", "Jahanbakhsh", "Ghoddos", "Hajsafi", "Mohammadi", "Kanaani", "Khalilzadeh", "Rezaeian", "Ezatolahi", "Karimi", "Ansarifard", "Niazmand", "Beiranvand", "Hosseini"]
  },
  "Danish": {
    first: ["Christian", "Rasmus", "Pierre-Emile", "Andreas", "Joachim", "Jonas", "Kasper", "Mikkel", "Victor", "Alexander", "Morten", "Philip", "Yussuf", "Gustav"],
    last: ["Eriksen", "Højlund", "Højbjerg", "Christensen", "Andersen", "Wind", "Schmeichel", "Damsgaard", "Kristiansen", "Bah", "Hjulmand", "Billing", "Poulsen", "Isaksen"]
  },
  "Swedish": {
    first: ["Alexander", "Dejan", "Viktor", "Emil", "Robin", "Victor", "Ludwig", "Jens", "Carl", "Samuel", "Gustaf", "Anthony", "Hugo", "Isak", "Kristoffer"],
    last: ["Isak", "Kulusevski", "Gyökeres", "Forsberg", "Olsen", "Lindelöf", "Augustinsson", "Cajuste", "Starfelt", "Gustafson", "Lagerbielke", "Elanga", "Larsson", "Hien", "Olsson"]
  },
  "Ukrainian": {
    first: ["Artem", "Mykhailo", "Oleksandr", "Viktor", "Vitaliy", "Illya", "Taras", "Ruslan", "Roman", "Heorhiy", "Anatoliy", "Valeriy", "Serhiy", "Andriy"],
    last: ["Dovbyk", "Mudryk", "Zinchenko", "Tsygankov", "Mykolenko", "Zabarnyi", "Stepanenko", "Malinovskyi", "Yaremchuk", "Sudakov", "Trubin", "Bondar", "Sydorchuk", "Lunin"]
  },
  "Polish": {
    first: ["Robert", "Piotr", "Sebastian", "Nicola", "Przemysław", "Jakub", "Jan", "Wojciech", "Marcin", "Kamil", "Karol", "Bartosz", "Mateusz", "Paweł"],
    last: ["Lewandowski", "Zieliński", "Szymański", "Zalewski", "Frankowski", "Kiwior", "Bednarek", "Szczęsny", "Bułka", "Grosicki", "Świderski", "Berestzyński", "Slisz", "Piotrowski"]
  }
};

const POSITIONS = ["GOL", "ZAG", "LAT", "MEI", "ATA"];

const SKILLS = {
  "GOL": ["Reflexo", "Elasticidade", "Saída de Gol", "Pênaltis"],
  "ZAG": ["Marcação", "Cabeceio", "Desarme", "Força"],
  "LAT": ["Cruzamento", "Velocidade", "Marcação", "Passe"],
  "MEI": ["Passe", "Armação", "Drible", "Finalização"],
  "ATA": ["Finalização", "Velocidade", "Drible", "Cabeceio"]
};

// Generates an entire database of players for the chosen leagues
function generateWorldDatabase() {
  const database = {};

  LEAGUES_DATA.forEach(league => {
    database[league.id] = {
      id: league.id,
      name: league.name,
      country: league.country,
      reputation: league.reputation,
      teams: league.teams.map(teamData => {
        const teamName = teamData.name;
        const starSquad = STAR_PLAYERS[teamName] || [];
        const squad = [];

        // Generate squad based on team reputation and division
        // High reputation teams get high rated players (average rating 80-92)
        // Low reputation teams get lower rated players (average rating 60-75)
        const rep = teamData.reputation;
        const isSecondDiv = league.id.endsWith("_b");
        const avgRating = isSecondDiv 
          ? Math.round(38 + (rep * 4.5) + (Math.random() * 4))
          : Math.round(55 + (rep * 7.5) + (Math.random() * 5));

        // Distribution of positions: 2 GOL, 5 ZAG, 3 LAT, 6 MEI, 4 ATA = 20 players
        const positionCount = {
          "GOL": 2,
          "ZAG": 5,
          "LAT": 3,
          "MEI": 6,
          "ATA": 4
        };

        // Add pre-defined star players first
        starSquad.forEach(star => {
          let rating = star.rating;
          if (isSecondDiv) {
            rating = Math.max(50, Math.round(star.rating * 0.8)); // scale down star players of second division teams
          }
          const value = calculatePlayerValue(rating, star.age, star.pos);
          const salary = calculatePlayerSalary(rating, star.age, value);
          let potential = rating;
          if (star.age <= 25) {
            potential = Math.min(99, rating + Math.floor(Math.random() * 12) + 4);
          } else if (star.age <= 30) {
            potential = Math.min(99, rating + Math.floor(Math.random() * 4) + 1);
          }
          squad.push({
            id: generateId(),
            name: star.name,
            position: star.pos,
            rating: rating,
            potential: potential,
            age: star.age,
            nationality: star.nat,
            value: value,
            salary: salary,
            goals: 0,
            assists: 0,
            yellowCards: 0,
            redCards: 0,
            games: 0,
            condition: 100,
            morale: 90,
            skills: star.traits,
            contract: Math.floor(Math.random() * 4) + 2 // 2 to 5 years
          });

          // Decrement count for generated players
          if (positionCount[star.pos] > 0) {
            positionCount[star.pos]--;
          }
        });

        // Generate remaining players to fill roster
        Object.entries(positionCount).forEach(([pos, count]) => {
          for (let i = 0; i < count; i++) {
            const playerRating = clamp(
              Math.round(avgRating + (Math.random() * 12 - 6)),
              45,
              99
            );
            const age = Math.floor(Math.random() * 18) + 17; // 17 to 34
            const nationality = league.nationality;
            const name = generatePlayerName(nationality);
            const value = calculatePlayerValue(playerRating, age, pos);
            const salary = calculatePlayerSalary(playerRating, age, value);
            const traits = generateTraits(pos);
            let potential = playerRating;
            if (age <= 25) {
              potential = Math.min(99, playerRating + Math.floor(Math.random() * 12) + 4);
            } else if (age <= 30) {
              potential = Math.min(99, playerRating + Math.floor(Math.random() * 4) + 1);
            }

            squad.push({
              id: generateId(),
              name: name,
              position: pos,
              rating: playerRating,
              potential: potential,
              age: age,
              nationality: nationality,
              value: value,
              salary: salary,
              goals: 0,
              assists: 0,
              yellowCards: 0,
              redCards: 0,
              games: 0,
              condition: 100,
              morale: 80 + Math.floor(Math.random() * 20),
              skills: traits,
              contract: Math.floor(Math.random() * 4) + 2
            });
          }
        });

        // Set squad details and sort by position, then rating descending
        squad.sort((a, b) => {
          const posOrder = { "GOL": 0, "LAT": 1, "ZAG": 2, "MEI": 3, "ATA": 4 };
          if (posOrder[a.position] !== posOrder[b.position]) {
            return posOrder[a.position] - posOrder[b.position];
          }
          return b.rating - a.rating;
        });

        // Standard team parameters
        let budget = Math.round((teamData.reputation ** 3.5) * 5000000); // 10M to 250M
        let ticketPrice = Math.round(15 + (teamData.reputation * 10)); // 15 to 65
        let stadiumCap = Math.round((teamData.reputation ** 2) * 5000 + 10000); // 15k to 135k
        let sponsorIncome = Math.round(teamData.reputation * 150000); // weekly sponsor income

        if (isSecondDiv) {
          budget = Math.round((teamData.reputation ** 2.5) * 500000); // R$ 5M to R$ 14.3M (lower starting money)
          stadiumCap = Math.round((teamData.reputation ** 1.8) * 1500 + 5000); // 10k to 25k
          ticketPrice = Math.round(10 + (teamData.reputation * 5)); // 15 to 30
          sponsorIncome = Math.round(teamData.reputation * 30000); // weekly sponsor income
        }

        return {
          id: generateId(),
          name: teamName,
          colors: teamData.colors,
          reputation: teamData.reputation,
          squad: squad,
          budget: budget,
          stadiumCapacity: stadiumCap,
          stadiumUpgrading: false,
          stadiumUpgradeWeeks: 0,
          ticketPrice: ticketPrice,
          fansLoyalty: 60 + Math.floor(teamData.reputation * 8),
          loan: 0,
          sponsorIncome: sponsorIncome, // weekly sponsor income
          points: 0,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          form: []
        };
      })
    };
  });

  return database;
}

// Utility functions for player data generation
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function generatePlayerName(nat) {
  let targetNat = nat;
  const mappings = {
    // English/British/Common/African Anglophone
    "Welsh": "English",
    "Australian": "English",
    "Canadian": "English",
    "Jamaican": "English",
    "Scottish": "English",
    "Irish": "English",
    "NorthernIrish": "English",
    "SouthAfrican": "English",
    "Ghanaian": "English",
    "Zambian": "English",
    "Kiwi": "English",
    "Ugandan": "English",

    // French/Francophone African/Swiss
    "Swiss": "French",
    "Senegalese": "French",
    "Tunisian": "French",
    "Algerian": "French",
    "Cameroonian": "French",
    "Ivorian": "French",
    "Malian": "French",
    "Congolese": "French",
    "Guinean": "French",
    "Gabonese": "French",

    // German/Austrian/European
    "Austrian": "German",
    "Turkish": "German",
    "Greek": "German",
    "Norwegian": "German",
    "Romanian": "German",
    "Slovak": "German",
    "Slovenian": "German",
    "Czech": "German",
    "Hungarian": "German",
    "Serbian": "German",
    "Finnish": "German",
    "Icelandic": "German",
    "Albanian": "German",
    "Macedonian": "German",
    "Georgian": "German",
    "Bosnian": "German",
    "Bulgarian": "German",
    "Montenegrin": "German",
    "Luxembourger": "German",
    "Armenian": "German",
    "Kazakh": "German",
    "Azerbaijani": "German",

    // Spanish/Latin American
    "Ecuadorian": "Spanish",
    "Chilean": "Spanish",
    "Mexican": "Spanish",
    "Paraguayan": "Spanish",
    "Peruvian": "Spanish",
    "Venezuelan": "Spanish",
    "Bolivian": "Spanish",
    "CostaRican": "Spanish",
    "Panamanian": "Spanish",
    "Honduran": "Spanish",
    "Salvadoran": "Spanish",

    // Portuguese/Lusophone
    "CapeVerdean": "Portuguese",
    "Angolan": "Portuguese",

    // Arabic
    "Egyptian": "Saudi",
    "Qatari": "Saudi",
    "Iraqi": "Saudi",
    "UAE": "Saudi",
    "Omani": "Saudi",
    "Jordanian": "Saudi",
    "Bahraini": "Saudi",
    "Syrian": "Saudi",
    "Palestinian": "Saudi",

    // Central Asian
    "Uzbek": "Iranian",
    "Kyrgyz": "Iranian",

    // East Asian
    "Chinese": "Japanese",
    "Vietnamese": "Japanese",
    "Thai": "Japanese",
    "NorthKorean": "Korean"
  };
  if (mappings[nat]) {
    targetNat = mappings[nat];
  }
  const bank = NATIONAL_NAMES[targetNat] || NATIONAL_NAMES["Brazilian"];
  const f = bank.first[Math.floor(Math.random() * bank.first.length)];
  const l = bank.last[Math.floor(Math.random() * bank.last.length)];
  return `${f} ${l}`;
}

function generateTraits(pos) {
  const pool = SKILLS[pos] || ["Passe", "Velocidade"];
  // Select 2 unique traits
  const traits = [];
  const clonedPool = [...pool];
  
  const firstTraitIdx = Math.floor(Math.random() * clonedPool.length);
  traits.push(clonedPool.splice(firstTraitIdx, 1)[0]);
  
  const secondTraitIdx = Math.floor(Math.random() * clonedPool.length);
  traits.push(clonedPool[secondTraitIdx]);
  
  return traits;
}

function calculatePlayerValue(rating, age, pos) {
  // Value curve based on rating, age and position
  // Peak value age is around 21-26. Older players decay rapidly.
  let ageMultiplier = 1.0;
  if (age < 20) ageMultiplier = 0.9 + (age - 17) * 0.05; // 0.9 to 1.0
  else if (age <= 26) ageMultiplier = 1.1 + (26 - age) * 0.02; // peak
  else if (age <= 30) ageMultiplier = 1.0 - (age - 26) * 0.06; // gradual decay
  else ageMultiplier = 0.7 - (age - 30) * 0.1; // rapid decay
  
  if (ageMultiplier < 0.1) ageMultiplier = 0.1;

  // Rating effect is exponential
  const ratingFactor = Math.pow(rating / 60, 4.5);
  let baseValue = ratingFactor * 800000;

  // Adjust by position
  let posFactor = 1.0;
  if (pos === "GOL") posFactor = 0.7;
  else if (pos === "ZAG") posFactor = 0.85;
  else if (pos === "LAT") posFactor = 0.9;
  else if (pos === "MEI") posFactor = 1.1;
  else if (pos === "ATA") posFactor = 1.25;

  const finalValue = Math.round(baseValue * ageMultiplier * posFactor);
  return Math.max(50000, Math.round(finalValue / 10000) * 10000); // round to nearest 10k, minimum 50k
}

function calculatePlayerSalary(rating, age, value) {
  // Salary is roughly 0.5% - 1.5% of value annually divided by 52 (weekly wage)
  // Let's do a weekly salary based on rating and value
  const baseSalary = value * 0.003; // weekly salary is ~0.3% of transfer value
  const ratingBonus = (rating - 50) * 80;
  let finalSalary = Math.round(baseSalary + ratingBonus);
  return Math.max(500, Math.round(finalSalary / 100) * 100); // minimum 500/week, round to 100
}

// Export for usage in window object or node module
if (typeof window !== "undefined") {
  window.LEAGUES_DATA = LEAGUES_DATA;
  window.STAR_PLAYERS = STAR_PLAYERS;
  window.NATIONAL_NAMES = NATIONAL_NAMES;
  window.POSITIONS = POSITIONS;
  window.SKILLS = SKILLS;
  window.generateWorldDatabase = generateWorldDatabase;
  window.calculatePlayerValue = calculatePlayerValue;
  window.calculatePlayerSalary = calculatePlayerSalary;
  window.generatePlayerName = generatePlayerName;
  window.generateTraits = generateTraits;
}

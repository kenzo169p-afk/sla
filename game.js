// game.js - Core Game Engine for Brasfoot Global

class GameEngine {
  constructor() {
    this.state = null;
    this.matchInterval = null;
    this.currentMatch = null;
    this.activeTab = "dashboard";
    this.selectedTeamForView = null;
    this.selectedPlayerForView = null;
  }

  // Start a brand new game
  initNewGame(managerName, managerNationality, chosenTeamName) {
    const database = window.generateWorldDatabase();
    
    // Find the chosen team and its league
    let userTeam = null;
    let userLeagueId = null;
    
    for (const [leagueId, league] of Object.entries(database)) {
      const team = league.teams.find(t => t.name === chosenTeamName);
      if (team) {
        userTeam = team;
        userLeagueId = leagueId;
        break;
      }
    }

    if (!userTeam) {
      console.error("Team not found:", chosenTeamName);
      return;
    }

    this.state = {
      manager: {
        name: managerName,
        nationality: managerNationality,
        teamId: userTeam.id,
        leagueId: userLeagueId,
        trophies: [],
        boardConfidence: 80,
        seasonGoal: null,
        stats: { wins: 0, draws: 0, losses: 0 },
        currentClubStats: { wins: 0, draws: 0, losses: 0 }
      },
      year: 2026,
      week: 1,
      season: 1,
      database: database,
      fixtures: {}, // populated by season generator
      cupFixtures: {}, // national cup fixtures
      continentalFixtures: {}, // continental cup fixtures
      mundialFixtures: {
        teams: [],
        rounds: [],
        currentRound: 0,
        simulated: false
      },
      selecoesFixtures: {
        groups: [],
        groupFixtures: [],
        knockoutRounds: [],
        currentStage: "group",
        currentGroupRound: 0,
        currentKnockoutRound: 0
      },
      nationalTeams: {}, // populated in generateSeasonFixtures
      currentRound: {}, // current round index per league
      news: [],
      transferList: [], // array of { playerId, teamId, originalPrice }
      freeAgents: [],
      history: [],
      stadiumUpgrade: null, // { capacityIncrease, cost, weeksRemaining }
      youthAcademyTimer: 0, // cooldown weeks to pull a youth player
    };

    // Auto-select starting 11 for the user's team
    this.autoSelectLineup(userTeam, "4-4-2");
    userTeam.formation = "4-4-2";
    userTeam.mentality = "balanced";

    // Auto-select lineups for ALL computer teams
    this.autoSelectAllComputerLineups();

    // Generate Season Fixtures
    this.generateSeasonFixtures();

    // Seed Initial News
    this.addNews("Início da Temporada", `O técnico ${managerName} assume o comando do ${userTeam.name}! Boa sorte na sua jornada.`);
    this.generateInitialTransferMarket();
    this.generateInitialFreeAgents();

    this.updateSeasonGoals();

    this.saveGame();
  }

  // Auto-select lineup for a team based on formation
  autoSelectLineup(team, formation) {
    // Clear current starters
    team.squad.forEach(p => {
      p.isStarter = false;
      p.isSub = false;
    });

    // Formations config: [DEF, MID, ATA]
    const configs = {
      "4-4-2": [4, 4, 2],
      "4-3-3": [4, 3, 3],
      "3-5-2": [3, 5, 2],
      "3-4-3": [3, 4, 3],
      "4-5-1": [4, 5, 1],
      "5-3-2": [5, 3, 2],
      "5-4-1": [5, 4, 1]
    };

    const config = configs[formation] || [4, 4, 2];
    const reqDef = config[0];
    const reqMid = config[1];
    const reqAta = config[2];

    // Find best Goalkeeper (GOL)
    const gks = team.squad.filter(p => p.position === "GOL" && p.condition > 30).sort((a, b) => b.rating - a.rating);
    if (gks[0]) gks[0].isStarter = true;

    // Find best Defenders (ZAG + LAT)
    const defs = team.squad.filter(p => (p.position === "ZAG" || p.position === "LAT") && p.condition > 30 && !p.isStarter)
                           .sort((a, b) => b.rating - a.rating);
    for (let i = 0; i < Math.min(reqDef, defs.length); i++) {
      defs[i].isStarter = true;
    }

    // Find best Midfielders (MEI)
    const mids = team.squad.filter(p => p.position === "MEI" && p.condition > 30 && !p.isStarter)
                           .sort((a, b) => b.rating - a.rating);
    for (let i = 0; i < Math.min(reqMid, mids.length); i++) {
      mids[i].isStarter = true;
    }

    // Find best Attackers (ATA)
    const atas = team.squad.filter(p => p.position === "ATA" && p.condition > 30 && !p.isStarter)
                           .sort((a, b) => b.rating - a.rating);
    for (let i = 0; i < Math.min(reqAta, atas.length); i++) {
      atas[i].isStarter = true;
    }

    // Set remaining players as subs (up to 7)
    const remaining = team.squad.filter(p => !p.isStarter).sort((a, b) => b.rating - a.rating);
    for (let i = 0; i < Math.min(7, remaining.length); i++) {
      remaining[i].isSub = true;
    }
  }

  autoSelectAllComputerLineups() {
    for (const league of Object.values(this.state.database)) {
      league.teams.forEach(team => {
        if (team.id !== this.state.manager.teamId) {
          const formations = ["4-4-2", "4-3-3", "3-5-2", "3-4-3", "4-5-1"];
          const selectedFormation = formations[Math.floor(Math.random() * formations.length)];
          team.formation = selectedFormation;
          const mentalities = ["defensive", "balanced", "offensive"];
          team.mentality = mentalities[Math.floor(Math.random() * mentalities.length)];
          this.autoSelectLineup(team, selectedFormation);
        }
      });
    }
  }

  // Generate complete schedule for all leagues, cup and continental
  generateSeasonFixtures() {
    this.state.fixtures = {};
    this.state.currentRound = {};

    // 1. League Fixtures
    for (const [leagueId, league] of Object.entries(this.state.database)) {
      this.state.fixtures[leagueId] = this.generateRoundRobinSchedule(league.teams);
      this.state.currentRound[leagueId] = 0;
    }

    // 2. National Cup Fixtures (Copa)
    // Create knockout brackets for each country
    this.state.cupFixtures = {};
    const countries = [...new Set(Object.values(this.state.database).map(l => l.country))];
    
    countries.forEach(country => {
      // Gather all teams in this country
      const countryLeagues = Object.values(this.state.database).filter(l => l.country === country);
      let teams = [];
      countryLeagues.forEach(l => {
        teams = teams.concat(l.teams);
      });

      // Filter to top power of 2 (32 or 16 teams)
      teams.sort((a, b) => b.reputation - a.reputation);
      const cupSize = teams.length >= 32 ? 32 : 16;
      const cupTeams = teams.slice(0, cupSize);

      this.state.cupFixtures[country] = {
        size: cupSize,
        currentRound: 0,
        rounds: this.generateKnockoutBracket(cupTeams.map(t => t.id), cupSize)
      };
    });

    // 3. Continental Cup Fixtures (Champions and Libertadores)
    this.generateContinentalFixtures();
    this.generateNationalTeamsAndFixtures();
  }

  // Round robin fixture generation (circle method)
  generateRoundRobinSchedule(teams) {
    const list = [...teams];
    const numTeams = list.length;
    const rounds = [];
    const halfSize = numTeams / 2;

    const tempTeams = [...list];
    
    for (let round = 0; round < numTeams - 1; round++) {
      const roundFixtures = [];
      for (let i = 0; i < halfSize; i++) {
        const home = tempTeams[i];
        const away = tempTeams[numTeams - 1 - i];
        
        roundFixtures.push({
          homeId: home.id,
          awayId: away.id,
          scoreHome: null,
          scoreAway: null,
          scorersHome: [],
          scorersAway: [],
          simulated: false,
          stats: null
        });
      }
      rounds.push(roundFixtures);
      // Rotate
      tempTeams.splice(1, 0, tempTeams.pop());
    }

    // Return double round-robin (reverse home/away for second half)
    const secondHalf = rounds.map(r => r.map(match => ({
      homeId: match.awayId,
      awayId: match.homeId,
      scoreHome: null,
      scoreAway: null,
      scorersHome: [],
      scorersAway: [],
      simulated: false,
      stats: null
    })));

    return [...rounds, ...secondHalf];
  }

  // Knockout brackets generation
  generateKnockoutBracket(teamIds, size) {
    // Shuffle teamIds for random draw
    const shuffled = [...teamIds].sort(() => Math.random() - 0.5);
    const rounds = [];
    
    // First round (Round of 32 or 16)
    const firstRoundMatches = [];
    for (let i = 0; i < size; i += 2) {
      firstRoundMatches.push({
        homeId: shuffled[i],
        awayId: shuffled[i+1],
        scoreHome: null,
        scoreAway: null,
        scorersHome: [],
        scorersAway: [],
        simulated: false,
        isPenalties: false,
        penHome: null,
        penAway: null,
        winnerId: null
      });
    }
    rounds.push(firstRoundMatches);

    // Placeholder rounds for remaining stages
    let currentStageSize = size / 2;
    while (currentStageSize > 1) {
      const nextRoundMatches = [];
      for (let i = 0; i < currentStageSize; i += 2) {
        nextRoundMatches.push({
          homeId: null, // to be populated when previous round resolves
          awayId: null,
          scoreHome: null,
          scoreAway: null,
          scorersHome: [],
          scorersAway: [],
          simulated: false,
          isPenalties: false,
          penHome: null,
          penAway: null,
          winnerId: null
        });
      }
      rounds.push(nextRoundMatches);
      currentStageSize /= 2;
    }

    return rounds;
  }

  generateContinentalFixtures() {
    this.state.continentalFixtures = {
      champions: {
        teams: [],
        groups: [], // 8 groups of 4
        groupFixtures: [], // 6 group rounds
        knockoutRounds: [], // R16, QF, SF, Final
        currentStage: "group", // "group" or "knockout"
        currentGroupRound: 0,
        currentKnockoutRound: 0
      },
      libertadores: {
        teams: [],
        groups: [], // 4 groups of 4
        groupFixtures: [], // 6 group rounds
        knockoutRounds: [], // QF, SF, Final
        currentStage: "group",
        currentGroupRound: 0,
        currentKnockoutRound: 0
      },
      sudamericana: {
        teams: [],
        groups: [], // 4 groups of 4
        groupFixtures: [], // 6 group rounds
        knockoutRounds: [], // QF, SF, Final
        currentStage: "group",
        currentGroupRound: 0,
        currentKnockoutRound: 0
      }
    };

    // 1. Gather teams for Champions League (European teams)
    const clLeagues = ["en_a", "es_a", "it_a", "de_a", "fr_a", "pt_a"];
    let clTeams = [];
    clLeagues.forEach(leagueId => {
      const league = this.state.database[leagueId];
      if (league) {
        // Take top 4-6 based on reputation in database (as it's Season 1)
        const sorted = [...league.teams].sort((a, b) => b.reputation - a.reputation);
        const quota = leagueId === "fr_a" || leagueId === "pt_a" ? 4 : 6;
        clTeams = clTeams.concat(sorted.slice(0, quota).map(t => t.id));
      }
    });
    // Trim/pad to 32 teams
    clTeams = clTeams.slice(0, 32);
    this.state.continentalFixtures.champions.teams = clTeams;

    // Draw Champions League groups (8 groups of 4)
    const shuffledCl = [...clTeams].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 8; i++) {
      this.state.continentalFixtures.champions.groups.push(shuffledCl.slice(i * 4, i * 4 + 4));
    }
    this.state.continentalFixtures.champions.groupFixtures = this.generateGroupFixtures(
      this.state.continentalFixtures.champions.groups
    );

    // 2. Gather teams for Copa Libertadores (South American teams)
    let libTeams = [];
    // Brazil Serie A top 10
    const brALeague = this.state.database["br_a"];
    if (brALeague) {
      const sortedBr = [...brALeague.teams].sort((a, b) => b.reputation - a.reputation);
      libTeams = libTeams.concat(sortedBr.slice(0, 10).map(t => t.id));
    }
    // Argentina top 6
    const argLeague = this.state.database["ar_a"];
    if (argLeague) {
      const sortedArg = [...argLeague.teams].sort((a, b) => b.reputation - a.reputation);
      libTeams = libTeams.concat(sortedArg.slice(0, 6).map(t => t.id));
    }
    libTeams = libTeams.slice(0, 16);
    this.state.continentalFixtures.libertadores.teams = libTeams;

    // Draw Libertadores groups (4 groups of 4)
    const shuffledLib = [...libTeams].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 4; i++) {
      this.state.continentalFixtures.libertadores.groups.push(shuffledLib.slice(i * 4, i * 4 + 4));
    }
    this.state.continentalFixtures.libertadores.groupFixtures = this.generateGroupFixtures(
      this.state.continentalFixtures.libertadores.groups
    );

    // 3. Gather teams for Copa Sudamericana (South American teams)
    let sudTeams = [];
    if (brALeague) {
      const sortedBr = [...brALeague.teams].sort((a, b) => b.reputation - a.reputation);
      // Next 6 teams (spots 11 to 16)
      sudTeams = sudTeams.concat(sortedBr.slice(10, 16).map(t => t.id));
    }
    if (argLeague) {
      const sortedArg = [...argLeague.teams].sort((a, b) => b.reputation - a.reputation);
      // Next 6 teams (spots 7 to 12)
      sudTeams = sudTeams.concat(sortedArg.slice(6, 12).map(t => t.id));
    }
    // Plus 4 teams from Brazil Serie B to fill the 16 spots
    const brBLeague = this.state.database["br_b"];
    if (brBLeague) {
      const sortedBrB = [...brBLeague.teams].sort((a, b) => b.reputation - a.reputation);
      sudTeams = sudTeams.concat(sortedBrB.slice(0, 4).map(t => t.id));
    }
    sudTeams = sudTeams.slice(0, 16);
    this.state.continentalFixtures.sudamericana.teams = sudTeams;

    // Draw Sudamericana groups (4 groups of 4)
    const shuffledSud = [...sudTeams].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 4; i++) {
      this.state.continentalFixtures.sudamericana.groups.push(shuffledSud.slice(i * 4, i * 4 + 4));
    }
    this.state.continentalFixtures.sudamericana.groupFixtures = this.generateGroupFixtures(
      this.state.continentalFixtures.sudamericana.groups
    );
  }

  generateNationalTeamsAndFixtures() {
    const nats = [
      "Argentinian", "French", "Spanish", "English", "Brazilian", "Belgian", "Dutch", "Portuguese",
      "Colombian", "Italian", "Croatian", "German", "Moroccan", "Uruguayan", "American", "Senegalese",
      "Japanese", "Swiss", "Iranian", "Danish", "Korean", "Australian", "Ukrainian", "Austrian",
      "Polish", "Swedish", "Welsh", "Ecuadorian", "Chilean", "Mexican", "Paraguayan", "Saudi",
      "Peruvian", "Venezuelan", "Bolivian", "Tunisian", "Algerian", "Egyptian", "Nigerian", "Cameroonian",
      "Ivorian", "Malian", "Canadian", "CostaRican", "Panamanian", "Jamaican", "Turkish", "Greek",
      "Norwegian", "Scottish", "Irish", "Romanian", "Slovak", "Slovenian", "Czech", "Hungarian",
      "Serbian", "Finnish", "Icelandic", "Albanian", "Macedonian", "Georgian", "Bosnian", "Qatari",
      "Iraqi", "UAE", "Omani", "Uzbek", "Chinese", "Jordanian", "Bahraini", "Syrian",
      "Palestinian", "Kyrgyz", "Vietnamese", "Thai", "NorthKorean", "SouthAfrican", "Ghanaian", "Congolese",
      "CapeVerdean", "Guinean", "Gabonese", "Zambian", "Honduran", "Salvadoran", "Kiwi", "Bulgarian",
      "Montenegrin", "NorthernIrish", "Luxembourger", "Armenian", "Kazakh", "Azerbaijani", "Angolan", "Ugandan"
    ];
    
    const countryNames = {
      "Argentinian": { name: "Argentina", flag: "🇦🇷", colors: ["#87cef8", "#ffffff"], avgRating: 88 },
      "French": { name: "França", flag: "🇫🇷", colors: ["#00209f", "#ffffff"], avgRating: 87 },
      "Spanish": { name: "Espanha", flag: "🇪🇸", colors: ["#ff0000", "#ffff00"], avgRating: 87 },
      "English": { name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", colors: ["#ffffff", "#ff0000"], avgRating: 86 },
      "Brazilian": { name: "Brasil", flag: "🇧🇷", colors: ["#fedf00", "#009c3b"], avgRating: 86 },
      "Belgian": { name: "Bélgica", flag: "🇧🇪", colors: ["#e30613", "#ffcc00"], avgRating: 85 },
      "Dutch": { name: "Holanda", flag: "🇳🇱", colors: ["#ff6600", "#ffffff"], avgRating: 85 },
      "Portuguese": { name: "Portugal", flag: "🇵🇹", colors: ["#ff0000", "#008000"], avgRating: 85 },
      "Colombian": { name: "Colômbia", flag: "🇨🇴", colors: ["#ffcc00", "#0033a0"], avgRating: 84 },
      "Italian": { name: "Itália", flag: "🇮🇹", colors: ["#002f6c", "#ffffff"], avgRating: 84 },
      "Croatian": { name: "Croácia", flag: "🇭🇷", colors: ["#ff0000", "#ffffff"], avgRating: 83 },
      "German": { name: "Alemanha", flag: "🇩🇪", colors: ["#ffffff", "#111111"], avgRating: 84 },
      "Moroccan": { name: "Marrocos", flag: "🇲🇦", colors: ["#c1272d", "#006233"], avgRating: 83 },
      "Uruguayan": { name: "Uruguai", flag: "🇺🇾", colors: ["#5cbbf6", "#ffffff"], avgRating: 83 },
      "American": { name: "Estados Unidos", flag: "🇺🇸", colors: ["#ffffff", "#000080"], avgRating: 81 },
      "Senegalese": { name: "Senegal", flag: "🇸🇳", colors: ["#00a859", "#fcd116"], avgRating: 81 },
      "Japanese": { name: "Japão", flag: "🇯🇵", colors: ["#ffffff", "#e2001a"], avgRating: 81 },
      "Swiss": { name: "Suíça", flag: "🇨🇭", colors: ["#d52b1e", "#ffffff"], avgRating: 80 },
      "Iranian": { name: "Irã", flag: "🇮🇷", colors: ["#239e46", "#ffffff"], avgRating: 79 },
      "Danish": { name: "Dinamarca", flag: "🇩🇰", colors: ["#c8102e", "#ffffff"], avgRating: 80 },
      "Korean": { name: "Coreia do Sul", flag: "🇰🇷", colors: ["#ffffff", "#cd2e3a"], avgRating: 79 },
      "Australian": { name: "Austrália", flag: "🇦🇺", colors: ["#00008b", "#ffffff"], avgRating: 78 },
      "Ukrainian": { name: "Ucrânia", flag: "🇺🇦", colors: ["#ffd700", "#0057b7"], avgRating: 79 },
      "Austrian": { name: "Áustria", flag: "🇦🇹", colors: ["#ed2939", "#ffffff"], avgRating: 79 },
      "Polish": { name: "Polônia", flag: "🇵🇱", colors: ["#ffffff", "#dc143c"], avgRating: 78 },
      "Swedish": { name: "Suécia", flag: "🇸🇪", colors: ["#006aa7", "#fecc00"], avgRating: 79 },
      "Welsh": { name: "Gales", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", colors: ["#ffffff", "#c8102e"], avgRating: 77 },
      "Ecuadorian": { name: "Equador", flag: "🇪🇨", colors: ["#ffcc00", "#0033a0"], avgRating: 78 },
      "Chilean": { name: "Chile", flag: "🇨🇱", colors: ["#0039a6", "#d52b1e"], avgRating: 77 },
      "Mexican": { name: "México", flag: "🇲🇽", colors: ["#006847", "#ffffff"], avgRating: 79 },
      "Paraguayan": { name: "Paraguai", flag: "🇵🇾", colors: ["#d52b1e", "#0038a8"], avgRating: 76 },
      "Saudi": { name: "Arábia Saudita", flag: "🇸🇦", colors: ["#006c35", "#ffffff"], avgRating: 75 },
      "Peruvian": { name: "Peru", flag: "🇵🇪", colors: ["#ffffff", "#ff0000"], avgRating: 78 },
      "Venezuelan": { name: "Venezuela", flag: "🇻🇪", colors: ["#7a1c1c", "#ffffff"], avgRating: 77 },
      "Bolivian": { name: "Bolívia", flag: "🇧🇴", colors: ["#007a33", "#ffffff"], avgRating: 72 },
      "Tunisian": { name: "Tunísia", flag: "🇹🇳", colors: ["#e20e17", "#ffffff"], avgRating: 77 },
      "Algerian": { name: "Argélia", flag: "🇩🇿", colors: ["#006233", "#ffffff"], avgRating: 78 },
      "Egyptian": { name: "Egito", flag: "🇪🇬", colors: ["#c1272d", "#ffffff"], avgRating: 79 },
      "Nigerian": { name: "Nigéria", flag: "🇳🇬", colors: ["#008751", "#ffffff"], avgRating: 79 },
      "Cameroonian": { name: "Camarões", flag: "🇨🇲", colors: ["#007a5e", "#ffcc00"], avgRating: 76 },
      "Ivorian": { name: "Costa do Marfim", flag: "🇨🇮", colors: ["#ff8200", "#009e60"], avgRating: 78 },
      "Malian": { name: "Mali", flag: "🇲🇱", colors: ["#fcdd09", "#fc1111"], avgRating: 75 },
      "Canadian": { name: "Canadá", flag: "🇨🇦", colors: ["#ff0000", "#ffffff"], avgRating: 77 },
      "CostaRican": { name: "Costa Rica", flag: "🇨🇷", colors: ["#002b7f", "#fc1111"], avgRating: 75 },
      "Panamanian": { name: "Panamá", flag: "🇵🇦", colors: ["#002b7f", "#da121a"], avgRating: 75 },
      "Jamaican": { name: "Jamaica", flag: "🇯🇲", colors: ["#000000", "#fed100"], avgRating: 74 },
      "Turkish": { name: "Turquia", flag: "🇹🇷", colors: ["#e30a17", "#ffffff"], avgRating: 80 },
      "Greek": { name: "Grécia", flag: "🇬🇷", colors: ["#0d5eaf", "#ffffff"], avgRating: 77 },
      "Norwegian": { name: "Noruega", flag: "🇳🇴", colors: ["#ef2b2d", "#00205b"], avgRating: 80 },
      "Scottish": { name: "Escócia", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", colors: ["#005eb8", "#ffffff"], avgRating: 77 },
      "Irish": { name: "Irlanda", flag: "🇮🇪", colors: ["#169b62", "#ff883e"], avgRating: 75 },
      "Romanian": { name: "Romênia", flag: "🇷🇴", colors: ["#002b7f", "#fcd116"], avgRating: 76 },
      "Slovak": { name: "Eslováquia", flag: "🇸🇰", colors: ["#ffffff", "#0b4ea2"], avgRating: 76 },
      "Slovenian": { name: "Eslovênia", flag: "🇸🇮", colors: ["#ffffff", "#005cff"], avgRating: 76 },
      "Czech": { name: "República Tcheca", flag: "🇨🇿", colors: ["#ffffff", "#d7141a"], avgRating: 78 },
      "Hungarian": { name: "Hungria", flag: "🇭🇺", colors: ["#c8102e", "#436f4d"], avgRating: 78 },
      "Serbian": { name: "Sérvia", flag: "🇷🇸", colors: ["#c8102e", "#0c4076"], avgRating: 79 },
      "Finnish": { name: "Finlândia", flag: "🇫🇮", colors: ["#ffffff", "#003580"], avgRating: 74 },
      "Icelandic": { name: "Islândia", flag: "🇮🇸", colors: ["#00205b", "#ef2b2d"], avgRating: 73 },
      "Albanian": { name: "Albânia", flag: "🇦🇱", colors: ["#e30e14", "#000000"], avgRating: 74 },
      "Macedonian": { name: "Macedônia do Norte", flag: "🇲🇰", colors: ["#d20000", "#ffe600"], avgRating: 73 },
      "Georgian": { name: "Geórgia", flag: "🇬🇪", colors: ["#ffffff", "#ff0000"], avgRating: 76 },
      "Bosnian": { name: "Bósnia", flag: "🇧🇦", colors: ["#002f6c", "#ffcc00"], avgRating: 73 },
      "Qatari": { name: "Catar", flag: "🇶🇦", colors: ["#8a1538", "#ffffff"], avgRating: 76 },
      "Iraqi": { name: "Iraque", flag: "🇮🇶", colors: ["#ff0000", "#007a3d"], avgRating: 75 },
      "UAE": { name: "Emirados Árabes", flag: "🇦🇪", colors: ["#ff0000", "#00732f"], avgRating: 74 },
      "Omani": { name: "Omã", flag: "🇴🇲", colors: ["#ff0000", "#008000"], avgRating: 73 },
      "Uzbek": { name: "Uzbequistão", flag: "🇺🇿", colors: ["#00a6ff", "#009933"], avgRating: 75 },
      "Chinese": { name: "China", flag: "🇨🇳", colors: ["#de2910", "#ffde00"], avgRating: 70 },
      "Jordanian": { name: "Jordânia", flag: "🇯🇴", colors: ["#ff0000", "#007a3d"], avgRating: 74 },
      "Bahraini": { name: "Bahrein", flag: "🇧🇭", colors: ["#ce1126", "#ffffff"], avgRating: 72 },
      "Syrian": { name: "Síria", flag: "🇸🇾", colors: ["#e31b23", "#007a3d"], avgRating: 71 },
      "Palestinian": { name: "Palestina", flag: "🇵🇸", colors: ["#000000", "#ff0000"], avgRating: 72 },
      "Kyrgyz": { name: "Quirguistão", flag: "🇰🇬", colors: ["#e30a17", "#fcd116"], avgRating: 70 },
      "Vietnamese": { name: "Vietnã", flag: "🇻🇳", colors: ["#da251d", "#ffff00"], avgRating: 69 },
      "Thai": { name: "Tailândia", flag: "🇹🇭", colors: ["#a51931", "#2d2a4a"], avgRating: 71 },
      "NorthKorean": { name: "Coreia do Norte", flag: "🇰🇵", colors: ["#024fa2", "#ed1c24"], avgRating: 69 },
      "SouthAfrican": { name: "África do Sul", flag: "🇿🇦", colors: ["#007a4d", "#ffb612"], avgRating: 76 },
      "Ghanaian": { name: "Gana", flag: "🇬🇭", colors: ["#e2183c", "#006b3f"], avgRating: 75 },
      "Congolese": { name: "RDC", flag: "🇨🇩", colors: ["#007fff", "#fcd116"], avgRating: 74 },
      "CapeVerdean": { name: "Cabo Verde", flag: "🇨🇻", colors: ["#002a8f", "#ffd100"], avgRating: 75 },
      "Guinean": { name: "Guiné", flag: "🇬🇳", colors: ["#ce1126", "#009460"], avgRating: 74 },
      "Gabonese": { name: "Gabão", flag: "🇬🇦", colors: ["#009e60", "#3a75c4"], avgRating: 73 },
      "Zambian": { name: "Zâmbia", flag: "🇿🇲", colors: ["#198a00", "#ff7a00"], avgRating: 72 },
      "Honduran": { name: "Honduras", flag: "🇭🇳", colors: ["#0073cf", "#ffffff"], avgRating: 71 },
      "Salvadoran": { name: "El Salvador", flag: "🇸🇻", colors: ["#0f47af", "#ffffff"], avgRating: 70 },
      "Kiwi": { name: "Nova Zelândia", flag: "🇳🇿", colors: ["#000000", "#ffffff"], avgRating: 69 },
      "Bulgarian": { name: "Bulgária", flag: "🇧🇬", colors: ["#ffffff", "#00966e"], avgRating: 72 },
      "Montenegrin": { name: "Montenegro", flag: "🇲🇪", colors: ["#c1272d", "#d4af37"], avgRating: 72 },
      "NorthernIrish": { name: "Irlanda do Norte", flag: "🇬🇧", colors: ["#ffffff", "#ff0000"], avgRating: 72 },
      "Luxembourger": { name: "Luxemburgo", flag: "🇱🇺", colors: ["#ea1429", "#00a2e8"], avgRating: 71 },
      "Armenian": { name: "Armênia", flag: "🇦🇲", colors: ["#d92323", "#f2a800"], avgRating: 70 },
      "Kazakh": { name: "Cazaquistão", flag: "🇰🇿", colors: ["#00afca", "#fec100"], avgRating: 70 },
      "Azerbaijani": { name: "Azerbaijão", flag: "🇦🇿", colors: ["#0097c3", "#3f9c35"], avgRating: 69 },
      "Angolan": { name: "Angola", flag: "🇦🇴", colors: ["#d81e05", "#000000"], avgRating: 69 },
      "Ugandan": { name: "Uganda", flag: "🇺🇬", colors: ["#000000", "#fadc00"], avgRating: 68 }
    };

    const generateNationalPlayer = (nat, pos, avgRating) => {
      const rating = Math.max(45, Math.min(99, Math.round(avgRating + (Math.random() * 8 - 4))));
      const age = Math.floor(Math.random() * 12) + 20; // 20 to 31
      const name = (typeof window !== "undefined" && window.generatePlayerName)
        ? window.generatePlayerName(nat)
        : `${pos} Player`;
      const traits = (typeof window !== "undefined" && window.generateTraits)
        ? window.generateTraits(pos)
        : ["Passe", "Velocidade"];
      const value = (typeof window !== "undefined" && window.calculatePlayerValue)
        ? window.calculatePlayerValue(rating, age, pos)
        : 500000;
      const salary = (typeof window !== "undefined" && window.calculatePlayerSalary)
        ? window.calculatePlayerSalary(rating, age, value)
        : 2000;
      
      let potential = rating;
      if (age <= 25) {
        potential = Math.min(99, rating + Math.floor(Math.random() * 8) + 2);
      }
      
      return {
        id: Math.random().toString(36).substr(2, 9),
        name: name,
        position: pos,
        rating: rating,
        potential: potential,
        age: age,
        nationality: nat,
        value: value,
        salary: salary,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        games: 0,
        condition: 100,
        morale: 90,
        skills: traits,
        contract: 3
      };
    };

    this.state.nationalTeams = {};
    const allPlayers = [];
    
    // Gather all players
    for (const league of Object.values(this.state.database)) {
      league.teams.forEach(team => {
        team.squad.forEach(p => {
          allPlayers.push({ player: p, team: team });
        });
      });
    }

    nats.forEach(nat => {
      const info = countryNames[nat];
      const natPlayers = allPlayers.filter(item => item.player.nationality === nat).map(item => item.player);
      
      const gks = natPlayers.filter(p => p.position === "GOL").sort((a,b) => b.rating - a.rating);
      const defs = natPlayers.filter(p => p.position === "ZAG" || p.position === "LAT").sort((a,b) => b.rating - a.rating);
      const mids = natPlayers.filter(p => p.position === "MEI").sort((a,b) => b.rating - a.rating);
      const atas = natPlayers.filter(p => p.position === "ATA").sort((a,b) => b.rating - a.rating);

      const finalGks = gks.slice(0, 2);
      while (finalGks.length < 2) {
        finalGks.push(generateNationalPlayer(nat, "GOL", info.avgRating));
      }

      const finalDefs = defs.slice(0, 6);
      while (finalDefs.length < 6) {
        const subPos = Math.random() < 0.6 ? "ZAG" : "LAT";
        finalDefs.push(generateNationalPlayer(nat, subPos, info.avgRating));
      }

      const finalMids = mids.slice(0, 6);
      while (finalMids.length < 6) {
        finalMids.push(generateNationalPlayer(nat, "MEI", info.avgRating));
      }

      const finalAtas = atas.slice(0, 4);
      while (finalAtas.length < 4) {
        finalAtas.push(generateNationalPlayer(nat, "ATA", info.avgRating));
      }

      let squad = [...finalGks, ...finalDefs, ...finalMids, ...finalAtas];

      // Sort squad by position, then rating descending
      squad.sort((a, b) => {
        const posOrder = { "GOL": 0, "LAT": 1, "ZAG": 2, "MEI": 3, "ATA": 4 };
        if (posOrder[a.position] !== posOrder[b.position]) {
          return posOrder[a.position] - posOrder[b.position];
        }
        return b.rating - a.rating;
      });

      // Map to starting XI for AI national teams
      squad.forEach((p, idx) => {
        p.isStarter = idx < 11;
        p.isSub = idx >= 11;
      });

      this.state.nationalTeams[info.name] = {
        id: info.name,
        name: info.name,
        flag: info.flag,
        rating: info.avgRating,
        squad: squad,
        colors: info.colors,
        played: 0,
        points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, form: []
      };
    });

    // 2. Set up Copa de Seleções (qualify top 64 based on rating, draw 16 groups of 4)
    const qualifiedTeamNames = Object.keys(this.state.nationalTeams)
      .sort((a, b) => {
        const infoA = Object.values(countryNames).find(c => c.name === a);
        const infoB = Object.values(countryNames).find(c => c.name === b);
        return infoB.avgRating - infoA.avgRating;
      })
      .slice(0, 64);

    const pot1 = qualifiedTeamNames.slice(0, 16).sort(() => Math.random() - 0.5);
    const pot2 = qualifiedTeamNames.slice(16, 32).sort(() => Math.random() - 0.5);
    const pot3 = qualifiedTeamNames.slice(32, 48).sort(() => Math.random() - 0.5);
    const pot4 = qualifiedTeamNames.slice(48, 64).sort(() => Math.random() - 0.5);

    const groups = [];
    for (let i = 0; i < 16; i++) {
      groups.push([pot1[i], pot2[i], pot3[i], pot4[i]]);
    }

    this.state.selecoesFixtures = {
      groups: groups,
      groupFixtures: [],
      knockoutRounds: [],
      currentStage: "group",
      currentGroupRound: 0,
      currentKnockoutRound: 0
    };

    const grFixtures = [[], [], []];
    this.state.selecoesFixtures.groups.forEach((group, groupIdx) => {
      const [A, B, C, D] = group;
      grFixtures[0].push({ groupIdx, homeId: A, awayId: B, scoreHome: null, scoreAway: null, scorersHome: [], scorersAway: [], simulated: false });
      grFixtures[0].push({ groupIdx, homeId: C, awayId: D, scoreHome: null, scoreAway: null, scorersHome: [], scorersAway: [], simulated: false });
      
      grFixtures[1].push({ groupIdx, homeId: A, awayId: C, scoreHome: null, scoreAway: null, scorersHome: [], scorersAway: [], simulated: false });
      grFixtures[1].push({ groupIdx, homeId: B, awayId: D, scoreHome: null, scoreAway: null, scorersHome: [], scorersAway: [], simulated: false });
      
      grFixtures[2].push({ groupIdx, homeId: A, awayId: D, scoreHome: null, scoreAway: null, scorersHome: [], scorersAway: [], simulated: false });
      grFixtures[2].push({ groupIdx, homeId: B, awayId: C, scoreHome: null, scoreAway: null, scorersHome: [], scorersAway: [], simulated: false });
    });

    this.state.selecoesFixtures.groupFixtures = grFixtures;
  }

  generateMundialFixtures() {
    const cl = this.state.continentalFixtures.champions;
    const lib = this.state.continentalFixtures.libertadores;
    const sud = this.state.continentalFixtures.sudamericana;

    // Find winners. Default to high reputation teams if any is missing
    let clWinnerId = cl.knockoutRounds[cl.knockoutRounds.length - 1][0].winnerId;
    let libWinnerId = lib.knockoutRounds[lib.knockoutRounds.length - 1][0].winnerId;
    let sudWinnerId = sud.knockoutRounds[sud.knockoutRounds.length - 1][0].winnerId;

    if (!clWinnerId) clWinnerId = cl.teams[0];
    if (!libWinnerId) libWinnerId = lib.teams[0];
    if (!sudWinnerId) sudWinnerId = sud.teams[0];

    const clFinalMatch = cl.knockoutRounds[cl.knockoutRounds.length - 1][0];
    let clRunnerId = clFinalMatch.winnerId === clFinalMatch.homeId ? clFinalMatch.awayId : clFinalMatch.homeId;
    if (!clRunnerId) clRunnerId = cl.teams[1];

    const teams = [clWinnerId, libWinnerId, sudWinnerId, clRunnerId];

    this.state.mundialFixtures = {
      teams: teams,
      rounds: [
        [
          { homeId: clWinnerId, awayId: sudWinnerId, scoreHome: null, scoreAway: null, scorersHome: [], scorersAway: [], simulated: false, isPenalties: false, winnerId: null },
          { homeId: libWinnerId, awayId: clRunnerId, scoreHome: null, scoreAway: null, scorersHome: [], scorersAway: [], simulated: false, isPenalties: false, winnerId: null }
        ]
      ],
      currentRound: 0,
      simulated: false
    };
  }

  resolveSelecoesGroupStage() {
    const sf = this.state.selecoesFixtures;
    sf.currentStage = "knockout";

    // Calculate standings for each group
    const standings = sf.groups.map((group, groupIdx) => {
      const stats = group.map(name => {
        const nt = this.state.nationalTeams[name];
        return { name: name, pts: nt.points, gf: nt.goalsFor, ga: nt.goalsAgainst };
      });

      stats.sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
      return stats;
    });

    // Round of 16 (16 teams -> 8 matches)
    sf.knockoutRounds = [
      // Round 0: Round of 16
      [
        { homeId: standings[0][0].name, awayId: standings[1][0].name, scoreHome: null, scoreAway: null, scorersHome: [], scorersAway: [], simulated: false, isPenalties: false, winnerId: null },
        { homeId: standings[2][0].name, awayId: standings[3][0].name, scoreHome: null, scoreAway: null, scorersHome: [], scorersAway: [], simulated: false, isPenalties: false, winnerId: null },
        { homeId: standings[4][0].name, awayId: standings[5][0].name, scoreHome: null, scoreAway: null, scorersHome: [], scorersAway: [], simulated: false, isPenalties: false, winnerId: null },
        { homeId: standings[6][0].name, awayId: standings[7][0].name, scoreHome: null, scoreAway: null, scorersHome: [], scorersAway: [], simulated: false, isPenalties: false, winnerId: null },
        { homeId: standings[8][0].name, awayId: standings[9][0].name, scoreHome: null, scoreAway: null, scorersHome: [], scorersAway: [], simulated: false, isPenalties: false, winnerId: null },
        { homeId: standings[10][0].name, awayId: standings[11][0].name, scoreHome: null, scoreAway: null, scorersHome: [], scorersAway: [], simulated: false, isPenalties: false, winnerId: null },
        { homeId: standings[12][0].name, awayId: standings[13][0].name, scoreHome: null, scoreAway: null, scorersHome: [], scorersAway: [], simulated: false, isPenalties: false, winnerId: null },
        { homeId: standings[14][0].name, awayId: standings[15][0].name, scoreHome: null, scoreAway: null, scorersHome: [], scorersAway: [], simulated: false, isPenalties: false, winnerId: null }
      ],
      // Round 1: Quarterfinals (4 matches)
      [
        { homeId: null, awayId: null, scoreHome: null, scoreAway: null, scorersHome: [], scorersAway: [], simulated: false, isPenalties: false, winnerId: null },
        { homeId: null, awayId: null, scoreHome: null, scoreAway: null, scorersHome: [], scorersAway: [], simulated: false, isPenalties: false, winnerId: null },
        { homeId: null, awayId: null, scoreHome: null, scoreAway: null, scorersHome: [], scorersAway: [], simulated: false, isPenalties: false, winnerId: null },
        { homeId: null, awayId: null, scoreHome: null, scoreAway: null, scorersHome: [], scorersAway: [], simulated: false, isPenalties: false, winnerId: null }
      ],
      // Round 2: Semifinals (2 matches)
      [
        { homeId: null, awayId: null, scoreHome: null, scoreAway: null, scorersHome: [], scorersAway: [], simulated: false, isPenalties: false, winnerId: null },
        { homeId: null, awayId: null, scoreHome: null, scoreAway: null, scorersHome: [], scorersAway: [], simulated: false, isPenalties: false, winnerId: null }
      ],
      // Round 3: Grand Final (1 match)
      [
        { homeId: null, awayId: null, scoreHome: null, scoreAway: null, scorersHome: [], scorersAway: [], simulated: false, isPenalties: false, winnerId: null }
      ]
    ];
  }

  // Generate fixtures for group stages
  generateGroupFixtures(groups) {
    // 6 rounds of group fixtures
    // For each group, we have 4 teams: A, B, C, D
    // Round 1: A vs B, C vs D
    // Round 2: B vs C, D vs A
    // Round 3: A vs C, B vs D
    // Round 4: B vs A, D vs C (reverse)
    // Round 5: C vs B, A vs D (reverse)
    // Round 6: C vs A, D vs B (reverse)
    const groupRounds = [];
    for (let r = 0; r < 6; r++) {
      groupRounds.push([]);
    }

    groups.forEach((group, groupIdx) => {
      const [A, B, C, D] = group;
      const order = [
        [[A, B], [C, D]],
        [[B, C], [D, A]],
        [[A, C], [B, D]],
        [[B, A], [D, C]],
        [[C, B], [A, D]],
        [[C, A], [D, B]]
      ];

      for (let r = 0; r < 6; r++) {
        order[r].forEach(([home, away]) => {
          groupRounds[r].push({
            groupIdx: groupIdx,
            homeId: home,
            awayId: away,
            scoreHome: null,
            scoreAway: null,
            scorersHome: [],
            scorersAway: [],
            simulated: false
          });
        });
      }
    });

    return groupRounds;
  }

  // News Manager
  addNews(title, content) {
    this.state.news.unshift({
      id: generateId(),
      week: this.state.week,
      year: this.state.year,
      title: title,
      content: content
    });
    // Limit to 50 news items
    if (this.state.news.length > 50) {
      this.state.news.pop();
    }
  }

  calculateTeamOverallRating(team) {
    if (!team || !team.squad || team.squad.length === 0) return 50;
    // Sort squad by rating descending
    const sorted = [...team.squad].sort((a, b) => b.rating - a.rating);
    // Take average of top 18 players
    const top18 = sorted.slice(0, 18);
    const sum = top18.reduce((acc, p) => acc + p.rating, 0);
    return Math.round(sum / top18.length);
  }

  updateSeasonGoals() {
    const userTeam = this.findTeamById(this.state.manager.teamId);
    if (!userTeam) return;

    const leagueId = this.state.manager.leagueId;
    const league = this.state.database[leagueId];
    if (!league) return;

    // Calculate overalls for all teams in the league
    const teamOveralls = league.teams.map(t => {
      return {
        id: t.id,
        name: t.name,
        overall: this.calculateTeamOverallRating(t)
      };
    });

    // Sort by overall descending
    teamOveralls.sort((a, b) => b.overall - a.overall);

    // Find rank of user's team (1-indexed)
    const userRank = teamOveralls.findIndex(t => t.id === userTeam.id) + 1;
    const totalTeams = league.teams.length;
    const userOverall = this.calculateTeamOverallRating(userTeam);

    let targetPosition = 16;
    let title = "Evitar o Rebaixamento";
    let description = "A diretoria espera que você evite o rebaixamento da equipe.";
    let minSafePosition = totalTeams - 4; // e.g. 16 in a 20-team league (since bottom 4 are relegated)

    if (userRank <= 3) {
      // Title contender
      targetPosition = 2;
      title = "Brigar pelo Título";
      description = "Com um dos melhores elencos, a diretoria exige que você termine no Top 2 (Campeão ou Vice).";
      minSafePosition = 4; // sacked if finished 5th or lower
    } else if (userRank <= Math.round(totalTeams * 0.35)) {
      // Upper tier
      targetPosition = 6;
      title = "Classificação Continental (G6)";
      description = "A diretoria espera uma classificação para as copas continentais (Top 6).";
      minSafePosition = 10; // sacked if finished 11th or lower
    } else if (userRank <= Math.round(totalTeams * 0.7)) {
      // Mid table
      targetPosition = 12;
      title = "Meio da Tabela (Top 12)";
      description = "A diretoria espera uma campanha tranquila e sem sustos no meio da tabela.";
      minSafePosition = totalTeams - 4; // sacked if relegated
    } else {
      // Lower tier
      targetPosition = totalTeams - 4; // Avoid relegation (top 16 in 20-team league)
      title = "Evitar o Rebaixamento";
      description = "A meta principal é manter o clube na divisão. Você precisa terminar fora da zona de rebaixamento.";
      minSafePosition = totalTeams - 4; // sacked if relegated
    }

    this.state.manager.seasonGoal = {
      targetPosition: targetPosition,
      minSafePosition: minSafePosition,
      title: title,
      description: description,
      teamOverallAtStart: userOverall,
      overallRankAtStart: userRank
    };
    
    // Reset/initialize confidence
    this.state.manager.boardConfidence = 80;
  }

  updateBoardConfidence() {
    if (!this.state.manager.seasonGoal) return;
    const userTeam = this.findTeamById(this.state.manager.teamId);
    if (!userTeam) return;

    const leagueId = this.state.manager.leagueId;
    const league = this.state.database[leagueId];
    if (!league) return;

    // Sort teams to find current position
    const standings = [...league.teams].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor);
    const currentPos = standings.findIndex(t => t.id === userTeam.id) + 1;
    
    const goal = this.state.manager.seasonGoal;
    
    // Form impact
    let formImpact = 0;
    if (userTeam.form && userTeam.form.length > 0) {
      const lastResult = userTeam.form[userTeam.form.length - 1];
      if (lastResult === "W") formImpact += 4;
      else if (lastResult === "L") formImpact -= 4;
      else formImpact -= 1; // draw is slightly disappointing unless meeting goal
    }

    // Position impact
    let posImpact = 0;
    if (currentPos <= goal.targetPosition) {
      posImpact = 2; // pleased
    } else if (currentPos <= goal.minSafePosition) {
      posImpact = -1; // minor concern
    } else {
      posImpact = -5; // serious concern
    }

    let newConfidence = (this.state.manager.boardConfidence || 80) + formImpact + posImpact;
    
    // Keep between 0 and 100
    newConfidence = Math.max(0, Math.min(100, newConfidence));
    this.state.manager.boardConfidence = newConfidence;

    // Sacking check mid-season if confidence hits 0!
    if (newConfidence <= 0) {
      alert(`🚨 DEMISSÃO! A diretoria do ${userTeam.name} perdeu totalmente a confiança no seu trabalho (Confiança: 0%) devido aos maus resultados e à péssima campanha (posição atual: ${currentPos}º, meta: ${goal.title}).\n\nVocê foi demitido! Fim de jogo.`);
      localStorage.removeItem("brasfoot_save");
      window.location.reload();
    }
  }

  // LocalStorage methods
  saveGame() {
    localStorage.setItem("brasfoot_save", JSON.stringify(this.state));
  }

  loadGame() {
    const saved = localStorage.getItem("brasfoot_save");
    if (saved) {
      try {
        this.state = JSON.parse(saved);
        // Find user team and league ID
        const userTeam = this.findTeamById(this.state.manager.teamId);
        if (!userTeam) {
          console.warn("Saved team not found. Clearing invalid save.");
          localStorage.removeItem("brasfoot_save");
          this.state = null;
          return false;
        }
        this.state.manager.leagueId = this.findLeagueIdByTeamId(this.state.manager.teamId);
        
        // Self-healing: ensure news array exists
        if (!this.state.news) {
          this.state.news = [];
        }

        // Self-healing: ensure all national teams have played, id and rating initialized
        if (this.state.nationalTeams) {
          const countryNames = {
            "Argentina": 88, "França": 87, "Espanha": 87, "Inglaterra": 86, "Brasil": 86,
            "Bélgica": 85, "Holanda": 85, "Portugal": 85, "Colômbia": 84, "Itália": 84,
            "Croácia": 83, "Alemanha": 84, "Marrocos": 83, "Uruguai": 83, "Estados Unidos": 81,
            "Senegal": 81, "Japão": 81, "Suíça": 80, "Irã": 79, "Dinamarca": 80,
            "Coreia do Sul": 79, "Austrália": 78, "Ucrânia": 79, "Áustria": 79, "Polônia": 78,
            "Suécia": 79, "Gales": 77, "Equador": 78, "Chile": 77, "México": 79,
            "Paraguai": 76, "Arábia Saudita": 75, "Peru": 78, "Venezuela": 77, "Bolívia": 72,
            "Tunísia": 77, "Argélia": 78, "Egito": 79, "Nigéria": 79, "Camarões": 76,
            "Costa do Marfim": 78, "Mali": 75, "Canadá": 77, "Costa Rica": 75, "Panamá": 75,
            "Jamaica": 74, "Turquia": 80, "Grécia": 77, "Noruega": 80, "Tcheca": 77,
            "Escócia": 77, "Eslovênia": 75, "Eslováquia": 75, "Irlanda": 75, "Finlândia": 74,
            "Albânia": 74, "Geórgia": 75, "Romênia": 75, "Hungria": 76, "Sérvia": 77,
            "Islândia": 74, "Bósnia": 74, "Irlanda do Norte": 73, "Guiné": 75, "África do Sul": 74,
            "Gana": 75, "Cabo Verde": 74, "RD Congo": 75, "Catar": 75, "Emirados Árabes": 73,
            "Iraque": 73, "Omã": 72, "Uzbequistão": 74, "China": 71, "Honduras": 73,
            "El Salvador": 72, "Nova Zelândia": 70
          };
          Object.keys(this.state.nationalTeams).forEach(name => {
            const nt = this.state.nationalTeams[name];
            if (nt.id === undefined) nt.id = name;
            if (nt.rating === undefined) nt.rating = countryNames[name] || 75;
            if (nt.played === undefined) nt.played = 0;
          });
        }

        if (this.state.manager && !this.state.manager.seasonGoal) {
          this.updateSeasonGoals();
          this.state.manager.boardConfidence = 80;
        }

        if (this.state.manager && !this.state.manager.stats) {
          this.state.manager.stats = { wins: 0, draws: 0, losses: 0 };
        }

        if (this.state.manager && !this.state.manager.currentClubStats) {
          this.state.manager.currentClubStats = { wins: 0, draws: 0, losses: 0 };
        }

        // Self-healing: financial system upgrades
        if (userTeam) {
          if (!userTeam.loans) {
            userTeam.loans = { popular: 0, comercial: 0, shark: 0 };
          }
          if (userTeam.weeksInDebt === undefined) {
            userTeam.weeksInDebt = 0;
          }
          if (userTeam.academyLevel === undefined) {
            userTeam.academyLevel = 2; // Default
          }
          this.initDefaultSponsorsIfMissing(userTeam);
          this.ensureTeamFinanceLog(userTeam);
        }

        // Self-healing: if selecoesFixtures has old 2-group/4-group/8-group or missing structure, regenerate it
        if (!this.state.selecoesFixtures || !this.state.selecoesFixtures.groups || this.state.selecoesFixtures.groups.length < 16) {
          this.generateNationalTeamsAndFixtures();
        }

        return true;
      } catch (e) {
        console.error("Failed to load save:", e);
        return false;
      }
    }
    return false;
  }

  hasSave() {
    return localStorage.getItem("brasfoot_save") !== null;
  }

  // Find helpers
  findTeamById(teamId) {
    if (this.state.nationalTeams && this.state.nationalTeams[teamId]) {
      return this.state.nationalTeams[teamId];
    }
    for (const league of Object.values(this.state.database)) {
      const team = league.teams.find(t => t.id === teamId);
      if (team) return team;
    }
    return null;
  }

  findLeagueIdByTeamId(teamId) {
    for (const [leagueId, league] of Object.entries(this.state.database)) {
      if (league.teams.some(t => t.id === teamId)) return leagueId;
    }
    return null;
  }

  findLeagueByTeamId(teamId) {
    for (const league of Object.values(this.state.database)) {
      if (league.teams.some(t => t.id === teamId)) return league;
    }
    return null;
  }

  findPlayerById(playerId) {
    for (const league of Object.values(this.state.database)) {
      for (const team of league.teams) {
        const player = team.squad.find(p => p.id === playerId);
        if (player) return { player, team };
      }
    }
    // Check free agents
    const freeAgent = this.state.freeAgents.find(p => p.id === playerId);
    if (freeAgent) return { player: freeAgent, team: null };
    return null;
  }

  // Weekly Schedule Runner
  // Matches occur on specific weeks:
  // Week 1 to 38: League Match (if 20 teams)
  // Midweek / Special Weeks: Cups (National Cup rounds, Continental Cup rounds)
  // Let's create a clear weekly schedule:
  // Each season is 42 weeks long:
  // League has 38 rounds (weeks 1 to 38).
  // National Cup:
  // - R32: Week 5 (Midweek - or we can just make it the main match of Week 5 if no league match, or separate round)
  // To keep it simple, we can have a sequence of 45 match days!
  // Match Day schedule:
  // - Odd Match Days (1, 3, 5, etc.): League matches.
  // - Even Match Days (2, 4, 6, etc.): League matches, EXCEPT:
  //   - Match Day 6: National Cup Round 1 (R32 or R16)
  //   - Match Day 12: National Cup Round 2
  //   - Match Day 18: National Cup Quarter-Finals
  //   - Match Day 24: National Cup Semi-Finals
  //   - Match Day 30: National Cup Final
  //   - Match Day 8, 14, 20, 26, 32, 36: Continental Group Stage (R1 to R6)
  //   - Match Day 39: Continental Knockout Round 1
  //   - Match Day 41: Continental Quarter-Finals
  //   - Match Day 43: Continental Semi-Finals
  //   - Match Day 45: Continental Final
  // This is a beautiful schedule that runs linearly!
  // Let's implement this "Linear Calendar" of 45 Weeks per season.
  
  getCurrentWeekMatchInfo() {
    const userTeamId = this.state.manager.teamId;
    const userLeagueId = this.state.manager.leagueId;
    const week = this.state.week;

    const isNationalTeam = this.state.nationalTeams && this.state.nationalTeams[userTeamId] !== undefined;

    // Define what competition is played in the current week
    const weekSchedule = this.getCompetitionForWeek(week);

    if (isNationalTeam) {
      if (weekSchedule.type !== "selecoes") {
        return { type: "none", title: "Sem compromisso esta semana (Treinando Seleção)", match: null };
      }
      
      const userNatName = userTeamId;
      const sf = this.state.selecoesFixtures;
      const roundIdx = weekSchedule.round;

      if (weekSchedule.stage === "group") {
        if (!sf || !sf.groupFixtures || !sf.groupFixtures[roundIdx]) {
          return { type: "none", title: "Copa Internacional - Sem compromisso", match: null };
        }
        const roundMatches = sf.groupFixtures[roundIdx];
        const match = roundMatches.find(m => m.homeId === userNatName || m.awayId === userNatName);
        return {
          type: "selecoes_group",
          title: `Copa de Seleções - Fase de Grupos (Rodada ${roundIdx + 1})`,
          round: roundIdx,
          match: match,
          allMatches: roundMatches,
          userNatName: userNatName
        };
      } else {
        if (!sf || !sf.knockoutRounds || !sf.knockoutRounds[roundIdx]) {
          return { type: "none", title: "Copa Internacional - Eliminado", match: null };
        }
        const roundMatches = sf.knockoutRounds[roundIdx];
        const match = roundMatches.find(m => m.homeId === userNatName || m.awayId === userNatName);
        const stageName = roundIdx === 0 ? "Oitavas de Final" : (roundIdx === 1 ? "Quartas de Final" : (roundIdx === 2 ? "Semifinal" : "Grande Final"));
        return {
          type: "selecoes_knockout",
          title: `Copa de Seleções - ${stageName}`,
          round: roundIdx,
          match: match,
          allMatches: roundMatches,
          userNatName: userNatName
        };
      }
    }

    if (weekSchedule.type === "league") {
      const roundIdx = weekSchedule.round;
      const leagueFixtures = this.state.fixtures[userLeagueId];
      if (!leagueFixtures || roundIdx >= leagueFixtures.length) {
        return { type: "none", title: "Fim de Temporada", match: null };
      }
      const roundMatches = leagueFixtures[roundIdx];
      const match = roundMatches.find(m => m.homeId === userTeamId || m.awayId === userTeamId);
      return {
        type: "league",
        title: `Campeonato Brasileiro - Rodada ${roundIdx + 1}`,
        round: roundIdx,
        match: match,
        allMatches: roundMatches,
        leagueId: userLeagueId
      };
    } else if (weekSchedule.type === "cup") {
      const country = this.findLeagueByTeamId(userTeamId).country;
      const cup = this.state.cupFixtures[country];
      const roundIdx = weekSchedule.round;
      
      if (!cup || roundIdx >= cup.rounds.length) {
        return { type: "none", title: "Sem compromisso esta semana", match: null };
      }
      
      const roundMatches = cup.rounds[roundIdx];
      const match = roundMatches.find(m => m.homeId === userTeamId || m.awayId === userTeamId);
      
      // Stage names
      const stageNames = cup.size === 32
        ? ["Trinta e dois avos", "Oitavas de Final", "Quartas de Final", "Semifinal", "Grande Final"]
        : ["Oitavas de Final", "Quartas de Final", "Semifinal", "Grande Final"];
      
      return {
        type: "cup",
        title: `Copa Nacional - ${stageNames[roundIdx] || "Fase Eliminatória"}`,
        round: roundIdx,
        match: match,
        allMatches: roundMatches,
        country: country
      };
    } else if (weekSchedule.type === "continental") {
      const isCL = ["en_a", "es_a", "it_a", "de_a", "fr_a", "pt_a"].includes(userLeagueId);
      
      let compKey = "libertadores";
      if (isCL) {
        compKey = "champions";
      } else {
        const inSud = this.state.continentalFixtures.sudamericana && this.state.continentalFixtures.sudamericana.teams.includes(userTeamId);
        if (inSud) compKey = "sudamericana";
      }
      
      const comp = this.state.continentalFixtures[compKey];
      const roundIdx = weekSchedule.round;
      const compNames = { champions: "UEFA Champions League", libertadores: "Copa Libertadores", sudamericana: "Copa Sudamericana" };

      if (weekSchedule.stage === "group") {
        if (!comp || roundIdx >= 6) {
          return { type: "none", title: "Sem compromisso esta semana", match: null };
        }
        const roundMatches = comp.groupFixtures[roundIdx];
        const match = roundMatches.find(m => m.homeId === userTeamId || m.awayId === userTeamId);
        
        return {
          type: "continental_group",
          title: `${compNames[compKey]} - Fase de Grupos (Rodada ${roundIdx + 1})`,
          round: roundIdx,
          match: match,
          allMatches: roundMatches,
          competition: compKey
        };
      } else {
        // Knockout continental stages
        const kRoundIdx = weekSchedule.round;
        if (!comp || !comp.knockoutRounds || kRoundIdx >= comp.knockoutRounds.length) {
          return { type: "none", title: "Sem compromisso esta semana (Eliminado)", match: null };
        }
        const roundMatches = comp.knockoutRounds[kRoundIdx];
        const match = roundMatches.find(m => m.homeId === userTeamId || m.awayId === userTeamId);
        
        const clStages = ["Oitavas de Final", "Quartas de Final", "Semifinal", "Grande Final"];
        const libStages = ["Quartas de Final", "Semifinal", "Grande Final"];
        const stageName = compKey === "champions" ? clStages[kRoundIdx] : libStages[kRoundIdx];

        return {
          type: "continental_knockout",
          title: `${compNames[compKey]} - ${stageName || "Fase Final"}`,
          round: kRoundIdx,
          match: match,
          allMatches: roundMatches,
          competition: compKey
        };
      }
    } else if (weekSchedule.type === "mundial") {
      const roundIdx = weekSchedule.round;
      const mundial = this.state.mundialFixtures;
      if (!mundial || !mundial.rounds || !mundial.rounds[roundIdx]) {
        return { type: "none", title: "Mundial de Clubes da FIFA (Não participante)", match: null };
      }
      const roundMatches = mundial.rounds[roundIdx];
      const match = roundMatches.find(m => m.homeId === userTeamId || m.awayId === userTeamId);
      const stageName = roundIdx === 0 ? "Semifinal" : "Grande Final";
      return {
        type: "mundial",
        title: `Mundial de Clubes da FIFA - ${stageName}`,
        round: roundIdx,
        match: match,
        allMatches: roundMatches
      };
    } else if (weekSchedule.type === "selecoes") {
      // Normal club coach doesn't play selecoes matches interactively
      return { type: "none", title: "Copa Internacional - Sem compromisso", match: null };
    }

    return { type: "none", title: "Sem compromisso esta semana", match: null };
  }

  getCompetitionForWeek(week) {
    const schedules = {
      1: { type: "league", round: 0 },
      2: { type: "league", round: 1 },
      3: { type: "league", round: 2 },
      4: { type: "continental", stage: "group", round: 0 },
      5: { type: "league", round: 3 },
      6: { type: "cup", round: 0 },
      7: { type: "league", round: 4 },
      8: { type: "league", round: 5 },
      9: { type: "continental", stage: "group", round: 1 },
      10: { type: "league", round: 6 },
      11: { type: "cup", round: 1 },
      12: { type: "league", round: 7 },
      13: { type: "league", round: 8 },
      14: { type: "continental", stage: "group", round: 2 },
      15: { type: "league", round: 9 },
      16: { type: "league", round: 10 },
      17: { type: "cup", round: 2 },
      18: { type: "league", round: 11 },
      19: { type: "league", round: 12 },
      20: { type: "continental", stage: "group", round: 3 },
      21: { type: "league", round: 13 },
      22: { type: "league", round: 14 },
      23: { type: "cup", round: 3 },
      24: { type: "league", round: 15 },
      25: { type: "league", round: 16 },
      26: { type: "continental", stage: "group", round: 4 },
      27: { type: "league", round: 17 },
      28: { type: "league", round: 18 },
      29: { type: "cup", round: 4 },
      30: { type: "continental", stage: "group", round: 5 },
      31: { type: "league", round: 19 },
      32: { type: "league", round: 20 },
      33: { type: "league", round: 21 },
      34: { type: "continental", stage: "knockout", round: 0 },
      35: { type: "league", round: 22 },
      36: { type: "league", round: 23 },
      37: { type: "league", round: 24 },
      38: { type: "continental", stage: "knockout", round: 1 },
      39: { type: "league", round: 25 },
      40: { type: "league", round: 26 },
      41: { type: "league", round: 27 },
      42: { type: "continental", stage: "knockout", round: 2 },
      43: { type: "league", round: 28 },
      44: { type: "league", round: 29 },
      45: { type: "continental", stage: "knockout", round: 3 },
      46: { type: "mundial", round: 0 },
      47: { type: "mundial", round: 1 },
      48: { type: "selecoes", stage: "group", round: 0 },
      49: { type: "selecoes", stage: "group", round: 1 },
      50: { type: "selecoes", stage: "group", round: 2 },
      51: { type: "selecoes", stage: "knockout", round: 0 },
      52: { type: "selecoes", stage: "knockout", round: 1 },
      53: { type: "selecoes", stage: "knockout", round: 2 },
      54: { type: "selecoes", stage: "knockout", round: 3 }
    };

    if (week > 54) {
      const extraRound = 30 + (week - 55);
      return { type: "league", round: extraRound };
    }

    return schedules[week] || { type: "league", round: week - 1 };
  }

  // Prepares the simulation of the current week's match
  setupMatchSimulation() {
    const matchInfo = this.getCurrentWeekMatchInfo();
    if (matchInfo.type === "none" || !matchInfo.match) {
      // No match for the user, simulate immediately in background
      this.simulateRemainingWeekMatches();
      this.advanceWeek();
      return false;
    }

    // Set up user match
    const homeTeam = this.findTeamById(matchInfo.match.homeId);
    const awayTeam = this.findTeamById(matchInfo.match.awayId);

    // Validate squad starting 11
    const userTeam = this.findTeamById(this.state.manager.teamId);
    let userTeamObj = userTeam;
    if (matchInfo.type.startsWith("selecoes")) {
      userTeamObj = this.state.nationalTeams[matchInfo.userNatName];
    }

    const userStarters = userTeamObj.squad.filter(p => p.isStarter);
    if (userStarters.length !== 11) {
      alert(`Você precisa escalar exatamente 11 titulares para jogar! Atualmente escalados: ${userStarters.length}`);
      return false;
    }

    this.currentMatch = {
      info: matchInfo,
      homeTeam: homeTeam,
      awayTeam: awayTeam,
      scoreHome: 0,
      scoreAway: 0,
      scorersHome: [],
      scorersAway: [],
      minute: 0,
      commentary: [{ min: 0, txt: "Partida iniciada! Times em campo.", type: "system" }],
      possession: 50,
      shotsHome: 0,
      shotsAway: 0,
      yellowHome: 0,
      yellowAway: 0,
      redHome: 0,
      redAway: 0,
      isUserHome: homeTeam.name === userTeamObj.name,
      tacticsHome: homeTeam.mentality || "balanced",
      tacticsAway: awayTeam.mentality || "balanced",
      events: []
    };

    homeTeam.matchSubsCount = 0;
    awayTeam.matchSubsCount = 0;

    // Calculate full live match properties
    this.currentMatch.forceHome = this.calculateTeamForce(homeTeam);
    this.currentMatch.forceAway = this.calculateTeamForce(awayTeam);

    // Initialize other matches of the round
    if (matchInfo.allMatches) {
      const isKnockout = ["cup", "continental_knockout", "mundial", "selecoes_knockout"].includes(matchInfo.type);
      matchInfo.allMatches.forEach(m => {
        m.scoreHome = 0;
        m.scoreAway = 0;
        m.scorersHome = [];
        m.scorersAway = [];
        m.simulated = false;

        // Skip user's own match
        if (m.homeId === matchInfo.match.homeId && m.awayId === matchInfo.match.awayId) return;

        const h = this.findTeamById(m.homeId);
        const a = this.findTeamById(m.awayId);
        if (h && a) {
          const fH = this.calculateTeamForce(h);
          const fA = this.calculateTeamForce(a);
          const res = this.generateMatchScore(fH, fA, isKnockout);

          m.targetScoreHome = res.scoreHome;
          m.targetScoreAway = res.scoreAway;
          m.goalMinutesHome = [];
          m.goalMinutesAway = [];

          for (let i = 0; i < res.scoreHome; i++) {
            m.goalMinutesHome.push(Math.floor(Math.random() * 90) + 1);
          }
          m.goalMinutesHome.sort((x, y) => x - y);

          for (let i = 0; i < res.scoreAway; i++) {
            m.goalMinutesAway.push(Math.floor(Math.random() * 90) + 1);
          }
          m.goalMinutesAway.sort((x, y) => x - y);
        }
      });
    }

    return true;
  }

  // Calculates playing force of a team based on squad and mentality
  calculateTeamForce(team) {
    if (!team || !team.squad || team.squad.length === 0) return 30;
    const starters = team.squad.filter(p => p.isStarter);
    const reserves = team.squad.filter(p => !p.isStarter);

    if (starters.length === 0) return 30;

    let startersRating = 0;
    let avgCondition = 0;
    let avgMorale = 0;

    starters.forEach(p => {
      startersRating += p.rating;
      avgCondition += p.condition;
      avgMorale += p.morale;
    });

    startersRating = startersRating / starters.length;
    avgCondition = avgCondition / starters.length;
    avgMorale = avgMorale / starters.length;

    let reservesRating = 0;
    if (reserves.length > 0) {
      reservesRating = reserves.reduce((acc, p) => acc + p.rating, 0) / reserves.length;
    } else {
      reservesRating = startersRating * 0.8;
    }

    // General overall is weighted: 75% starters, 25% reserves
    let generalOverall = startersRating * 0.75 + reservesRating * 0.25;

    // Force is general overall scaled by condition and morale
    let force = generalOverall * (0.5 + (avgCondition / 200)) * (0.8 + (avgMorale / 500));

    // Mentality bonus
    if (team.mentality === "offensive") force *= 1.05;
    else if (team.mentality === "ultra-offensive") force *= 1.10;
    else if (team.mentality === "defensive") force *= 0.95;

    return Math.round(force);
  }

  // Generates match goals for home and away based on their forces
  generateMatchScore(fH, fA, isKnockout = false) {
    const homeAdvantage = 2.5; // Home advantage in force rating points
    const effectiveDiff = fH - fA + homeAdvantage;

    let probHomeWin, probDraw, probAwayWin;

    if (Math.abs(effectiveDiff) <= 3) {
      // Similar overalls (difference between -3 and 3)
      probDraw = 0.50; // 50% chance of draw
      if (effectiveDiff >= 0) {
        probHomeWin = 0.30;
        probAwayWin = 0.20;
      } else {
        probHomeWin = 0.20;
        probAwayWin = 0.30;
      }
    } else if (effectiveDiff > 3) {
      // Home is stronger
      const factor = Math.min(12, effectiveDiff - 3);
      probHomeWin = 0.50 + (factor * 0.038); // up to 95.6%
      probDraw = 0.35 - (factor * 0.025);   // down to 5%
      probAwayWin = 1.0 - probHomeWin - probDraw;
    } else {
      // Away is stronger
      const factor = Math.min(12, Math.abs(effectiveDiff) - 3);
      probAwayWin = 0.50 + (factor * 0.038); // up to 95.6%
      probDraw = 0.35 - (factor * 0.025);   // down to 5%
      probHomeWin = 1.0 - probAwayWin - probDraw;
    }

    // Clamp probabilities to be safe
    probHomeWin = Math.max(0.02, Math.min(0.96, probHomeWin));
    probDraw = Math.max(0.02, Math.min(0.50, probDraw));
    probAwayWin = Math.max(0.02, Math.min(0.96, probAwayWin));

    // Normalize probabilities to sum up to 1.0
    const sum = probHomeWin + probDraw + probAwayWin;
    probHomeWin /= sum;
    probDraw /= sum;
    probAwayWin /= sum;

    // Roll result
    const roll = Math.random();
    let scoreHome = 0;
    let scoreAway = 0;

    if (roll < probHomeWin) {
      // Home Win
      const diffGoals = 1 + Math.floor(Math.random() * (1 + Math.floor(Math.abs(effectiveDiff) / 6)));
      scoreAway = Math.floor(Math.random() * 2); // 0 or 1
      scoreHome = scoreAway + diffGoals;
    } else if (roll < probHomeWin + probDraw) {
      // Draw
      const drawRoll = Math.random();
      let goals = 0;
      if (drawRoll < 0.35) goals = 0;
      else if (drawRoll < 0.80) goals = 1;
      else if (drawRoll < 0.97) goals = 2;
      else goals = 3;

      scoreHome = goals;
      scoreAway = goals;
    } else {
      // Away Win
      const diffGoals = 1 + Math.floor(Math.random() * (1 + Math.floor(Math.abs(effectiveDiff) / 6)));
      scoreHome = Math.floor(Math.random() * 2); // 0 or 1
      scoreAway = scoreHome + diffGoals;
    }

    return { scoreHome, scoreAway };
  }

  // Simulates a fast match in the background and populates its score/scorers
  simulateFastMatch(m, homeTeam, awayTeam, isKnockout = false) {
    const fH = this.calculateTeamForce(homeTeam);
    const fA = this.calculateTeamForce(awayTeam);

    const res = this.generateMatchScore(fH, fA, isKnockout);

    m.scoreHome = res.scoreHome;
    m.scoreAway = res.scoreAway;
    m.scorersHome = [];
    m.scorersAway = [];

    // Distribute goals and choose scorers
    for (let i = 0; i < res.scoreHome; i++) {
      const min = Math.floor(Math.random() * 90) + 1;
      m.scorersHome.push({ name: this.selectScorer(homeTeam).name, min: min });
    }
    m.scorersHome.sort((a, b) => a.min - b.min);

    for (let i = 0; i < res.scoreAway; i++) {
      const min = Math.floor(Math.random() * 90) + 1;
      m.scorersAway.push({ name: this.selectScorer(awayTeam).name, min: min });
    }
    m.scorersAway.sort((a, b) => a.min - b.min);

    if (isKnockout) {
      if (res.scoreHome === res.scoreAway) {
        m.isPenalties = true;
        const pH = fH / (fH + fA);
        let pH_wins = Math.random() < pH;
        m.penHome = pH_wins ? 5 : 4;
        m.penAway = pH_wins ? 4 : 5;
        m.winnerId = pH_wins ? m.homeId : m.awayId;
      } else {
        m.isPenalties = false;
        m.winnerId = res.scoreHome > res.scoreAway ? m.homeId : m.awayId;
      }
    }

    m.simulated = true;
  }

  // Ticks the current live match simulation by 1 minute
  tickMatch(speed = 1) {
    if (!this.currentMatch || this.currentMatch.minute >= 90) {
      return; // Let app.js handle the end-of-match flow
    }

    this.currentMatch.minute++;
    const min = this.currentMatch.minute;

    // Simulate this minute for the user match
    this.simulateUserMatchMinute(min);

    // Simulate other matches in the same round minute by minute for live updates
    this.simulateOtherRoundMatchesStep(min);
  }

  simulateUserMatchMinute(min) {
    const match = this.currentMatch;
    // Auto tactical substitutions every minute after 55' (both live and skip modes)
    if (match && min >= 55 && min % 5 === 0) {
      this.makeTacticalSubs(match.homeTeam, min);
      this.makeTacticalSubs(match.awayTeam, min);
    }

    // 6% chance of event per minute
    if (Math.random() < 0.07) {
      const fHome = match.forceHome;
      const fAway = match.forceAway;
      const homeBiasPoints = 2.5; // Home advantage in force rating points
      const diff = fHome - fAway + homeBiasPoints;
      // Logistic sigmoid probability to favor the stronger team much more heavily
      const probHome = 1 / (1 + Math.exp(-diff / 8));
      const isHomeEvent = Math.random() < probHome;

      const attackingTeam = isHomeEvent ? match.homeTeam : match.awayTeam;
      const defendingTeam = isHomeEvent ? match.awayTeam : match.homeTeam;
      
      const eventType = Math.random();

      if (eventType < 0.15) {
        // GOAL!
        const scorer = this.selectScorer(attackingTeam);
        const assister = this.selectAssister(attackingTeam, scorer);
        
        let goalType = "chute firme";
        if (scorer.skills.includes("Cabeceio") && Math.random() < 0.5) goalType = "cabeceio preciso";
        else if (scorer.skills.includes("Velocidade") && Math.random() < 0.3) goalType = "arrancada espetacular";
        else if (scorer.skills.includes("Drible") && Math.random() < 0.3) goalType = "drible desconcertante no goleiro";

        if (isHomeEvent) {
          match.scoreHome++;
          match.scorersHome.push({ name: scorer.name, min: min });
          match.commentary.unshift({
            min: min,
            txt: `GOL do ${attackingTeam.name}! ${scorer.name} marca após ${goalType}! ${assister ? '(Assistência: ' + assister.name + ')' : ''}`,
            type: "goal-home"
          });
          match.shotsHome++;
        } else {
          match.scoreAway++;
          match.scorersAway.push({ name: scorer.name, min: min });
          match.commentary.unshift({
            min: min,
            txt: `GOL do ${attackingTeam.name}! ${scorer.name} marca após ${goalType}! ${assister ? '(Assistência: ' + assister.name + ')' : ''}`,
            type: "goal-away"
          });
          match.shotsAway++;
        }
        // Goal affects morale
        attackingTeam.squad.forEach(p => p.morale = Math.min(100, p.morale + 3));
        defendingTeam.squad.forEach(p => p.morale = Math.max(0, p.morale - 2));
      } 
      else if (eventType < 0.50) {
        // Missed Chance / GK Save
        const shooter = this.selectScorer(attackingTeam);
        const gk = defendingTeam.squad.find(p => p.position === "GOL" && p.isStarter);

        if (isHomeEvent) match.shotsHome++; else match.shotsAway++;

        if (gk && Math.random() < 0.4) {
          match.commentary.unshift({
            min: min,
            txt: `Defesaça de ${gk.name}! Espalma a finalização de ${shooter.name} para escanteio!`,
            type: "gk-save"
          });
        } else {
          const missDetails = [
            `Chute forte de ${shooter.name} que vai por cima do gol!`,
            `${shooter.name} finaliza colocado, mas a bola bate na rede pelo lado de fora!`,
            `${shooter.name} cabeceia rente à trave! Quase o gol!`,
            `Na trave! Chute incrível de ${shooter.name} explode no travessão!`
          ];
          match.commentary.unshift({
            min: min,
            txt: missDetails[Math.floor(Math.random() * missDetails.length)],
            type: "miss"
          });
        }
      } 
      else if (eventType < 0.80) {
        // Foul / Yellow Card
        const fouler = this.selectFouler(defendingTeam);
        if (fouler) {
          fouler.yellowCards++;
          if (isHomeEvent) match.yellowAway++; else match.yellowHome++;

          if (fouler.yellowCards === 2) {
            fouler.redCards++;
            fouler.isStarter = false; // sent off!
            if (isHomeEvent) { match.redAway++; } else { match.redHome++; }
            match.commentary.unshift({
              min: min,
              txt: `Cartão vermelho! ${fouler.name} recebe o segundo amarelo e está expulso!`,
              type: "red-card"
            });
            this.recalculateLiveForce();
          } else {
            match.commentary.unshift({
              min: min,
              txt: `Cartão amarelo para ${fouler.name} por entrada dura.`,
              type: "yellow-card"
            });
          }
        }
      } 
      else if (eventType < 0.90) {
        // Direct Red Card
        const fouler = this.selectFouler(defendingTeam);
        if (fouler) {
          fouler.redCards++;
          fouler.isStarter = false;
          if (isHomeEvent) match.redAway++; else match.redHome++;
          match.commentary.unshift({
            min: min,
            txt: `CARTÃO VERMELHO DIRETO! Entrada violenta de ${fouler.name}! Expulso do jogo!`,
            type: "red-card"
          });
          this.recalculateLiveForce();
        }
      } 
      else if (eventType < 0.95) {
        // Injury
        const injured = this.selectInjured(attackingTeam);
        if (injured) {
          injured.condition = Math.max(10, injured.condition - 40);
          match.commentary.unshift({
            min: min,
            txt: `Lesão! ${injured.name} sente uma pancada e precisa sair do campo com urgência.`,
            type: "injury"
          });
          
          const userTeam = match.isUserHome ? match.homeTeam : match.awayTeam;
          if (attackingTeam.name === userTeam.name) {
            if (match.isSkipping) {
              // Automatically make the sub if the user is skipping simulation to the end
              this.makeComputerAutoSub(attackingTeam, injured);
            } else {
              // User player injured. Auto-pause game to make sub
              window.pauseMatchSim();
              window.showCustomAlert(`ATENÇÃO: Seu jogador ${injured.name} está lesionado e precisa ser substituído!`, "Lesão", () => {
                // After user acknowledges, open substitution modal (which resumes timer on close)
                if (typeof window.openMatchSubModal === 'function') {
                  window.openMatchSubModal();
                } else {
                  window.startMatchTimer();
                }
              });
            }
          } else {
            // Computer auto sub
            this.makeComputerAutoSub(attackingTeam, injured);
          }
        }
      } 
      else {
        // Penalty Kick!
        const shooter = this.selectScorer(attackingTeam);
        const gk = defendingTeam.squad.find(p => p.position === "GOL" && p.isStarter);
        
        match.commentary.unshift({
          min: min,
          txt: `PÊNALTI! Falta dentro da área cometida pela defesa do ${defendingTeam.name}!`,
          type: "penalty"
        });

        if (Math.random() < 0.78) {
          // Penalty scored
          if (isHomeEvent) {
            match.scoreHome++;
            match.scorersHome.push({ name: shooter.name + " (pên.)", min: min });
            match.shotsHome++;
          } else {
            match.scoreAway++;
            match.scorersAway.push({ name: shooter.name + " (pên.)", min: min });
            match.shotsAway++;
          }
          match.commentary.unshift({
            min: min,
            txt: `GOL! ${shooter.name} cobra com categoria e marca de pênalti!`,
            type: isHomeEvent ? "goal-home" : "goal-away"
          });
        } else {
          // Penalty missed
          const save = Math.random() < 0.5;
          if (save && gk) {
            match.commentary.unshift({
              min: min,
              txt: `DEFENDEU! O goleiro ${gk.name} voa no canto e defende o pênalti de ${shooter.name}!`,
              type: "gk-save"
            });
          } else {
            match.commentary.unshift({
              min: min,
              txt: `BATEU PARA FORA! ${shooter.name} cobra mal e manda longe do gol!`,
              type: "miss"
            });
          }
        }
      }
    }

    // Dynamic possession adjustment
    const ratio = this.currentMatch.forceHome / (this.currentMatch.forceHome + this.currentMatch.forceAway);
    this.currentMatch.possession = Math.round(ratio * 100 + (Math.random() * 10 - 5));
    this.currentMatch.possession = Math.max(30, Math.min(70, this.currentMatch.possession));
  }

  // Select player to score
  selectScorer(team) {
    if (!team || !team.squad) return { id: -999, name: "Jogador", position: "ATA", rating: 50, stats: { goals: 0 }, skills: [], morale: 50, condition: 100 };
    const starters = team.squad.filter(p => p.isStarter);
    const weighted = [];
    starters.forEach(p => {
      let weight = 1;
      if (p.position === "ATA") weight = 6;
      else if (p.position === "MEI") weight = 3;
      else if (p.position === "LAT") weight = 1.5;
      
      // Skill bonus
      if (p.skills && p.skills.includes("Finalização")) weight *= 1.5;
      if (p.skills && p.skills.includes("Cabeceio")) weight *= 1.2;

      for (let i = 0; i < weight * 10; i++) {
        weighted.push(p);
      }
    });

    if (weighted.length === 0) {
      return starters[0] || team.squad[0] || { id: -999, name: "Jogador", position: "ATA", rating: 50, stats: { goals: 0 }, skills: [], morale: 50, condition: 100 };
    }
    return weighted[Math.floor(Math.random() * weighted.length)];
  }

  // Select player to assist
  selectAssister(team, scorer) {
    if (!team || !team.squad) return null;
    const scorerId = scorer ? scorer.id : -999;
    const starters = team.squad.filter(p => p.isStarter && p.id !== scorerId);
    if (starters.length === 0) return null;
    if (Math.random() < 0.25) return null; // solo goal

    const weighted = [];
    starters.forEach(p => {
      let weight = 1;
      if (p.position === "MEI") weight = 5;
      else if (p.position === "LAT") weight = 3;
      else if (p.position === "ATA") weight = 2;

      if (p.skills && p.skills.includes("Passe")) weight *= 1.5;
      if (p.skills && p.skills.includes("Cruzamento")) weight *= 1.3;
      if (p.skills && p.skills.includes("Armação")) weight *= 1.4;

      for (let i = 0; i < weight * 10; i++) {
        weighted.push(p);
      }
    });

    if (weighted.length === 0) return starters[0] || null;
    return weighted[Math.floor(Math.random() * weighted.length)];
  }

  selectFouler(team) {
    const starters = team.squad.filter(p => p.isStarter && p.position !== "GOL");
    if (starters.length === 0) return null;
    
    const weighted = [];
    starters.forEach(p => {
      let weight = 1;
      if (p.position === "ZAG") weight = 4;
      else if (p.position === "LAT") weight = 3;
      else if (p.position === "MEI") weight = 2;

      if (p.skills.includes("Marcação")) weight *= 0.7; // better defenders foul less
      if (p.skills.includes("Desarme")) weight *= 0.6;
      if (p.skills.includes("Força")) weight *= 1.4; // strong players foul more

      for (let i = 0; i < weight * 10; i++) {
        weighted.push(p);
      }
    });

    return weighted[Math.floor(Math.random() * weighted.length)];
  }

  selectInjured(team) {
    const starters = team.squad.filter(p => p.isStarter);
    if (starters.length === 0) return null;
    return starters[Math.floor(Math.random() * starters.length)];
  }

  recalculateLiveForce() {
    this.currentMatch.forceHome = this.calculateTeamForce(this.currentMatch.homeTeam);
    this.currentMatch.forceAway = this.calculateTeamForce(this.currentMatch.awayTeam);
  }

  makeComputerAutoSub(team, injuredPlayer) {
    injuredPlayer.isStarter = false;
    // Find best reserve on the bench of the same category (or any field position)
    const reserve = team.squad
      .filter(p => p.isSub && p.condition > 50)
      .sort((a, b) => {
        // Prioritize same position category
        const samePos = (a.position === injuredPlayer.position ? 1 : 0) - (b.position === injuredPlayer.position ? 1 : 0);
        if (samePos !== 0) return -samePos;
        return b.rating - a.rating;
      })[0];

    if (reserve) {
      reserve.isSub = false;
      reserve.isStarter = true;
      this.currentMatch.commentary.unshift({
        min: this.currentMatch.minute,
        txt: `Substituição no ${team.name}: Entra ${reserve.name} no lugar de ${injuredPlayer.name}.`,
        type: "sub"
      });
      this.recalculateLiveForce();
    }
  }

  makeTacticalSubs(team, min) {
    if (!team || !team.squad) return;
    if (team.matchSubsCount === undefined) {
      team.matchSubsCount = 0;
    }
    if (team.matchSubsCount >= 3) return;

    // Find the most fatigued starting field player (any condition, pick worst)
    // Also always try to make at least one sub per check interval after 60'
    const fieldStarters = team.squad
      .filter(p => p.isStarter && p.position !== "GOL")
      .sort((a, b) => a.condition - b.condition);

    // Determine if we should force a sub (every 15 minutes after 55') or only if tired (<88)
    const forceSubMinutes = [55, 70, 82];
    const shouldForce = forceSubMinutes.includes(min);
    const candidates = shouldForce
      ? fieldStarters.slice(0, 1) // force replace the most tired one
      : fieldStarters.filter(p => p.condition < 88);

    for (let tiredPlayer of candidates) {
      if (team.matchSubsCount >= 3) break;

      // Find best available reserve (any condition > 50)
      const reserve = team.squad
        .filter(p => p.isSub && p.condition > 50)
        .sort((a, b) => {
          const samePos = (a.position === tiredPlayer.position ? 1 : 0) - (b.position === tiredPlayer.position ? 1 : 0);
          if (samePos !== 0) return -samePos;
          return b.rating - a.rating;
        })[0];

      if (reserve) {
        tiredPlayer.isStarter = false;
        tiredPlayer.isSub = false; // sent off, cannot be re-entered
        reserve.isSub = false;
        reserve.isStarter = true;
        team.matchSubsCount++;

        if (this.currentMatch) {
          this.currentMatch.commentary.unshift({
            min: min,
            txt: `Substituição tática no ${team.name}: Entra ${reserve.name} no lugar de ${tiredPlayer.name}.`,
            type: "sub"
          });
        }
      }
    }
    this.recalculateLiveForce();
  }

  // Simulated other matches round step-by-step
  simulateOtherRoundMatchesStep(currentMin) {
    const allMatches = this.currentMatch.info.allMatches;
    const userMatch = this.currentMatch.info.match;
    const type = this.currentMatch.info.type;

    allMatches.forEach(match => {
      // Don't simulate user match (simulating in real-time)
      if (match.homeId === userMatch.homeId && match.awayId === userMatch.awayId) return;
      if (match.simulated && currentMin < 90) return;

      const home = this.findTeamById(match.homeId);
      const away = this.findTeamById(match.awayId);
      if (!home || !away) return;

      // Check pre-determined goals for home
      if (match.goalMinutesHome) {
        while (match.goalMinutesHome.length > 0 && match.goalMinutesHome[0] <= currentMin) {
          match.goalMinutesHome.shift();
          match.scoreHome++;
          const scorer = this.selectScorer(home);
          match.scorersHome.push({ name: scorer.name, min: currentMin });
        }
      }

      // Check pre-determined goals for away
      if (match.goalMinutesAway) {
        while (match.goalMinutesAway.length > 0 && match.goalMinutesAway[0] <= currentMin) {
          match.goalMinutesAway.shift();
          match.scoreAway++;
          const scorer = this.selectScorer(away);
          match.scorersAway.push({ name: scorer.name, min: currentMin });
        }
      }

      if (currentMin === 90) {
        // Resolve penalties or knockout winners if necessary
        const isKnockout = ["cup", "continental_knockout", "mundial", "selecoes_knockout"].includes(type);
        if (isKnockout) {
          if (match.scoreHome === match.scoreAway) {
            match.isPenalties = true;
            const fH = this.calculateTeamForce(home);
            const fA = this.calculateTeamForce(away);
            const pH = fH / (fH + fA);
            let pH_wins = Math.random() < pH;
            match.penHome = pH_wins ? 5 : 4;
            match.penAway = pH_wins ? 4 : 5;
            match.winnerId = pH_wins ? match.homeId : match.awayId;
          } else {
            match.isPenalties = false;
            match.winnerId = match.scoreHome > match.scoreAway ? match.homeId : match.awayId;
          }
        }
        match.simulated = true;
      }
    });
  }

  // Save the result of the match and apply points, cards, condition changes
  endMatch() {
    if (this.matchInterval) {
      clearInterval(this.matchInterval);
      this.matchInterval = null;
    }

    const match = this.currentMatch;
    const userMatch = match.info.match;

    // Apply User match score
    userMatch.scoreHome = match.scoreHome;
    userMatch.scoreAway = match.scoreAway;
    userMatch.scorersHome = match.scorersHome;
    userMatch.scorersAway = match.scorersAway;
    userMatch.simulated = true;

    // Simulate final step of other matches if missed
    this.simulateOtherRoundMatchesStep(90);

    // Apply match effects (wages, ticket income, points, stats, condition recovery)
    this.applyRoundResults();

    // Simulate remaining matches for other leagues and competitions
    this.simulateRemainingWeekMatches();

    // Advance week calendar (finances, transfers, upgrades, age, etc.)
    this.advanceWeek();

    this.currentMatch = null;
    this.saveGame();
    
    // Switch to Dashboard tab
    this.activeTab = "dashboard";
    // Note: renderApp() is called by app.js after the match-end modal is dismissed
  }

  applyRoundResults() {
    const matchInfo = this.getCurrentWeekMatchInfo();
    const type = matchInfo.type;
    const userTeamId = this.state.manager.teamId;

    if (type === "league") {
      const leagueFixtures = this.state.fixtures[matchInfo.leagueId];
      const roundMatches = leagueFixtures[matchInfo.round];

      roundMatches.forEach(m => {
        const home = this.findTeamById(m.homeId);
        const away = this.findTeamById(m.awayId);

        home.played++;
        away.played++;
        home.goalsFor += m.scoreHome;
        home.goalsAgainst += m.scoreAway;
        away.goalsFor += m.scoreAway;
        away.goalsAgainst += m.scoreHome;

        if (m.scoreHome > m.scoreAway) {
          home.wins++;
          home.points += 3;
          away.losses++;
          home.form.push("W");
          away.form.push("L");
        } else if (m.scoreHome < m.scoreAway) {
          away.wins++;
          away.points += 3;
          home.losses++;
          home.form.push("L");
          away.form.push("W");
        } else {
          home.draws++;
          away.draws++;
          home.points += 1;
          away.points += 1;
          home.form.push("D");
          away.form.push("D");
        }

        // Limit form list
        if (home.form.length > 5) home.form.shift();
        if (away.form.length > 5) away.form.shift();

        // Accumulate statistics to squad
        this.applyRosterStatsFromMatch(home, m.scorersHome, m.homeId === userTeamId);
        this.applyRosterStatsFromMatch(away, m.scorersAway, m.awayId === userTeamId);

        // Ticket Income for Home team
        const ticketIncome = this.calculateTicketIncome(home, m.scoreHome, m.scoreAway);
        this.adjustTeamBudget(home, ticketIncome, 'ticketSales');

        // Apply sponsor match bonuses for user team
        const isUserMatch = (m.homeId === userTeamId || m.awayId === userTeamId);
        if (isUserMatch) {
          const userIsHome = m.homeId === userTeamId;
          const userTeam = userIsHome ? home : away;
          let isWin = false;
          let isDraw = false;
          if (m.scoreHome > m.scoreAway) { isWin = userIsHome; }
          else if (m.scoreHome < m.scoreAway) { isWin = !userIsHome; }
          else { isDraw = true; }
          this.incrementManagerStats(isWin, isDraw);

          this.ensureTeamFinanceLog(userTeam);
          this.initDefaultSponsorsIfMissing(userTeam);
          if (userTeam.sponsors) {
            if (userTeam.sponsors.master && userTeam.sponsors.master.weeksRemaining > 0) {
              const bonus = isWin ? userTeam.sponsors.master.winBonus : (isDraw ? Math.round(userTeam.sponsors.master.winBonus * 0.3) : 0);
              if (bonus > 0) this.adjustTeamBudget(userTeam, bonus, 'sponsorMaster');
            }
            if (userTeam.sponsors.sleeve && userTeam.sponsors.sleeve.weeksRemaining > 0) {
              const bonus = isWin ? userTeam.sponsors.sleeve.winBonus : (isDraw ? Math.round(userTeam.sponsors.sleeve.winBonus * 0.3) : 0);
              if (bonus > 0) this.adjustTeamBudget(userTeam, bonus, 'sponsorSleeve');
            }
          }
        }

        // Player condition decay
        this.applyConditionDecay(home);
        this.applyConditionDecay(away);
      });

      // Increment round index for this league
      this.state.currentRound[matchInfo.leagueId]++;
    } 
    else if (type === "cup") {
      // Cup matches
      const cup = this.state.cupFixtures[matchInfo.country];
      const roundMatches = cup.rounds[matchInfo.round];

      roundMatches.forEach(m => {
        const home = this.findTeamById(m.homeId);
        const away = this.findTeamById(m.awayId);

        // Tiebreaker for Cup: Extra-time / Penalties
        if (m.scoreHome === m.scoreAway) {
          m.isPenalties = true;
          // Random penalty shootout based on relative force
          const fH = this.calculateTeamForce(home);
          const fA = this.calculateTeamForce(away);
          const pH = fH / (fH + fA);
          
          let pensH = 0;
          let pensA = 0;
          
          // Best of 5
          for (let i = 0; i < 5; i++) {
            if (Math.random() < 0.75 * (pH + 0.1)) pensH++;
            if (Math.random() < 0.75 * ((1 - pH) + 0.1)) pensA++;
          }
          // Sudden death
          while (pensH === pensA) {
            if (Math.random() < 0.75) pensH++;
            if (Math.random() < 0.75) pensA++;
          }
          m.penHome = pensH;
          m.penAway = pensA;
          m.winnerId = pensH > pensA ? m.homeId : m.awayId;
        } else {
          m.winnerId = m.scoreHome > m.scoreAway ? m.homeId : m.awayId;
        }

        m.simulated = true;

        this.applyRosterStatsFromMatch(home, m.scorersHome, m.homeId === userTeamId);
        this.applyRosterStatsFromMatch(away, m.scorersAway, m.awayId === userTeamId);

        // Stadium Ticket income
        const ticketIncome = this.calculateTicketIncome(home, m.scoreHome, m.scoreAway) * 1.2; // cup bonus ticket sales
        this.adjustTeamBudget(home, ticketIncome, 'ticketSales');

        // Apply sponsor match bonuses for user team
        const isUserMatch = (m.homeId === userTeamId || m.awayId === userTeamId);
        if (isUserMatch) {
          const userIsHome = m.homeId === userTeamId;
          const userTeam = userIsHome ? home : away;
          let isWin = false;
          let isDraw = false;
          if (m.scoreHome > m.scoreAway) { isWin = userIsHome; }
          else if (m.scoreHome < m.scoreAway) { isWin = !userIsHome; }
          else { isDraw = true; }
          this.incrementManagerStats(isWin, isDraw);

          this.ensureTeamFinanceLog(userTeam);
          this.initDefaultSponsorsIfMissing(userTeam);
          if (userTeam.sponsors) {
            if (userTeam.sponsors.master && userTeam.sponsors.master.weeksRemaining > 0) {
              const bonus = isWin ? userTeam.sponsors.master.winBonus : (isDraw ? Math.round(userTeam.sponsors.master.winBonus * 0.3) : 0);
              if (bonus > 0) this.adjustTeamBudget(userTeam, bonus, 'sponsorMaster');
            }
            if (userTeam.sponsors.sleeve && userTeam.sponsors.sleeve.weeksRemaining > 0) {
              const bonus = isWin ? userTeam.sponsors.sleeve.winBonus : (isDraw ? Math.round(userTeam.sponsors.sleeve.winBonus * 0.3) : 0);
              if (bonus > 0) this.adjustTeamBudget(userTeam, bonus, 'sponsorSleeve');
            }
          }
        }

        this.applyConditionDecay(home);
        this.applyConditionDecay(away);
      });

      // Draw next Cup round if this wasn't the final!
      if (matchInfo.round < cup.rounds.length - 1) {
        const nextRoundMatches = cup.rounds[matchInfo.round + 1];
        const winners = roundMatches.map(m => m.winnerId);
        
        // Populate the homeId and awayId of the next round matches
        for (let i = 0; i < nextRoundMatches.length; i++) {
          nextRoundMatches[i].homeId = winners[i * 2];
          nextRoundMatches[i].awayId = winners[i * 2 + 1];
        }
      } else {
        // Cup Final Winner!
        const finalMatch = roundMatches[0];
        const champion = this.findTeamById(finalMatch.winnerId);
        const prize = 15000000; // 15M prize
        this.awardTitleRewards(champion, "Copa Nacional", prize);
        this.addNews("Campeão da Copa", `${champion.name} vence a Copa Nacional e leva a taça + R$ 15.000.000 de premiação!`);
        
        if (champion.id === userTeamId) {
          this.state.manager.trophies.push({ year: this.state.year, title: "Copa Nacional", team: champion.name });
        }
      }
    } 
    else if (type.startsWith("continental")) {
      const compKey = matchInfo.competition;
      const comp = this.state.continentalFixtures[compKey];
      const allMatches = matchInfo.allMatches;

      if (matchInfo.type === "continental_group") {
        // Group Stage
        allMatches.forEach(m => {
          const home = this.findTeamById(m.homeId);
          const away = this.findTeamById(m.awayId);

          m.simulated = true;
          this.applyRosterStatsFromMatch(home, m.scorersHome, m.homeId === userTeamId);
          this.applyRosterStatsFromMatch(away, m.scorersAway, m.awayId === userTeamId);

          const ticketIncome = this.calculateTicketIncome(home, m.scoreHome, m.scoreAway) * 1.5; // continental bonus
          this.adjustTeamBudget(home, ticketIncome, 'ticketSales');

          // Apply sponsor match bonuses for user team
          const isUserMatch = (m.homeId === userTeamId || m.awayId === userTeamId);
          if (isUserMatch) {
            const userIsHome = m.homeId === userTeamId;
            const userTeam = userIsHome ? home : away;
            let isWin = false;
            let isDraw = false;
            if (m.scoreHome > m.scoreAway) { isWin = userIsHome; }
            else if (m.scoreHome < m.scoreAway) { isWin = !userIsHome; }
            else { isDraw = true; }
            this.incrementManagerStats(isWin, isDraw);

            this.ensureTeamFinanceLog(userTeam);
            this.initDefaultSponsorsIfMissing(userTeam);
            if (userTeam.sponsors) {
              if (userTeam.sponsors.master && userTeam.sponsors.master.weeksRemaining > 0) {
                const bonus = isWin ? userTeam.sponsors.master.winBonus : (isDraw ? Math.round(userTeam.sponsors.master.winBonus * 0.3) : 0);
                if (bonus > 0) this.adjustTeamBudget(userTeam, bonus, 'sponsorMaster');
              }
              if (userTeam.sponsors.sleeve && userTeam.sponsors.sleeve.weeksRemaining > 0) {
                const bonus = isWin ? userTeam.sponsors.sleeve.winBonus : (isDraw ? Math.round(userTeam.sponsors.sleeve.winBonus * 0.3) : 0);
                if (bonus > 0) this.adjustTeamBudget(userTeam, bonus, 'sponsorSleeve');
              }
            }
          }

          this.applyConditionDecay(home);
          this.applyConditionDecay(away);
        });

        // If it was the 6th group round, draw the knockout bracket!
        if (matchInfo.round === 5) {
          this.resolveContinentalGroupStage(compKey);
        }
      } 
      else {
        // Continental Knockout
        allMatches.forEach(m => {
          const home = this.findTeamById(m.homeId);
          const away = this.findTeamById(m.awayId);

          if (m.scoreHome === m.scoreAway) {
            m.isPenalties = true;
            const fH = this.calculateTeamForce(home);
            const fA = this.calculateTeamForce(away);
            const pH = fH / (fH + fA);
            
            let pensH = 0; let pensA = 0;
            for (let i = 0; i < 5; i++) {
              if (Math.random() < 0.75 * (pH + 0.1)) pensH++;
              if (Math.random() < 0.75 * ((1 - pH) + 0.1)) pensA++;
            }
            while (pensH === pensA) {
              if (Math.random() < 0.75) pensH++;
              if (Math.random() < 0.75) pensA++;
            }
            m.penHome = pensH;
            m.penAway = pensA;
            m.winnerId = pensH > pensA ? m.homeId : m.awayId;
          } else {
            m.winnerId = m.scoreHome > m.scoreAway ? m.homeId : m.awayId;
          }
          m.simulated = true;

          this.applyRosterStatsFromMatch(home, m.scorersHome, m.homeId === userTeamId);
          this.applyRosterStatsFromMatch(away, m.scorersAway, m.awayId === userTeamId);

          const ticketIncome = this.calculateTicketIncome(home, m.scoreHome, m.scoreAway) * 1.5;
          this.adjustTeamBudget(home, ticketIncome, 'ticketSales');

          // Apply sponsor match bonuses for user team
          const isUserMatch = (m.homeId === userTeamId || m.awayId === userTeamId);
          if (isUserMatch) {
            const userIsHome = m.homeId === userTeamId;
            const userTeam = userIsHome ? home : away;
            let isWin = false;
            let isDraw = false;
            if (m.scoreHome > m.scoreAway) { isWin = userIsHome; }
            else if (m.scoreHome < m.scoreAway) { isWin = !userIsHome; }
            else { isDraw = true; }
            this.incrementManagerStats(isWin, isDraw);

            this.ensureTeamFinanceLog(userTeam);
            this.initDefaultSponsorsIfMissing(userTeam);
            if (userTeam.sponsors) {
              if (userTeam.sponsors.master && userTeam.sponsors.master.weeksRemaining > 0) {
                const bonus = isWin ? userTeam.sponsors.master.winBonus : (isDraw ? Math.round(userTeam.sponsors.master.winBonus * 0.3) : 0);
                if (bonus > 0) this.adjustTeamBudget(userTeam, bonus, 'sponsorMaster');
              }
              if (userTeam.sponsors.sleeve && userTeam.sponsors.sleeve.weeksRemaining > 0) {
                const bonus = isWin ? userTeam.sponsors.sleeve.winBonus : (isDraw ? Math.round(userTeam.sponsors.sleeve.winBonus * 0.3) : 0);
                if (bonus > 0) this.adjustTeamBudget(userTeam, bonus, 'sponsorSleeve');
              }
            }
          }

          this.applyConditionDecay(home);
          this.applyConditionDecay(away);
        });

        // Set up next knockout round
        if (matchInfo.round < comp.knockoutRounds.length - 1) {
          const nextKnockout = comp.knockoutRounds[matchInfo.round + 1];
          const winners = allMatches.map(m => m.winnerId);
          for (let i = 0; i < nextKnockout.length; i++) {
            nextKnockout[i].homeId = winners[i * 2];
            nextKnockout[i].awayId = winners[i * 2 + 1];
          }
        } else {
          // Final Winner!
          const finalMatch = allMatches[0];
          const champion = this.findTeamById(finalMatch.winnerId);
          let prize = 25000000;
          if (compKey === "champions") prize = 35000000;
          else if (compKey === "sudamericana") prize = 15000000;
          
          let cupName = "Copa Libertadores";
          if (compKey === "champions") cupName = "Champions League";
          else if (compKey === "sudamericana") cupName = "Copa Sudamericana";

          this.awardTitleRewards(champion, cupName, prize);
          
          this.addNews(`Campeão da ${cupName}`, `${champion.name} conquista o topo e leva a taça da ${cupName} + R$ ${prize.toLocaleString()}!`);
          
          if (champion.id === userTeamId) {
            this.state.manager.trophies.push({ year: this.state.year, title: cupName, team: champion.name });
          }
        }
      }
    }
    else if (type === "mundial") {
      const mundial = this.state.mundialFixtures;
      const roundMatches = mundial.rounds[matchInfo.round];

      roundMatches.forEach(m => {
        const home = this.findTeamById(m.homeId);
        const away = this.findTeamById(m.awayId);

        if (m.scoreHome === m.scoreAway) {
          m.isPenalties = true;
          const fH = this.calculateTeamForce(home);
          const fA = this.calculateTeamForce(away);
          const pH = fH / (fH + fA);
          
          let pensH = 0; let pensA = 0;
          for (let i = 0; i < 5; i++) {
            if (Math.random() < 0.75 * (pH + 0.1)) pensH++;
            if (Math.random() < 0.75 * ((1 - pH) + 0.1)) pensA++;
          }
          while (pensH === pensA) {
            if (Math.random() < 0.75) pensH++;
            if (Math.random() < 0.75) pensA++;
          }
          m.penHome = pensH;
          m.penAway = pensA;
          m.winnerId = pensH > pensA ? m.homeId : m.awayId;
        } else {
          m.winnerId = m.scoreHome > m.scoreAway ? m.homeId : m.awayId;
        }

        m.simulated = true;
        this.applyRosterStatsFromMatch(home, m.scorersHome, m.homeId === userTeamId);
        this.applyRosterStatsFromMatch(away, m.scorersAway, m.awayId === userTeamId);

        const ticketIncome = this.calculateTicketIncome(home, m.scoreHome, m.scoreAway) * 2.0;
        this.adjustTeamBudget(home, ticketIncome, 'ticketSales');

        // Apply sponsor match bonuses for user team
        const isUserMatch = (m.homeId === userTeamId || m.awayId === userTeamId);
        if (isUserMatch) {
          const userIsHome = m.homeId === userTeamId;
          const userTeam = userIsHome ? home : away;
          let isWin = false;
          let isDraw = false;
          if (m.scoreHome > m.scoreAway) { isWin = userIsHome; }
          else if (m.scoreHome < m.scoreAway) { isWin = !userIsHome; }
          else { isDraw = true; }
          this.incrementManagerStats(isWin, isDraw);

          this.ensureTeamFinanceLog(userTeam);
          this.initDefaultSponsorsIfMissing(userTeam);
          if (userTeam.sponsors) {
            if (userTeam.sponsors.master && userTeam.sponsors.master.weeksRemaining > 0) {
              const bonus = isWin ? userTeam.sponsors.master.winBonus : (isDraw ? Math.round(userTeam.sponsors.master.winBonus * 0.3) : 0);
              if (bonus > 0) this.adjustTeamBudget(userTeam, bonus, 'sponsorMaster');
            }
            if (userTeam.sponsors.sleeve && userTeam.sponsors.sleeve.weeksRemaining > 0) {
              const bonus = isWin ? userTeam.sponsors.sleeve.winBonus : (isDraw ? Math.round(userTeam.sponsors.sleeve.winBonus * 0.3) : 0);
              if (bonus > 0) this.adjustTeamBudget(userTeam, bonus, 'sponsorSleeve');
            }
          }
        }

        this.applyConditionDecay(home);
        this.applyConditionDecay(away);
      });

      if (matchInfo.round === 0) {
        const winners = roundMatches.map(m => m.winnerId);
        mundial.rounds.push([{
          homeId: winners[0],
          awayId: winners[1],
          scoreHome: null,
          scoreAway: null,
          scorersHome: [],
          scorersAway: [],
          simulated: false,
          isPenalties: false,
          winnerId: null
        }]);
      } else {
        const finalMatch = roundMatches[0];
        const champion = this.findTeamById(finalMatch.winnerId);
        const prize = 40000000;
        this.awardTitleRewards(champion, "Mundial de Clubes da FIFA", prize);
        this.addNews("Campeão Mundial", `${champion.name} vence o Mundial de Clubes da FIFA e é coroado o melhor clube do mundo! + R$ 40.000.000 de premiação.`);
        
        if (champion.id === userTeamId) {
          this.state.manager.trophies.push({ year: this.state.year, title: "Mundial de Clubes da FIFA", team: champion.name });
        }
        mundial.simulated = true;
      }
    }
    else if (type.startsWith("selecoes")) {
      const sf = this.state.selecoesFixtures;
      const userNatName = matchInfo.userNatName;

      if (type === "selecoes_group") {
        const roundMatches = sf.groupFixtures[matchInfo.round];

        roundMatches.forEach(m => {
          const home = this.findTeamById(m.homeId);
          const away = this.findTeamById(m.awayId);

          m.simulated = true;
          this.applyRosterStatsFromMatch(home, m.scorersHome, m.homeId === userNatName);
          this.applyRosterStatsFromMatch(away, m.scorersAway, m.awayId === userNatName);

          home.played++;
          away.played++;
          home.goalsFor += m.scoreHome;
          home.goalsAgainst += m.scoreAway;
          away.goalsFor += m.scoreAway;
          away.goalsAgainst += m.scoreHome;

          if (m.scoreHome > m.scoreAway) {
            home.wins++;
            home.points += 3;
            away.losses++;
          } else if (m.scoreHome < m.scoreAway) {
            away.wins++;
            away.points += 3;
            home.losses++;
          } else {
            home.draws++;
            away.draws++;
            home.points += 1;
            away.points += 1;
          }

          this.applyConditionDecay(home);
          this.applyConditionDecay(away);
        });

        if (matchInfo.round === 2) {
          this.resolveSelecoesGroupStage();
        }
      } else {
        const roundMatches = sf.knockoutRounds[matchInfo.round];

        roundMatches.forEach(m => {
          const home = this.findTeamById(m.homeId);
          const away = this.findTeamById(m.awayId);

          if (m.scoreHome === m.scoreAway) {
            m.isPenalties = true;
            const fH = this.calculateTeamForce(home);
            const fA = this.calculateTeamForce(away);
            const pH = fH / (fH + fA);
            
            let pensH = 0; let pensA = 0;
            for (let i = 0; i < 5; i++) {
              if (Math.random() < 0.75 * (pH + 0.1)) pensH++;
              if (Math.random() < 0.75 * ((1 - pH) + 0.1)) pensA++;
            }
            while (pensH === pensA) {
              if (Math.random() < 0.75) pensH++;
              if (Math.random() < 0.75) pensA++;
            }
            m.penHome = pensH;
            m.penAway = pensA;
            m.winnerId = pensH > pensA ? m.homeId : m.awayId;
          } else {
            m.winnerId = m.scoreHome > m.scoreAway ? m.homeId : m.awayId;
          }

          m.simulated = true;
          this.applyRosterStatsFromMatch(home, m.scorersHome, m.homeId === userNatName);
          this.applyRosterStatsFromMatch(away, m.scorersAway, m.awayId === userNatName);

          this.applyConditionDecay(home);
          this.applyConditionDecay(away);
        });

        if (matchInfo.round === 0) {
          // Round of 16 -> Quarterfinals
          const winners = roundMatches.map(m => m.winnerId);
          sf.knockoutRounds[1][0].homeId = winners[0];
          sf.knockoutRounds[1][0].awayId = winners[1];
          sf.knockoutRounds[1][1].homeId = winners[2];
          sf.knockoutRounds[1][1].awayId = winners[3];
          sf.knockoutRounds[1][2].homeId = winners[4];
          sf.knockoutRounds[1][2].awayId = winners[5];
          sf.knockoutRounds[1][3].homeId = winners[6];
          sf.knockoutRounds[1][3].awayId = winners[7];
        } else if (matchInfo.round === 1) {
          // Quarterfinals -> Semifinals
          const winners = roundMatches.map(m => m.winnerId);
          sf.knockoutRounds[2][0].homeId = winners[0];
          sf.knockoutRounds[2][0].awayId = winners[1];
          sf.knockoutRounds[2][1].homeId = winners[2];
          sf.knockoutRounds[2][1].awayId = winners[3];
        } else if (matchInfo.round === 2) {
          // Semifinals -> Final
          const winners = roundMatches.map(m => m.winnerId);
          sf.knockoutRounds[3][0].homeId = winners[0];
          sf.knockoutRounds[3][0].awayId = winners[1];
        } else {
          // Final -> Champion!
          const finalMatch = roundMatches[0];
          const champion = this.findTeamById(finalMatch.winnerId);
          this.addNews("Campeão da Copa de Seleções", `${champion.name} vence a grande Copa de Seleções e conquista a glória internacional!`);
          
          if (champion.name === userNatName) {
            this.state.manager.trophies.push({ year: this.state.year, title: "Copa de Seleções", team: champion.name });
          }
        }
      }
    }
  }

  // Group stand calculations and knockout drawing
  resolveContinentalGroupStage(compKey) {
    const comp = this.state.continentalFixtures[compKey];
    comp.currentStage = "knockout";

    // Calculate group standings
    const standings = comp.groups.map((group, groupIdx) => {
      const stats = group.map(teamId => {
        return { id: teamId, pts: 0, gf: 0, ga: 0 };
      });

      // Sum results from fixtures
      comp.groupFixtures.forEach(round => {
        round.forEach(m => {
          if (m.groupIdx !== groupIdx) return;
          const h = stats.find(s => s.id === m.homeId);
          const a = stats.find(s => s.id === m.awayId);

          h.gf += m.scoreHome;
          h.ga += m.scoreAway;
          a.gf += m.scoreAway;
          a.ga += m.scoreHome;

          if (m.scoreHome > m.scoreAway) h.pts += 3;
          else if (m.scoreHome < m.scoreAway) a.pts += 3;
          else { h.pts += 1; a.pts += 1; }
        });
      });

      // Sort group (pts, gd, gf)
      stats.sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
      return stats;
    });

    // Draw Knockout Stage
    // Champions: R16 (8 group winners vs 8 runners-up)
    // Libertadores: QF (4 group winners vs 4 runners-up)
    if (compKey === "champions") {
      const winners = standings.map(g => g[0].id);
      const runnersUp = standings.map(g => g[1].id).sort(() => Math.random() - 0.5); // shuffle runners-up
      
      const r16Matches = [];
      for (let i = 0; i < 8; i++) {
        r16Matches.push({
          homeId: winners[i],
          awayId: runnersUp[i],
          scoreHome: null,
          scoreAway: null,
          scorersHome: [],
          scorersAway: [],
          simulated: false,
          isPenalties: false,
          winnerId: null
        });
      }
      comp.knockoutRounds.push(r16Matches); // R16
      
      // Add placeholders for QF, SF, Final
      for (let size of [4, 2, 1]) {
        const round = [];
        for (let i = 0; i < size; i++) {
          round.push({
            homeId: null, awayId: null, scoreHome: null, scoreAway: null,
            scorersHome: [], scorersAway: [], simulated: false, isPenalties: false, winnerId: null
          });
        }
        comp.knockoutRounds.push(round);
      }
    } 
    else {
      // Libertadores
      const winners = standings.map(g => g[0].id);
      const runnersUp = standings.map(g => g[1].id).sort(() => Math.random() - 0.5);

      const qfMatches = [];
      for (let i = 0; i < 4; i++) {
        qfMatches.push({
          homeId: winners[i],
          awayId: runnersUp[i],
          scoreHome: null,
          scoreAway: null,
          scorersHome: [],
          scorersAway: [],
          simulated: false,
          isPenalties: false,
          winnerId: null
        });
      }
      comp.knockoutRounds.push(qfMatches); // QF

      // Add placeholders for SF, Final
      for (let size of [2, 1]) {
        const round = [];
        for (let i = 0; i < size; i++) {
          round.push({
            homeId: null, awayId: null, scoreHome: null, scoreAway: null,
            scorersHome: [], scorersAway: [], simulated: false, isPenalties: false, winnerId: null
          });
        }
        comp.knockoutRounds.push(round);
      }
    }
  }

  // Simulate remaining fixtures in the week for leagues user is NOT in
  simulateRemainingWeekMatches() {
    const userLeagueId = this.state.manager.leagueId;
    const week = this.state.week;
    const schedule = this.getCompetitionForWeek(week);

    // 1. Simulate all other active leagues
    for (const [leagueId, league] of Object.entries(this.state.database)) {
      if (schedule.type === "league") {
        const roundIdx = schedule.round;
        const fixtures = this.state.fixtures[leagueId];
        if (fixtures && roundIdx < fixtures.length) {
          fixtures[roundIdx].forEach(m => {
            if (m.simulated) return;
            const h = league.teams.find(t => t.id === m.homeId);
            const a = league.teams.find(t => t.id === m.awayId);

            // Fast simulation
            this.simulateFastMatch(m, h, a, false);
            const goalsH = m.scoreHome;
            const goalsA = m.scoreAway;

            // Apply points
            h.played++; a.played++;
            h.goalsFor += goalsH; h.goalsAgainst += goalsA;
            a.goalsFor += goalsA; a.goalsAgainst += goalsH;
            
            if (goalsH > goalsA) { h.wins++; h.points += 3; a.losses++; h.form.push("W"); a.form.push("L"); }
            else if (goalsH < goalsA) { a.wins++; a.points += 3; h.losses++; h.form.push("L"); a.form.push("W"); }
            else { h.draws++; a.draws++; h.points += 1; a.points += 1; h.form.push("D"); a.form.push("D"); }

            if (h.form.length > 5) h.form.shift();
            if (a.form.length > 5) a.form.shift();

            this.adjustTeamBudget(h, this.calculateTicketIncome(h, goalsH, goalsA), 'ticketSales');
            this.applyConditionDecay(h);
            this.applyConditionDecay(a);
          });
          this.state.currentRound[leagueId]++;
        }
      }
    }

    // 2. Simulate other Cup / Continental matches in the background if the user isn't involved
    if (schedule.type === "cup") {
      Object.keys(this.state.cupFixtures).forEach(country => {
        const cup = this.state.cupFixtures[country];
        const roundIdx = schedule.round;
        if (cup && roundIdx < cup.rounds.length) {
          cup.rounds[roundIdx].forEach(m => {
            if (m.simulated) return;
            const h = this.findTeamById(m.homeId);
            const a = this.findTeamById(m.awayId);
            
            this.simulateFastMatch(m, h, a, true);
            const gH = m.scoreHome;
            const gA = m.scoreAway;

            this.adjustTeamBudget(h, this.calculateTicketIncome(h, gH, gA) * 1.2, 'ticketSales');
            this.applyConditionDecay(h);
            this.applyConditionDecay(a);
          });

          // Draw next round if last round completed
          if (roundIdx < cup.rounds.length - 1) {
            const nextRound = cup.rounds[roundIdx + 1];
            const winners = cup.rounds[roundIdx].map(m => m.winnerId);
            for (let i = 0; i < nextRound.length; i++) {
              nextRound[i].homeId = winners[i * 2];
              nextRound[i].awayId = winners[i * 2 + 1];
            }
          } else {
            // End Cup
            const cupWinner = this.findTeamById(cup.rounds[roundIdx][0].winnerId);
            this.awardTitleRewards(cupWinner, "Copa Nacional", 15000000);
          }
        }
      });
    }

    if (schedule.type === "continental") {
      ["champions", "libertadores", "sudamericana"].forEach(compKey => {
        const comp = this.state.continentalFixtures[compKey];
        const roundIdx = schedule.round;

        if (schedule.stage === "group") {
          if (comp && roundIdx < comp.groupFixtures.length) {
            comp.groupFixtures[roundIdx].forEach(m => {
              if (m.simulated) return;
              const h = this.findTeamById(m.homeId);
              const a = this.findTeamById(m.awayId);

              this.simulateFastMatch(m, h, a, false);
              const gH = m.scoreHome;
              const gA = m.scoreAway;
              this.adjustTeamBudget(h, this.calculateTicketIncome(h, gH, gA) * 1.5, 'ticketSales');
              this.applyConditionDecay(h);
              this.applyConditionDecay(a);
            });
            if (roundIdx === 5) {
              this.resolveContinentalGroupStage(compKey);
            }
          }
        } 
        else {
          // Continental Knockout
          if (comp && comp.knockoutRounds && roundIdx < comp.knockoutRounds.length) {
            comp.knockoutRounds[roundIdx].forEach(m => {
              if (m.simulated || !m.homeId || !m.awayId) return;
              const h = this.findTeamById(m.homeId);
              const a = this.findTeamById(m.awayId);

              this.simulateFastMatch(m, h, a, true);
              const gH = m.scoreHome;
              const gA = m.scoreAway;
              this.adjustTeamBudget(h, this.calculateTicketIncome(h, gH, gA) * 1.5, 'ticketSales');
              this.applyConditionDecay(h);
              this.applyConditionDecay(a);
            });

            // Set up next
            if (roundIdx < comp.knockoutRounds.length - 1) {
              const nextRound = comp.knockoutRounds[roundIdx + 1];
              const winners = comp.knockoutRounds[roundIdx].map(m => m.winnerId);
              for (let i = 0; i < nextRound.length; i++) {
                nextRound[i].homeId = winners[i * 2];
                nextRound[i].awayId = winners[i * 2 + 1];
              }
            } else {
              const finalMatch = comp.knockoutRounds[roundIdx][0];
              const champion = this.findTeamById(finalMatch.winnerId);
              let prize = 25000000;
              if (compKey === "champions") prize = 35000000;
              else if (compKey === "sudamericana") prize = 15000000;
              
              let cupName = "Copa Libertadores";
              if (compKey === "champions") cupName = "Champions League";
              else if (compKey === "sudamericana") cupName = "Copa Sudamericana";
              
              this.awardTitleRewards(champion, cupName, prize);
            }
          }
        }
      });
    }

    if (schedule.type === "mundial") {
      const mundial = this.state.mundialFixtures;
      const roundIdx = schedule.round;
      if (mundial && mundial.rounds && roundIdx < mundial.rounds.length) {
        mundial.rounds[roundIdx].forEach(m => {
          if (m.simulated) return;
          const h = this.findTeamById(m.homeId);
          const a = this.findTeamById(m.awayId);

          this.simulateFastMatch(m, h, a, true);
          const gH = m.scoreHome;
          const gA = m.scoreAway;
          this.adjustTeamBudget(h, this.calculateTicketIncome(h, gH, gA) * 2.0, 'ticketSales');
          this.applyConditionDecay(h);
          this.applyConditionDecay(a);
        });

        if (roundIdx === 0) {
          const winners = mundial.rounds[0].map(m => m.winnerId);
          mundial.rounds.push([{
            homeId: winners[0],
            awayId: winners[1],
            scoreHome: null,
            scoreAway: null,
            scorersHome: [],
            scorersAway: [],
            simulated: false,
            isPenalties: false,
            winnerId: null
          }]);
        } else {
          const finalMatch = mundial.rounds[roundIdx][0];
          const champion = this.findTeamById(finalMatch.winnerId);
          this.awardTitleRewards(champion, "Mundial de Clubes da FIFA", 40000000);
          mundial.simulated = true;
        }
      }
    }

    if (schedule.type === "selecoes") {
      const sf = this.state.selecoesFixtures;
      const roundIdx = schedule.round;

      if (schedule.stage === "group") {
        if (sf && sf.groupFixtures && roundIdx < sf.groupFixtures.length) {
          sf.groupFixtures[roundIdx].forEach(m => {
            if (m.simulated) return;
            const h = this.findTeamById(m.homeId);
            const a = this.findTeamById(m.awayId);

            this.simulateFastMatch(m, h, a, false);
            const gH = m.scoreHome;
            const gA = m.scoreAway;

            h.played++;
            a.played++;
            h.goalsFor += gH;
            h.goalsAgainst += gA;
            a.goalsFor += gA;
            a.goalsAgainst += gH;

            if (gH > gA) {
              h.wins++;
              h.points += 3;
              a.losses++;
            } else if (gH < gA) {
              a.wins++;
              a.points += 3;
              h.losses++;
            } else {
              h.draws++;
              a.draws++;
              h.points += 1;
              a.points += 1;
            }

            this.applyConditionDecay(h);
            this.applyConditionDecay(a);
          });

          if (roundIdx === 2) {
            this.resolveSelecoesGroupStage();
          }
        }
      } else {
        if (sf && sf.knockoutRounds && roundIdx < sf.knockoutRounds.length) {
          sf.knockoutRounds[roundIdx].forEach(m => {
            if (m.simulated || !m.homeId || !m.awayId) return;
            const h = this.findTeamById(m.homeId);
            const a = this.findTeamById(m.awayId);

            this.simulateFastMatch(m, h, a, true);
            const gH = m.scoreHome;
            const gA = m.scoreAway;

            this.applyConditionDecay(h);
            this.applyConditionDecay(a);
          });

          if (roundIdx === 0) {
            // Round of 16 -> Quarterfinals
            const winners = sf.knockoutRounds[0].map(m => m.winnerId);
            sf.knockoutRounds[1][0].homeId = winners[0];
            sf.knockoutRounds[1][0].awayId = winners[1];
            sf.knockoutRounds[1][1].homeId = winners[2];
            sf.knockoutRounds[1][1].awayId = winners[3];
            sf.knockoutRounds[1][2].homeId = winners[4];
            sf.knockoutRounds[1][2].awayId = winners[5];
            sf.knockoutRounds[1][3].homeId = winners[6];
            sf.knockoutRounds[1][3].awayId = winners[7];
          } else if (roundIdx === 1) {
            // Quarterfinals -> Semifinals
            const winners = sf.knockoutRounds[1].map(m => m.winnerId);
            sf.knockoutRounds[2][0].homeId = winners[0];
            sf.knockoutRounds[2][0].awayId = winners[1];
            sf.knockoutRounds[2][1].homeId = winners[2];
            sf.knockoutRounds[2][1].awayId = winners[3];
          } else if (roundIdx === 2) {
            // Semifinals -> Final
            const winners = sf.knockoutRounds[2].map(m => m.winnerId);
            sf.knockoutRounds[3][0].homeId = winners[0];
            sf.knockoutRounds[3][0].awayId = winners[1];
          }
        }
      }
    }
  }

  applyRosterStatsFromMatch(team, scorers, isUserTeam) {
    if (!team || !team.squad) return;
    // Add matches count
    team.squad.forEach(p => {
      if (p.isStarter) p.games = (p.games || 0) + 1;
    });

    if (scorers) {
      scorers.forEach(scorerData => {
        if (!scorerData || !scorerData.name) return;
        // Find player by name (dirty match)
        const cleanName = scorerData.name.replace(" (pên.)", "");
        const player = team.squad.find(p => p.name === cleanName);
        if (player) {
          player.goals = (player.goals || 0) + 1;
          player.morale = Math.min(100, (player.morale || 50) + 10);
        }
      });
    }
  }

  calculateTicketIncome(team, goalsF, goalsA) {
    if (!team || !team.stadiumCapacity) return 0;
    // Basic capacity filling based on ticket price, loyalty, and team prestige
    const maxCapacity = team.stadiumCapacity;
    const rep = team.reputation || 3.0;
    const price = team.ticketPrice || 15;
    
    // Higher price reduces attendance factor
    const priceFactor = Math.max(0.1, 1 - (price / (20 + rep * 15)));
    
    // Base attendance factor
    let attendanceFactor = priceFactor * ((team.fansLoyalty || 70) / 100);
    
    // Add randomness and variance based on team form
    let formBonus = 0;
    if (team.form && team.form.length > 0) {
      const wins = team.form.filter(f => f === "W").length;
      formBonus = (wins - 2) * 0.05;
    }
    attendanceFactor = clamp(attendanceFactor + formBonus + (Math.random() * 0.1 - 0.05), 0.2, 1.0);
    
    const audience = Math.round(maxCapacity * attendanceFactor);
    const revenue = audience * price;
    
    return revenue;
  }

  applyConditionDecay(team) {
    if (!team || !team.squad) return;
    team.squad.forEach(p => {
      if (p.isStarter) {
        // Decrease condition by 3-6% depending on age and traits (energy lasts much longer)
        let decay = Math.round(3 + (p.age > 30 ? (p.age - 30) * 0.4 : 0) + (Math.random() * 2));
        if (p.skills && p.skills.includes("Velocidade")) decay += 1;
        p.condition = Math.max(10, p.condition - decay);
        p.morale = Math.max(10, Math.min(100, p.morale + Math.floor(Math.random() * 5) - 1));
      } else {
        // Recover bench/reserve players condition (15-25% recovery per week)
        p.condition = Math.min(100, p.condition + 20 + Math.floor(Math.random() * 10));
        p.morale = Math.max(10, p.morale - 1); // unplayed players slowly lose morale
      }
    });
  }

  // Weekly Advances
  advanceWeek() {
    // 1. Process finances
    this.processWeeklyFinances();

    // 2. Process stadium upgrades
    this.processStadiumUpgrades();

    // 3. Process AI transfers
    this.processAITransfers();

    // 4. Recovery / Youth academies
    if (this.state.youthAcademyTimer > 0) {
      this.state.youthAcademyTimer--;
    }

    // 5. Update contracts & age & retired players (At season end)
    // 6. Check season end
    const userLeagueFixtures = this.state.fixtures[this.state.manager.leagueId];
    const totalLeagueRounds = userLeagueFixtures.length;

    // Season ends at week 54 after the Copa de Seleções final
    const isSeasonOver = this.state.week >= 54;

    if (isSeasonOver) {
      this.resolveSeasonEnd();
    } else {
      this.state.week++;
      if (this.state.week === 46) {
        this.generateMundialFixtures();
      }

      // Random mid-season job offer chance (based on performance, checked every 5 weeks)
      if (this.state.week % 5 === 0) {
        const stats = this.state.manager.currentClubStats || { wins: 0, draws: 0, losses: 0 };
        const totalGames = stats.wins + stats.draws + stats.losses;
        const pointsRate = totalGames > 0 ? ((stats.wins * 3 + stats.draws) / (totalGames * 3)) * 100 : 50;

        let offerChance = 0.15;
        if (pointsRate >= 65) {
          offerChance = 0.35; // Successful coach gets more offers
        } else if (pointsRate < 35) {
          offerChance = 0.25; // Struggling teams trying to recruit a savior, or coach looking to jump ship
        }

        if (Math.random() < offerChance) {
          const offers = this.generateJobOffers();
          if (offers && offers.length > 0) {
            // Just take 1 random offer for mid-season
            this.state.pendingJobOffers = [offers[Math.floor(Math.random() * offers.length)]];
          }
        }
      }
    }

    // Recover condition for everyone slightly
    for (const league of Object.values(this.state.database)) {
      league.teams.forEach(t => {
        t.squad.forEach(p => {
          if (!p.isStarter) {
            p.condition = Math.min(100, p.condition + 10);
          }
        });
      });
    }

    if (!isSeasonOver) {
      this.updateBoardConfidence();
    }

    this.saveGame();
    window.renderApp();
  }

  processWeeklyFinances() {
    const userTeamId = this.state.manager ? this.state.manager.teamId : null;
    
    for (const league of Object.values(this.state.database)) {
      league.teams.forEach(team => {
        const weeklyWages = team.squad.reduce((sum, p) => sum + p.salary, 0);

        if (team.id === userTeamId) {
          // USER TEAM DETAILED PROCESSING
          this.ensureTeamFinanceLog(team);
          
          // 1. Pay Salaries
          this.adjustTeamBudget(team, -weeklyWages, 'playerWages');
          
          // 2. Process Sponsors (Fixed Weekly Fees)
          this.initDefaultSponsorsIfMissing(team);
          
          let masterFee = 0;
          let sleeveFee = 0;
          let namingFee = 0;
          
          if (team.sponsors.master && team.sponsors.master.weeksRemaining > 0) {
            masterFee = team.sponsors.master.weeklyFee;
            team.sponsors.master.weeksRemaining--;
            this.adjustTeamBudget(team, masterFee, 'sponsorMaster');
            if (team.sponsors.master.weeksRemaining === 0) {
              this.addNews("Patrocínio Expirado", `O contrato de patrocínio máster com a ${team.sponsors.master.name} terminou.`);
            }
          }
          
          if (team.sponsors.sleeve && team.sponsors.sleeve.weeksRemaining > 0) {
            sleeveFee = team.sponsors.sleeve.weeklyFee;
            team.sponsors.sleeve.weeksRemaining--;
            this.adjustTeamBudget(team, sleeveFee, 'sponsorSleeve');
            if (team.sponsors.sleeve.weeksRemaining === 0) {
              this.addNews("Patrocínio Expirado", `O contrato de patrocínio de manga com a ${team.sponsors.sleeve.name} terminou.`);
            }
          }
          
          if (team.sponsors.stadium && team.sponsors.stadium.weeksRemaining > 0) {
            namingFee = team.sponsors.stadium.weeklyFee;
            team.sponsors.stadium.weeksRemaining--;
            this.adjustTeamBudget(team, namingFee, 'sponsorNaming');
            if (team.sponsors.stadium.weeksRemaining === 0) {
              this.addNews("Patrocínio Expirado", `O contrato de naming rights do estádio com a ${team.sponsors.stadium.name} terminou.`);
            }
          }
          
          // 3. TV Rights Weekly Income
          const userLeague = this.findLeagueByTeamId(team.id);
          const leagueRep = userLeague ? userLeague.reputation : 3.0;
          let baseTV = Math.round(leagueRep * 75000);
          
          let tvBonus = 0;
          const currentMatchInfo = this.getCurrentWeekMatchInfo();
          if (currentMatchInfo && currentMatchInfo.match) {
            const oppId = currentMatchInfo.match.homeId === team.id ? currentMatchInfo.match.awayId : currentMatchInfo.match.homeId;
            const opp = this.findTeamById(oppId);
            if (opp && opp.reputation >= 4.0) {
              tvBonus = 350000; // Big match bonus!
            }
          }
          this.adjustTeamBudget(team, baseTV + tvBonus, 'tvRights');
          
          // 4. Merchandising Weekly Income
          const baseMerch = Math.round(team.reputation * 30000 * (team.fansLoyalty / 100));
          
          // Superstars bonus
          let starBonusRatio = 0.0;
          team.squad.forEach(p => {
            if (p.rating >= 90) starBonusRatio += 0.15;
            else if (p.rating >= 83) starBonusRatio += 0.05;
          });
          starBonusRatio = Math.min(0.6, starBonusRatio);
          
          // Form bonus
          let formMultiplier = 1.0;
          if (team.form && team.form.length > 0) {
            const lastForm = team.form[team.form.length - 1];
            if (lastForm === 'W') {
              formMultiplier = 1.2;
              const wins = team.form.filter(f => f === 'W').length;
              if (wins >= 3) formMultiplier = 1.45;
            } else if (lastForm === 'L') {
              formMultiplier = 0.9;
            }
          }
          
          const merchIncome = Math.round(baseMerch * (1 + starBonusRatio) * formMultiplier);
          this.adjustTeamBudget(team, merchIncome, 'merchandising');
          
          // 5. Stadium Maintenance Cost
          const stadiumUpkeep = Math.round(team.stadiumCapacity * 8);
          this.adjustTeamBudget(team, -stadiumUpkeep, 'stadiumUpkeep');
          
          // 6. Youth Academy Upkeep Cost
          if (team.academyLevel === undefined) team.academyLevel = 2;
          const academyCosts = [0, 50000, 150000, 350000, 600000];
          const youthCost = academyCosts[team.academyLevel] || 150000;
          this.adjustTeamBudget(team, -youthCost, 'youthAcademyUpkeep');
          
          // 7. Loan Interest & Active Loans
          this.initLoansIfMissing(team);
          const interestPopular = team.loans.popular * 0.005;
          const interestComercial = team.loans.comercial * 0.009;
          const interestShark = team.loans.shark * 0.018;
          const totalInterest = Math.round(interestPopular + interestComercial + interestShark);
          
          if (totalInterest > 0) {
            this.adjustTeamBudget(team, -totalInterest, 'loanInterest');
          }
          
          team.loan = team.loans.popular + team.loans.comercial + team.loans.shark;
          
          // 8. Financial Distress
          if (team.budget < 0) {
            team.weeksInDebt = (team.weeksInDebt || 0) + 1;
            
            if (team.weeksInDebt === 2 || team.weeksInDebt === 4 || team.weeksInDebt === 6) {
              this.addNews(
                "Crise Financeira",
                `⚠️ ALERTA DA DIRETORIA DO ${team.name.toUpperCase()}: As finanças estão no vermelho há ${team.weeksInDebt} semanas. Regularize o caixa em até ${8 - team.weeksInDebt} semanas para evitar punições ou demissão!`
              );
            } else if (team.weeksInDebt >= 8) {
              if (team.points > 0) {
                team.points = Math.max(0, team.points - 6);
                this.addNews(
                  "Punição Severa",
                  `🚨 FAIR PLAY FINANCEIRO: O ${team.name} foi punido com a perda de 6 pontos na tabela por acumular dívidas sem pagamento por mais de 8 semanas!`
                );
              }
              
              const sortedValuable = [...team.squad]
                .filter(p => !p.isStarter)
                .concat([...team.squad].filter(p => p.isStarter))
                .sort((a, b) => b.value - a.value);
              
              if (sortedValuable[0] && !this.state.transferList.some(item => item.playerId === sortedValuable[0].id)) {
                const playerToSell = sortedValuable[0];
                this.state.transferList.push({
                  playerId: playerToSell.id,
                  teamId: team.id,
                  originalPrice: playerToSell.value
                });
                this.addNews(
                  "Intervenção Financeira",
                  `🏗️ DIRETORIA VENDE JOGADOR: Devido ao déficit contínuo, a diretoria do ${team.name} listou compulsoriamente o jogador ${playerToSell.name} (${playerToSell.position}, f:${playerToSell.rating}) para venda imediata.`
                );
              }
            }
          } else {
            team.weeksInDebt = 0;
          }
          
          // 9. Close Weekly Ledger & Rotate History
          const loggedWeek = { ...team.financeLog.currentWeek };
          team.financeLog.history.unshift({
            week: this.state.week,
            season: this.state.season,
            year: this.state.year,
            values: loggedWeek
          });
          if (team.financeLog.history.length > 12) {
            team.financeLog.history.pop();
          }
          
          Object.keys(team.financeLog.currentWeek).forEach(k => {
            team.financeLog.currentWeek[k] = 0;
          });
          
        } else {
          // AI TEAM SIMPLIFIED PROCESSING
          const weeklyWages = team.squad.reduce((sum, p) => sum + p.salary, 0);
          const sponsorIncome = team.sponsorIncome || Math.round(team.reputation * 150000);
          const loanInterest = (team.loan || 0) * 0.01;
          
          team.budget = Math.round(team.budget - weeklyWages + sponsorIncome - loanInterest);
          
          if (team.budget > 50000000 && Math.random() < 0.01) {
            team.stadiumCapacity += 5000;
            team.budget -= 6000000;
          }
        }
      });
    }
    
    // Add user weekly news message with summary
    const userTeam = this.findTeamById(userTeamId);
    if (userTeam) {
      const lastHistory = userTeam.financeLog.history[0];
      if (lastHistory) {
        const v = lastHistory.values;
        const totalIncome = v.ticketSales + v.sponsorMaster + v.sponsorSleeve + v.sponsorNaming + v.tvRights + v.playerSales + v.merchandising;
        const totalExpense = v.playerWages + v.transferFeesPaid + v.stadiumUpkeep + v.loanInterest + v.loanRepayments + v.youthAcademyUpkeep;
        const net = totalIncome + totalExpense;
        
        const netStr = net >= 0 ? `+R$ ${net.toLocaleString()}` : `-R$ ${Math.abs(net).toLocaleString()}`;
        this.addNews(
          "Balanço Financeiro Semanal",
          `Balanço do ${userTeam.name}: Receitas (+R$ ${totalIncome.toLocaleString()}), Despesas (-R$ ${Math.abs(totalExpense).toLocaleString()}). Saldo Semanal: ${netStr}. Saldo em Caixa: R$ ${userTeam.budget.toLocaleString()}`
        );
      }
    }
  }

  processStadiumUpgrades() {
    const userTeam = this.findTeamById(this.state.manager.teamId);
    if (userTeam.stadiumUpgrading) {
      userTeam.stadiumUpgradeWeeks--;
      if (userTeam.stadiumUpgradeWeeks <= 0) {
        userTeam.stadiumCapacity += userTeam.stadiumUpgradeCapacityIncrease;
        userTeam.stadiumUpgrading = false;
        this.addNews("Estádio Ampliado", `As obras no estádio do ${userTeam.name} terminaram! Nova capacidade: ${userTeam.stadiumCapacity.toLocaleString()} espectadores.`);
      }
    }
  }

  // AI Transfer Activity (clubs bid for user players or buy other AI players)
  processAITransfers() {
    const userTeam = this.findTeamById(this.state.manager.teamId);

    // Chance of getting a bid on user's transfer listed players
    this.state.transferList.forEach((listItem, index) => {
      if (listItem.teamId === userTeam.id) {
        const player = userTeam.squad.find(p => p.id === listItem.playerId);
        if (player && Math.random() < 0.25) {
          // AI makes an offer
          const allTeams = this.getAllTeams().filter(t => t.id !== userTeam.id);
          const bidder = allTeams[Math.floor(Math.random() * allTeams.length)];
          const offerPrice = Math.round(player.value * (0.85 + Math.random() * 0.3)); // 85% to 115% value
          
          // Trigger notification / offer modal
          this.state.pendingOffer = {
            playerId: player.id,
            bidderId: bidder.id,
            bidderName: bidder.name,
            offerPrice: offerPrice,
            listIndex: index
          };

          this.addNews("Proposta de Transferência", `O ${bidder.name} fez uma proposta oficial de R$ ${offerPrice.toLocaleString()} pelo jogador ${player.name}.`);
        }
      }
    });

    // Random computer-to-computer transfers to keep database active
    const allLeagues = Object.values(this.state.database);
    if (Math.random() < 0.3) {
      // Find a random buyer and a random seller/player
      const l1 = allLeagues[Math.floor(Math.random() * allLeagues.length)];
      const l2 = allLeagues[Math.floor(Math.random() * allLeagues.length)];
      
      const buyer = l1.teams[Math.floor(Math.random() * l1.teams.length)];
      const seller = l2.teams[Math.floor(Math.random() * l2.teams.length)];

      if (buyer.id !== seller.id && buyer.id !== userTeam.id && seller.id !== userTeam.id) {
        // Select random player from seller who isn't crucial (not top rating)
        const sortedSquad = [...seller.squad].sort((a, b) => b.rating - a.rating);
        const player = sortedSquad[Math.floor(Math.random() * (sortedSquad.length - 5) + 5)]; // skip top 5 players

        if (player && buyer.budget > player.value * 1.5) {
          // Buy!
          seller.squad = seller.squad.filter(p => p.id !== player.id);
          buyer.squad.push(player);
          seller.budget += player.value;
          buyer.budget -= player.value;

          // Adjust contract slightly
          player.contract = Math.floor(Math.random() * 4) + 1;
          player.salary = window.calculatePlayerSalary(player.rating, player.age, player.value);

          this.addNews("Mercado da Bola", `${buyer.name} contrata o jogador ${player.name} (${player.position}, f:${player.rating}) do ${seller.name} por R$ ${player.value.toLocaleString()}.`);
        }
      }
    }
  }

  acceptPendingOffer() {
    if (!this.state.pendingOffer) return;
    const offer = this.state.pendingOffer;
    const userTeam = this.findTeamById(this.state.manager.teamId);
    const bidder = this.findTeamById(offer.bidderId);
    const player = userTeam.squad.find(p => p.id === offer.playerId);

    if (player && userTeam) {
      // Transfer money
      this.adjustTeamBudget(userTeam, offer.offerPrice, 'playerSales');
      
      // Remove player from user squad
      userTeam.squad = userTeam.squad.filter(p => p.id !== player.id);
      
      // If bidder exists and has room, add to squad
      if (bidder) {
        bidder.budget -= offer.offerPrice;
        player.contract = Math.floor(Math.random() * 3) + 2;
        player.isStarter = false;
        player.isSub = false;
        bidder.squad.push(player);
      }

      // Remove from transferList
      this.state.transferList = this.state.transferList.filter(item => item.playerId !== player.id);

      this.addNews("Venda Realizada", `${userTeam.name} vendeu o jogador ${player.name} para o ${bidder ? bidder.name : "outro clube"} por R$ ${offer.offerPrice.toLocaleString()}.`);
      alert(`Vendido! ${player.name} foi vendido para o ${bidder ? bidder.name : "outro clube"} por R$ ${offer.offerPrice.toLocaleString()}.`);
    }

    this.state.pendingOffer = null;
    this.saveGame();
    if (typeof window !== "undefined" && window.renderApp) {
      window.renderApp();
    }
  }

  rejectPendingOffer() {
    if (!this.state.pendingOffer) return;
    const offer = this.state.pendingOffer;
    const userTeam = this.findTeamById(this.state.manager.teamId);
    const player = userTeam.squad.find(p => p.id === offer.playerId);

    if (player && userTeam) {
      this.addNews("Proposta Recusada", `${userTeam.name} recusou a proposta do ${offer.bidderName} por ${player.name}.`);
    }

    this.state.pendingOffer = null;
    this.saveGame();
    if (typeof window !== "undefined" && window.renderApp) {
      window.renderApp();
    }
  }

  // Returns all teams in the database as flat list
  getAllTeams() {
    let list = [];
    Object.values(this.state.database).forEach(league => {
      list = list.concat(league.teams);
    });
    return list;
  }

  generateInitialTransferMarket() {
    this.state.transferList = [];
    // List 20 random players from various clubs on the transfer list
    const teams = this.getAllTeams();
    for (let i = 0; i < 25; i++) {
      const team = teams[Math.floor(Math.random() * teams.length)];
      if (team.squad.length > 15) {
        const playerIdx = Math.floor(Math.random() * team.squad.length);
        const player = team.squad[playerIdx];
        if (!player.isStarter && !this.state.transferList.some(item => item.playerId === player.id)) {
          this.state.transferList.push({
            playerId: player.id,
            teamId: team.id,
            originalPrice: Math.round(player.value * 0.9)
          });
        }
      }
    }
  }

  generateInitialFreeAgents() {
    this.state.freeAgents = [];

    // Create Zé Rato: 16 years old, Portuguese, 99 overall, attacker (ATA)
    const existing = this.findPlayerById("ze_rato");
    if (!existing) {
      const value = window.calculatePlayerValue(99, 16, "ATA") * 0.7;
      const salary = window.calculatePlayerSalary(99, 16, value);
      const zeRato = {
        id: "ze_rato",
        name: "Zé Rato",
        position: "ATA",
        rating: 99,
        potential: 99,
        age: 16,
        nationality: "Portuguese",
        value: value,
        salary: salary,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        games: 0,
        condition: 100,
        morale: 95,
        skills: ["Veloz", "Finalizador", "Driblador"],
        contract: 0
      };
      this.state.freeAgents.push(zeRato);
    }

    // Generate 19 random unassigned players (free agents)
    const positions = ["GOL", "ZAG", "LAT", "MEI", "ATA"];
    const nationalities = ["Brazilian", "English", "Spanish", "Argentinian", "German", "French", "Italian", "Portuguese"];
    
    for (let i = 0; i < 19; i++) {
      const pos = positions[Math.floor(Math.random() * positions.length)];
      const nat = nationalities[Math.floor(Math.random() * nationalities.length)];
      const name = window.generatePlayerName(nat);
      const rating = Math.floor(Math.random() * 30) + 50; // 50 to 80
      const age = Math.floor(Math.random() * 15) + 19; // 19 to 33
      const value = window.calculatePlayerValue(rating, age, pos) * 0.7; // cheap free agent price (no buyout)
      const salary = window.calculatePlayerSalary(rating, age, value);
      const traits = window.generateTraits(pos);

      let potential = rating;
      if (age <= 25) {
        potential = Math.min(99, rating + Math.floor(Math.random() * 12) + 4);
      } else if (age <= 30) {
        potential = Math.min(99, rating + Math.floor(Math.random() * 4) + 1);
      }

      this.state.freeAgents.push({
        id: generateId(),
        name: name,
        position: pos,
        rating: rating,
        potential: potential,
        age: age,
        nationality: nat,
        value: value,
        salary: salary,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        games: 0,
        condition: 100,
        morale: 70,
        skills: traits,
        contract: 0 // needs a contract
      });
    }
  }

  // End of Season resolutions: Promotion, Relegation, Champion Awards, Retirements, Age increment
  resolveSeasonEnd() {
    const summaries = [];

    // 0. Check manager performance against season goals before resolving relegation/promotions
    const userTeam = this.findTeamById(this.state.manager.teamId);
    const userLeagueId = this.state.manager.leagueId;
    const userLeague = this.state.database[userLeagueId];
    if (userTeam && userLeague && this.state.manager.seasonGoal) {
      // Sort teams to get final standings
      const standings = [...userLeague.teams].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor);
      const finalPos = standings.findIndex(t => t.id === userTeam.id) + 1;
      const goal = this.state.manager.seasonGoal;
      
      if (finalPos > goal.minSafePosition) {
        // Sacked!
        alert(`🚨 DEMITIDO! A diretoria do ${userTeam.name} demitiu você por não cumprir a meta da temporada.\n\nSua meta era terminar no mínimo em ${goal.minSafePosition}º lugar (${goal.title}), mas você terminou em ${finalPos}º lugar.\n\nFim de jogo!`);
        localStorage.removeItem("brasfoot_save");
        window.location.reload();
        return;
      } else {
        // Met target or survived! Let's display a success message.
        let bonusText = "";
        if (finalPos <= goal.targetPosition) {
          bonusText = " Você superou as expectativas da diretoria e eles estão radiantes!";
        } else {
          bonusText = " Você cumpriu a meta mínima e continua no cargo.";
        }
        alert(`🎉 Temporada concluída! A diretoria do ${userTeam.name} está satisfeita com o seu trabalho.${bonusText}`);
      }
    }

    // 1. Process League Promotions and Relegations
    // We only have Série A and Série B in Brazil, and Premier League and Championship in England.
    // Let's resolve Brazil (br_a & br_b)
    this.resolvePromotionRelegation("br_a", "br_b", "Campeonato Brasileiro");
    this.resolvePromotionRelegation("en_a", "en_b", "Premier League / Championship");

    // 2. Award prize money and champions
    for (const [leagueId, league] of Object.entries(this.state.database)) {
      // Sort teams
      league.teams.sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor);
      
      const champion = league.teams[0];
      const runnerUp = league.teams[1];

      // Awards
      const isSecondDiv = leagueId.endsWith("_b");
      const prizeChamp = isSecondDiv ? 5000000 : 30000000;
      const prizeRunner = isSecondDiv ? 3000000 : 18000000;
      this.awardTitleRewards(champion, league.name, prizeChamp);
      this.adjustTeamBudget(runnerUp, prizeRunner, 'prizeMoney');

      this.addNews("Campeão Nacional", `${champion.name} é o campeão da liga ${league.name}!`);

      if (champion.id === this.state.manager.teamId) {
        this.state.manager.trophies.push({ year: this.state.year, title: league.name, team: champion.name });
      }

      // Find Top Scorer in this league
      let topScorer = null;
      let topGoals = 0;
      league.teams.forEach(team => {
        team.squad.forEach(p => {
          if (p.goals > topGoals) {
            topGoals = p.goals;
            topScorer = { player: p, team: team };
          }
        });
      });

      if (topScorer) {
        this.addNews("Artilheiro da Liga", `${topScorer.player.name} (${topScorer.team.name}) é o artilheiro com ${topGoals} gols!`);
      }
    }

    // 3. Aging & Retirements & Skill growths
    for (const league of Object.values(this.state.database)) {
      league.teams.forEach(team => {
        const activeSquad = [];
        
        team.squad.forEach(p => {
          // Self-healing: ensure player potential is set
          if (!p.potential) {
            if (p.age <= 25) {
              p.potential = Math.min(99, p.rating + Math.floor(Math.random() * 10) + 3);
            } else if (p.age <= 30) {
              p.potential = Math.min(99, p.rating + Math.floor(Math.random() * 3) + 1);
            } else {
              p.potential = p.rating;
            }
          }

          // Performance Score Evaluation (range 0.1 to 1.5)
          let perfScore = 0.5; // default fallback if they didn't play
          if (p.games > 0) {
            if (p.position === "GOL" || p.position === "ZAG" || p.position === "LAT") {
              perfScore = p.games / 25; // 25 matches is standard
            } else {
              perfScore = (p.games / 25) + (p.goals / 8);
            }
            perfScore = Math.max(0.1, Math.min(1.5, perfScore));
          }

          // Potential growth / decline by Age brackets
          let ratingChange = 0;

          if (p.age <= 25) {
            // Growing Potential Bracket (16 to 25)
            if (perfScore >= 1.0) {
              // Excellent performance: significant growth (+2 to +5) and potential ceiling increases
              ratingChange = Math.floor(Math.random() * 4) + 2;
              p.potential = Math.min(99, p.potential + Math.floor(Math.random() * 2) + 1);
            } else if (perfScore >= 0.5) {
              // Moderate performance: standard growth (+1 to +3)
              ratingChange = Math.floor(Math.random() * 3) + 1;
            } else {
              // Stagnation: played little (+0 to +1), potential declines slightly
              ratingChange = Math.random() < 0.3 ? 1 : 0;
              p.potential = Math.max(p.rating, p.potential - Math.floor(Math.random() * 2));
            }
            p.rating = Math.min(p.potential, p.rating + ratingChange);

          } else if (p.age <= 30) {
            // Peak prime Bracket (25 to 30)
            if (perfScore >= 1.1) {
              // Outstanding season at peak can still improve rating slightly (+1)
              p.rating = Math.min(99, p.rating + 1);
            } else if (perfScore < 0.5) {
              // Underperforming or not playing at peak causes a slight decay in form (-1 to -2)
              p.rating = Math.max(45, p.rating - (Math.floor(Math.random() * 2) + 1));
            }
            p.potential = p.rating; // potential aligns with prime rating

          } else {
            // Veteran Decline Bracket (30+)
            // Decline is inevitable, but mitigated by playing/performing well
            if (perfScore >= 1.0) {
              // Excellent season: mitigates decline (0 or -1)
              ratingChange = Math.random() < 0.3 ? 0 : -1;
            } else if (perfScore >= 0.5) {
              // Moderate season: standard decay (-1 to -2)
              ratingChange = -(Math.floor(Math.random() * 2) + 1);
            } else {
              // Poor season / did not play: fast decay (-3 to -5)
              ratingChange = -(Math.floor(Math.random() * 3) + 3);
            }
            p.rating = Math.max(45, p.rating + ratingChange);
            p.potential = p.rating;
          }

          // Age increment
          p.age++;

          // Reset stats for next season
          p.goals = 0;
          p.games = 0;
          p.yellowCards = 0;
          p.redCards = 0;

          p.value = window.calculatePlayerValue(p.rating, p.age, p.position);
          p.salary = window.calculatePlayerSalary(p.rating, p.age, p.value);

          // Decrement contract remaining years
          if (p.contract !== undefined) {
            p.contract--;
          } else {
            p.contract = 3;
          }

          // Check for retirement (chance increases above age 33)
          let retires = false;
          if (p.age >= 34) {
            const chance = (p.age - 33) * 0.15; // 34: 15%, 35: 30%, etc.
            retires = Math.random() < chance;
          }

          if (retires) {
            this.addNews("Aposentadoria", `${p.name} (${p.position}, f:${p.rating}), jogador do ${team.name}, se aposentou do futebol aos ${p.age} anos.`);
          } else if (p.contract <= 0) {
            p.isStarter = false;
            p.isSub = false;
            p.contract = 0;
            this.state.freeAgents.push(p);
            this.addNews("Fim de Contrato", `${p.name} (${p.position}, f:${p.rating}) encerrou seu contrato com o ${team.name} e está livre no mercado.`);
          } else {
            activeSquad.push(p);
          }
        });

        team.squad = activeSquad;

        // Fill vacant rosters with youth academy players (base)
        const isSecondDiv = league.id.endsWith("_b");
        while (team.squad.length < 18) {
          const positions = ["GOL", "ZAG", "LAT", "MEI", "ATA"];
          const pos = positions[Math.floor(Math.random() * positions.length)];
          const leagueRep = league.reputation;
          let rating = clamp(Math.round(45 + (leagueRep * 6) + (Math.random() * 10)), 45, 75);
          if (isSecondDiv) {
            rating = clamp(Math.round(38 + (leagueRep * 5) + (Math.random() * 8)), 45, 65);
          }
          
          const newYouth = {
            id: generateId(),
            name: window.generatePlayerName(league.nationality),
            position: pos,
            rating: rating,
            potential: Math.min(99, rating + Math.floor(Math.random() * 12) + 5),
            age: 17,
            nationality: league.nationality,
            value: window.calculatePlayerValue(rating, 17, pos),
            salary: window.calculatePlayerSalary(rating, 17, 100000),
            goals: 0, games: 0, yellowCards: 0, redCards: 0,
            condition: 100, morale: 80,
            skills: window.generateTraits(pos),
            contract: 3
          };
          team.squad.push(newYouth);
        }

        // Reset points for next season
        team.points = 0; team.played = 0; team.wins = 0; team.draws = 0; team.losses = 0;
        team.goalsFor = 0; team.goalsAgainst = 0; team.form = [];
      });
    }

    // 4. Increment Season Year and Week Reset
    this.state.season++;
    this.state.year++;
    this.state.week = 1;

    // Reset national teams stats for next season
    if (this.state.nationalTeams) {
      Object.values(this.state.nationalTeams).forEach(nt => {
        nt.played = 0;
        nt.points = 0;
        nt.wins = 0;
        nt.draws = 0;
        nt.losses = 0;
        nt.goalsFor = 0;
        nt.goalsAgainst = 0;
        nt.form = [];
      });
    }

    // 5. Generate fresh Fixtures for new season
    this.generateSeasonFixtures();
    this.generateInitialTransferMarket();
    this.generateInitialFreeAgents();

    // Auto escalate computer squads again
    this.autoSelectAllComputerLineups();

    alert(`Fim de temporada! Bem-vindo à temporada ${this.state.season} (${this.state.year}).`);
    
    // Reset seasonTotals in finance log
    const uTeam = this.findTeamById(this.state.manager.teamId);
    if (uTeam && uTeam.financeLog) {
      Object.keys(uTeam.financeLog.seasonTotal).forEach(k => {
        uTeam.financeLog.seasonTotal[k] = 0;
      });
    }

    // Check user bankruptcy
    if (uTeam && uTeam.budget < 0) {
      alert(`🚨 FALÊNCIA! A diretoria do ${uTeam.name} demitiu você devido ao saldo negativo crônico de R$ ${uTeam.budget.toLocaleString()} no caixa do clube no fim da temporada.\n\nFim de jogo!`);
      localStorage.removeItem("brasfoot_save");
      window.location.reload();
      return;
    }

    // Generate new season goals based on new squad strength
    this.updateSeasonGoals();

    // Generate job offers for the manager
    const offers = this.generateJobOffers();
    if (offers && offers.length > 0) {
      this.state.pendingJobOffers = offers;
    }

    this.saveGame();
  }

  // Resolves promotion/relegation between division A and division B
  resolvePromotionRelegation(divAId, divBId, title) {
    const divA = this.state.database[divAId];
    const divB = this.state.database[divBId];

    if (!divA || !divB) return;

    // Sort squads
    divA.teams.sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));
    divB.teams.sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));

    // Top 4 from B promoted, bottom 4 from A relegated
    const relegated = divA.teams.slice(-4);
    const promoted = divB.teams.slice(0, 4);

    // Swap teams between array lists
    divA.teams = divA.teams.filter(t => !relegated.includes(t)).concat(promoted);
    divB.teams = divB.teams.filter(t => !promoted.includes(t)).concat(relegated);

    // Notify news
    promoted.forEach(t => {
      const promoVerba = 15000000; // R$ 15M promotion budget boost
      this.adjustTeamBudget(t, promoVerba, 'prizeMoney');
      this.addNews("Promoção", `Parabéns! ${t.name} conquistou o acesso e vai disputar a Série A / Divisão Principal! Recebeu R$ 15.000.000 extras de verba inicial para a elite.`);
    });
    relegated.forEach(t => {
      this.addNews("Rebaixamento", `${t.name} fez uma campanha ruim e foi rebaixado para a divisão inferior.`);
    });

    // If manager team got promoted/relegated, update their league ID
    const userTeamId = this.state.manager.teamId;
    if (promoted.some(t => t.id === userTeamId)) {
      this.state.manager.leagueId = divAId;
    } else if (relegated.some(t => t.id === userTeamId)) {
      this.state.manager.leagueId = divBId;
    }
  }

  // User Actions: Transfer bidding
  makeTransferBid(playerId, bidAmount) {
    const userTeam = this.findTeamById(this.state.manager.teamId);
    const playerDetails = this.findPlayerById(playerId);

    if (userTeam.budget < 0) {
      alert("Operação bloqueada! O clube está com saldo negativo e sob intervenção financeira da diretoria.");
      return;
    }

    if (!playerDetails || !playerDetails.team) {
      alert("Jogador não pertence a nenhum clube ou já é agente livre.");
      return;
    }

    const { player, team } = playerDetails;

    if (bidAmount > userTeam.budget) {
      alert("Seu orçamento é insuficiente para esta proposta.");
      return;
    }

    // Bid decision formula
    // Accept instantly if bid is at least 100% of the player's value (ratio >= 1.0).
    const ratio = bidAmount / player.value;
    let accepted = false;

    if (ratio >= 1.0) {
      accepted = true;
    } else if (ratio >= 0.85) {
      accepted = Math.random() < 0.65;
    } else {
      accepted = Math.random() < 0.2;
    }

    if (accepted) {
      // Contract negotiation
      const demandSalary = Math.round(player.salary * (1.0 + (Math.random() * 0.25 - 0.05)));
      
      // We return the result so the UI can prompt salary negotiation
      return {
        status: "accepted",
        player: player,
        ownerTeam: team,
        bidAmount: bidAmount,
        demandedSalary: demandSalary
      };
    } else {
      return {
        status: "rejected"
      };
    }
  }

  completeTransfer(player, ownerTeam, bidAmount, weeklySalary, contractYears) {
    const userTeam = this.findTeamById(this.state.manager.teamId);

    if (userTeam.squad.length >= 50) {
      alert("Seu elenco está cheio! O limite é de 50 jogadores.");
      return;
    }

    // Subtract transfer fee
    this.adjustTeamBudget(userTeam, -bidAmount, 'transferFeesPaid');
    if (ownerTeam) {
      this.adjustTeamBudget(ownerTeam, bidAmount, 'playerSales');
      // Remove player from owner squad
      ownerTeam.squad = ownerTeam.squad.filter(p => p.id !== player.id);
    }

    // Remove from transfer lists or free agent list
    this.state.transferList = this.state.transferList.filter(item => item.playerId !== player.id);
    this.state.freeAgents = this.state.freeAgents.filter(p => p.id !== player.id);

    // Set new player properties
    player.salary = weeklySalary;
    player.contract = contractYears;
    player.isStarter = false;
    player.isSub = false;

    // Add to user squad
    userTeam.squad.push(player);

    this.addNews("Contratação!", `${userTeam.name} anuncia a contratação de ${player.name} (${player.position}) por R$ ${bidAmount.toLocaleString()}.`);
    this.saveGame();
  }

  // Fire a player (must pay remaining contract fee)
  firePlayer(playerId) {
    const userTeam = this.findTeamById(this.state.manager.teamId);
    const player = userTeam.squad.find(p => p.id === playerId);
    if (!player) return;

    const penaltyFee = player.salary * 10 * player.contract; // 10 weeks of wages per remaining year
    
    if (confirm(`Tem certeza que deseja rescindir o contrato de ${player.name}? A multa rescisória é de R$ ${penaltyFee.toLocaleString()}`)) {
      if (userTeam.budget < penaltyFee) {
        alert("Orçamento insuficiente para pagar a rescisão!");
        return;
      }
      this.adjustTeamBudget(userTeam, -penaltyFee, 'playerWages');
      userTeam.squad = userTeam.squad.filter(p => p.id !== playerId);
      
      // Make them a free agent
      player.isStarter = false;
      player.isSub = false;
      player.contract = 0;
      this.state.freeAgents.push(player);

      this.addNews("Rescisão", `${userTeam.name} rescindiu o contrato de ${player.name}.`);
      this.saveGame();
      window.renderApp();
    }
  }

  // List/Delist player from transfer market
  toggleTransferList(playerId) {
    const userTeam = this.findTeamById(this.state.manager.teamId);
    const player = userTeam.squad.find(p => p.id === playerId);
    if (!player) return;

    const index = this.state.transferList.findIndex(item => item.playerId === playerId);
    if (index > -1) {
      this.state.transferList.splice(index, 1);
      alert(`${player.name} foi retirado da lista de transferências.`);
    } else {
      this.state.transferList.push({
        playerId: playerId,
        teamId: userTeam.id,
        originalPrice: player.value
      });
      alert(`${player.name} foi listado para venda.`);
    }
    this.saveGame();
    window.renderApp();
  }

  // Pull a young player from Youth Academy (Categorias de Base)
  pullYouthAcademy() {
    const userTeam = this.findTeamById(this.state.manager.teamId);
    const userLeague = this.findLeagueByTeamId(userTeam.id);

    if (userTeam.budget < 0) {
      alert("Operação bloqueada! O clube está com saldo negativo e sob intervenção.");
      return;
    }

    if (this.state.youthAcademyTimer > 0) {
      alert(`Você precisa aguardar mais ${this.state.youthAcademyTimer} semanas para puxar outro jogador da base.`);
      return;
    }

    if (userTeam.academyLevel === undefined) userTeam.academyLevel = 2;
    
    // Cost, cooldown and rating configurations per level
    const configs = {
      1: { cost: 500000, cooldown: 10, minRating: 45, maxRating: 65 },
      2: { cost: 1500000, cooldown: 8, minRating: 55, maxRating: 75 },
      3: { cost: 3500000, cooldown: 6, minRating: 65, maxRating: 82 },
      4: { cost: 8000000, cooldown: 5, minRating: 72, maxRating: 88 }
    };
    
    const conf = configs[userTeam.academyLevel] || configs[2];

    if (userTeam.budget < conf.cost) {
      alert(`Orçamento insuficiente! Você precisa de R$ ${conf.cost.toLocaleString()} para recrutar com a base atual.`);
      return;
    }

    if (userTeam.squad.length >= 50) {
      alert("Seu elenco está cheio! O limite é de 50 jogadores.");
      return;
    }

    this.adjustTeamBudget(userTeam, -conf.cost, 'youthAcademyUpkeep');
    this.state.youthAcademyTimer = conf.cooldown;

    const positions = ["GOL", "ZAG", "LAT", "MEI", "ATA"];
    const pos = positions[Math.floor(Math.random() * positions.length)];
    
    // Calculate rating based on academy limits
    const rating = clamp(
      Math.round(conf.minRating + Math.random() * (conf.maxRating - conf.minRating)),
      conf.minRating,
      conf.maxRating
    );
    
    const name = window.generatePlayerName(userLeague.nationality);
    
    const youthPlayer = {
      id: generateId(),
      name: name,
      position: pos,
      rating: rating,
      potential: Math.min(99, rating + Math.floor(Math.random() * 12) + 6),
      age: 17,
      nationality: userLeague.nationality,
      value: window.calculatePlayerValue(rating, 17, pos),
      salary: window.calculatePlayerSalary(rating, 17, 100000),
      goals: 0, games: 0, yellowCards: 0, redCards: 0,
      condition: 100, morale: 95,
      skills: window.generateTraits(pos),
      contract: 4
    };

    userTeam.squad.push(youthPlayer);
    this.addNews("Joia da Base", `${userTeam.name} promove ${name} (${pos}, f:${rating}) da base nível ${this.getAcademyLevelName(userTeam.academyLevel)}!`);
    alert(`Sucesso! Você promoveu ${name} (${pos}, Força: ${rating}) para a equipe principal.`);
    this.saveGame();
    window.renderApp();
  }

  // Stadium Upgrade
  upgradeStadium(capacityIncrease) {
    const userTeam = this.findTeamById(this.state.manager.teamId);
    if (userTeam.stadiumUpgrading) {
      alert("Já existe uma obra em andamento no seu estádio.");
      return;
    }

    const costPerSeat = 1200; // R$ 1,200 per new seat
    const cost = capacityIncrease * costPerSeat;

    if (userTeam.budget < cost) {
      alert(`Orçamento insuficiente. A obra custa R$ ${cost.toLocaleString()}`);
      return;
    }

    const weeks = Math.round(capacityIncrease / 2000) + 2; // e.g. 5000 seats = 4-5 weeks

    if (confirm(`Confirmar ampliação de ${capacityIncrease.toLocaleString()} assentos por R$ ${cost.toLocaleString()}? A obra levará ${weeks} semanas.`)) {
      this.adjustTeamBudget(userTeam, -cost, 'stadiumUpkeep');
      userTeam.stadiumUpgrading = true;
      userTeam.stadiumUpgradeWeeks = weeks;
      userTeam.stadiumUpgradeCapacityIncrease = capacityIncrease;
      
      this.addNews("Obras no Estádio", `${userTeam.name} iniciou as obras para aumentar a capacidade do estádio em ${capacityIncrease.toLocaleString()} lugares.`);
      this.saveGame();
      window.renderApp();
    }
  }

  awardTitleRewards(team, titleName, basePrize) {
    if (!team) return;

    // 1. Award base tournament prize money
    if (basePrize > 0) {
      this.adjustTeamBudget(team, basePrize, 'prizeMoney');
    }

    // 2. Award sponsor title bonuses (if the team has sponsors)
    let totalSponsorBonus = 0;
    if (team.sponsors) {
      if (team.sponsors.master && team.sponsors.master.titleBonus) {
        totalSponsorBonus += team.sponsors.master.titleBonus;
      }
      if (team.sponsors.stadium && team.sponsors.stadium.titleBonus) {
        totalSponsorBonus += team.sponsors.stadium.titleBonus;
      }
    }

    if (totalSponsorBonus > 0) {
      this.adjustTeamBudget(team, totalSponsorBonus, 'prizeMoney');
      // If user's team, notify them of the sponsor payouts!
      if (this.state.manager && team.id === this.state.manager.teamId) {
        this.addNews("Patrocínio: Bônus de Título!", `Seus patrocinadores pagaram um bônus total de R$ ${totalSponsorBonus.toLocaleString()} pela conquista do título: ${titleName}!`);
      }
    }
  }

  // Advanced Financial System Helpers
  adjustTeamBudget(team, amount, category) {
    if (!team) return;
    team.budget = Math.round((team.budget || 0) + amount);
    
    // Only log ledger entries for the user's team
    if (this.state.manager && team.id === this.state.manager.teamId) {
      this.ensureTeamFinanceLog(team);
      
      if (team.financeLog && team.financeLog.currentWeek && team.financeLog.currentWeek[category] !== undefined) {
        team.financeLog.currentWeek[category] += amount;
      }
      if (team.financeLog && team.financeLog.seasonTotal && team.financeLog.seasonTotal[category] !== undefined) {
        team.financeLog.seasonTotal[category] += amount;
      }
    }
  }

  ensureTeamFinanceLog(team) {
    if (!team) return;
    if (!team.financeLog) {
      team.financeLog = {
        currentWeek: this.createEmptyLedger(),
        seasonTotal: this.createEmptyLedger(),
        history: []
      };
    } else {
      // Self-healing: ensure keys are set
      if (!team.financeLog.currentWeek) team.financeLog.currentWeek = this.createEmptyLedger();
      if (!team.financeLog.seasonTotal) team.financeLog.seasonTotal = this.createEmptyLedger();
      if (!team.financeLog.history) team.financeLog.history = [];
    }
  }

  createEmptyLedger() {
    return {
      ticketSales: 0,
      sponsorMaster: 0,
      sponsorSleeve: 0,
      sponsorNaming: 0,
      tvRights: 0,
      playerSales: 0,
      merchandising: 0,
      prizeMoney: 0,
      
      playerWages: 0,
      transferFeesPaid: 0,
      stadiumUpkeep: 0,
      loanInterest: 0,
      loanRepayments: 0,
      youthAcademyUpkeep: 0
    };
  }

  initDefaultSponsorsIfMissing(team) {
    if (!team) return;
    if (!team.sponsors) {
      team.sponsors = {};
    }
    
    let rep = team.reputation || 3.0;
    const league = this.findLeagueByTeamId(team.id);
    if (league && league.id.endsWith("_b")) {
      rep = rep * 0.35;
    }
    
    // Set default sponsors if empty (backward compatible)
    if (!team.sponsors.master) {
      team.sponsors.master = {
        name: this.getRandomSponsorName("master"),
        weeklyFee: Math.round(rep * 110000),
        winBonus: Math.round(rep * 15000),
        titleBonus: Math.round(rep * 500000),
        weeksRemaining: Math.floor(Math.random() * 20) + 15
      };
    }
    if (!team.sponsors.sleeve) {
      team.sponsors.sleeve = {
        name: this.getRandomSponsorName("sleeve"),
        weeklyFee: Math.round(rep * 45000),
        winBonus: Math.round(rep * 4000),
        weeksRemaining: Math.floor(Math.random() * 20) + 10
      };
    }
    if (!team.sponsors.stadium) {
      team.sponsors.stadium = {
        name: this.getRandomSponsorName("stadium"),
        weeklyFee: Math.round(rep * 60000),
        titleBonus: Math.round(rep * 400000),
        weeksRemaining: Math.floor(Math.random() * 30) + 20
      };
    }
  }

  initLoansIfMissing(team) {
    if (!team) return;
    if (!team.loans) {
      team.loans = { popular: 0, comercial: 0, shark: 0 };
    }
    // Backward compatibility: map single loan to comercial
    if (team.loan > 0 && team.loans.popular === 0 && team.loans.comercial === 0 && team.loans.shark === 0) {
      team.loans.comercial = team.loan;
    }
  }

  getRandomSponsorName(type) {
    const masterNames = ["Crefisa", "Banco Inter", "Fly Emirates", "Pixbet", "Betano", "Novibet", "Sportsbet.io", "Bmg", "Caixa", "EstrelaBet", "Superbet"];
    const sleeveNames = ["Havan", "Avanutri", "Uniasselvi", "KTO", "ABC da Construção", "TIM", "Cartão de Todos", "Zeedog", "Midea"];
    const stadiumNames = ["Allianz Parque", "Neo Química Arena", "Morumbis", "Ligga Arena", "Casa Apostas Arena Fonte Nova", "Mercado Livre Arena Pacaembu"];
    
    let list = masterNames;
    if (type === "sleeve") list = sleeveNames;
    if (type === "stadium") list = stadiumNames;
    
    return list[Math.floor(Math.random() * list.length)];
  }

  generateSponsorOffers(type) {
    const userTeam = this.findTeamById(this.state.manager.teamId);
    let rep = userTeam.reputation || 3.0;
    const isSecondDiv = this.state.manager.leagueId.endsWith("_b");
    if (isSecondDiv) {
      rep = rep * 0.35;
    }
    
    // Get board confidence to calculate multiplier
    const confidence = this.state.manager.boardConfidence !== undefined ? this.state.manager.boardConfidence : 80;
    // Base is 80% confidence -> multiplier is 1.0
    // If confidence is high (up to 100%), multiplier goes up to 1.25
    // If confidence is low (down to 10%), multiplier drops to 0.125
    const multiplier = Math.max(0.1, Math.min(1.3, 0.5 + (confidence - 40) / 80));

    const offers = [];
    
    for (let i = 0; i < 3; i++) {
      let name = this.getRandomSponsorName(type);
      while (offers.some(o => o.name === name)) {
        name = this.getRandomSponsorName(type);
      }
      
      let weeklyFee = 0;
      let winBonus = 0;
      let titleBonus = 0;
      let weeksRemaining = 0;
      let desc = "";
      
      if (type === "master") {
        weeksRemaining = [40, 45, 80][i];
        if (i === 0) {
          weeklyFee = Math.round(rep * 135000 * (0.95 + Math.random() * 0.1) * multiplier);
          winBonus = Math.round(rep * 10000 * (0.9 + Math.random() * 0.2) * multiplier);
          titleBonus = Math.round(rep * 400000 * (0.8 + Math.random() * 0.4) * multiplier);
          desc = "Perfil Conservador: Foco em receita garantida toda semana, com bônus modestos por vitórias e títulos.";
        } else if (i === 1) {
          weeklyFee = Math.round(rep * 90000 * (0.95 + Math.random() * 0.1) * multiplier);
          winBonus = Math.round(rep * 45000 * (0.9 + Math.random() * 0.2) * multiplier);
          titleBonus = Math.round(rep * 800000 * (0.8 + Math.random() * 0.4) * multiplier);
          desc = "Perfil Esportivo: Receita fixa moderada, mas paga excelentes prêmios a cada vitória do time.";
        } else {
          weeklyFee = Math.round(rep * 75000 * (0.95 + Math.random() * 0.1) * multiplier);
          winBonus = Math.round(rep * 15000 * (0.9 + Math.random() * 0.2) * multiplier);
          titleBonus = Math.round(rep * 2500000 * (0.9 + Math.random() * 0.2) * multiplier);
          desc = "Perfil Ousado: Contrato de longo prazo com valores semanais menores, porém com premiação gigante em caso de título.";
        }
      } else if (type === "sleeve") {
        weeksRemaining = [30, 35, 45][i];
        if (i === 0) {
          weeklyFee = Math.round(rep * 55000 * (0.9 + Math.random() * 0.2) * multiplier);
          winBonus = Math.round(rep * 2000 * multiplier);
          desc = "Sleeve fixo de curto prazo.";
        } else if (i === 1) {
          weeklyFee = Math.round(rep * 40000 * (0.9 + Math.random() * 0.2) * multiplier);
          winBonus = Math.round(rep * 8000 * (0.9 + Math.random() * 0.2) * multiplier);
          desc = "Sleeve esportivo com bônus de vitória expressivo.";
        } else {
          weeklyFee = Math.round(rep * 45000 * (0.9 + Math.random() * 0.2) * multiplier);
          winBonus = Math.round(rep * 4000 * multiplier);
          titleBonus = Math.round(rep * 250000 * multiplier);
          desc = "Sleeve equilibrado de duração intermediária.";
        }
      } else {
        weeksRemaining = [80, 90, 120][i];
        if (i === 0) {
          weeklyFee = Math.round(rep * 75000 * (0.9 + Math.random() * 0.2) * multiplier);
          titleBonus = Math.round(rep * 300000 * multiplier);
          desc = "Naming Rights com excelente repasse semanal.";
        } else if (i === 1) {
          weeklyFee = Math.round(rep * 55000 * (0.9 + Math.random() * 0.2) * multiplier);
          titleBonus = Math.round(rep * 900000 * (0.9 + Math.random() * 0.2) * multiplier);
          desc = "Naming Rights com alto bônus por conquistas.";
        } else {
          weeklyFee = Math.round(rep * 62000 * (0.9 + Math.random() * 0.2) * multiplier);
          titleBonus = Math.round(rep * 500000 * multiplier);
          desc = "Naming Rights de longa duração equilibrado.";
        }
      }
      
      offers.push({
        name: name,
        weeklyFee: Math.round(weeklyFee / 1000) * 1000,
        winBonus: Math.round(winBonus / 1000) * 1000,
        titleBonus: Math.round(titleBonus / 1000) * 1000,
        weeksRemaining: weeksRemaining,
        desc: desc,
        multiplier: multiplier,
        confidence: confidence
      });
    }
    
    return offers;
  }

  // Loans
  borrowMoney(amount) {
    this.borrowMoneyFromBank("comercial", amount);
  }

  repayLoan(amount) {
    this.repayLoanToBank("comercial", amount);
  }

  borrowMoneyFromBank(bankId, amount) {
    const userTeam = this.findTeamById(this.state.manager.teamId);
    this.initLoansIfMissing(userTeam);
    
    const rep = userTeam.reputation || 3.0;
    const limits = {
      popular: Math.round(rep * 2000000),
      comercial: Math.round(rep * 5000000),
      shark: Math.round(rep * 12000000)
    };
    
    const limit = limits[bankId] || 5000000;
    const currentLoan = userTeam.loans[bankId] || 0;
    
    if (currentLoan + amount > limit) {
      alert(`Empréstimo negado! O limite máximo para esta linha de crédito é R$ ${limit.toLocaleString()}`);
      return;
    }
    
    userTeam.loans[bankId] = currentLoan + amount;
    userTeam.loan = userTeam.loans.popular + userTeam.loans.comercial + userTeam.loans.shark;
    
    this.adjustTeamBudget(userTeam, amount, 'loansBorrowed'); // wait, this was loansBorrowed - since loansBorrowed isn't in ledger, let's keep it but since we want to avoid error, wait, is it in createEmptyLedger? Ah!
    // Let's check: createEmptyLedger has:
    // ticketSales, sponsorMaster, sponsorSleeve, sponsorNaming, tvRights, playerSales, merchandising, prizeMoney
    // playerWages, transferFeesPaid, stadiumUpkeep, loanInterest, loanRepayments, youthAcademyUpkeep.
    // Ah! 'loansBorrowed' and 'loanRepayments'. Wait! 'loansBorrowed' is not a ledger category because it's debt! That is correct, debt receipt is a capital influx and shouldn't impact P&L.
    // Wait, but to log it properly, we don't need to log debt receipt in weekly expenses/incomes! So we can just do:
    // team.budget += amount; (without adjustTeamBudget category)
    // Wait! Let's do:
    // userTeam.budget = Math.round(userTeam.budget + amount);
    // and for repay:
    // userTeam.budget = Math.round(userTeam.budget - amount);
    // and log the repayment under 'loanRepayments' (which IS in the ledger!).
    // Let's check: yes, createEmptyLedger has 'loanRepayments'! This is perfect!
    // So for borrow:
    userTeam.budget = Math.round(userTeam.budget + amount);
    
    this.addNews("Empréstimo", `${userTeam.name} captou R$ ${amount.toLocaleString()} no banco (${bankId.toUpperCase()}).`);
    this.saveGame();
    if (typeof window !== "undefined" && window.renderApp) {
      window.renderApp();
    }
  }

  repayLoanToBank(bankId, amount) {
    const userTeam = this.findTeamById(this.state.manager.teamId);
    this.initLoansIfMissing(userTeam);
    
    const currentLoan = userTeam.loans[bankId] || 0;
    if (amount > userTeam.budget) {
      alert("Saldo em caixa insuficiente para pagar este valor.");
      return;
    }
    if (amount > currentLoan) {
      amount = currentLoan;
    }
    
    userTeam.loans[bankId] = currentLoan - amount;
    userTeam.loan = userTeam.loans.popular + userTeam.loans.comercial + userTeam.loans.shark;
    
    this.adjustTeamBudget(userTeam, -amount, 'loanRepayments');
    
    this.addNews("Pagamento", `${userTeam.name} quitou R$ ${amount.toLocaleString()} da dívida com o banco (${bankId.toUpperCase()}).`);
    this.saveGame();
    if (typeof window !== "undefined" && window.renderApp) {
      window.renderApp();
    }
  }

  upgradeAcademy() {
    const userTeam = this.findTeamById(this.state.manager.teamId);
    if (userTeam.academyLevel === undefined) userTeam.academyLevel = 2;
    
    if (userTeam.academyLevel >= 4) {
      alert("A categoria de base já está no nível máximo (Classe Mundial).");
      return;
    }
    
    const costs = [0, 0, 1500000, 6000000, 18000000];
    const nextLevel = userTeam.academyLevel + 1;
    const cost = costs[nextLevel];
    
    if (userTeam.budget < cost) {
      alert(`Orçamento insuficiente. A melhoria custa R$ ${cost.toLocaleString()}`);
      return;
    }
    
    if (confirm(`Confirmar upgrade da Categoria de Base para o nível ${this.getAcademyLevelName(nextLevel)} por R$ ${cost.toLocaleString()}?`)) {
      this.adjustTeamBudget(userTeam, -cost, 'stadiumUpkeep');
      userTeam.academyLevel = nextLevel;
      this.addNews("Infraestrutura", `${userTeam.name} realizou melhorias na categoria de base, agora classificada como ${this.getAcademyLevelName(nextLevel)}.`);
      this.saveGame();
      if (typeof window !== "undefined" && window.renderApp) {
        window.renderApp();
      }
    }
  }

  setAcademyLevel(level) {
    const userTeam = this.findTeamById(this.state.manager.teamId);
    if (userTeam.academyLevel === undefined) userTeam.academyLevel = 2;
    
    if (level < 1 || level > 4) return;
    if (level === userTeam.academyLevel) return;
    
    if (level < userTeam.academyLevel) {
      if (confirm(`Tem certeza que deseja reduzir o nível da base para ${this.getAcademyLevelName(level)}? Isso reduzirá a qualidade dos jovens revelados, mas diminuirá os custos semanais.`)) {
        userTeam.academyLevel = level;
        this.saveGame();
        if (typeof window !== "undefined" && window.renderApp) {
          window.renderApp();
        }
      }
    } else {
      this.upgradeAcademy();
    }
  }

  getAcademyLevelName(level) {
    const names = ["", "Básica", "Aprimorada", "Excelente", "Classe Mundial"];
    return names[level] || "Aprimorada";
  }

  incrementManagerStats(isWin, isDraw) {
    if (!this.state.manager.stats) {
      this.state.manager.stats = { wins: 0, draws: 0, losses: 0 };
    }
    if (isWin) this.state.manager.stats.wins++;
    else if (isDraw) this.state.manager.stats.draws++;
    else this.state.manager.stats.losses++;

    if (!this.state.manager.currentClubStats) {
      this.state.manager.currentClubStats = { wins: 0, draws: 0, losses: 0 };
    }
    if (isWin) this.state.manager.currentClubStats.wins++;
    else if (isDraw) this.state.manager.currentClubStats.draws++;
    else this.state.manager.currentClubStats.losses++;
  }

  generateJobOffers() {
    const userTeam = this.findTeamById(this.state.manager.teamId);
    if (!userTeam) return [];

    const isUserNational = this.state.nationalTeams && this.state.nationalTeams[userTeam.id] !== undefined;

    // Get current club stats, falling back to career stats if less than 3 matches played in the current club/selection
    let stats = this.state.manager.currentClubStats || { wins: 0, draws: 0, losses: 0 };
    let totalGames = stats.wins + stats.draws + stats.losses;
    let usingCareerStats = false;

    if (totalGames < 3) {
      const careerStats = this.state.manager.stats || { wins: 0, draws: 0, losses: 0 };
      const careerTotal = careerStats.wins + careerStats.draws + careerStats.losses;
      if (careerTotal >= 3) {
        stats = careerStats;
        totalGames = careerTotal;
        usingCareerStats = true;
      }
    }

    const wins = stats.wins;
    const draws = stats.draws;
    const losses = stats.losses;
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 50;
    const pointsRate = totalGames > 0 ? ((wins * 3 + draws) / (totalGames * 3)) * 100 : 50;
    const lossRate = totalGames > 0 ? (losses / totalGames) * 100 : 25;
    const drawRate = totalGames > 0 ? (draws / totalGames) * 100 : 25;

    // Collect all clubs from all leagues that are NOT the user's current team
    const allClubs = [];
    Object.keys(this.state.database).forEach(leagueId => {
      const league = this.state.database[leagueId];
      league.teams.forEach(t => {
        if (t.id !== userTeam.id) {
          allClubs.push({
            team: t,
            leagueId: leagueId,
            leagueName: league.name
          });
        }
      });
    });

    // Gather all eligible national teams
    let eligibleNationals = [];
    const userRep = isUserNational ? (userTeam.rating - 50) / 10 : (userTeam.reputation || 3.0);

    if (this.state.nationalTeams) {
      Object.keys(this.state.nationalTeams).forEach(natId => {
        if (natId !== userTeam.id) {
          const nt = this.state.nationalTeams[natId];
          const candRep = Math.max(1.0, Math.min(5.0, (nt.rating - 50) / 10));
          const repDiff = candRep - userRep;

          let isInterested = false;
          if (totalGames < 3) {
            isInterested = (repDiff >= -0.6 && repDiff <= 0.4);
          } else {
            if (candRep >= 4.0) {
              if (winRate >= 50 && pointsRate >= 60 && lossRate <= 25) {
                isInterested = true;
              }
            } else if (candRep >= 3.0) {
              if ((pointsRate >= 45 && lossRate <= 35) || (drawRate >= 35 && pointsRate >= 45)) {
                isInterested = true;
              }
            } else if (candRep >= 2.0) {
              if (pointsRate >= 35 && lossRate <= 45) {
                isInterested = true;
              } else if (pointsRate < 35 && repDiff <= -0.5) {
                isInterested = true;
              }
            } else {
              if (!(pointsRate >= 70 && repDiff <= -1.5) && !(pointsRate < 20 && candRep > userRep)) {
                isInterested = true;
              }
            }
          }

          if (isInterested) {
            eligibleNationals.push(nt);
          }
        }
      });
    }

    // Now filter clubs based on performance and reputation
    let eligibleClubs = [];
    if (allClubs.length > 0) {
      allClubs.forEach(c => {
        const candRep = c.team.reputation || 3.0;
        const repDiff = candRep - userRep;

        let isInterested = false;
        if (totalGames < 3) {
          isInterested = (repDiff >= -0.6 && repDiff <= 0.4);
        } else {
          if (candRep >= 4.0) {
            if (winRate >= 50 && pointsRate >= 60 && lossRate <= 25) {
              isInterested = true;
            }
          } else if (candRep >= 3.0) {
            if ((pointsRate >= 45 && lossRate <= 35) || (drawRate >= 35 && pointsRate >= 45)) {
              isInterested = true;
            }
          } else if (candRep >= 2.0) {
            if (pointsRate >= 35 && lossRate <= 45) {
              isInterested = true;
            } else if (pointsRate < 35 && repDiff <= -0.5) {
              isInterested = true;
            }
          } else {
            if (!(pointsRate >= 70 && repDiff <= -1.5) && !(pointsRate < 20 && candRep > userRep)) {
              isInterested = true;
            }
          }
        }

        if (isInterested) {
          eligibleClubs.push(c);
        }
      });
    }

    // Pick up to 2-3 clubs with a diverse reputation distribution
    let selectedClubs = [];
    if (eligibleClubs.length > 0) {
      const stepUp = eligibleClubs.filter(c => (c.team.reputation || 3.0) - userRep > 0.2);
      const sameTier = eligibleClubs.filter(c => Math.abs((c.team.reputation || 3.0) - userRep) <= 0.2);
      const stepDown = eligibleClubs.filter(c => (c.team.reputation || 3.0) - userRep < -0.2);

      if (stepUp.length > 0) {
        selectedClubs.push(stepUp[Math.floor(Math.random() * stepUp.length)]);
      }
      if (sameTier.length > 0) {
        selectedClubs.push(sameTier[Math.floor(Math.random() * sameTier.length)]);
      }
      if (stepDown.length > 0) {
        selectedClubs.push(stepDown[Math.floor(Math.random() * stepDown.length)]);
      }

      const remaining = eligibleClubs.filter(c => !selectedClubs.includes(c));
      const shuffledRemaining = remaining.sort(() => 0.5 - Math.random());
      while (selectedClubs.length < Math.min(3, eligibleClubs.length) && shuffledRemaining.length > 0) {
        selectedClubs.push(shuffledRemaining.pop());
      }
    }

    if (selectedClubs.length === 0 && allClubs.length > 0) {
      const fallbackClubs = allClubs.filter(c => Math.abs((c.team.reputation || 3.0) - userRep) <= 1.0);
      const shuffledFallback = fallbackClubs.sort(() => 0.5 - Math.random());
      selectedClubs = shuffledFallback.slice(0, 3);
    }

    // Map club offers
    const clubOffers = selectedClubs.map(item => {
      const t = item.team;
      const overall = this.calculateTeamOverallRating(t);
      const isB = item.leagueId.endsWith("_b");
      const rep = t.reputation || 3.0;
      
      let goalTitle = "Evitar Rebaixamento";
      let minSafePos = 16;
      if (rep >= 4.5 && !isB) {
        goalTitle = "Brigar pelo Título";
        minSafePos = 4;
      } else if (rep >= 3.5 && !isB) {
        goalTitle = "Classificação Continental (G6)";
        minSafePos = 10;
      } else if (rep >= 2.5) {
        goalTitle = "Meio da Tabela (Top 12)";
        minSafePos = 16;
      }

      let message = "";
      const currentTeamName = userTeam.name;

      if (totalGames < 3) {
        message = `A diretoria do ${t.name} confia na sua filosofia de jogo e acredita que você tem o perfil ideal para liderar nosso projeto esportivo.`;
      } else {
        const textContext = usingCareerStats ? "na sua carreira" : "no seu clube atual";
        if (winRate >= 55) {
          message = `A diretoria do ${t.name} busca um técnico vencedor. Com um ótimo aproveitamento de vitórias de ${winRate.toFixed(0)}% (${wins} vitórias em ${totalGames} jogos) ${textContext} com o ${currentTeamName}, acreditamos que você é o nome certo para guiar nosso elenco ao topo.`;
        } else if (lossRate <= 18 && totalGames >= 5) {
          message = `Ficamos impressionados com a solidez da sua equipe ${textContext}. Com apenas ${losses} derrota(s) em ${totalGames} partidas (${lossRate.toFixed(0)}% de derrotas), você mostrou grande consistência defensiva e competitividade. Queremos levar essa estabilidade ao ${t.name}.`;
        } else if (drawRate >= 35 && pointsRate >= 45) {
          message = `Analisamos seu trabalho ${textContext} no ${currentTeamName} e destacamos a sua organização tática. Mesmo com ${draws} empates em ${totalGames} jogos, você manteve o time seguro e muito difícil de ser batido. Acreditamos que você dará a solidez necessária ao ${t.name}.`;
        } else if (pointsRate < 38) {
          message = `O ${t.name} precisa de uma reformulação completa. Apesar das dificuldades recentes ${textContext} no ${currentTeamName} com ${losses} derrotas e ${draws} empates, enxergamos seu potencial tático para reerguer nosso elenco e iniciar um novo ciclo vitorioso.`;
        } else {
          message = `Analisamos detalhadamente seus números ${textContext} (${wins} vitórias, ${draws} empates, ${losses} derrotas - aproveitamento de ${pointsRate.toFixed(0)}%). Vemos in você o perfil técnico perfeito para guiar nosso elenco rumo aos objetivos traçados.`;
        }
      }

      return {
        teamId: t.id,
        teamName: t.name,
        leagueId: item.leagueId,
        leagueName: item.leagueName,
        budget: t.budget,
        overall: overall,
        goalTitle: goalTitle,
        minSafePos: minSafePos,
        rep: rep,
        message: message
      };
    });

    // Pick 1-2 random eligible national offers
    const nationalOffers = [];
    if (eligibleNationals.length > 0) {
      const count = Math.min(2, eligibleNationals.length);
      const shuffledNats = [...eligibleNationals].sort(() => 0.5 - Math.random());
      for (let i = 0; i < count; i++) {
        const nt = shuffledNats[i];
        const rep = Math.max(1.0, Math.min(5.0, (nt.rating - 50) / 10));
        
        let goalTitle = "Disputar a Copa com Dignidade";
        if (nt.rating >= 88) {
          goalTitle = "Ser Campeão da Copa de Seleções";
        } else if (nt.rating >= 78) {
          goalTitle = "Chegar às Quartas de Final";
        }

        const overall = nt.rating;
        const budget = 100000000; // 100 Million for national team
        
        let message = "";
        if (totalGames < 3) {
          message = `A Confederação do/a ${nt.name} vê em você uma nova mente brilhante para conduzir nossa seleção de futebol na disputa mundial.`;
        } else {
          const textContext = usingCareerStats ? "na sua carreira" : "no seu clube atual";
          if (winRate >= 55) {
            message = `A Federação de Futebol do/a ${nt.name} busca um treinador com perfil vencedor para guiar nossa seleção rumo à glória internacional. Seu aproveitamento espetacular de ${winRate.toFixed(0)}% ${textContext} com o ${userTeam.name} nos provou sua competência.`;
          } else {
            message = `Convidamos você para assumir a seleção do/a ${nt.name}. Acreditamos na sua consistência tática e no seu aproveitamento geral de ${pointsRate.toFixed(0)}% de pontos para estruturar nossa equipe principal.`;
          }
        }

        nationalOffers.push({
          teamId: nt.id,
          teamName: `${nt.flag} ${nt.name}`,
          leagueId: null,
          leagueName: "Seleção Nacional",
          budget: budget,
          overall: overall,
          goalTitle: goalTitle,
          minSafePos: null,
          rep: rep,
          message: message
        });
      }
    }

    return clubOffers.concat(nationalOffers);
  }

  acceptJobOffer(teamId, leagueId) {
    const userTeam = this.findTeamById(this.state.manager.teamId);
    const newTeam = this.findTeamById(teamId);
    if (!newTeam) return false;

    // Remove pending offers
    delete this.state.pendingJobOffers;

    // Reset manager parameters for the new team
    this.state.manager.teamId = newTeam.id;
    this.state.manager.leagueId = leagueId || null;
    this.state.manager.currentClubStats = { wins: 0, draws: 0, losses: 0 };
    
    // Auto escalate new squad so they are ready to play
    this.autoSelectLineup(newTeam, "4-4-2");

    // Generate new season goal
    this.updateSeasonGoals();

    // Reset confidence
    this.state.manager.boardConfidence = 80;

    // Add news
    const isNational = this.state.nationalTeams && this.state.nationalTeams[newTeam.id] !== undefined;
    if (isNational) {
      newTeam.budget = newTeam.budget || 100000000;
      newTeam.reputation = Math.max(1.0, Math.min(5.0, (newTeam.rating - 50) / 10));
      this.ensureTeamFinanceLog(newTeam);
      this.addNews("Novo Selecionador", `O técnico ${this.state.manager.name} aceitou a proposta do/a ${newTeam.name} e assumiu o comando técnico da Seleção! Ele deixou seu cargo anterior para se dedicar à seleção.`);
    } else {
      this.addNews("Novo Treinador", `O técnico ${this.state.manager.name} aceitou a proposta do ${newTeam.name} e assumiu o comando do clube!`);
    }
    
    this.saveGame();
    return true;
  }

  refuseJobOffers() {
    delete this.state.pendingJobOffers;
    this.saveGame();
  }

  calculateTeamAssetValue(team) {
    let squadValue = 0;
    team.squad.forEach(p => squadValue += p.value);
    return squadValue + team.budget;
  }
}

// Global initialization
if (typeof window !== "undefined") {
  window.GameEngine = GameEngine;
}

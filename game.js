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
        trophies: []
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
    const nats = ["Brazilian", "English", "Spanish", "Argentinian", "German", "French", "Italian", "Portuguese"];
    const countryNames = {
      "Brazilian": { name: "Brasil", flag: "🇧🇷" },
      "English": { name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
      "Spanish": { name: "Espanha", flag: "🇪🇸" },
      "Argentinian": { name: "Argentina", flag: "🇦🇷" },
      "German": { name: "Alemanha", flag: "🇩🇪" },
      "French": { name: "França", flag: "🇫🇷" },
      "Italian": { name: "Itália", flag: "🇮🇹" },
      "Portuguese": { name: "Portugal", flag: "🇵🇹" }
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
      const natPlayers = allPlayers.filter(item => item.player.nationality === nat);
      
      const gks = natPlayers.filter(item => item.player.position === "GOL").sort((a,b) => b.player.rating - a.player.rating).slice(0, 2);
      const defs = natPlayers.filter(item => item.player.position === "ZAG" || item.player.position === "LAT").sort((a,b) => b.player.rating - a.player.rating).slice(0, 6);
      const mids = natPlayers.filter(item => item.player.position === "MEI").sort((a,b) => b.player.rating - a.player.rating).slice(0, 6);
      const atas = natPlayers.filter(item => item.player.position === "ATA").sort((a,b) => b.player.rating - a.player.rating).slice(0, 4);

      let squad = [...gks, ...defs, ...mids, ...atas].map(item => item.player);

      // Backup fallback if squad lacks players
      if (squad.length < 18) {
        const sortedAll = natPlayers.sort((a,b) => b.player.rating - a.player.rating).slice(0, 18).map(item => item.player);
        squad = sortedAll;
      }

      // Map to starting XI for AI national teams
      squad.forEach((p, idx) => {
        p.isStarter = idx < 11;
        p.isSub = idx >= 11;
      });

      this.state.nationalTeams[info.name] = {
        name: info.name,
        flag: info.flag,
        squad: squad,
        colors: nat === "Brazilian" ? ["#fedf00", "#009c3b"] : (nat === "English" ? ["#ffffff", "#ff0000"] : ["#ff0000", "#ffffff"]),
        played: 0,
        points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, form: []
      };
    });

    // 2. Set up Copa de Seleções
    this.state.selecoesFixtures = {
      groups: [
        ["Brasil", "Argentina", "Portugal", "Inglaterra"],
        ["Espanha", "Itália", "Alemanha", "França"]
      ],
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

    // Semifinals
    const sem1Home = standings[0][0].name;
    const sem1Away = standings[1][1].name;
    const sem2Home = standings[1][0].name;
    const sem2Away = standings[0][1].name;

    sf.knockoutRounds = [
      [
        { homeId: sem1Home, awayId: sem1Away, scoreHome: null, scoreAway: null, scorersHome: [], scorersAway: [], simulated: false, isPenalties: false, winnerId: null },
        { homeId: sem2Home, awayId: sem2Away, scoreHome: null, scoreAway: null, scorersHome: [], scorersAway: [], simulated: false, isPenalties: false, winnerId: null }
      ],
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

        // Self-healing: ensure all national teams have played initialized
        if (this.state.nationalTeams) {
          Object.values(this.state.nationalTeams).forEach(nt => {
            if (nt.played === undefined) {
              nt.played = 0;
            }
          });
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

    // Define what competition is played in the current week
    const weekSchedule = this.getCompetitionForWeek(week);

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
      const countryNames = {
        "Brazilian": "Brasil", "English": "Inglaterra", "Spanish": "Espanha",
        "Argentinian": "Argentina", "German": "Alemanha", "French": "França",
        "Italian": "Itália", "Portuguese": "Portugal"
      };
      const userNatName = countryNames[this.state.manager.nationality] || "Brasil";
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
        const stageName = roundIdx === 0 ? "Semifinal" : "Grande Final";
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
      52: { type: "selecoes", stage: "knockout", round: 1 }
    };

    if (week > 52) {
      const extraRound = 30 + (week - 53);
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

    // Calculate full live match properties
    this.currentMatch.forceHome = this.calculateTeamForce(homeTeam);
    this.currentMatch.forceAway = this.calculateTeamForce(awayTeam);

    return true;
  }

  // Calculates playing force of a team based on squad and mentality
  calculateTeamForce(team) {
    const starters = team.squad.filter(p => p.isStarter);
    if (starters.length === 0) return 30;

    let totalRating = 0;
    let avgCondition = 0;
    let avgMorale = 0;

    starters.forEach(p => {
      totalRating += p.rating;
      avgCondition += p.condition;
      avgMorale += p.morale;
    });

    let avgRating = totalRating / starters.length;
    avgCondition = avgCondition / starters.length;
    avgMorale = avgMorale / starters.length;

    // Force is average rating scaled by condition and morale
    let force = avgRating * (0.5 + (avgCondition / 200)) * (0.8 + (avgMorale / 500));

    // Mentality bonus
    if (team.mentality === "offensive") force *= 1.05;
    else if (team.mentality === "ultra-offensive") force *= 1.10;
    else if (team.mentality === "defensive") force *= 0.95;

    return Math.round(force);
  }

  // Ticks the current live match simulation by 1 minute
  tickMatch(speed = 1) {
    if (!this.currentMatch || this.currentMatch.minute >= 90) {
      this.endMatch();
      return;
    }

    this.currentMatch.minute++;
    const min = this.currentMatch.minute;

    // Simulate this minute for the user match
    this.simulateUserMatchMinute(min);

    // Simulate other matches in the same round at key intervals
    if (min % 10 === 0 || min === 90) {
      this.simulateOtherRoundMatchesStep(min);
    }
  }

  simulateUserMatchMinute(min) {
    // 6% chance of event per minute
    if (Math.random() < 0.07) {
      const match = this.currentMatch;
      const fHome = match.forceHome;
      const fAway = match.forceAway;
      const homeBias = 1.08; // small home advantage

      const probHome = (fHome * homeBias) / (fHome * homeBias + fAway);
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
          
          if (attackingTeam.id === this.state.manager.teamId) {
            // User player injured. Auto-pause game to make sub
            window.pauseMatchSim();
            alert(`ATENÇÃO: Seu jogador ${injured.name} está lesionado e precisa ser substituído!`);
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
    const starters = team.squad.filter(p => p.isStarter);
    // Weight by position: ATA (5), MEI (3), LAT/ZAG (1)
    const weighted = [];
    starters.forEach(p => {
      let weight = 1;
      if (p.position === "ATA") weight = 6;
      else if (p.position === "MEI") weight = 3;
      else if (p.position === "LAT") weight = 1.5;
      
      // Skill bonus
      if (p.skills.includes("Finalização")) weight *= 1.5;
      if (p.skills.includes("Cabeceio")) weight *= 1.2;

      for (let i = 0; i < weight * 10; i++) {
        weighted.push(p);
      }
    });

    if (weighted.length === 0) return starters[0];
    return weighted[Math.floor(Math.random() * weighted.length)];
  }

  // Select player to assist
  selectAssister(team, scorer) {
    const starters = team.squad.filter(p => p.isStarter && p.id !== scorer.id);
    if (starters.length === 0) return null;
    if (Math.random() < 0.25) return null; // solo goal

    const weighted = [];
    starters.forEach(p => {
      let weight = 1;
      if (p.position === "MEI") weight = 5;
      else if (p.position === "LAT") weight = 3;
      else if (p.position === "ATA") weight = 2;

      if (p.skills.includes("Passe")) weight *= 1.5;
      if (p.skills.includes("Cruzamento")) weight *= 1.3;
      if (p.skills.includes("Armação")) weight *= 1.4;

      for (let i = 0; i < weight * 10; i++) {
        weighted.push(p);
      }
    });

    if (weighted.length === 0) return starters[0];
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

      if (currentMin === 10) {
        match.scoreHome = 0;
        match.scoreAway = 0;
        match.scorersHome = [];
        match.scorersAway = [];
      }

      const forceHome = this.calculateTeamForce(home);
      const forceAway = this.calculateTeamForce(away);

      // Simulates minor scoring events
      if (Math.random() < 0.05) {
        const total = forceHome + forceAway;
        if (Math.random() < (forceHome * 1.05) / total) {
          match.scoreHome++;
          const scorer = this.selectScorer(home);
          match.scorersHome.push({ name: scorer.name, min: currentMin });
        } else {
          match.scoreAway++;
          const scorer = this.selectScorer(away);
          match.scorersAway.push({ name: scorer.name, min: currentMin });
        }
      }

      if (currentMin === 90) {
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
    window.renderApp();
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
        home.budget += ticketIncome;

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
        home.budget += ticketIncome;

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
        champion.budget += prize;
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
          home.budget += ticketIncome;

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
          home.budget += ticketIncome;

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

          champion.budget += prize;
          
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
        home.budget += ticketIncome;

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
        champion.budget += prize;
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
          const winners = roundMatches.map(m => m.winnerId);
          sf.knockoutRounds[1][0].homeId = winners[0];
          sf.knockoutRounds[1][0].awayId = winners[1];
        } else {
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
            const fH = this.calculateTeamForce(h);
            const fA = this.calculateTeamForce(a);
            
            // Random scoring based on relative strength
            const total = fH + fA;
            const goalChance = 0.05 * 90; // avg goals per match
            
            let goalsH = 0;
            let goalsA = 0;
            
            for (let i = 0; i < 90; i++) {
              if (Math.random() < 0.035) {
                if (Math.random() < (fH * 1.05) / total) {
                  goalsH++;
                  m.scorersHome.push({ name: this.selectScorer(h).name, min: i });
                } else {
                  goalsA++;
                  m.scorersAway.push({ name: this.selectScorer(a).name, min: i });
                }
              }
            }

            m.scoreHome = goalsH;
            m.scoreAway = goalsA;
            m.simulated = true;

            // Apply points
            h.played++; a.played++;
            h.goalsFor += goalsH; h.goalsAgainst += goalsA;
            a.goalsFor += goalsA; a.goalsAgainst += goalsH;
            
            if (goalsH > goalsA) { h.wins++; h.points += 3; a.losses++; h.form.push("W"); a.form.push("L"); }
            else if (goalsH < goalsA) { a.wins++; a.points += 3; h.losses++; h.form.push("L"); a.form.push("W"); }
            else { h.draws++; a.draws++; h.points += 1; a.points += 1; h.form.push("D"); a.form.push("D"); }

            if (h.form.length > 5) h.form.shift();
            if (a.form.length > 5) a.form.shift();

            h.budget += this.calculateTicketIncome(h, goalsH, goalsA);
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
            
            const fH = this.calculateTeamForce(h);
            const fA = this.calculateTeamForce(a);
            
            let gH = 0; let gA = 0;
            for (let i = 0; i < 90; i++) {
              if (Math.random() < 0.035) {
                if (Math.random() < (fH * 1.05) / (fH + fA)) gH++; else gA++;
              }
            }
            m.scoreHome = gH; m.scoreAway = gA;
            
            if (gH === gA) {
              m.isPenalties = true;
              const pH = fH / (fH + fA);
              let pH_wins = Math.random() < pH;
              m.penHome = pH_wins ? 5 : 4;
              m.penAway = pH_wins ? 4 : 5;
              m.winnerId = pH_wins ? m.homeId : m.awayId;
            } else {
              m.winnerId = gH > gA ? m.homeId : m.awayId;
            }
            m.simulated = true;

            h.budget += this.calculateTicketIncome(h, gH, gA) * 1.2;
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
            cupWinner.budget += 15000000;
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

              const fH = this.calculateTeamForce(h);
              const fA = this.calculateTeamForce(a);
              
              let gH = 0; let gA = 0;
              for (let i = 0; i < 90; i++) {
                if (Math.random() < 0.035) {
                  if (Math.random() < (fH * 1.05) / (fH + fA)) gH++; else gA++;
                }
              }
              m.scoreHome = gH; m.scoreAway = gA;
              m.simulated = true;
              h.budget += this.calculateTicketIncome(h, gH, gA) * 1.5;
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

              const fH = this.calculateTeamForce(h);
              const fA = this.calculateTeamForce(a);

              let gH = 0; let gA = 0;
              for (let i = 0; i < 90; i++) {
                if (Math.random() < 0.035) {
                  if (Math.random() < (fH * 1.05) / (fH + fA)) gH++; else gA++;
                }
              }
              m.scoreHome = gH; m.scoreAway = gA;

              if (gH === gA) {
                m.isPenalties = true;
                const pH = fH / (fH + fA);
                let pH_wins = Math.random() < pH;
                m.penHome = pH_wins ? 5 : 4;
                m.penAway = pH_wins ? 4 : 5;
                m.winnerId = pH_wins ? m.homeId : m.awayId;
              } else {
                m.winnerId = gH > gA ? m.homeId : m.awayId;
              }
              m.simulated = true;
              h.budget += this.calculateTicketIncome(h, gH, gA) * 1.5;
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
              champion.budget += prize;
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

          const fH = this.calculateTeamForce(h);
          const fA = this.calculateTeamForce(a);

          let gH = 0; let gA = 0;
          for (let i = 0; i < 90; i++) {
            if (Math.random() < 0.035) {
              if (Math.random() < (fH * 1.05) / (fH + fA)) gH++; else gA++;
            }
          }
          m.scoreHome = gH; m.scoreAway = gA;

          if (gH === gA) {
            m.isPenalties = true;
            const pH = fH / (fH + fA);
            let pH_wins = Math.random() < pH;
            m.penHome = pH_wins ? 5 : 4;
            m.penAway = pH_wins ? 4 : 5;
            m.winnerId = pH_wins ? m.homeId : m.awayId;
          } else {
            m.winnerId = gH > gA ? m.homeId : m.awayId;
          }
          m.simulated = true;
          h.budget += this.calculateTicketIncome(h, gH, gA) * 2.0;
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
          champion.budget += 40000000;
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

            const fH = this.calculateTeamForce(h);
            const fA = this.calculateTeamForce(a);

            let gH = 0; let gA = 0;
            for (let i = 0; i < 90; i++) {
              if (Math.random() < 0.035) {
                if (Math.random() < (fH * 1.05) / (fH + fA)) gH++; else gA++;
              }
            }
            m.scoreHome = gH; m.scoreAway = gA;
            m.simulated = true;

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

            const fH = this.calculateTeamForce(h);
            const fA = this.calculateTeamForce(a);

            let gH = 0; let gA = 0;
            for (let i = 0; i < 90; i++) {
              if (Math.random() < 0.035) {
                if (Math.random() < (fH * 1.05) / (fH + fA)) gH++; else gA++;
              }
            }
            m.scoreHome = gH; m.scoreAway = gA;

            if (gH === gA) {
              m.isPenalties = true;
              const pH = fH / (fH + fA);
              let pH_wins = Math.random() < pH;
              m.penHome = pH_wins ? 5 : 4;
              m.penAway = pH_wins ? 4 : 5;
              m.winnerId = pH_wins ? m.homeId : m.awayId;
            } else {
              m.winnerId = gH > gA ? m.homeId : m.awayId;
            }
            m.simulated = true;

            this.applyConditionDecay(h);
            this.applyConditionDecay(a);
          });

          if (roundIdx === 0) {
            const winners = sf.knockoutRounds[0].map(m => m.winnerId);
            sf.knockoutRounds[1][0].homeId = winners[0];
            sf.knockoutRounds[1][0].awayId = winners[1];
          }
        }
      }
    }
  }

  applyRosterStatsFromMatch(team, scorers, isUserTeam) {
    // Add matches count
    team.squad.forEach(p => {
      if (p.isStarter) p.games++;
    });

    scorers.forEach(scorerData => {
      // Find player by name (dirty match)
      const cleanName = scorerData.name.replace(" (pên.)", "");
      const player = team.squad.find(p => p.name === cleanName);
      if (player) {
        player.goals++;
        player.morale = Math.min(100, player.morale + 10);
      }
    });
  }

  calculateTicketIncome(team, goalsF, goalsA) {
    // Basic capacity filling based on ticket price, loyalty, and team prestige
    const maxCapacity = team.stadiumCapacity;
    const rep = team.reputation;
    const price = team.ticketPrice;
    
    // Higher price reduces attendance factor
    const priceFactor = Math.max(0.1, 1 - (price / (20 + rep * 15)));
    
    // Base attendance factor
    let attendanceFactor = priceFactor * (team.fansLoyalty / 100);
    
    // Add randomness and variance based on team form
    let formBonus = 0;
    if (team.form.length > 0) {
      const wins = team.form.filter(f => f === "W").length;
      formBonus = (wins - 2) * 0.05;
    }
    attendanceFactor = clamp(attendanceFactor + formBonus + (Math.random() * 0.1 - 0.05), 0.2, 1.0);
    
    const audience = Math.round(maxCapacity * attendanceFactor);
    const revenue = audience * price;
    
    return revenue;
  }

  applyConditionDecay(team) {
    team.squad.forEach(p => {
      if (p.isStarter) {
        // Decrease condition by 10-18% depending on age and traits
        let decay = Math.round(10 + (p.age > 30 ? (p.age - 30) * 1.2 : 0) + (Math.random() * 5));
        if (p.skills.includes("Velocidade")) decay += 2;
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

    // Check if season is over
    // Season ends when all league rounds + cup final + continental final are finished.
    // That means week is at least totalLeagueRounds + 7 (approx week 46/47/48)
    const isSeasonOver = this.state.week >= totalLeagueRounds + 7;

    if (isSeasonOver) {
      this.resolveSeasonEnd();
    } else {
      this.state.week++;
      if (this.state.week === 46) {
        this.generateMundialFixtures();
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

    this.saveGame();
    window.renderApp();
  }

  processWeeklyFinances() {
    // Subtract wages for all teams
    for (const league of Object.values(this.state.database)) {
      league.teams.forEach(team => {
        let weeklyWages = 0;
        team.squad.forEach(p => {
          weeklyWages += p.salary;
        });

        // Weekly Sponsor income
        const sponsorIncome = team.sponsorIncome;

        // Interest on loans (1% per week)
        const loanInterest = team.loan * 0.01;

        team.budget = Math.round(team.budget - weeklyWages + sponsorIncome - loanInterest);
      });
    }

    // Notify user of their financial details
    const userTeam = this.findTeamById(this.state.manager.teamId);
    let userWages = 0;
    userTeam.squad.forEach(p => userWages += p.salary);
    this.addNews(
      "Finanças Semanais", 
      `Balanço do ${userTeam.name}: Patrocínio (+R$ ${userTeam.sponsorIncome.toLocaleString()}), Salários (-R$ ${userWages.toLocaleString()}). Saldo Atual: R$ ${userTeam.budget.toLocaleString()}`
    );
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
      userTeam.budget += offer.offerPrice;
      
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
    // Generate 15 unassigned players (free agents)
    const positions = ["GOL", "ZAG", "LAT", "MEI", "ATA"];
    const nationalities = ["Brazilian", "English", "Spanish", "Argentinian", "German", "French", "Italian", "Portuguese"];
    
    for (let i = 0; i < 20; i++) {
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
      champion.budget += 30000000;
      runnerUp.budget += 18000000;

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

          // Check for retirement (chance increases above age 33)
          let retires = false;
          if (p.age >= 34) {
            const chance = (p.age - 33) * 0.15; // 34: 15%, 35: 30%, etc.
            retires = Math.random() < chance;
          }

          if (retires) {
            this.addNews("Aposentadoria", `${p.name} (${p.position}, f:${p.rating}), jogador do ${team.name}, se aposentou do futebol aos ${p.age} anos.`);
          } else {
            activeSquad.push(p);
          }
        });

        team.squad = activeSquad;

        // Fill vacant rosters with youth academy players (base)
        while (team.squad.length < 18) {
          const positions = ["GOL", "ZAG", "LAT", "MEI", "ATA"];
          const pos = positions[Math.floor(Math.random() * positions.length)];
          const leagueRep = league.reputation;
          const rating = clamp(Math.round(45 + (leagueRep * 6) + (Math.random() * 10)), 45, 75);
          
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
      this.addNews("Promoção", `Parabéns! ${t.name} conquistou o acesso e vai disputar a Série A / Divisão Principal!`);
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
    // Accept instantly if bid >= 1.2 * value.
    // Probability based on value vs bid.
    const ratio = bidAmount / player.value;
    let accepted = false;

    if (ratio >= 1.2) {
      accepted = true;
    } else if (ratio >= 1.0) {
      accepted = Math.random() < 0.85;
    } else if (ratio >= 0.85) {
      accepted = Math.random() < 0.45;
    } else {
      accepted = Math.random() < 0.1;
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

    // Subtract transfer fee
    userTeam.budget -= bidAmount;
    if (ownerTeam) {
      ownerTeam.budget += bidAmount;
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
      userTeam.budget -= penaltyFee;
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

    if (this.state.youthAcademyTimer > 0) {
      alert(`Você precisa aguardar mais ${this.state.youthAcademyTimer} semanas para puxar outro jogador da base.`);
      return;
    }

    const cost = 2500000; // 2.5M training fee
    if (userTeam.budget < cost) {
      alert("Orçamento insuficiente! Você precisa de R$ 2.500.000 para recrutar da base.");
      return;
    }

    if (userTeam.squad.length >= 26) {
      alert("Seu elenco está cheio! O limite é de 26 jogadores.");
      return;
    }

    userTeam.budget -= cost;
    this.state.youthAcademyTimer = 8; // 8 weeks cooldown

    const positions = ["GOL", "ZAG", "LAT", "MEI", "ATA"];
    const pos = positions[Math.floor(Math.random() * positions.length)];
    const leagueRep = userLeague.reputation;
    const rating = clamp(Math.round(50 + (leagueRep * 6.5) + (Math.random() * 14 - 4)), 50, 85);
    const name = window.generatePlayerName(userLeague.nationality);
    
    const youthPlayer = {
      id: generateId(),
      name: name,
      position: pos,
      rating: rating,
      potential: Math.min(99, rating + Math.floor(Math.random() * 12) + 5),
      age: 17,
      nationality: userLeague.nationality,
      value: window.calculatePlayerValue(rating, 17, pos),
      salary: window.calculatePlayerSalary(rating, 17, 100000),
      goals: 0, games: 0, yellowCards: 0, redCards: 0,
      condition: 100, morale: 90,
      skills: window.generateTraits(pos),
      contract: 4
    };

    userTeam.squad.push(youthPlayer);
    this.addNews("Joia da Base", `${userTeam.name} promove ${name} (${pos}, f:${rating}) das categorias de base!`);
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
      userTeam.budget -= cost;
      userTeam.stadiumUpgrading = true;
      userTeam.stadiumUpgradeWeeks = weeks;
      userTeam.stadiumUpgradeCapacityIncrease = capacityIncrease;
      
      this.addNews("Obras no Estádio", `${userTeam.name} iniciou as obras para aumentar a capacidade do estádio em ${capacityIncrease.toLocaleString()} lugares.`);
      this.saveGame();
      window.renderApp();
    }
  }

  // Loans
  borrowMoney(amount) {
    const userTeam = this.findTeamById(this.state.manager.teamId);
    const maxLoan = Math.round(this.calculateTeamAssetValue(userTeam) * 0.5);

    if (userTeam.loan + amount > maxLoan) {
      alert(`Empréstimo negado! O banco permite um limite máximo de R$ ${maxLoan.toLocaleString()} em dívida.`);
      return;
    }

    userTeam.loan += amount;
    userTeam.budget += amount;
    this.addNews("Empréstimo", `${userTeam.name} pegou R$ ${amount.toLocaleString()} de empréstimo bancário.`);
    this.saveGame();
    window.renderApp();
  }

  repayLoan(amount) {
    const userTeam = this.findTeamById(this.state.manager.teamId);
    if (amount > userTeam.budget) {
      alert("Saldo insuficiente para pagar este valor.");
      return;
    }
    if (amount > userTeam.loan) {
      amount = userTeam.loan;
    }

    userTeam.loan -= amount;
    userTeam.budget -= amount;
    this.addNews("Pagamento", `${userTeam.name} quitou R$ ${amount.toLocaleString()} do seu empréstimo.`);
    this.saveGame();
    window.renderApp();
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

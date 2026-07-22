// app.js - UI Controller for Brasfoot Global

const game = new GameEngine();

// On Load, check if there's a saved game and toggle buttons
window.addEventListener("DOMContentLoaded", () => {
  const btnLoad = document.getElementById("btn-load-game");
  if (!game.hasSave()) {
    btnLoad.style.opacity = 0.5;
    btnLoad.disabled = true;
    btnLoad.title = "Nenhum jogo salvo encontrado";
  }
  
  // Populate starting leagues and teams in welcome screen
  populateWelcomeDropdowns();
});

// Populate welcome screen selectors
function populateWelcomeDropdowns() {
  const selectLeague = document.getElementById("select-league");
  selectLeague.innerHTML = "";
  
  window.LEAGUES_DATA.forEach(league => {
    const opt = document.createElement("option");
    opt.value = league.id;
    opt.textContent = `${league.name} (${league.country})`;
    selectLeague.appendChild(opt);
  });

  updateTeamDropdown();
}

function updateTeamDropdown() {
  const leagueId = document.getElementById("select-league").value;
  const selectTeam = document.getElementById("select-team");
  selectTeam.innerHTML = "";

  const league = window.LEAGUES_DATA.find(l => l.id === leagueId);
  if (league) {
    const isSecondDiv = league.id.endsWith("_b");
    league.teams.forEach((team, idx) => {
      const opt = document.createElement("option");
      // Use index or team name as ID. Let's match by generating the database first
      opt.value = team.name; // match team name
      const estRating = isSecondDiv 
        ? Math.round(38 + team.reputation * 4.5)
        : Math.round(55 + team.reputation * 7.5);
      opt.textContent = `${team.name} (Rep: ${"★".repeat(Math.round(team.reputation))} - f: ~${estRating})`;
      selectTeam.appendChild(opt);
    });
  }
}

// Start New Game Action
function handleStartNewGame(e) {
  e.preventDefault();
  const mgrName = document.getElementById("mgr-name").value.trim();
  const mgrNat = document.getElementById("mgr-nat").value;
  const teamName = document.getElementById("select-team").value;

  if (!mgrName) {
    alert("Por favor, digite seu nome.");
    return;
  }

  game.initNewGame(mgrName, mgrNat, teamName);
  
  if (game.state) {
    // Hide welcome, show app
    document.getElementById("welcome-screen").style.display = "none";
    document.getElementById("app-container").style.display = "flex";
    
    switchTab("dashboard");
    renderApp();
  } else {
    alert("Erro ao criar o jogo. Time não localizado.");
  }
}

// Load Game Action
function handleLoadGame() {
  if (game.loadGame()) {
    document.getElementById("welcome-screen").style.display = "none";
    document.getElementById("app-container").style.display = "flex";
    
    switchTab("dashboard");
    renderApp();
  } else {
    alert("Falha ao carregar o jogo salvo.");
  }
}

// Tab switcher
function getActiveUserTeam() {
  const weekInfo = game.getCurrentWeekMatchInfo();
  const isSelecoes = weekInfo && weekInfo.type && weekInfo.type.startsWith("selecoes") && weekInfo.match;
  if (isSelecoes) {
    return game.state.nationalTeams[weekInfo.userNatName];
  }
  return game.findTeamById(game.state.manager.teamId);
}

function switchTab(tabId) {
  game.activeTab = tabId;
  
  // Close mobile sidebar if open
  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    sidebar.classList.remove("active");
  }
  
  // Update sidebar active state
  document.querySelectorAll("#sidebar .nav-item").forEach(item => {
    item.classList.remove("active");
    if (item.getAttribute("data-tab") === tabId) {
      item.classList.add("active");
    }
  });

  renderApp();
}

// Main Rendering Router
function renderApp() {
  if (!game.state) return;

  // Check for pending job offers
  if (game.state.pendingJobOffers && game.state.pendingJobOffers.length > 0) {
    const modal = document.getElementById("modal-job-offers");
    if (modal && modal.style.display !== "flex") {
      setTimeout(() => {
        openJobOffersModal();
      }, 300);
    }
  }

  // 1. Render Header / Status information
  const userTeam = game.findTeamById(game.state.manager.teamId) || { name: "Sem Time", budget: 0, squad: [] };
  const weekInfo = game.getCurrentWeekMatchInfo() || { title: "Nenhum", match: null };

  document.getElementById("header-week-badge").innerHTML = `
    Temporada <span>${game.state.season}</span> | Semana <span>${game.state.week}</span> | Próximo: <span style="color: var(--accent-emerald)">${weekInfo.title}</span>
  `;

  // Render Sidebar manager card info
  let userWages = 0;
  if (userTeam.squad) {
    userTeam.squad.forEach(p => userWages += (p.salary || 0));
  }
  const isNational = game.state.nationalTeams && game.state.nationalTeams[userTeam.id] !== undefined;
  let userWagesHtml = `<div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">Salários: ${formatMoney(userWages)}/sem</div>`;
  if (isNational) {
    userWagesHtml = `<div style="font-size: 11px; color: var(--accent-gold); margin-top: 6px; font-weight:700;">Comando Técnico de Seleção</div>`;
  }
  document.getElementById("sidebar-manager-panel").innerHTML = `
    <div class="manager-name">${game.state.manager.name}</div>
    <div class="manager-team">${userTeam.name}</div>
    <div class="manager-balance" title="Saldo Financeiro">${formatMoney(userTeam.budget || 0)}</div>
    ${userWagesHtml}
  `;

  // 2. Render target Screen
  const renderer = document.getElementById("screen-renderer");
  renderer.innerHTML = "";

  switch (game.activeTab) {
    case "dashboard":
      renderDashboard(renderer);
      break;
    case "squad":
      renderSquad(renderer);
      break;
    case "tactics":
      renderTactics(renderer);
      break;
    case "tables":
      renderTables(renderer);
      break;
    case "market":
      renderMarket(renderer);
      break;
    case "stadium":
      renderStadium(renderer);
      break;
    case "news":
      renderNews(renderer);
      break;
    case "history":
      renderHistory(renderer);
      break;
  }

  // Check for pending player sales offers
  checkPendingOffers();
}

// Formatting utilities
function formatMoney(amount) {
  return "R$ " + amount.toLocaleString("pt-BR");
}

function createShieldHTML(colors, size = "20px") {
  const c1 = colors[0] || "#fff";
  const c2 = colors[1] || "#000";
  return `<span class="team-shield-icon" style="width: ${size}; height: ${size}; background: linear-gradient(135deg, ${c1} 50%, ${c2} 50%)"></span>`;
}

// Render Dashboard View
function renderDashboard(container) {
  const userTeam = getActiveUserTeam() || { name: "Jogador", colors: ["#777", "#333"], id: -1 };
  const clubTeam = game.findTeamById(game.state.manager.teamId) || { id: -1, name: "Sem Time", colors: ["#777", "#333"] };
  const matchInfo = game.getCurrentWeekMatchInfo();

  // Create layout wrapper
  const wrapper = document.createElement("div");
  wrapper.className = "grid-main-dashboard";
  
  // Left side widget
  let nextMatchHtml = "";
  if (matchInfo && matchInfo.match) {
    const isHome = matchInfo.match.homeId === userTeam.name || matchInfo.match.homeId === userTeam.id;
    const oppId = isHome ? matchInfo.match.awayId : matchInfo.match.homeId;
    const oppTeam = game.findTeamById(oppId) || { name: oppId || "A definir", colors: ["#777", "#333"] };

    nextMatchHtml = `
      <div class="dashboard-next-match">
        <h4 style="color: var(--text-muted); font-size:13px; text-transform: uppercase;">Próximo Confronto</h4>
        <div class="match-teams-vs">
          <div class="team-vs-display">
            <div class="shield-large" style="background: linear-gradient(135deg, ${(userTeam.colors || ['#777', '#333'])[0]} 50%, ${(userTeam.colors || ['#777', '#333'])[1]} 50%)"></div>
            <div class="team-name">${userTeam.name}</div>
          </div>
          <div class="vs-text">VS</div>
          <div class="team-vs-display">
            <div class="shield-large" style="background: linear-gradient(135deg, ${(oppTeam.colors || ['#777', '#333'])[0]} 50%, ${(oppTeam.colors || ['#777', '#333'])[1]} 50%)"></div>
            <div class="team-name">${oppTeam.name}</div>
          </div>
        </div>
        <p style="font-size:14px; color: var(--accent-cyan); font-weight:600;">${matchInfo.title}</p>
        <p style="font-size:12px; color: var(--text-muted); margin-top: 4px;">Jogando como: ${isHome ? 'Mandante' : 'Visitante'}</p>
      </div>
    `;
  } else {
    nextMatchHtml = `
      <div class="dashboard-next-match">
        <div style="font-size:40px; margin-bottom: 12px;">🏖️</div>
        <h4>Nenhum compromisso agendado</h4>
        <p style="font-size:13px; color:var(--text-muted); max-width: 250px; margin-top: 8px;">Aproveite para renegociar contratos ou expandir seu estádio!</p>
      </div>
    `;
  }

  // Mini table of user's league
  const leagueId = game.state.manager.leagueId || Object.keys(game.state.database)[0];
  const league = game.state.database[leagueId];
  const sortedTeams = [...league.teams].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));
  const userIdx = sortedTeams.findIndex(t => t.id === clubTeam.id);
  
  // Show 3 teams above and 3 below user team
  const start = userIdx >= 0 ? Math.max(0, Math.min(sortedTeams.length - 6, userIdx - 2)) : 0;
  const sliceTeams = sortedTeams.slice(start, start + 7);

  let standingsHtml = `
    <table class="premium-table" style="font-size:13px;">
      <thead>
        <tr>
          <th style="width: 30px;">#</th>
          <th>Time</th>
          <th style="text-align:right;">P</th>
          <th style="text-align:right;">SG</th>
        </tr>
      </thead>
      <tbody>
  `;

  sliceTeams.forEach(team => {
    const pos = sortedTeams.indexOf(team) + 1;
    const isUser = team.id === clubTeam.id;
    standingsHtml += `
      <tr style="${isUser ? 'background: rgba(16,185,129,0.1); font-weight: 700; color: var(--accent-emerald);' : ''}">
        <td>${pos}</td>
        <td>${createShieldHTML(team.colors, "14px")} ${team.name}</td>
        <td style="text-align:right;">${team.points}</td>
        <td style="text-align:right; color: ${team.goalsFor - team.goalsAgainst >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'}">
          ${team.goalsFor - team.goalsAgainst}
        </td>
      </tr>
    `;
  });
  standingsHtml += `</tbody></table>`;

  const goal = game.state.manager.seasonGoal || { title: "Evitar Rebaixamento", description: "A diretoria espera que você evite o rebaixamento da equipe.", minSafePosition: 16, targetPosition: 16 };
  const confidence = game.state.manager.boardConfidence !== undefined ? game.state.manager.boardConfidence : 80;
  
  let confidenceColor = "var(--accent-emerald)";
  let confidenceColorGlow = "rgba(16, 185, 129, 0.4)";
  if (confidence < 40) {
    confidenceColor = "var(--accent-rose)";
    confidenceColorGlow = "rgba(244, 63, 94, 0.4)";
  } else if (confidence < 65) {
    confidenceColor = "var(--accent-gold)";
    confidenceColorGlow = "rgba(234, 179, 8, 0.4)";
  }

  // Calculate current team overall
  const teamOverall = game.calculateTeamOverallRating(clubTeam);

  // Build left side widgets
  const leftCol = document.createElement("div");
  leftCol.style.display = "flex";
  leftCol.style.flexDirection = "column";
  leftCol.style.gap = "24px";

  leftCol.innerHTML = `
    <div class="glass-card" style="flex-grow: 1; min-height: 250px;">
      ${nextMatchHtml}
    </div>
    
    <div class="grid-2">
      <div class="glass-card" style="display:flex; flex-direction:column; justify-content:space-between; min-height:180px;">
        <div>
          <h3 class="card-title" style="margin-bottom:12px;">Situação Financeira</h3>
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div class="finance-metric">
              <span class="label">Balanço do Caixa</span>
              <span class="value ${clubTeam.budget >= 0 ? 'positive' : 'negative'}">${formatMoney(clubTeam.budget)}</span>
            </div>
            <div class="finance-metric">
              <span class="label">Empréstimos Bancários</span>
              <span class="value" style="color: #f59e0b;">${formatMoney(clubTeam.loan)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="glass-card" style="display:flex; flex-direction:column; gap:12px; min-height:180px;">
        <h3 class="card-title" style="margin-bottom:8px;">Metas & Carreira</h3>
        <div style="display:flex; flex-direction:column; gap:8px; font-size:13px;">
          <div>
            <span style="color:var(--text-muted); font-size:11px; text-transform:uppercase; font-weight:600; display:block;">Objetivo da Diretoria</span>
            <span style="font-weight:700; color:var(--accent-cyan); font-size:14px;">${goal.title}</span>
            <p style="color:var(--text-muted); font-size:12px; margin-top:2px; line-height:1.3;">${goal.description}</p>
          </div>
          <div>
            <span style="color:var(--text-muted); font-size:11px; text-transform:uppercase; font-weight:600; display:block;">Força do Elenco</span>
            <span style="font-weight:600;">Overall Geral: <span style="color:var(--accent-emerald);">${teamOverall}</span> <span style="color:var(--text-muted); font-weight:normal; font-size:12px;">(Rank: ${goal.overallRankAtStart || 'N/A'}º)</span></span>
          </div>
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span style="color:var(--text-muted); font-size:11px; text-transform:uppercase; font-weight:600;">Confiança do Conselho</span>
              <span style="font-weight:800; color:${confidenceColor};">${confidence}%</span>
            </div>
            <div style="width:100%; height:6px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden; border:1px solid var(--border-glow);">
              <div style="width:${confidence}%; height:100%; background:${confidenceColor}; box-shadow:0 0 8px ${confidenceColorGlow}; transition: width 0.5s ease;"></div>
            </div>
          </div>
          <div style="border-top:1px dashed var(--border-glow); padding-top:8px; margin-top:2px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span style="color:var(--text-muted); font-size:11px; text-transform:uppercase; font-weight:600;">No Clube Atual</span>
              <span style="font-size:11px; font-weight:700; color:var(--accent-cyan);">Aproveit.: ${(() => {
                const cStats = game.state.manager.currentClubStats || { wins: 0, draws: 0, losses: 0 };
                const cTotal = cStats.wins + cStats.draws + cStats.losses;
                return cTotal > 0 ? (((cStats.wins * 3 + cStats.draws) / (cTotal * 3)) * 100).toFixed(1) + "%" : "0.0%";
              })()}</span>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; text-align:center; font-size:11px; background:rgba(255,255,255,0.01); padding:6px; border-radius:6px; border:1px solid var(--border-glow); margin-bottom:6px;">
              <div><span style="color:var(--accent-emerald); font-weight:700;">${game.state.manager.currentClubStats ? game.state.manager.currentClubStats.wins : 0} Vit</span></div>
              <div><span style="color:var(--accent-gold); font-weight:700;">${game.state.manager.currentClubStats ? game.state.manager.currentClubStats.draws : 0} Emp</span></div>
              <div><span style="color:var(--accent-rose); font-weight:700;">${game.state.manager.currentClubStats ? game.state.manager.currentClubStats.losses : 0} Der</span></div>
            </div>
          </div>
          <div style="border-top:1px dashed var(--border-glow); padding-top:6px;">
            <span style="color:var(--text-muted); font-size:11px; text-transform:uppercase; font-weight:600; display:block; margin-bottom:4px;">Retrospecto da Carreira</span>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; text-align:center; font-size:11px; background:rgba(255,255,255,0.01); padding:6px; border-radius:6px; border:1px solid var(--border-glow);">
              <div><span style="color:var(--accent-emerald); font-weight:700;">${game.state.manager.stats ? game.state.manager.stats.wins : 0} Vit</span></div>
              <div><span style="color:var(--accent-gold); font-weight:700;">${game.state.manager.stats ? game.state.manager.stats.draws : 0} Emp</span></div>
              <div><span style="color:var(--accent-rose); font-weight:700;">${game.state.manager.stats ? game.state.manager.stats.losses : 0} Der</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="glass-card" style="grid-column: span 2;">
        <h3 class="card-title">Liga Atual</h3>
        ${standingsHtml}
      </div>
    </div>
  `;

  // Right side: News & Transfers widget
  const rightCol = document.createElement("div");
  rightCol.className = "glass-card";
  rightCol.style.display = "flex";
  rightCol.style.flexDirection = "column";
  rightCol.style.height = "100%";

  let newsHtml = "";
  game.state.news.forEach(item => {
    newsHtml += `
      <div class="news-item">
        <div class="news-meta">S${item.year} - W${item.week}</div>
        <div class="news-title">${item.title}</div>
        <div class="news-desc">${item.content}</div>
      </div>
    `;
  });

  if (game.state.news.length === 0) {
    newsHtml = `<div style="text-align:center; color:var(--text-muted); padding:30px;">Sem notícias relevantes no momento.</div>`;
  }

  rightCol.innerHTML = `
    <h3 class="card-title">Portal de Notícias</h3>
    <div class="news-list" style="flex-grow: 1;">
      ${newsHtml}
    </div>
  `;

  wrapper.appendChild(leftCol);
  wrapper.appendChild(rightCol);
  container.appendChild(wrapper);

  // If there is an offer pending from the computer, prompt it!
  if (game.state.pendingOffer) {
    showPendingOfferModal();
  }
}

// Render Squad (Elenco) View
function renderSquad(container) {
  const userTeam = getActiveUserTeam();
  const weekInfo = game.getCurrentWeekMatchInfo();
  const isSelecoes = weekInfo && weekInfo.type && weekInfo.type.startsWith("selecoes") && weekInfo.match;

  const card = document.createElement("div");
  card.className = "glass-card";

  let tbodyHtml = "";
  userTeam.squad.forEach(p => {
    const isListed = !isSelecoes && game.state.transferList.some(item => item.playerId === p.id);
    
    let actionsHtml = "";
    if (isSelecoes) {
      actionsHtml = `<span style="color:var(--text-muted); font-size:12px;">Convocado</span>`;
    } else {
      actionsHtml = `
        <div class="actions-cell">
          <button class="action-btn-sm btn-list ${isListed ? 'listed' : ''}" onclick="game.toggleTransferList('${p.id}')">
            ${isListed ? 'Vender: Sim' : 'Vender'}
          </button>
          <button class="action-btn-sm btn-renew" onclick="openContractRenewalModal('${p.id}')">Renovar</button>
          <button class="action-btn-sm btn-fire" onclick="game.firePlayer('${p.id}')">Rescindir</button>
        </div>
      `;
    }

    tbodyHtml += `
      <tr>
        <td>
          <span style="font-weight: 700;">${p.name}</span>
          <div class="traits-list">
            ${p.skills.map(s => `<span class="trait-badge">${s}</span>`).join("")}
          </div>
        </td>
        <td><span class="badge badge-position">${p.position}</span></td>
        <td>
          <span class="badge badge-rating">${p.rating}</span>
          <span style="font-size:10px; color:var(--text-muted); display:block; margin-top:2px; font-weight:600;">Pot: ${p.potential || p.rating}</span>
        </td>
        <td>${p.age} anos</td>
        <td>${formatMoney(p.value)}</td>
        <td>${formatMoney(p.salary)}/sem</td>
        <td>${p.condition}%</td>
        <td>${p.morale}</td>
        <td>${p.games} / ${p.goals}</td>
        <td>${p.contract} anos</td>
        <td>${actionsHtml}</td>
      </tr>
    `;
  });

  const pullBaseButton = isSelecoes ? "" : `
    <button class="btn-primary" style="width:auto; font-size:13px; padding: 6px 14px;" onclick="game.pullYouthAcademy()">
      Puxar Jogador da Base (R$ 2.500.000)
    </button>
  `;

  card.innerHTML = `
    <h3 class="card-title">
      Gerenciamento do Elenco ${isSelecoes ? `da Seleção (${userTeam.name})` : `(${userTeam.squad.length}/50 jogadores)`}
      ${pullBaseButton}
    </h3>
    <table class="premium-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Pos</th>
          <th>Força</th>
          <th>Idade</th>
          <th>Valor de Mercado</th>
          <th>Salário Semanal</th>
          <th>Cond.</th>
          <th>Mor.</th>
          <th>J / G</th>
          <th>Contrato</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${tbodyHtml}
      </tbody>
    </table>
  `;

  container.appendChild(card);
}

// Render Tactics (Tática) View
function renderTactics(container) {
  const userTeam = getActiveUserTeam();

  const wrapper = document.createElement("div");
  wrapper.className = "grid-tactics-layout";

  // Left column: Visual field
  const fieldCard = document.createElement("div");
  fieldCard.className = "glass-card";
  fieldCard.style.textAlign = "center";

  // Sort and assign starters to slots based on formation
  const starters = userTeam.squad.filter(p => p.isStarter);
  
  // Sort order: GOL first, then defenders, then midfielders, then attackers
  starters.sort((a, b) => {
    const order = { "GOL": 0, "LAT": 1, "ZAG": 2, "MEI": 3, "ATA": 4 };
    return order[a.position] - order[b.position];
  });

  let fieldNodesHtml = "";
  // Draw exactly 11 player nodes on the pitch
  for (let i = 0; i < 11; i++) {
    const player = starters[i];
    const name = player ? player.name.split(" ")[0] : "Vazio";
    const rating = player ? player.rating : "--";
    const pos = player ? player.position : "";
    const condition = player ? `${player.condition}%` : "";
    
    // Jersey colors
    const color = userTeam.colors[0] || "#fff";
    const border = userTeam.colors[1] || "#000";

    fieldNodesHtml += `
      <div class="field-player-node slot-${i}" onclick="openSwapSlotModal(${i})">
        <div class="field-player-shirt" style="background: ${color}; border-color: ${border}">
          ${player ? player.rating : ""}
          <span class="pos-overlay">${player ? player.position : 'ES'}</span>
        </div>
        <div class="field-player-name">${name}</div>
        <div class="field-player-rating" style="${player && player.condition < 60 ? 'color: var(--accent-rose);' : ''}">${player ? condition : 'Escalar'}</div>
      </div>
    `;
  }

  fieldCard.innerHTML = `
    <h3 class="card-title">Distribuição de Campo</h3>
    <div class="pitch-container" data-formation="${userTeam.formation || '4-4-2'}">
      <div class="pitch-center-circle"></div>
      <div class="pitch-mid-line"></div>
      <div class="pitch-penalty-box-top"></div>
      <div class="pitch-penalty-box-bottom"></div>
      ${fieldNodesHtml}
    </div>
  `;

  // Right column: Formations, mentalities, auto select, list of reserves
  const controlCard = document.createElement("div");
  controlCard.className = "glass-card";
  controlCard.style.display = "flex";
  controlCard.style.flexDirection = "column";
  controlCard.style.gap = "20px";

  // Bench list rendering
  let benchHtml = "";
  const nonStarters = userTeam.squad.filter(p => !p.isStarter).sort((a,b) => {
    if (a.isSub && !b.isSub) return -1;
    if (!a.isSub && b.isSub) return 1;
    return b.rating - a.rating;
  });

  nonStarters.forEach(p => {
    benchHtml += `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background: rgba(255,255,255,0.01); border: 1px solid var(--border-glow); border-radius:8px; margin-bottom: 6px;">
        <div>
          <span style="font-weight:600;">${p.name}</span>
          <span class="badge badge-position" style="margin-left:8px;">${p.position}</span>
          <span class="badge badge-rating" style="margin-left:4px;">${p.rating}</span>
        </div>
        <div>
          <button class="action-btn-sm" style="background:${p.isSub ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)'}" onclick="toggleBenchReserve('${p.id}')">
            ${p.isSub ? 'Banco' : 'Reserva'}
          </button>
        </div>
      </div>
    `;
  });

  controlCard.innerHTML = `
    <h3 class="card-title">Ajustes Táticos</h3>
    
    <div class="form-group">
      <label>Esquema Tático (Formação)</label>
      <select id="tactic-formation" class="form-control" onchange="handleFormationChange()">
        <option value="4-4-2" ${userTeam.formation === '4-4-2' ? 'selected' : ''}>4-4-2</option>
        <option value="4-3-3" ${userTeam.formation === '4-3-3' ? 'selected' : ''}>4-3-3</option>
        <option value="3-5-2" ${userTeam.formation === '3-5-2' ? 'selected' : ''}>3-5-2</option>
        <option value="3-4-3" ${userTeam.formation === '3-4-3' ? 'selected' : ''}>3-4-3</option>
        <option value="4-5-1" ${userTeam.formation === '4-5-1' ? 'selected' : ''}>4-5-1</option>
        <option value="5-3-2" ${userTeam.formation === '5-3-2' ? 'selected' : ''}>5-3-2</option>
        <option value="5-4-1" ${userTeam.formation === '5-4-1' ? 'selected' : ''}>5-4-1</option>
      </select>
    </div>

    <div class="form-group">
      <label>Postura Tática (Mentalidade)</label>
      <select id="tactic-mentality" class="form-control" onchange="handleMentalityChange()">
        <option value="defensive" ${userTeam.mentality === 'defensive' ? 'selected' : ''}>Defensiva</option>
        <option value="balanced" ${userTeam.mentality === 'balanced' ? 'selected' : ''}>Equilibrada</option>
        <option value="offensive" ${userTeam.mentality === 'offensive' ? 'selected' : ''}>Ofensiva</option>
        <option value="ultra-offensive" ${userTeam.mentality === 'ultra-offensive' ? 'selected' : ''}>Ultra-Ofensiva</option>
      </select>
    </div>

    <button class="btn-primary" style="margin-top: 10px;" onclick="handleAutoEscalar()">Auto-escalar Elenco</button>

    <div style="margin-top:20px; flex-grow:1; display:flex; flex-direction:column; overflow:hidden;">
      <label style="font-size:12px; font-weight:600; color:var(--text-muted); text-transform:uppercase; margin-bottom:8px;">Suplentes & Reservas</label>
      <div style="overflow-y:auto; flex-grow:1; max-height:280px; padding-right:4px;">
        ${benchHtml}
      </div>
    </div>
  `;

  wrapper.appendChild(fieldCard);
  wrapper.appendChild(controlCard);
  container.appendChild(wrapper);
}

// Tactical Changes handlers
function handleFormationChange() {
  const userTeam = getActiveUserTeam();
  userTeam.formation = document.getElementById("tactic-formation").value;
  // Auto escalation to match new formation slots
  game.autoSelectLineup(userTeam, userTeam.formation);
  game.saveGame();
  renderApp();
}

function handleMentalityChange() {
  const userTeam = getActiveUserTeam();
  userTeam.mentality = document.getElementById("tactic-mentality").value;
  game.saveGame();
}

function handleAutoEscalar() {
  const userTeam = getActiveUserTeam();
  game.autoSelectLineup(userTeam, userTeam.formation);
  game.saveGame();
  renderApp();
}

// Toggle whether a non-starting player sits on the bench (sub) or is just reserve
function toggleBenchReserve(playerId) {
  const userTeam = getActiveUserTeam();
  const player = userTeam.squad.find(p => p.id === playerId);
  if (!player) return;

  const currentBenchCount = userTeam.squad.filter(p => p.isSub).length;

  if (!player.isSub && currentBenchCount >= 7) {
    alert("O banco de reservas já está cheio! Máximo 7 suplentes.");
    return;
  }

  player.isSub = !player.isSub;
  game.saveGame();
  renderApp();
}

// Open slot swap modal
// Mobile menu toggle for responsive layout
function toggleMobileMenu() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('active');
}
let activeSwapStarterIdx = null;

function openSwapSlotModal(starterIdx) {
  activeSwapStarterIdx = starterIdx;
  
  const userTeam = getActiveUserTeam();
  const starters = userTeam.squad.filter(p => p.isStarter);
  
  // Sort starters to match slots
  starters.sort((a, b) => {
    const order = { "GOL": 0, "LAT": 1, "ZAG": 2, "MEI": 3, "ATA": 4 };
    return order[a.position] - order[b.position];
  });

  const activeStarter = starters[starterIdx];

  // List all other players who can be subbed in (reserves & bench)
  const availableList = userTeam.squad.filter(p => !p.isStarter).sort((a,b) => b.rating - a.rating);

  const modalList = document.getElementById("modal-select-player-list");
  modalList.innerHTML = "";

  if (availableList.length === 0) {
    modalList.innerHTML = `<div style="text-align:center; padding: 20px; color:var(--text-muted);">Nenhum reserva disponível.</div>`;
  }

  availableList.forEach(p => {
    const row = document.createElement("div");
    row.className = "bench-player-row";
    row.style.marginBottom = "8px";
    row.onclick = () => confirmSwapPlayer(p.id);

    row.innerHTML = `
      <div>
        <span style="font-weight:700;">${p.name}</span>
        <span class="badge badge-position" style="margin-left:8px;">${p.position}</span>
        <span class="badge badge-rating" style="margin-left:4px;">${p.rating}</span>
        <span style="font-size:12px; color:var(--text-muted); margin-left:12px;">Cond: ${p.condition}%</span>
      </div>
      <div style="font-size:11px; color:var(--text-muted); font-weight:600;">
        ${p.isSub ? 'BANCO' : 'RESERVA'}
      </div>
    `;
    modalList.appendChild(row);
  });

  openModal("modal-select-player");
}

function confirmSwapPlayer(newStarterId) {
  const userTeam = getActiveUserTeam();
  const starters = userTeam.squad.filter(p => p.isStarter);
  
  starters.sort((a, b) => {
    const order = { "GOL": 0, "LAT": 1, "ZAG": 2, "MEI": 3, "ATA": 4 };
    return order[a.position] - order[b.position];
  });

  const oldStarter = starters[activeSwapStarterIdx];
  const newStarter = userTeam.squad.find(p => p.id === newStarterId);

  if (newStarter) {
    if (oldStarter) {
      oldStarter.isStarter = false;
      oldStarter.isSub = newStarter.isSub; // old starter goes to bench if new was on bench
    }
    
    newStarter.isStarter = true;
    newStarter.isSub = false;

    game.saveGame();
    closeModal("modal-select-player");
    renderApp();
  }
}

// Render Tables & Standings (Classificação) View
function renderTables(container) {
  container.innerHTML = "";
  if (typeof window.showAllTables === "undefined") {
    window.showAllTables = false;
  }

  // Dropdown to choose league table
  const bar = document.createElement("div");
  bar.style.display = "flex";
  bar.style.justifyContent = "space-between";
  bar.style.alignItems = "center";
  bar.style.marginBottom = "20px";

  const userTeamId = game.state.manager.teamId;
  const isNational = game.state.nationalTeams && game.state.nationalTeams[userTeamId] !== undefined;

  let userComps = [];
  if (isNational) {
    userComps.push({ value: "selecoes", label: "Copa de Seleções" });
  } else {
    // 1. User League
    const userLeagueId = game.state.manager.leagueId;
    const leagueName = game.state.database[userLeagueId]?.name || "Liga";
    userComps.push({ value: `league_${userLeagueId}`, label: leagueName });

    // 2. User Cup
    const userTeam = game.findTeamById(userTeamId);
    if (userTeam) {
      const userLeague = game.findLeagueByTeamId(userTeamId);
      if (userLeague && userLeague.country) {
        userComps.push({ value: `cup_${userLeague.country}`, label: `Copa Nacional (${userLeague.country.toUpperCase()})` });
      }
    }

    // 3. Continental Cups
    ["champions", "libertadores", "sudamericana"].forEach(compKey => {
      const comp = game.state.continentalFixtures[compKey];
      if (comp && comp.teams && comp.teams.includes(userTeamId)) {
        const compNames = { champions: "UEFA Champions League", libertadores: "Copa Libertadores", sudamericana: "Copa Sudamericana" };
        userComps.push({ value: `continental_${compKey}`, label: compNames[compKey] });
      }
    });

    // 4. Mundial de Clubes
    const mundial = game.state.mundialFixtures;
    if (mundial && mundial.teams && mundial.teams.includes(userTeamId)) {
      userComps.push({ value: "mundial", label: "Mundial de Clubes da FIFA" });
    }
  }

  let selectHtml = `<select id="table-select-league" class="form-control" style="width: auto;" onchange="renderStandingsTable()">`;
  
  if (!window.showAllTables) {
    // Show only user competitions
    userComps.forEach((comp, idx) => {
      selectHtml += `<option value="${comp.value}" ${idx === 0 ? 'selected' : ''}>${comp.label}</option>`;
    });
  } else {
    // Show all competitions
    selectHtml += `<optgroup label="Ligas Nacionais">`;
    for (const [leagueId, league] of Object.entries(game.state.database)) {
      const isUser = leagueId === game.state.manager.leagueId;
      selectHtml += `<option value="league_${leagueId}" ${isUser ? 'selected' : ''}>${league.name}</option>`;
    }
    selectHtml += `</optgroup>`;

    selectHtml += `<optgroup label="Copas Nacionais">`;
    for (const country of Object.keys(game.state.cupFixtures || {})) {
      selectHtml += `<option value="cup_${country}">Copa Nacional (${country})</option>`;
    }
    selectHtml += `</optgroup>`;

    selectHtml += `<optgroup label="Copas Continentais">`;
    selectHtml += `<option value="continental_champions">UEFA Champions League</option>`;
    selectHtml += `<option value="continental_libertadores">Copa Libertadores</option>`;
    selectHtml += `<option value="continental_sudamericana">Copa Sudamericana</option>`;
    selectHtml += `</optgroup>`;

    selectHtml += `<optgroup label="Torneios de Elite & Seleções">`;
    selectHtml += `<option value="mundial">Mundial de Clubes da FIFA</option>`;
    selectHtml += `<option value="selecoes">Copa de Seleções</option>`;
    selectHtml += `</optgroup>`;
  }
  selectHtml += `</select>`;

  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.alignItems = "center";
  
  const selectWrapper = document.createElement("div");
  selectWrapper.innerHTML = selectHtml;
  controls.appendChild(selectWrapper.firstChild);

  const toggleBtnText = window.showAllTables ? "Ver Minhas Competições" : "Ver Outras Competições";
  const toggleBtn = document.createElement("button");
  toggleBtn.className = "btn-secondary";
  toggleBtn.style.marginLeft = "12px";
  toggleBtn.style.padding = "8px 16px";
  toggleBtn.style.fontSize = "13px";
  toggleBtn.style.width = "auto";
  toggleBtn.textContent = toggleBtnText;
  toggleBtn.onclick = () => {
    window.showAllTables = !window.showAllTables;
    renderTables(container);
  };
  controls.appendChild(toggleBtn);

  const title = document.createElement("h3");
  title.style.fontSize = "20px";
  title.style.fontWeight = "700";
  title.style.margin = "0";
  title.textContent = "Tabela de Classificação";

  bar.appendChild(title);
  bar.appendChild(controls);
  container.appendChild(bar);

  // Table wrapper card
  const tableCard = document.createElement("div");
  tableCard.className = "glass-card";
  tableCard.id = "standings-table-card";
  container.appendChild(tableCard);

  // Initial draw
  renderStandingsTable();
}

function renderStandingsTable() {
  const selectedVal = document.getElementById("table-select-league").value;
  const card = document.getElementById("standings-table-card");
  card.innerHTML = "";
  card.style.display = "block";
  card.style.padding = "24px";

  if (selectedVal.startsWith("league_")) {
    renderLeagueStandings(selectedVal.replace("league_", ""), card);
  } else if (selectedVal.startsWith("cup_")) {
    renderCupStandings(selectedVal.replace("cup_", ""), card);
  } else if (selectedVal.startsWith("continental_")) {
    renderContinentalStandings(selectedVal.replace("continental_", ""), card);
  } else if (selectedVal === "mundial") {
    renderMundialStandings(card);
  } else if (selectedVal === "selecoes") {
    renderSelecoesStandings(card);
  }
}

function renderLeagueStandings(leagueId, card) {
  const league = game.state.database[leagueId];
  if (!league) return;

  const userTeam = game.findTeamById(game.state.manager.teamId);
  const teams = [...league.teams].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor);

  let tbodyHtml = "";
  teams.forEach((t, idx) => {
    const pos = idx + 1;
    const isUser = t.id === userTeam.id;
    const gd = t.goalsFor - t.goalsAgainst;
    
    let posBg = "transparent";
    if (pos <= 4) posBg = "rgba(16, 185, 129, 0.08)";
    else if (pos > teams.length - 4) posBg = "rgba(244, 63, 94, 0.08)";

    tbodyHtml += `
      <tr style="background: ${isUser ? 'rgba(16,185,129,0.15) !important' : posBg}">
        <td style="font-weight: 700; width: 40px; color:${isUser ? 'var(--accent-emerald)' : 'var(--text-muted)'}">${pos}</td>
        <td style="${isUser ? 'font-weight:700; color:var(--accent-emerald);' : ''}">
          ${createShieldHTML(t.colors, "14px")} ${t.name}
        </td>
        <td style="text-align:right;">${t.played}</td>
        <td style="text-align:right;">${t.wins}</td>
        <td style="text-align:right;">${t.draws}</td>
        <td style="text-align:right;">${t.losses}</td>
        <td style="text-align:right;">${t.goalsFor}</td>
        <td style="text-align:right;">${t.goalsAgainst}</td>
        <td style="text-align:right; font-weight:600; color: ${gd >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'}">${gd >= 0 ? '+' : ''}${gd}</td>
        <td style="text-align:right; font-weight:800; font-size:15px; color:${isUser ? 'var(--accent-emerald)' : 'var(--text-main)'}">${t.points}</td>
        <td style="text-align:center;">
          <div style="display:flex; gap:3px; justify-content:center;">
            ${t.form.map(f => {
              const bg = f === 'W' ? 'var(--accent-emerald)' : (f === 'D' ? 'var(--text-muted)' : 'var(--accent-rose)');
              return `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${bg};" title="${f}"></span>`;
            }).join("")}
          </div>
        </td>
      </tr>
    `;
  });

  const scorersList = [];
  league.teams.forEach(team => {
    team.squad.forEach(p => {
      if (p.goals > 0) scorersList.push({ player: p, team: team });
    });
  });
  scorersList.sort((a, b) => b.player.goals - a.player.goals);

  let scorersHtml = "";
  scorersList.slice(0, 10).forEach((item, idx) => {
    scorersHtml += `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; border-bottom:1px solid rgba(255,255,255,0.02); font-size:13px;">
        <div>
          <span style="color:var(--text-muted); font-weight:600; margin-right:8px;">${idx+1}.</span>
          <span style="font-weight:700;">${item.player.name}</span>
          <span style="font-size:11px; color:var(--text-muted); margin-left:6px;">(${item.player.position}, f:${item.player.rating})</span>
          <div style="font-size:11px; color:var(--accent-cyan); margin-top:2px;">${item.team.name}</div>
        </div>
        <span style="font-size:16px; font-weight:800; color:var(--accent-gold);">${item.player.goals} ⚽</span>
      </div>
    `;
  });

  if (scorersList.length === 0) {
    scorersHtml = `<div style="text-align:center; padding:30px; color:var(--text-muted); font-size:13px;">Nenhum gol marcado nesta liga ainda.</div>`;
  }

  card.className = "grid-tables-layout";

  card.innerHTML = `
    <div>
      <table class="premium-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Equipe</th>
            <th style="text-align:right;">J</th>
            <th style="text-align:right;">V</th>
            <th style="text-align:right;">E</th>
            <th style="text-align:right;">D</th>
            <th style="text-align:right;">GP</th>
            <th style="text-align:right;">GC</th>
            <th style="text-align:right;">SG</th>
            <th style="text-align:right;">Pts</th>
            <th style="text-align:center;">Forma</th>
          </tr>
        </thead>
        <tbody>
          ${tbodyHtml}
        </tbody>
      </table>
    </div>
    
    <div style="border-left: 1px solid var(--border-glow); padding-left:24px;">
      <h4 style="font-size:15px; font-weight:700; margin-bottom:16px; text-transform:uppercase; color:var(--text-muted);">Artilharia da Liga</h4>
      <div>
        ${scorersHtml}
      </div>
    </div>
  `;
}

function renderCupStandings(country, card) {
  const cup = game.state.cupFixtures[country];
  if (!cup) {
    card.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">Copa não disponível.</div>`;
    return;
  }

  let roundsTabsHtml = "";
  const roundNames = ["Fase de 32", "Oitavas de Final", "Quartas de Final", "Semifinal", "Grande Final"];
  
  let activeRoundIdx = cup.rounds.findIndex(r => r.some(m => !m.simulated));
  if (activeRoundIdx === -1) activeRoundIdx = cup.rounds.length - 1;

  let roundsMatchesHtml = "";
  cup.rounds.forEach((round, rIdx) => {
    let matchesHtml = "";
    round.forEach(m => {
      const home = game.findTeamById(m.homeId) || { name: "A definir", colors: ["#777", "#333"] };
      const away = game.findTeamById(m.awayId) || { name: "A definir", colors: ["#777", "#333"] };
      
      const scoreText = m.simulated 
        ? `${m.scoreHome} ${m.isPenalties ? `(${m.penHome})` : ''} - ${m.scoreAway} ${m.isPenalties ? `(${m.penAway})` : ''}` 
        : "VS";
        
      const isWinnerHome = m.winnerId && m.winnerId === m.homeId;
      const isWinnerAway = m.winnerId && m.winnerId === m.awayId;

      matchesHtml += `
        <div class="cup-match-row" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.02); font-size:13px;">
          <div style="flex:1; text-align:right; font-weight: ${isWinnerHome ? '700' : 'normal'}; color: ${isWinnerHome ? 'var(--accent-emerald)' : 'inherit'};">
            ${home.name} ${createShieldHTML(home.colors, "12px")}
          </div>
          <div style="width:100px; text-align:center; font-weight:700; background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:4px; margin:0 12px; color:var(--accent-cyan);">
            ${scoreText}
          </div>
          <div style="flex:1; text-align:left; font-weight: ${isWinnerAway ? '700' : 'normal'}; color: ${isWinnerAway ? 'var(--accent-emerald)' : 'inherit'};">
            ${createShieldHTML(away.colors, "12px")} ${away.name}
          </div>
        </div>
      `;
    });

    roundsMatchesHtml += `
      <div class="cup-round-section" id="cup-round-${rIdx}" style="display: ${rIdx === activeRoundIdx ? 'block' : 'none'};">
        <h4 style="color:var(--text-muted); font-size:14px; text-transform:uppercase; margin-bottom:16px; font-weight:700;">Partidas - ${roundNames[rIdx]}</h4>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${matchesHtml}
        </div>
      </div>
    `;

    roundsTabsHtml += `
      <button class="tab-btn ${rIdx === activeRoundIdx ? 'active' : ''}" style="padding: 6px 12px; font-size: 12px; border-radius: 4px; border: 1px solid var(--border-glow); background: ${rIdx === activeRoundIdx ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)'}; color: ${rIdx === activeRoundIdx ? '#000' : 'var(--text-main)'}; cursor:pointer;" onclick="switchCupRoundTab(${rIdx})">
        ${roundNames[rIdx]}
      </button>
    `;
  });

  card.innerHTML = `
    <div style="display:flex; gap:10px; margin-bottom:20px; overflow-x:auto; padding-bottom:6px;">
      ${roundsTabsHtml}
    </div>
    <div>
      ${roundsMatchesHtml}
    </div>
  `;

  window.switchCupRoundTab = (rIdx) => {
    document.querySelectorAll(".cup-round-section").forEach(sec => sec.style.display = "none");
    document.getElementById(`cup-round-${rIdx}`).style.display = "block";
    
    const btns = card.querySelectorAll(".tab-btn");
    btns.forEach((btn, idx) => {
      if (idx === rIdx) {
        btn.style.background = "var(--accent-cyan)";
        btn.style.color = "#000";
      } else {
        btn.style.background = "rgba(255,255,255,0.05)";
        btn.style.color = "var(--text-main)";
      }
    });
  };
}

function renderContinentalStandings(compKey, card) {
  const comp = game.state.continentalFixtures[compKey];
  if (!comp) {
    card.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">Competição não disponível.</div>`;
    return;
  }

  const groupStandings = comp.groups.map((group, groupIdx) => {
    const stats = group.map(teamId => {
      const t = game.findTeamById(teamId) || { name: "A definir", colors: ["#777", "#333"] };
      return { id: teamId, name: t.name, colors: t.colors, pts: 0, gf: 0, ga: 0, played: 0, wins: 0, draws: 0, losses: 0 };
    });

    comp.groupFixtures.forEach(round => {
      round.forEach(m => {
        if (m.groupIdx !== groupIdx) return;
        const h = stats.find(s => s.id === m.homeId);
        const a = stats.find(s => s.id === m.awayId);
        if (!h || !a) return;

        if (m.simulated) {
          h.played++; a.played++;
          h.gf += m.scoreHome; h.ga += m.scoreAway;
          a.gf += m.scoreAway; a.ga += m.scoreHome;

          if (m.scoreHome > m.scoreAway) { h.pts += 3; h.wins++; a.losses++; }
          else if (m.scoreHome < m.scoreAway) { a.pts += 3; a.wins++; h.losses++; }
          else { h.pts += 1; a.pts += 1; h.draws++; a.draws++; }
        }
      });
    });

    stats.sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
    return stats;
  });

  let groupsHtml = `<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:20px;">`;
  groupStandings.forEach((gStand, gIdx) => {
    const letter = String.fromCharCode(65 + gIdx);
    let rowsHtml = "";
    gStand.forEach((team, tIdx) => {
      rowsHtml += `
        <tr style="font-size:12px;">
          <td>${tIdx+1}</td>
          <td style="font-weight:600;">${createShieldHTML(team.colors, "12px")} ${team.name}</td>
          <td style="text-align:right;">${team.played}</td>
          <td style="text-align:right; font-weight:700;">${team.pts}</td>
          <td style="text-align:right;">${team.gf - team.ga}</td>
        </tr>
      `;
    });

    groupsHtml += `
      <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border-glow); border-radius:8px; padding:12px;">
        <h4 style="color:var(--accent-cyan); font-size:13px; text-transform:uppercase; margin-bottom:8px; font-weight:700;">Grupo ${letter}</h4>
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="font-size:11px; color:var(--text-muted); border-bottom:1px solid rgba(255,255,255,0.05); text-align:left;">
              <th style="padding:4px 0;">#</th>
              <th>Time</th>
              <th style="text-align:right;">J</th>
              <th style="text-align:right;">P</th>
              <th style="text-align:right;">SG</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  });
  groupsHtml += `</div>`;

  let knockoutHtml = "";
  if (!comp.knockoutRounds || comp.knockoutRounds.length === 0) {
    knockoutHtml = `<div style="text-align:center; padding:40px; color:var(--text-muted);">A fase eliminatória começará após o fim da fase de grupos.</div>`;
  } else {
    const clStages = ["Oitavas de Final", "Quartas de Final", "Semifinal", "Grande Final"];
    const libStages = ["Quartas de Final", "Semifinal", "Grande Final"];
    const stages = compKey === "champions" ? clStages : libStages;

    let knockRoundsHtml = "";
    comp.knockoutRounds.forEach((round, rIdx) => {
      let matchesHtml = "";
      round.forEach(m => {
        const home = game.findTeamById(m.homeId) || { name: "A definir", colors: ["#777", "#333"] };
        const away = game.findTeamById(m.awayId) || { name: "A definir", colors: ["#777", "#333"] };
        
        const scoreText = m.simulated 
          ? `${m.scoreHome} ${m.isPenalties ? `(${m.penHome})` : ''} - ${m.scoreAway} ${m.isPenalties ? `(${m.penAway})` : ''}` 
          : (m.homeId && m.awayId ? "VS" : "-");

        const isWinnerHome = m.winnerId && m.winnerId === m.homeId;
        const isWinnerAway = m.winnerId && m.winnerId === m.awayId;

        matchesHtml += `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-bottom:1px solid rgba(255,255,255,0.01); font-size:12px;">
            <div style="flex:1; text-align:right; font-weight: ${isWinnerHome ? '700' : 'normal'}; color: ${isWinnerHome ? 'var(--accent-emerald)' : 'inherit'};">
              ${home.name} ${createShieldHTML(home.colors, "10px")}
            </div>
            <div style="width:80px; text-align:center; font-weight:700; background:rgba(255,255,255,0.03); padding:2px 6px; border-radius:4px; margin:0 8px; color:var(--accent-gold);">
              ${scoreText}
            </div>
            <div style="flex:1; text-align:left; font-weight: ${isWinnerAway ? '700' : 'normal'}; color: ${isWinnerAway ? 'var(--accent-emerald)' : 'inherit'};">
              ${createShieldHTML(away.colors, "10px")} ${away.name}
            </div>
          </div>
        `;
      });

      knockRoundsHtml += `
        <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border-glow); border-radius:8px; padding:12px; margin-bottom:15px;">
          <h4 style="color:var(--accent-gold); font-size:13px; text-transform:uppercase; margin-bottom:8px; font-weight:700;">${stages[rIdx] || `Fase ${rIdx}`}</h4>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${matchesHtml}
          </div>
        </div>
      `;
    });

    knockoutHtml = `<div style="display:flex; flex-direction:column; gap:10px;">${knockRoundsHtml}</div>`;
  }

  const activeTab = comp.currentStage || "group";

  card.innerHTML = `
    <div style="display:flex; gap:10px; margin-bottom:20px;">
      <button class="tab-btn" style="padding: 6px 16px; font-size: 13px; border-radius: 4px; border: 1px solid var(--border-glow); background: ${activeTab === 'group' ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)'}; color: ${activeTab === 'group' ? '#000' : 'var(--text-main)'}; cursor:pointer;" onclick="switchContinentalTab('group')">
        Fase de Grupos
      </button>
      <button class="tab-btn" style="padding: 6px 16px; font-size: 13px; border-radius: 4px; border: 1px solid var(--border-glow); background: ${activeTab === 'knockout' ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)'}; color: ${activeTab === 'knockout' ? '#000' : 'var(--text-main)'}; cursor:pointer;" onclick="switchContinentalTab('knockout')">
        Fase Eliminatória (Playoffs)
      </button>
    </div>
    
    <div id="continental-groups-view" style="display: ${activeTab === 'group' ? 'block' : 'none'};">
      ${groupsHtml}
    </div>
    
    <div id="continental-knockout-view" style="display: ${activeTab === 'knockout' ? 'block' : 'none'};">
      ${knockoutHtml}
    </div>
  `;

  window.switchContinentalTab = (stage) => {
    document.getElementById("continental-groups-view").style.display = stage === "group" ? "block" : "none";
    document.getElementById("continental-knockout-view").style.display = stage === "knockout" ? "block" : "none";
    
    const btns = card.querySelectorAll(".tab-btn");
    btns[0].style.background = stage === "group" ? "var(--accent-cyan)" : "rgba(255,255,255,0.05)";
    btns[0].style.color = stage === "group" ? "#000" : "var(--text-main)";
    btns[1].style.background = stage === "knockout" ? "var(--accent-cyan)" : "rgba(255,255,255,0.05)";
    btns[1].style.color = stage === "knockout" ? "#000" : "var(--text-main)";
  };
}

function renderMundialStandings(card) {
  const mundial = game.state.mundialFixtures;
  if (!mundial || !mundial.rounds || mundial.rounds.length === 0) {
    card.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">O Mundial de Clubes acontecerá nas semanas 46 e 47 com os campeões continentais.</div>`;
    return;
  }

  let html = `<div><h3 style="color:var(--accent-gold); font-size:16px; margin-bottom:20px; text-transform:uppercase; font-weight:700;">Chaveamento do Mundial de Clubes</h3>`;

  mundial.rounds.forEach((round, rIdx) => {
    const roundName = rIdx === 0 ? "Semifinais" : "Grande Final";
    let matchesHtml = "";
    round.forEach(m => {
      const home = game.findTeamById(m.homeId) || { name: "A definir", colors: ["#777", "#333"] };
      const away = game.findTeamById(m.awayId) || { name: "A definir", colors: ["#777", "#333"] };
      
      const scoreText = m.simulated 
        ? `${m.scoreHome} ${m.isPenalties ? `(${m.penHome})` : ''} - ${m.scoreAway} ${m.isPenalties ? `(${m.penAway})` : ''}` 
        : "VS";

      const isWinnerHome = m.winnerId && m.winnerId === m.homeId;
      const isWinnerAway = m.winnerId && m.winnerId === m.awayId;

      matchesHtml += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.02); font-size:13px;">
          <div style="flex:1; text-align:right; font-weight: ${isWinnerHome ? '700' : 'normal'}; color: ${isWinnerHome ? 'var(--accent-emerald)' : 'inherit'};">
            ${home.name} ${createShieldHTML(home.colors, "12px")}
          </div>
          <div style="width:100px; text-align:center; font-weight:700; background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:4px; margin:0 12px; color:var(--accent-gold);">
            ${scoreText}
          </div>
          <div style="flex:1; text-align:left; font-weight: ${isWinnerAway ? '700' : 'normal'}; color: ${isWinnerAway ? 'var(--accent-emerald)' : 'inherit'};">
            ${createShieldHTML(away.colors, "12px")} ${away.name}
          </div>
        </div>
      `;
    });

    html += `
      <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border-glow); border-radius:8px; padding:16px; margin-bottom:20px;">
        <h4 style="color:var(--text-muted); font-size:14px; text-transform:uppercase; margin-bottom:12px; font-weight:700;">${roundName}</h4>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${matchesHtml}
        </div>
      </div>
    `;
  });

  html += `</div>`;
  card.innerHTML = html;
}

function renderSelecoesStandings(card) {
  const sf = game.state.selecoesFixtures;
  if (!sf) {
    card.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">A Copa de Seleções acontecerá nas semanas 48 a 54 com as principais seleções.</div>`;
    return;
  }

  const groupStandings = sf.groups.map((group, groupIdx) => {
    const stats = group.map(name => {
      const nt = game.state.nationalTeams[name];
      return { name: name, flag: nt.flag, colors: nt.colors, pts: nt.points, gf: nt.goalsFor, ga: nt.goalsAgainst, played: nt.played, wins: nt.wins, draws: nt.draws, losses: nt.losses };
    });

    stats.sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
    return stats;
  });

  let groupsHtml = `<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:20px; margin-bottom:24px;">`;
  groupStandings.forEach((gStand, gIdx) => {
    const groupLetter = String.fromCharCode(65 + gIdx);
    let rowsHtml = "";
    gStand.forEach((team, tIdx) => {
      rowsHtml += `
        <tr style="font-size:13px;">
          <td style="font-weight:700; width:20px;">${tIdx+1}</td>
          <td style="font-weight:600;">${team.flag} ${team.name}</td>
          <td style="text-align:right;">${team.played}</td>
          <td style="text-align:right;">${team.wins}</td>
          <td style="text-align:right;">${team.draws}</td>
          <td style="text-align:right;">${team.losses}</td>
          <td style="text-align:right; font-weight:700; color:var(--accent-cyan);">${team.pts}</td>
          <td style="text-align:right; color:${team.gf-team.ga>=0?'var(--accent-emerald)':'var(--accent-rose)'}">${team.gf-team.ga>=0?'+':''}${team.gf-team.ga}</td>
        </tr>
      `;
    });

    groupsHtml += `
      <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border-glow); border-radius:8px; padding:16px;">
        <h4 style="color:var(--accent-cyan); font-size:14px; text-transform:uppercase; margin-bottom:12px; font-weight:700;">Grupo ${groupLetter}</h4>
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="font-size:11px; color:var(--text-muted); border-bottom:1px solid rgba(255,255,255,0.05); text-align:left;">
              <th style="padding:6px 0;">#</th>
              <th>Seleção</th>
              <th style="text-align:right;">J</th>
              <th style="text-align:right;">V</th>
              <th style="text-align:right;">E</th>
              <th style="text-align:right;">D</th>
              <th style="text-align:right;">Pts</th>
              <th style="text-align:right;">SG</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  });
  groupsHtml += `</div>`;

  let knockoutHtml = "";
  if (!sf.knockoutRounds || sf.knockoutRounds.length === 0) {
    knockoutHtml = `<div style="text-align:center; padding:30px; background:rgba(255,255,255,0.01); border:1px solid var(--border-glow); border-radius:8px; color:var(--text-muted); font-size:13px;">A fase eliminatória começará após a rodada 3 da fase de grupos.</div>`;
  } else {
    let knockRoundsHtml = "";
    sf.knockoutRounds.forEach((round, rIdx) => {
      const stageName = rIdx === 0 ? "Oitavas de Final" : (rIdx === 1 ? "Quartas de Final" : (rIdx === 2 ? "Semifinais" : "Grande Final"));
      let matchesHtml = "";
      round.forEach(m => {
        const home = game.findTeamById(m.homeId) || { name: "A definir", colors: ["#777", "#333"], flag: "" };
        const away = game.findTeamById(m.awayId) || { name: "A definir", colors: ["#777", "#333"], flag: "" };
        
        const scoreText = m.simulated 
          ? `${m.scoreHome} ${m.isPenalties ? `(${m.penHome})` : ''} - ${m.scoreAway} ${m.isPenalties ? `(${m.penAway})` : ''}` 
          : (m.homeId && m.awayId ? "VS" : "-");

        const isWinnerHome = m.winnerId && m.winnerId === m.homeId;
        const isWinnerAway = m.winnerId && m.winnerId === m.awayId;

        matchesHtml += `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; border-bottom:1px solid rgba(255,255,255,0.01); font-size:13px;">
            <div style="flex:1; text-align:right; font-weight: ${isWinnerHome ? '700' : 'normal'}; color: ${isWinnerHome ? 'var(--accent-emerald)' : 'inherit'};">
              ${home.flag || ''} ${home.name} ${createShieldHTML(home.colors, "10px")}
            </div>
            <div style="width:90px; text-align:center; font-weight:700; background:rgba(255,255,255,0.03); padding:3px 8px; border-radius:4px; margin:0 10px; color:var(--accent-cyan);">
              ${scoreText}
            </div>
            <div style="flex:1; text-align:left; font-weight: ${isWinnerAway ? '700' : 'normal'}; color: ${isWinnerAway ? 'var(--accent-emerald)' : 'inherit'};">
              ${createShieldHTML(away.colors, "10px")} ${away.flag || ''} ${away.name}
            </div>
          </div>
        `;
      });

      knockRoundsHtml += `
        <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border-glow); border-radius:8px; padding:16px;">
          <h4 style="color:var(--accent-gold); font-size:14px; text-transform:uppercase; margin-bottom:12px; font-weight:700;">${stageName}</h4>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${matchesHtml}
          </div>
        </div>
      `;
    });

    knockoutHtml = `<div style="display:flex; flex-direction:column; gap:16px;">${knockRoundsHtml}</div>`;
  }

  const activeTab = sf.currentStage || "group";

  card.innerHTML = `
    <div style="display:flex; gap:10px; margin-bottom:20px;">
      <button class="tab-btn" style="padding: 6px 16px; font-size: 13px; border-radius: 4px; border: 1px solid var(--border-glow); background: ${activeTab === 'group' ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)'}; color: ${activeTab === 'group' ? '#000' : 'var(--text-main)'}; cursor:pointer;" onclick="switchSelecoesTab('group')">
        Fase de Grupos
      </button>
      <button class="tab-btn" style="padding: 6px 16px; font-size: 13px; border-radius: 4px; border: 1px solid var(--border-glow); background: ${activeTab === 'knockout' ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)'}; color: ${activeTab === 'knockout' ? '#000' : 'var(--text-main)'}; cursor:pointer;" onclick="switchSelecoesTab('knockout')">
        Fase Final (Playoffs)
      </button>
    </div>
    
    <div id="selecoes-groups-view" style="display: ${activeTab === 'group' ? 'block' : 'none'};">
      ${groupsHtml}
    </div>
    
    <div id="selecoes-knockout-view" style="display: ${activeTab === 'knockout' ? 'block' : 'none'};">
      ${knockoutHtml}
    </div>
  `;

  window.switchSelecoesTab = (stage) => {
    document.getElementById("selecoes-groups-view").style.display = stage === "group" ? "block" : "none";
    document.getElementById("selecoes-knockout-view").style.display = stage === "knockout" ? "block" : "none";
    
    const btns = card.querySelectorAll(".tab-btn");
    btns[0].style.background = stage === "group" ? "var(--accent-cyan)" : "rgba(255,255,255,0.05)";
    btns[0].style.color = stage === "group" ? "#000" : "var(--text-main)";
    btns[1].style.background = stage === "knockout" ? "var(--accent-cyan)" : "rgba(255,255,255,0.05)";
    btns[1].style.color = stage === "knockout" ? "#000" : "var(--text-main)";
  };
}

// Render Transfer Market (Mercado da Bola) View
let currentMarketTab = "listed"; // "listed", "search", "free_agents"
let marketFilters = {
  name: "",
  club: "ALL",
  pos: "ALL",
  rating: "ALL",
  age: "ALL",
  page: 1,
  pageSize: 15
};

function renderMarket(container) {
  // Navigation for market tabs
  const bar = document.createElement("div");
  bar.style.display = "flex";
  bar.style.justifyContent = "space-between";
  bar.style.alignItems = "center";
  bar.style.marginBottom = "24px";

  bar.innerHTML = `
    <div class="form-toggle-switch" style="margin-bottom:0;">
      <div class="toggle-btn ${currentMarketTab === 'listed' ? 'active' : ''}" onclick="switchMarketTab('listed')">Jogadores Listados</div>
      <div class="toggle-btn ${currentMarketTab === 'search' ? 'active' : ''}" onclick="switchMarketTab('search')">Buscar no Banco de Dados</div>
      <div class="toggle-btn ${currentMarketTab === 'free_agents' ? 'active' : ''}" onclick="switchMarketTab('free_agents')">Agentes Livres (Sem Clube)</div>
    </div>
  `;
  container.appendChild(bar);

  // Gather all clubs dynamically from the database
  const allClubs = [];
  if (game.state && game.state.database) {
    for (const league of Object.values(game.state.database)) {
      league.teams.forEach(team => {
        allClubs.push(team.name);
      });
    }
  }
  allClubs.sort((a, b) => a.localeCompare(b));
  const clubOptions = allClubs.map(c => `<option value="${c}" ${marketFilters.club === c ? 'selected' : ''}>${c}</option>`).join("");

  // Filters Bar
  const filtersDiv = document.createElement("div");
  filtersDiv.className = "search-filter-bar";
  filtersDiv.innerHTML = `
    <input type="text" id="market-search-name" class="form-control" placeholder="Buscar por nome..." value="${marketFilters.name || ''}" oninput="applyMarketFilters()" style="flex-grow: 1; max-width: 250px; min-width: 150px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-glow); color: var(--text-main); padding: 8px 12px; border-radius: 4px;">
    
    <select id="market-filter-club" onchange="applyMarketFilters()" ${currentMarketTab === 'free_agents' ? 'disabled style="opacity: 0.5;"' : ''}>
      <option value="ALL" ${marketFilters.club === 'ALL' ? 'selected' : ''}>Todos os Clubes</option>
      ${clubOptions}
    </select>

    <select id="market-filter-pos" onchange="applyMarketFilters()">
      <option value="ALL" ${marketFilters.pos === 'ALL' ? 'selected' : ''}>Todas as Posições</option>
      <option value="GOL" ${marketFilters.pos === 'GOL' ? 'selected' : ''}>Goleiro (GOL)</option>
      <option value="ZAG" ${marketFilters.pos === 'ZAG' ? 'selected' : ''}>Zagueiro (ZAG)</option>
      <option value="LAT" ${marketFilters.pos === 'LAT' ? 'selected' : ''}>Lateral (LAT)</option>
      <option value="MEI" ${marketFilters.pos === 'MEI' ? 'selected' : ''}>Meio-campo (MEI)</option>
      <option value="ATA" ${marketFilters.pos === 'ATA' ? 'selected' : ''}>Atacante (ATA)</option>
    </select>
    
    <select id="market-filter-rating" onchange="applyMarketFilters()">
      <option value="ALL" ${marketFilters.rating === 'ALL' ? 'selected' : ''}>Qualquer Força</option>
      <option value="90" ${marketFilters.rating === '90' ? 'selected' : ''}>Super Estrelas (90+)</option>
      <option value="80" ${marketFilters.rating === '80' ? 'selected' : ''}>Elite (80-89)</option>
      <option value="70" ${marketFilters.rating === '70' ? 'selected' : ''}>Profissional (70-79)</option>
      <option value="50" ${marketFilters.rating === '50' ? 'selected' : ''}>Base/Acesso (50-69)</option>
    </select>

    <select id="market-filter-age" onchange="applyMarketFilters()">
      <option value="ALL" ${marketFilters.age === 'ALL' ? 'selected' : ''}>Qualquer Idade</option>
      <option value="young" ${marketFilters.age === 'young' ? 'selected' : ''}>Jovens Promessas (17-21)</option>
      <option value="peak" ${marketFilters.age === 'peak' ? 'selected' : ''}>Auge Técnico (22-29)</option>
      <option value="veteran" ${marketFilters.age === 'veteran' ? 'selected' : ''}>Experientes (30+)</option>
    </select>
  `;
  container.appendChild(filtersDiv);

  // Market list card
  const listCard = document.createElement("div");
  listCard.className = "glass-card";
  listCard.id = "market-list-card";
  container.appendChild(listCard);

  drawMarketList();
}

function switchMarketTab(tabId) {
  currentMarketTab = tabId;
  marketFilters.page = 1;
  marketFilters.name = "";
  marketFilters.club = "ALL";
  renderApp();
}

function applyMarketFilters() {
  marketFilters.name = document.getElementById("market-search-name").value;
  marketFilters.club = document.getElementById("market-filter-club") ? document.getElementById("market-filter-club").value : "ALL";
  marketFilters.pos = document.getElementById("market-filter-pos").value;
  marketFilters.rating = document.getElementById("market-filter-rating").value;
  marketFilters.age = document.getElementById("market-filter-age").value;
  marketFilters.page = 1;
  drawMarketList();
}

function drawMarketList() {
  const card = document.getElementById("market-list-card");
  card.innerHTML = "";

  const userTeam = game.findTeamById(game.state.manager.teamId);
  let playerList = [];

  if (currentMarketTab === "listed") {
    // Gather all listed players
    game.state.transferList.forEach(item => {
      const pDetails = game.findPlayerById(item.playerId);
      if (pDetails && pDetails.team && pDetails.team.id !== userTeam.id) {
        playerList.push({ player: pDetails.player, team: pDetails.team, price: item.originalPrice });
      }
    });
  } 
  else if (currentMarketTab === "free_agents") {
    game.state.freeAgents.forEach(p => {
      playerList.push({ player: p, team: null, price: p.value });
    });
  } 
  else {
    // Search Database (All players in all leagues, excluding user team)
    for (const league of Object.values(game.state.database)) {
      league.teams.forEach(team => {
        if (team.id !== userTeam.id) {
          team.squad.forEach(p => {
            playerList.push({ player: p, team: team, price: p.value });
          });
        }
      });
    }
  }

  // Filter list by name
  if (marketFilters.name && marketFilters.name.trim() !== "") {
    const searchVal = marketFilters.name.toLowerCase().trim();
    playerList = playerList.filter(item => item.player.name.toLowerCase().includes(searchVal));
  }

  // Filter list by club
  if (marketFilters.club && marketFilters.club !== "ALL") {
    playerList = playerList.filter(item => item.team && item.team.name === marketFilters.club);
  }

  // Filter list by position
  if (marketFilters.pos !== "ALL") {
    playerList = playerList.filter(item => item.player.position === marketFilters.pos);
  }
  
  if (marketFilters.rating !== "ALL") {
    const min = parseInt(marketFilters.rating);
    if (min === 90) playerList = playerList.filter(item => item.player.rating >= 90);
    else if (min === 80) playerList = playerList.filter(item => item.player.rating >= 80 && item.player.rating < 90);
    else if (min === 70) playerList = playerList.filter(item => item.player.rating >= 70 && item.player.rating < 80);
    else playerList = playerList.filter(item => item.player.rating >= 50 && item.player.rating < 70);
  }

  if (marketFilters.age !== "ALL") {
    if (marketFilters.age === "young") playerList = playerList.filter(item => item.player.age <= 21);
    else if (marketFilters.age === "peak") playerList = playerList.filter(item => item.player.age >= 22 && item.player.age <= 29);
    else playerList = playerList.filter(item => item.player.age >= 30);
  }

  // Pagination logic
  const totalItems = playerList.length;
  const totalPages = Math.ceil(totalItems / marketFilters.pageSize) || 1;
  if (marketFilters.page > totalPages) marketFilters.page = totalPages;
  if (marketFilters.page < 1) marketFilters.page = 1;

  const startIndex = (marketFilters.page - 1) * marketFilters.pageSize;
  const endIndex = startIndex + marketFilters.pageSize;
  const paginatedPlayers = playerList.slice(startIndex, endIndex);

  // Draw Table
  let tbodyHtml = "";
  paginatedPlayers.forEach(item => {
    tbodyHtml += `
      <tr>
        <td>
          <span style="font-weight:700;">${item.player.name}</span>
          <div style="font-size:11px; color:var(--text-muted);">${item.player.nationality}</div>
        </td>
        <td><span class="badge badge-position">${item.player.position}</span></td>
        <td>
          <span class="badge badge-rating">${item.player.rating}</span>
          <span style="font-size:10px; color:var(--text-muted); display:block; margin-top:2px; font-weight:600;">Pot: ${item.player.potential || item.player.rating}</span>
        </td>
        <td>${item.player.age} anos</td>
        <td>${item.team ? createShieldHTML(item.team.colors, '12px') + ' ' + item.team.name : 'Agente Livre'}</td>
        <td style="font-weight:700; color:var(--accent-gold);">${formatMoney(item.price)}</td>
        <td>
          <button class="btn-primary" style="width:auto; padding:6px 12px; font-size:12px;" onclick="openNegotiateModal('${item.player.id}')">
            Contratar
          </button>
        </td>
      </tr>
    `;
  });

  if (playerList.length === 0) {
    tbodyHtml = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">Nenhum jogador encontrado com estes filtros.</td></tr>`;
  }

  let paginationHtml = "";
  if (totalPages > 1) {
    paginationHtml = `
      <div style="display:flex; justify-content:center; align-items:center; gap:12px; margin-top:20px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.05);">
        <button class="btn-secondary" style="width:auto; padding:6px 12px; font-size:12px; cursor:pointer;" onclick="changeMarketPage(${marketFilters.page - 1})" ${marketFilters.page === 1 ? 'disabled style="opacity:0.5; cursor:default;"' : ''}>Anterior</button>
        <span style="font-size:13px; color:var(--text-muted);">Página <strong style="color:var(--accent-cyan);">${marketFilters.page}</strong> de ${totalPages} (Total: ${totalItems})</span>
        <button class="btn-secondary" style="width:auto; padding:6px 12px; font-size:12px; cursor:pointer;" onclick="changeMarketPage(${marketFilters.page + 1})" ${marketFilters.page === totalPages ? 'disabled style="opacity:0.5; cursor:default;"' : ''}>Próxima</button>
      </div>
    `;
  }

  card.innerHTML = `
    <table class="premium-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Pos</th>
          <th>Força</th>
          <th>Idade</th>
          <th>Clube Atual</th>
          <th>Preço sugerido</th>
          <th>Negociar</th>
        </tr>
      </thead>
      <tbody>
        ${tbodyHtml}
      </tbody>
    </table>
    ${paginationHtml}
  `;
}

window.changeMarketPage = (newPage) => {
  marketFilters.page = newPage;
  drawMarketList();
};

// Bidding Negotiation Modals
let activeNegotiationPlayer = null;
let bidAcceptedByClub = false;
let offerDetails = null;

function openNegotiateModal(playerId) {
  const userTeam = game.findTeamById(game.state.manager.teamId);
  if (userTeam && userTeam.squad && userTeam.squad.length >= 50) {
    alert("Seu elenco está cheio! O limite é de 50 jogadores.");
    return;
  }

  const pDetails = game.findPlayerById(playerId);
  if (!pDetails) return;

  activeNegotiationPlayer = pDetails.player;
  bidAcceptedByClub = pDetails.team === null; // Free agents don't need club negotiations
  offerDetails = {
    playerId: playerId,
    ownerTeam: pDetails.team,
    suggestedPrice: pDetails.player.value * (pDetails.team === null ? 0.7 : 1.0)
  };

  const modalBody = document.getElementById("modal-negotiate-body");
  modalBody.innerHTML = "";

  renderNegotiationSteps(modalBody);
  openModal("modal-negotiate");
}

function renderNegotiationSteps(container) {
  const player = activeNegotiationPlayer;
  const team = offerDetails.ownerTeam;

  let clubOfferHtml = "";
  if (!bidAcceptedByClub && team) {
    clubOfferHtml = `
      <div id="club-bid-pane" style="margin-bottom:24px; border-bottom:1px solid var(--border-glow); padding-bottom:20px;">
        <h4 style="font-size:14px; font-weight:700; margin-bottom:12px; color:var(--text-muted); text-transform:uppercase;">1. Proposta ao Clube (${team.name})</h4>
        <div class="form-group">
          <label>Valor da Proposta de Transferência</label>
          <div style="display:flex; gap:8px;">
            <input type="number" id="neg-bid-amount" class="form-control" value="${Math.round(offerDetails.suggestedPrice)}" placeholder="Valor em R$">
            <button class="btn-primary" style="width:auto; white-space:nowrap;" onclick="submitBidToClub()">Enviar Oferta</button>
          </div>
          <span style="font-size:11px; color:var(--text-muted); margin-top:6px; display:block;">Valor de mercado do jogador: ${formatMoney(player.value)}</span>
        </div>
      </div>
    `;
  }

  let contractOfferHtml = "";
  if (bidAcceptedByClub) {
    const demandSalary = offerDetails.demandedSalary || Math.round(player.salary * 1.15);
    contractOfferHtml = `
      <div id="player-contract-pane">
        <h4 style="font-size:14px; font-weight:700; margin-bottom:12px; color:var(--accent-emerald); text-transform:uppercase;">2. Contrato com o Jogador</h4>
        <div style="background:rgba(16,185,129,0.05); border:1px solid rgba(16,185,129,0.2); border-radius:8px; padding:12px; margin-bottom:16px; font-size:13px;">
          O jogador aceitou abrir negociações de contrato e exige um salário semanal aproximado de <span style="font-weight:700; color:var(--accent-gold);">${formatMoney(demandSalary)}</span>.
        </div>
        <div class="form-group">
          <label>Salário Semanal Proposto</label>
          <input type="number" id="neg-salary-amount" class="form-control" value="${demandSalary}" placeholder="Salário em R$">
        </div>
        <div class="form-group">
          <label>Duração do Contrato</label>
          <select id="neg-contract-years" class="form-control">
            <option value="1">1 Ano</option>
            <option value="2">2 Anos</option>
            <option value="3" selected>3 Anos</option>
            <option value="4">4 Anos</option>
            <option value="5">5 Anos</option>
          </select>
        </div>
        <button class="btn-primary" onclick="submitContractToPlayer()">Assinar Contrato</button>
      </div>
    `;
  }

  container.innerHTML = `
    <div style="display:flex; gap:16px; align-items:center; margin-bottom:20px; background:rgba(255,255,255,0.02); padding:16px; border-radius:10px;">
      <div style="flex-grow:1;">
        <div style="font-size:16px; font-weight:800;">${player.name}</div>
        <div style="font-size:12px; color:var(--text-muted);">${player.position} | Força: ${player.rating} | Pot: ${player.potential || player.rating} | ${player.age} anos | ${player.nationality}</div>
        <div style="margin-top:6px; display:flex; gap:6px;">
          ${player.skills.map(s => `<span class="trait-badge">${s}</span>`).join("")}
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px; color:var(--text-muted);">SALÁRIO ATUAL</div>
        <div style="font-weight:700;">${formatMoney(player.salary)}/sem</div>
      </div>
    </div>

    ${clubOfferHtml}
    ${contractOfferHtml}
  `;
}

function submitBidToClub() {
  const bidAmount = parseInt(document.getElementById("neg-bid-amount").value);
  if (isNaN(bidAmount) || bidAmount <= 0) {
    alert("Digite um valor válido.");
    return;
  }

  const result = game.makeTransferBid(activeNegotiationPlayer.id, bidAmount);

  if (result && result.status === "accepted") {
    alert("O clube aceitou a sua proposta de transferência! Prossiga com o contrato.");
    bidAcceptedByClub = true;
    offerDetails.bidAmount = bidAmount;
    offerDetails.demandedSalary = result.demandedSalary;
    
    // Refresh modal body
    renderNegotiationSteps(document.getElementById("modal-negotiate-body"));
  } else {
    alert("Oferta recusada pelo clube! Eles não querem vender o jogador por este valor.");
  }
}

function submitContractToPlayer() {
  const salary = parseInt(document.getElementById("neg-salary-amount").value);
  const years = parseInt(document.getElementById("neg-contract-years").value);

  if (isNaN(salary) || salary <= 0) {
    alert("Digite um salário válido.");
    return;
  }

  // Player contract decision
  const demandSalary = offerDetails.demandedSalary || activeNegotiationPlayer.salary;
  const ratio = salary / demandSalary;

  let signs = false;
  if (ratio >= 1.0) signs = true;
  else if (ratio >= 0.85) signs = Math.random() < 0.55;
  else signs = Math.random() < 0.15;

  if (signs) {
    game.completeTransfer(
      activeNegotiationPlayer, 
      offerDetails.ownerTeam, 
      offerDetails.bidAmount || 0, 
      salary, 
      years
    );
    alert(`Contratação realizada! ${activeNegotiationPlayer.name} assinou o contrato e se juntou ao elenco.`);
    closeModal("modal-negotiate");
    renderApp();
  } else {
    alert("O jogador recusou a proposta salarial! A oferta está abaixo das expectativas do atleta.");
  }
}

// Render Stadium & Finances (Estádio & Caixa) View
let activeStadiumTab = "stadium";

function changeStadiumTab(tabId) {
  activeStadiumTab = tabId;
  renderApp();
}

function handleBankBorrow(bankId) {
  const input = document.getElementById(`input-borrow-${bankId}`);
  const amt = parseInt(input.value);
  if (isNaN(amt) || amt <= 0) {
    alert("Digite um valor válido para empréstimo.");
    return;
  }
  game.borrowMoneyFromBank(bankId, amt);
  input.value = "";
  renderApp();
}

function handleBankRepay(bankId) {
  const input = document.getElementById(`input-repay-${bankId}`);
  const amt = parseInt(input.value);
  if (isNaN(amt) || amt <= 0) {
    alert("Digite um valor válido para pagamento.");
    return;
  }
  game.repayLoanToBank(bankId, amt);
  input.value = "";
  renderApp();
}

function handleUpgradeAcademy() {
  game.upgradeAcademy();
}

function handleSetAcademyLevel() {
  const select = document.getElementById("academy-level-selector");
  const level = parseInt(select.value);
  game.setAcademyLevel(level);
}

let currentSponsorNegotiationType = null;
let currentSponsorOffers = [];

function openSponsorNegotiation(type) {
  currentSponsorNegotiationType = type;
  currentSponsorOffers = game.generateSponsorOffers(type);
  
  const titleEl = document.getElementById("sponsor-offers-title");
  const bodyEl = document.getElementById("modal-sponsor-offers-body");
  
  const typeNames = {
    master: "Patrocinador Máster",
    sleeve: "Patrocinador de Manga (Sleeve)",
    stadium: "Naming Rights do Estádio"
  };
  
  titleEl.textContent = `Propostas: ${typeNames[type]}`;
  
  let html = `<div style="display:flex; flex-direction:column; gap:16px;">`;

  // Display feedback message based on board confidence multiplier
  const firstOffer = currentSponsorOffers[0];
  if (firstOffer && firstOffer.multiplier !== undefined) {
    const multPercent = Math.round((firstOffer.multiplier - 1.0) * 100);
    const confidence = firstOffer.confidence;
    let bannerHtml = "";
    if (multPercent > 0) {
      bannerHtml = `
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px; padding: 12px; font-size: 13px; color: var(--accent-emerald); display: flex; align-items: center; gap: 10px; line-height: 1.4;">
          <span style="font-size: 18px;">📈</span>
          <span><strong>Parceria em Alta!</strong> Com o ótimo desempenho do clube e a alta confiança da diretoria (${confidence}%), as marcas estão oferecendo propostas <strong>+${multPercent}% superiores</strong>!</span>
        </div>
      `;
    } else if (multPercent < 0) {
      bannerHtml = `
        <div style="background: rgba(244, 63, 94, 0.08); border: 1px solid rgba(244, 63, 94, 0.2); border-radius: 12px; padding: 12px; font-size: 13px; color: var(--accent-rose); display: flex; align-items: center; gap: 10px; line-height: 1.4;">
          <span style="font-size: 18px;">📉</span>
          <span><strong>Parceria Desvalorizada!</strong> Devido ao momento instável do clube e à baixa confiança da diretoria (${confidence}%), as propostas oferecidas estão <strong>${multPercent}% desvalorizadas</strong>. Melhore sua campanha para atrair melhores contratos!</span>
        </div>
      `;
    } else {
      bannerHtml = `
        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-glow); border-radius: 12px; padding: 12px; font-size: 13px; color: var(--text-muted); display: flex; align-items: center; gap: 10px; line-height: 1.4;">
          <span style="font-size: 18px;">ℹ️</span>
          <span>Propostas padrão baseadas na reputação atual do clube. (Confiança da diretoria: ${confidence}%).</span>
        </div>
      `;
    }
    html = bannerHtml + html;
  }
  
  currentSponsorOffers.forEach((offer, index) => {
    html += `
      <div class="glass-card" style="border: 1px solid var(--border-glow); padding:16px; display:flex; flex-direction:column; gap:12px; transition:var(--transition-smooth); cursor:pointer;" onclick="selectSponsorOffer(${index})">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-size:16px; color:var(--accent-cyan);">${offer.name}</strong>
          <span class="badge" style="background:rgba(16,185,129,0.15); color:var(--accent-emerald); font-weight:700;">${offer.weeksRemaining} semanas</span>
        </div>
        <p style="font-size:12px; color:var(--text-muted); margin:0;">${offer.desc}</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:13px; border-top:1px dashed var(--border-glow); padding-top:10px;">
          <div>Semanal: <strong style="color:var(--text-main);">${formatMoney(offer.weeklyFee)}</strong></div>
          <div>Bônus Vitória: <strong style="color:var(--text-main);">${offer.winBonus > 0 ? formatMoney(offer.winBonus) : "Nenhum"}</strong></div>
          <div style="grid-column:span 2;">Bônus de Título: <strong style="color:var(--accent-gold);">${offer.titleBonus > 0 ? formatMoney(offer.titleBonus) : "Nenhum"}</strong></div>
        </div>
        <button class="btn-primary" style="margin-top:8px; padding:8px 16px; font-size:13px;" onclick="event.stopPropagation(); selectSponsorOffer(${index})">Assinar Contrato</button>
      </div>
    `;
  });
  
  html += `</div>`;
  bodyEl.innerHTML = html;
  
  openModal("modal-sponsor-offers");
}

function openJobOffersModal() {
  const offers = game.state.pendingJobOffers;
  if (!offers || offers.length === 0) return;

  const bodyEl = document.getElementById("modal-job-offers-body");
  
  let stats = game.state.manager.currentClubStats || { wins: 0, draws: 0, losses: 0 };
  let totalGames = stats.wins + stats.draws + stats.losses;
  let titleLabel = "Seu Desempenho no Clube Atual";
  
  if (totalGames < 3) {
    const careerStats = game.state.manager.stats || { wins: 0, draws: 0, losses: 0 };
    const careerTotal = careerStats.wins + careerStats.draws + careerStats.losses;
    if (careerTotal >= 3) {
      stats = careerStats;
      totalGames = careerTotal;
      titleLabel = "Seu Desempenho Geral na Carreira";
    }
  }

  const winRate = totalGames > 0 ? ((stats.wins / totalGames) * 100).toFixed(1) : "0.0";
  const pointsRate = totalGames > 0 ? (((stats.wins * 3 + stats.draws) / (totalGames * 3)) * 100).toFixed(1) : "0.0";

  let html = `
    <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-glow); border-radius: 12px; padding: 14px; margin-bottom: 20px; font-size: 13.5px; line-height: 1.5;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-weight:700; color:var(--accent-cyan); font-size:15px;">${titleLabel}</span>
        <span class="badge" style="background:rgba(245,158,11,0.15); color:var(--accent-gold); font-weight:700;">Aproveitamento: ${pointsRate}%</span>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:10px; text-align:center; font-size:12px; color:var(--text-muted);">
        <div>Jogos: <strong style="color:var(--text-main); font-size:14px; display:block;">${totalGames}</strong></div>
        <div>Vitórias: <strong style="color:var(--accent-emerald); font-size:14px; display:block;">${stats.wins}</strong></div>
        <div>Empates: <strong style="color:var(--accent-gold); font-size:14px; display:block;">${stats.draws}</strong></div>
        <div>Derrotas: <strong style="color:var(--accent-rose); font-size:14px; display:block;">${stats.losses}</strong></div>
      </div>
    </div>
    
    <p style="font-size:13px; color:var(--text-muted); margin-bottom:16px;">Com base nos seus resultados, as seguintes equipes (clubes ou seleções) enviaram propostas oficiais de contrato para você:</p>
    <div style="display:flex; flex-direction:column; gap:16px; max-height: 380px; overflow-y: auto; padding-right: 6px;">
  `;

  offers.forEach((offer, index) => {
    // Show reputation stars
    const stars = "★".repeat(Math.round(offer.rep));
    
    html += `
      <div class="glass-card" style="border: 1px solid var(--border-glow); padding:16px; display:flex; flex-direction:column; gap:12px; transition:var(--transition-smooth);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong style="font-size:16px; color:var(--text-main);">${offer.teamName}</strong>
            <span style="color:var(--accent-gold); font-size:12px; margin-left:8px;">${stars}</span>
          </div>
          <span class="badge" style="background:rgba(59,130,246,0.15); color:var(--accent-blue); font-weight:700;">${offer.leagueName}</span>
        </div>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:13px; border-top:1px dashed var(--border-glow); padding-top:10px; margin-bottom:4px;">
          <div>Orçamento do Clube: <strong style="color:var(--accent-emerald);">${formatMoney(offer.budget)}</strong></div>
          <div>Força Geral (Overall): <strong style="color:var(--accent-cyan);">${offer.overall}</strong></div>
          <div style="grid-column:span 2;">Expectativa da Diretoria: <strong style="color:var(--accent-gold);">${offer.goalTitle}</strong></div>
        </div>

        ${offer.message ? `
        <div style="font-style: italic; color: var(--text-muted); font-size: 12.5px; background: rgba(255,255,255,0.01); padding: 10px 14px; border-radius: 8px; border-left: 3px solid var(--accent-cyan); line-height: 1.4; border-top: 1px solid var(--border-glow); border-right: 1px solid var(--border-glow); border-bottom: 1px solid var(--border-glow);">
          "${offer.message}"
        </div>
        ` : ''}
        
        <button class="btn-primary" style="padding:10px; font-size:13px; font-weight:700;" onclick="acceptJobOfferUI('${offer.teamId}', '${offer.leagueId}')">Aceitar Cargo</button>
      </div>
    `;
  });

  html += `
    </div>
    <div style="display:flex; justify-content:center; margin-top:20px; border-top:1px solid var(--border-glow); padding-top:16px;">
      <button class="btn-primary" style="background:rgba(255,255,255,0.05); border-color:var(--border-glow); color:var(--text-main); padding:10px 24px; font-size:13px; font-weight:700;" onclick="refuseJobOffersUI()">Recusar Propostas / Continuar no Clube</button>
    </div>
  `;

  bodyEl.innerHTML = html;
  openModal("modal-job-offers");
}

function acceptJobOfferUI(teamId, leagueId) {
  const isNational = game.state.nationalTeams && game.state.nationalTeams[teamId] !== undefined;
  const promptText = isNational 
    ? "Tem certeza que deseja aceitar este cargo? Você deixará seu clube atual imediatamente e assumirá o comando técnico desta Seleção Nacional!"
    : "Tem certeza que deseja aceitar este cargo? Você deixará seu time atual imediatamente e assumirá o comando técnico deste novo clube.";
  
  if (confirm(promptText)) {
    if (game.acceptJobOffer(teamId, leagueId)) {
      closeModal("modal-job-offers");
      window.location.reload();
    }
  }
}

function refuseJobOffersUI() {
  if (confirm("Deseja recusar todas as propostas e continuar no comando do seu clube atual?")) {
    game.refuseJobOffers();
    closeModal("modal-job-offers");
    renderApp();
  }
}

window.openJobOffersModal = openJobOffersModal;
window.acceptJobOfferUI = acceptJobOfferUI;
window.refuseJobOffersUI = refuseJobOffersUI;

function selectSponsorOffer(index) {
  const offer = currentSponsorOffers[index];
  if (!offer) return;
  
  const userTeam = game.findTeamById(game.state.manager.teamId);
  game.initDefaultSponsorsIfMissing(userTeam);
  
  if (confirm(`Deseja assinar contrato de patrocínio com a ${offer.name} por ${offer.weeksRemaining} semanas?`)) {
    userTeam.sponsors[currentSponsorNegotiationType] = {
      name: offer.name,
      weeklyFee: offer.weeklyFee,
      winBonus: offer.winBonus,
      titleBonus: offer.titleBonus,
      weeksRemaining: offer.weeksRemaining
    };
    
    // Add advance sign-on bonus (2 weeks fee advance)
    const advance = offer.weeklyFee * 2;
    game.adjustTeamBudget(userTeam, advance, 'sponsor' + currentSponsorNegotiationType.charAt(0).toUpperCase() + currentSponsorNegotiationType.slice(1));
    
    game.addNews("Novo Patrocinador", `Parceria fechada! O ${userTeam.name} assinou com o patrocinador ${offer.name} (${currentSponsorNegotiationType.toUpperCase()}) por ${offer.weeksRemaining} semanas.`);
    closeModal("modal-sponsor-offers");
    game.saveGame();
    renderApp();
  }
}

function updateTicketPriceLabel() {
  const val = document.getElementById("finance-ticket-range").value;
  document.getElementById("ticket-price-val").textContent = `R$ ${val}`;
  
  const userTeam = game.findTeamById(game.state.manager.teamId);
  userTeam.ticketPrice = parseInt(val);
  game.saveGame();
  
  // Update real-time expected metrics
  const baseRep = userTeam.reputation * 0.2 + 0.1;
  const priceFactor = Math.max(0, 1 - (userTeam.ticketPrice - 10) / 140);
  const loyaltyFactor = userTeam.fansLoyalty / 100;
  const expectedAttendance = Math.min(userTeam.stadiumCapacity, Math.round(userTeam.stadiumCapacity * baseRep * priceFactor * (0.5 + loyaltyFactor * 0.5)));
  const occupancy = Math.round((expectedAttendance / userTeam.stadiumCapacity) * 100);
  const projectedRevenue = expectedAttendance * userTeam.ticketPrice;
  
  const attEl = document.getElementById("projected-attendance-val");
  const revEl = document.getElementById("projected-revenue-val");
  if (attEl) attEl.textContent = `${expectedAttendance.toLocaleString()} (~${occupancy}% de ocupação)`;
  if (revEl) revEl.textContent = formatMoney(projectedRevenue);
}

function renderLedgerTable(userTeam) {
  const ledgerNames = {
    ticketSales: "Bilheteria",
    sponsorMaster: "Patrocínio Máster",
    sponsorSleeve: "Patrocínio Manga (Sleeve)",
    sponsorNaming: "Naming Rights Estádio",
    tvRights: "Direitos de Transmissão",
    playerSales: "Venda de Jogadores",
    merchandising: "Merchandising / Loja",
    prizeMoney: "Premiações de Campeonatos",
    
    playerWages: "Salários do Elenco",
    transferFeesPaid: "Compra de Jogadores",
    stadiumUpkeep: "Manutenção do Estádio",
    loanInterest: "Juros de Empréstimos",
    loanRepayments: "Pagamento de Dívidas",
    youthAcademyUpkeep: "Despesa Categorias de Base"
  };

  const w = userTeam.financeLog.currentWeek;
  const s = userTeam.financeLog.seasonTotal;

  const totalIncomeW = w.ticketSales + w.sponsorMaster + w.sponsorSleeve + w.sponsorNaming + w.tvRights + w.playerSales + w.merchandising + w.prizeMoney;
  const totalIncomeS = s.ticketSales + s.sponsorMaster + s.sponsorSleeve + s.sponsorNaming + s.tvRights + s.playerSales + s.merchandising + s.prizeMoney;

  const totalExpenseW = w.playerWages + w.transferFeesPaid + w.stadiumUpkeep + w.loanInterest + w.loanRepayments + w.youthAcademyUpkeep;
  const totalExpenseS = s.playerWages + s.transferFeesPaid + s.stadiumUpkeep + s.loanInterest + s.loanRepayments + s.youthAcademyUpkeep;

  const netW = totalIncomeW + totalExpenseW;
  const netS = totalIncomeS + totalExpenseS;

  let html = `
    <table class="market-table" style="width:100%; border-collapse:collapse; font-size:12px;">
      <thead>
        <tr style="border-bottom:1px solid var(--border-glow); text-align:left;">
          <th style="padding:8px 4px; color:var(--text-muted); font-weight:600;">Categoria</th>
          <th style="padding:8px 4px; text-align:right; color:var(--text-muted); font-weight:600;">Semana Atual</th>
          <th style="padding:8px 4px; text-align:right; color:var(--text-muted); font-weight:600;">Temporada</th>
        </tr>
      </thead>
      <tbody>
        <tr style="font-weight:700; color:var(--accent-cyan);"><td colspan="3" style="padding:10px 4px 4px 4px; border-bottom:1px dashed var(--border-glow);">RECEITAS</td></tr>
  `;

  const incomeKeys = ['ticketSales', 'sponsorMaster', 'sponsorSleeve', 'sponsorNaming', 'tvRights', 'playerSales', 'merchandising', 'prizeMoney'];
  incomeKeys.forEach(k => {
    const valW = w[k] || 0;
    const valS = s[k] || 0;
    if (valW > 0 || valS > 0) {
      html += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.03);">
          <td style="padding:6px 4px;">${ledgerNames[k]}</td>
          <td style="padding:6px 4px; text-align:right; color:var(--accent-emerald);">+ ${formatMoney(valW)}</td>
          <td style="padding:6px 4px; text-align:right; color:var(--accent-emerald);">+ ${formatMoney(valS)}</td>
        </tr>
      `;
    }
  });

  html += `
        <tr style="border-top:1px solid var(--border-glow); font-weight:700;">
          <td style="padding:8px 4px;">Total Receitas</td>
          <td style="padding:8px 4px; text-align:right; color:var(--accent-emerald);">${formatMoney(totalIncomeW)}</td>
          <td style="padding:8px 4px; text-align:right; color:var(--accent-emerald);">${formatMoney(totalIncomeS)}</td>
        </tr>
        
        <tr style="font-weight:700; color:var(--accent-rose);"><td colspan="3" style="padding:16px 4px 4px 4px; border-bottom:1px dashed var(--border-glow);">DESPESAS</td></tr>
  `;

  const expenseKeys = ['playerWages', 'transferFeesPaid', 'stadiumUpkeep', 'youthAcademyUpkeep', 'loanInterest', 'loanRepayments'];
  expenseKeys.forEach(k => {
    const valW = w[k] || 0;
    const valS = s[k] || 0;
    if (valW < 0 || valS < 0) {
      html += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.03);">
          <td style="padding:6px 4px;">${ledgerNames[k]}</td>
          <td style="padding:6px 4px; text-align:right; color:var(--accent-rose);">${formatMoney(valW)}</td>
          <td style="padding:6px 4px; text-align:right; color:var(--accent-rose);">${formatMoney(valS)}</td>
        </tr>
      `;
    }
  });

  html += `
        <tr style="border-top:1px solid var(--border-glow); font-weight:700;">
          <td style="padding:8px 4px;">Total Despesas</td>
          <td style="padding:8px 4px; text-align:right; color:var(--accent-rose);">${formatMoney(totalExpenseW)}</td>
          <td style="padding:8px 4px; text-align:right; color:var(--accent-rose);">${formatMoney(totalExpenseS)}</td>
        </tr>
        
        <tr style="border-top:2px double var(--border-glow); font-weight:800; font-size:13px; background:rgba(255,255,255,0.02);">
          <td style="padding:10px 4px;">Balanço Líquido</td>
          <td style="padding:10px 4px; text-align:right; color:${netW >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">${netW >= 0 ? '+' : ''}${formatMoney(netW)}</td>
          <td style="padding:10px 4px; text-align:right; color:${netS >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">${netS >= 0 ? '+' : ''}${formatMoney(netS)}</td>
        </tr>
      </tbody>
    </table>
  `;

  return html;
}

function renderStadium(container) {
  const userTeam = game.findTeamById(game.state.manager.teamId);
  const isNational = game.state.nationalTeams && game.state.nationalTeams[userTeam.id] !== undefined;

  if (isNational) {
    container.innerHTML = `
      <div class="glass-card" style="text-align: center; padding: 48px; border: 1px solid var(--border-glow); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;">
        <div style="font-size: 48px;">🏟️</div>
        <h3 style="color: var(--accent-cyan); font-size: 20px; font-weight: 800; margin: 0;">Gestão de Seleção</h3>
        <p style="color: var(--text-muted); font-size: 14px; line-height: 1.6; max-width: 450px; margin: 0 auto; text-align: center;">
          Finanças, patrocinadores e benfeitorias de infraestrutura de estádio são de responsabilidade da Confederação Nacional de Futebol do/a <strong>${userTeam.name}</strong>.
          <br><br>
          Como selecionador nacional, seu foco exclusivo é convocar os melhores atletas e liderar o elenco rumo ao título mundial.
        </p>
      </div>
    `;
    return;
  }

  game.initDefaultSponsorsIfMissing(userTeam);
  game.ensureTeamFinanceLog(userTeam);
  game.initLoansIfMissing(userTeam);

  if (userTeam.weeksInDebt === undefined) userTeam.weeksInDebt = 0;
  if (userTeam.academyLevel === undefined) userTeam.academyLevel = 2;

  // Sub navigation tabs
  const subNav = document.createElement("div");
  subNav.className = "stadium-sub-nav";
  subNav.innerHTML = `
    <button class="tab-btn ${activeStadiumTab === 'stadium' ? 'active' : ''}" style="flex:1; padding:10px; font-size:13px; font-weight:700; border-radius:8px; border:1px solid var(--border-glow); background:${activeStadiumTab === 'stadium' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)'}; color:${activeStadiumTab === 'stadium' ? 'var(--accent-emerald)' : 'var(--text-main)'}; cursor:pointer;" onclick="window.changeStadiumTab('stadium')">🏟️ Infraestrutura</button>
    <button class="tab-btn ${activeStadiumTab === 'finance' ? 'active' : ''}" style="flex:1; padding:10px; font-size:13px; font-weight:700; border-radius:8px; border:1px solid var(--border-glow); background:${activeStadiumTab === 'finance' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)'}; color:${activeStadiumTab === 'finance' ? 'var(--accent-blue)' : 'var(--text-main)'}; cursor:pointer;" onclick="window.changeStadiumTab('finance')">📊 Finanças & Banco</button>
    <button class="tab-btn ${activeStadiumTab === 'sponsors' ? 'active' : ''}" style="flex:1; padding:10px; font-size:13px; font-weight:700; border-radius:8px; border:1px solid var(--border-glow); background:${activeStadiumTab === 'sponsors' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.03)'}; color:${activeStadiumTab === 'sponsors' ? 'var(--accent-gold)' : 'var(--text-main)'}; cursor:pointer;" onclick="window.changeStadiumTab('sponsors')">🤝 Patrocínios & Loja</button>
  `;
  container.appendChild(subNav);

  // Financial Alert banner if in debt
  if (userTeam.weeksInDebt > 0) {
    const alertDiv = document.createElement("div");
    alertDiv.style.background = "rgba(239,68,68,0.15)";
    alertDiv.style.border = "1px solid rgba(239,68,68,0.3)";
    alertDiv.style.borderRadius = "8px";
    alertDiv.style.padding = "12px 16px";
    alertDiv.style.color = "var(--accent-rose)";
    alertDiv.style.fontSize = "13px";
    alertDiv.style.fontWeight = "600";
    alertDiv.style.marginBottom = "16px";
    alertDiv.style.display = "flex";
    alertDiv.style.alignItems = "center";
    alertDiv.style.gap = "8px";
    alertDiv.innerHTML = `
      <span>⚠️ <strong>CRISE FINANCEIRA:</strong> Seu caixa está no vermelho há ${userTeam.weeksInDebt} semanas consecutivas. Você tem até a 8ª semana para reverter a dívida antes que ocorra a punição esportiva (-6 pontos) e venda compulsória.</span>
    `;
    container.appendChild(alertDiv);
  }

  const wrapper = document.createElement("div");
  wrapper.className = "grid-2";

  if (activeStadiumTab === "stadium") {
    // -------------------------------------------------------------
    // TAB STADIUM & ACADEMY
    // -------------------------------------------------------------
    const leftCard = document.createElement("div");
    leftCard.className = "glass-card";
    
    const upgradeStatus = userTeam.stadiumUpgrading 
      ? `<div style="background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.3); border-radius:8px; padding:12px; font-size:13px; margin-bottom:16px;">
          🏗️ Obras em andamento! Aumentando +${userTeam.stadiumUpgradeCapacityIncrease.toLocaleString()} assentos (${userTeam.stadiumUpgradeWeeks} semanas restantes).
         </div>`
      : "";

    // Simulated ticket pricing metrics
    const baseRep = userTeam.reputation * 0.2 + 0.1;
    const priceFactor = Math.max(0, 1 - (userTeam.ticketPrice - 10) / 140);
    const loyaltyFactor = userTeam.fansLoyalty / 100;
    const expectedAttendance = Math.min(userTeam.stadiumCapacity, Math.round(userTeam.stadiumCapacity * baseRep * priceFactor * (0.5 + loyaltyFactor * 0.5)));
    const occupancy = Math.round((expectedAttendance / userTeam.stadiumCapacity) * 100);
    const projectedRevenue = expectedAttendance * userTeam.ticketPrice;

    leftCard.innerHTML = `
      <h3 class="card-title">Gestão do Estádio</h3>
      ${upgradeStatus}
      
      <div style="display:flex; flex-direction:column; gap:20px;">
        <div>
          <span style="font-size:12px; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Capacidade</span>
          <div style="font-size:24px; font-weight:800; margin-top:4px;">${userTeam.stadiumCapacity.toLocaleString()} assentos</div>
        </div>

        <div class="form-group" style="border-top: 1px solid var(--border-glow); padding-top:20px;">
          <label>Preço do Ingresso (R$)</label>
          <div style="display:flex; gap:16px; align-items:center;">
            <input type="range" id="finance-ticket-range" min="10" max="150" value="${userTeam.ticketPrice}" style="flex-grow:1; accent-color:var(--accent-emerald);" oninput="window.updateTicketPriceLabel()">
            <span style="font-size:18px; font-weight:700; width:70px; text-align:right;" id="ticket-price-val">R$ ${userTeam.ticketPrice}</span>
          </div>
          <span style="font-size:11px; color:var(--text-muted); margin-top:6px; display:block;">Preço alto reduz a presença. Fidelidade da torcida: ${userTeam.fansLoyalty}%</span>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:12px; border-radius:8px; background:rgba(255,255,255,0.02); border:1px solid var(--border-glow); font-size:12px;">
          <div>
            <span style="color:var(--text-muted);">Público Estimado:</span>
            <div id="projected-attendance-val" style="font-weight:700; margin-top:2px;">${expectedAttendance.toLocaleString()} (~${occupancy}% de ocupação)</div>
          </div>
          <div>
            <span style="color:var(--text-muted);">Renda Estimada:</span>
            <div id="projected-revenue-val" style="font-weight:700; color:var(--accent-emerald); margin-top:2px;">${formatMoney(projectedRevenue)}</div>
          </div>
        </div>

        <div style="border-top:1px solid var(--border-glow); padding-top:20px;">
          <label style="font-size:12px; color:var(--text-muted); font-weight:600; text-transform:uppercase; margin-bottom:12px; display:block;">Ampliar Estádio</label>
          <div class="form-toggle-switch" style="display:flex; flex-direction:column; gap:8px; background:none; border:none; padding:0;">
            <div class="toggle-btn" style="border: 1px solid var(--border-glow); border-radius:8px; padding:10px; cursor:pointer;" onclick="game.upgradeStadium(5000)">+5.000 assentos<br><span style="font-size:11px; color:var(--accent-gold); font-weight:700;">R$ 6.000.000</span></div>
            <div class="toggle-btn" style="border: 1px solid var(--border-glow); border-radius:8px; padding:10px; cursor:pointer;" onclick="game.upgradeStadium(10000)">+10.000 assentos<br><span style="font-size:11px; color:var(--accent-gold); font-weight:700;">R$ 12.000.000</span></div>
            <div class="toggle-btn" style="border: 1px solid var(--border-glow); border-radius:8px; padding:10px; cursor:pointer;" onclick="game.upgradeStadium(20000)">+20.000 assentos<br><span style="font-size:11px; color:var(--accent-gold); font-weight:700;">R$ 24.000.000</span></div>
          </div>
        </div>
      </div>
    `;

    const rightCard = document.createElement("div");
    rightCard.className = "glass-card";
    
    const nextUpgradeCost = [0, 0, 1500000, 6000000, 18000000][userTeam.academyLevel + 1];
    const upgradeButtonText = userTeam.academyLevel >= 4 
      ? "Nível Máximo Atingido" 
      : `Melhorar Infraestrutura (R$ ${nextUpgradeCost.toLocaleString()})`;

    const recruitCooldown = game.state.youthAcademyTimer;
    const recruitButton = recruitCooldown > 0
      ? `<button class="btn-primary" style="background:#4b5563; border-color:#4b5563; cursor:not-allowed;" disabled>Recrutar da Base (${recruitCooldown} sem. restantes)</button>`
      : `<button class="btn-primary" onclick="game.pullYouthAcademy()">Recrutar Promessa (${formatMoney(userTeam.academyLevel === 1 ? 500000 : userTeam.academyLevel === 2 ? 1500000 : userTeam.academyLevel === 3 ? 3500000 : 8000000)})</button>`;

    rightCard.innerHTML = `
      <h3 class="card-title">Categorias de Base</h3>
      <div style="display:flex; flex-direction:column; gap:20px;">
        <div>
          <span style="font-size:12px; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Nível de Instalações</span>
          <div style="font-size:24px; font-weight:800; color:var(--accent-cyan); margin-top:4px;">${game.getAcademyLevelName(userTeam.academyLevel)}</div>
          <span style="font-size:11px; color:var(--text-muted); margin-top:4px; display:block;">Manutenção semanal da base: ${formatMoney(userTeam.academyLevel === 1 ? 50000 : userTeam.academyLevel === 2 ? 150000 : userTeam.academyLevel === 3 ? 350000 : 600000)}</span>
        </div>

        <div style="border-top:1px solid var(--border-glow); padding-top:20px;">
          <label style="font-size:12px; color:var(--text-muted); font-weight:600; text-transform:uppercase; margin-bottom:8px; display:block;">Alterar Categoria de Base</label>
          <div style="display:flex; gap:8px;">
            <select id="academy-level-selector" class="form-control" style="flex:1;">
              <option value="1" ${userTeam.academyLevel === 1 ? 'selected' : ''}>Básica (Manutenção: R$ 50 mil/sem | Nível f:45-65)</option>
              <option value="2" ${userTeam.academyLevel === 2 ? 'selected' : ''}>Aprimorada (Manutenção: R$ 150 mil/sem | Nível f:55-75)</option>
              <option value="3" ${userTeam.academyLevel === 3 ? 'selected' : ''}>Excelente (Manutenção: R$ 350 mil/sem | Nível f:65-82)</option>
              <option value="4" ${userTeam.academyLevel === 4 ? 'selected' : ''}>Classe Mundial (Manutenção: R$ 600 mil/sem | Nível f:72-88)</option>
            </select>
            <button class="btn-primary" style="width:auto; padding:0 16px; font-size:13px;" onclick="window.handleSetAcademyLevel()">Confirmar</button>
          </div>
          <span style="font-size:11px; color:var(--text-muted); margin-top:6px; display:block;">Melhorar o nível exige investimento imediato. Reduzir o nível é gratuito e economiza custos de manutenção semanais.</span>
        </div>

        <div style="border-top:1px solid var(--border-glow); padding-top:20px; display:flex; flex-direction:column; gap:12px;">
          ${recruitButton}
          ${userTeam.academyLevel < 4 ? `<button class="btn-secondary" style="border-color:var(--accent-cyan); color:var(--accent-cyan);" onclick="window.handleUpgradeAcademy()">${upgradeButtonText}</button>` : ""}
        </div>
      </div>
    `;

    wrapper.appendChild(leftCard);
    wrapper.appendChild(rightCard);

  } else if (activeStadiumTab === "finance") {
    // -------------------------------------------------------------
    // TAB FINANCE & LEDGER & BANKS
    // -------------------------------------------------------------
    const leftCard = document.createElement("div");
    leftCard.className = "glass-card";
    leftCard.style.padding = "20px";
    leftCard.innerHTML = `
      <h3 class="card-title" style="margin-bottom:16px;">Demonstrativo Financeiro (P&L)</h3>
      ${renderLedgerTable(userTeam)}
    `;

    const rightCard = document.createElement("div");
    rightCard.className = "glass-card";
    
    // Calculate bank limits based on reputation
    const rep = userTeam.reputation || 3.0;
    const limitPopular = Math.round(rep * 2000000);
    const limitComercial = Math.round(rep * 5000000);
    const limitShark = Math.round(rep * 12000000);

    rightCard.innerHTML = `
      <h3 class="card-title">Linhas de Crédito & Bancos</h3>
      <div style="display:flex; flex-direction:column; gap:16px;">
        
        <div>
          <span style="font-size:12px; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Dívida Bancária Total</span>
          <div style="font-size:24px; font-weight:800; color:${userTeam.loan > 0 ? 'var(--accent-rose)' : 'var(--text-main)'}; margin-top:4px;">${formatMoney(userTeam.loan)}</div>
          <span style="font-size:11px; color:var(--text-muted); margin-top:4px; display:block;">O limite máximo de endividamento do clube é de ${formatMoney(limitShark)}.</span>
        </div>

        <!-- 1. Banco Popular -->
        <div style="border-top:1px solid var(--border-glow); padding-top:12px; display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong style="color:var(--text-main); font-size:13px;">1. Banco do Povo (Crédito Social)</strong>
              <div style="font-size:11px; color:var(--text-muted);">Juros: <span style="color:var(--accent-emerald);">0.5% / semana</span> | Limite: ${formatMoney(limitPopular)}</div>
            </div>
            <span class="badge" style="background:rgba(16,185,129,0.1); color:var(--accent-emerald); font-weight:700;">Dívida: ${formatMoney(userTeam.loans.popular || 0)}</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:4px;">
            <div style="display:flex; gap:4px;">
              <input type="number" id="input-borrow-popular" class="form-control" style="font-size:12px; padding:6px;" placeholder="Pegar R$">
              <button class="btn-primary" style="padding:6px 10px; font-size:12px; width:auto;" onclick="window.handleBankBorrow('popular')">Pegar</button>
            </div>
            <div style="display:flex; gap:4px;">
              <input type="number" id="input-repay-popular" class="form-control" style="font-size:12px; padding:6px;" placeholder="Pagar R$">
              <button class="btn-secondary" style="padding:6px 10px; font-size:12px; width:auto; border-color:var(--accent-rose); color:var(--accent-rose);" onclick="window.handleBankRepay('popular')">Pagar</button>
            </div>
          </div>
        </div>

        <!-- 2. Banco Comercial -->
        <div style="border-top:1px solid var(--border-glow); padding-top:12px; display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong style="color:var(--text-main); font-size:13px;">2. Banco Comercial Nacional</strong>
              <div style="font-size:11px; color:var(--text-muted);">Juros: <span style="color:var(--accent-blue);">0.9% / semana</span> | Limite: ${formatMoney(limitComercial)}</div>
            </div>
            <span class="badge" style="background:rgba(59,130,246,0.1); color:var(--accent-blue); font-weight:700;">Dívida: ${formatMoney(userTeam.loans.comercial || 0)}</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:4px;">
            <div style="display:flex; gap:4px;">
              <input type="number" id="input-borrow-comercial" class="form-control" style="font-size:12px; padding:6px;" placeholder="Pegar R$">
              <button class="btn-primary" style="padding:6px 10px; font-size:12px; width:auto; background:var(--accent-blue); border-color:var(--accent-blue);" onclick="window.handleBankBorrow('comercial')">Pegar</button>
            </div>
            <div style="display:flex; gap:4px;">
              <input type="number" id="input-repay-comercial" class="form-control" style="font-size:12px; padding:6px;" placeholder="Pagar R$">
              <button class="btn-secondary" style="padding:6px 10px; font-size:12px; width:auto; border-color:var(--accent-rose); color:var(--accent-rose);" onclick="window.handleBankRepay('comercial')">Pagar</button>
            </div>
          </div>
        </div>

        <!-- 3. Shark Capital -->
        <div style="border-top:1px solid var(--border-glow); padding-top:12px; display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong style="color:var(--text-main); font-size:13px;">3. Shark Capital (Investment Fund)</strong>
              <div style="font-size:11px; color:var(--text-muted);">Juros: <span style="color:var(--accent-rose);">1.8% / semana</span> | Limite: ${formatMoney(limitShark)}</div>
            </div>
            <span class="badge" style="background:rgba(239,68,68,0.1); color:var(--accent-rose); font-weight:700;">Dívida: ${formatMoney(userTeam.loans.shark || 0)}</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:4px;">
            <div style="display:flex; gap:4px;">
              <input type="number" id="input-borrow-shark" class="form-control" style="font-size:12px; padding:6px;" placeholder="Pegar R$">
              <button class="btn-primary" style="padding:6px 10px; font-size:12px; width:auto; background:var(--accent-rose); border-color:var(--accent-rose);" onclick="window.handleBankBorrow('shark')">Pegar</button>
            </div>
            <div style="display:flex; gap:4px;">
              <input type="number" id="input-repay-shark" class="form-control" style="font-size:12px; padding:6px;" placeholder="Pagar R$">
              <button class="btn-secondary" style="padding:6px 10px; font-size:12px; width:auto; border-color:var(--accent-rose); color:var(--accent-rose);" onclick="window.handleBankRepay('shark')">Pagar</button>
            </div>
          </div>
        </div>

      </div>
    `;

    wrapper.appendChild(leftCard);
    wrapper.appendChild(rightCard);

  } else if (activeStadiumTab === "sponsors") {
    // -------------------------------------------------------------
    // TAB SPONSORS & MERCHANDISING
    // -------------------------------------------------------------
    const leftCard = document.createElement("div");
    leftCard.className = "glass-card";
    
    // Master sponsor slot status
    const mActive = userTeam.sponsors.master && userTeam.sponsors.master.weeksRemaining > 0;
    const masterSlot = mActive
      ? `<div style="border: 1px solid var(--border-glow); border-radius:8px; padding:12px; display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between;">
            <strong style="color:var(--accent-cyan); font-size:14px;">${userTeam.sponsors.master.name} (Máster)</strong>
            <span class="badge" style="background:rgba(16,185,129,0.15); color:var(--accent-emerald); font-weight:700;">${userTeam.sponsors.master.weeksRemaining} sem. restantes</span>
          </div>
          <div style="font-size:12px; color:var(--text-muted); display:grid; grid-template-columns:1fr 1fr; gap:6px; border-top:1px dashed var(--border-glow); padding-top:6px; margin-top:4px;">
            <div>Semanal: <strong>${formatMoney(userTeam.sponsors.master.weeklyFee)}</strong></div>
            <div>Bônus Vitória: <strong>${userTeam.sponsors.master.winBonus > 0 ? formatMoney(userTeam.sponsors.master.winBonus) : "Nenhum"}</strong></div>
            <div style="grid-column:span 2;">Bônus de Título: <strong>${userTeam.sponsors.master.titleBonus > 0 ? formatMoney(userTeam.sponsors.master.titleBonus) : "Nenhum"}</strong></div>
          </div>
        </div>`
      : `<div style="border: 1px dashed var(--accent-rose); border-radius:8px; padding:12px; text-align:center;">
          <div style="color:var(--accent-rose); font-weight:700; font-size:13px; margin-bottom:8px;">⚠️ SEM PATROCINADOR MÁSTER</div>
          <button class="btn-primary" style="padding:6px 12px; font-size:12px; width:auto;" onclick="window.openSponsorNegotiation('master')">Negociar Patrocínio Máster</button>
        </div>`;

    // Sleeve sponsor slot status
    const slActive = userTeam.sponsors.sleeve && userTeam.sponsors.sleeve.weeksRemaining > 0;
    const sleeveSlot = slActive
      ? `<div style="border: 1px solid var(--border-glow); border-radius:8px; padding:12px; display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between;">
            <strong style="color:var(--accent-cyan); font-size:14px;">${userTeam.sponsors.sleeve.name} (Manga)</strong>
            <span class="badge" style="background:rgba(16,185,129,0.15); color:var(--accent-emerald); font-weight:700;">${userTeam.sponsors.sleeve.weeksRemaining} sem. restantes</span>
          </div>
          <div style="font-size:12px; color:var(--text-muted); display:grid; grid-template-columns:1fr 1fr; gap:6px; border-top:1px dashed var(--border-glow); padding-top:6px; margin-top:4px;">
            <div>Semanal: <strong>${formatMoney(userTeam.sponsors.sleeve.weeklyFee)}</strong></div>
            <div>Bônus Vitória: <strong>${userTeam.sponsors.sleeve.winBonus > 0 ? formatMoney(userTeam.sponsors.sleeve.winBonus) : "Nenhum"}</strong></div>
          </div>
        </div>`
      : `<div style="border: 1px dashed var(--accent-rose); border-radius:8px; padding:12px; text-align:center;">
          <div style="color:var(--accent-rose); font-weight:700; font-size:13px; margin-bottom:8px;">⚠️ SEM PATROCINADOR DE MANGA</div>
          <button class="btn-primary" style="padding:6px 12px; font-size:12px; width:auto; background:var(--accent-blue); border-color:var(--accent-blue);" onclick="window.openSponsorNegotiation('sleeve')">Negociar Patrocínio Manga</button>
        </div>`;

    // Stadium Naming sponsor slot status
    const nActive = userTeam.sponsors.stadium && userTeam.sponsors.stadium.weeksRemaining > 0;
    const namingSlot = nActive
      ? `<div style="border: 1px solid var(--border-glow); border-radius:8px; padding:12px; display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between;">
            <strong style="color:var(--accent-cyan); font-size:14px;">${userTeam.sponsors.stadium.name} (Naming Rights)</strong>
            <span class="badge" style="background:rgba(16,185,129,0.15); color:var(--accent-emerald); font-weight:700;">${userTeam.sponsors.stadium.weeksRemaining} sem. restantes</span>
          </div>
          <div style="font-size:12px; color:var(--text-muted); display:grid; grid-template-columns:1fr 1fr; gap:6px; border-top:1px dashed var(--border-glow); padding-top:6px; margin-top:4px;">
            <div>Semanal: <strong>${formatMoney(userTeam.sponsors.stadium.weeklyFee)}</strong></div>
            <div style="grid-column:span 2;">Bônus de Título: <strong>${userTeam.sponsors.stadium.titleBonus > 0 ? formatMoney(userTeam.sponsors.stadium.titleBonus) : "Nenhum"}</strong></div>
          </div>
        </div>`
      : `<div style="border: 1px dashed var(--accent-rose); border-radius:8px; padding:12px; text-align:center;">
          <div style="color:var(--accent-rose); font-weight:700; font-size:13px; margin-bottom:8px;">⚠️ SEM CONTRATO DE NAMING RIGHTS</div>
          <button class="btn-primary" style="padding:6px 12px; font-size:12px; width:auto; background:var(--accent-gold); border-color:var(--accent-gold);" onclick="window.openSponsorNegotiation('stadium')">Negociar Naming Rights</button>
        </div>`;

    leftCard.innerHTML = `
      <h3 class="card-title">Parcerias e Patrocínios</h3>
      <div style="display:flex; flex-direction:column; gap:16px;">
        ${masterSlot}
        ${sleeveSlot}
        ${namingSlot}
      </div>
    `;

    const rightCard = document.createElement("div");
    rightCard.className = "glass-card";

    // Merchandising / Superstars evaluation
    let superstarsHtml = "";
    userTeam.squad.forEach(p => {
      if (p.rating >= 90) {
        superstarsHtml += `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.02);"><span>⭐ ${p.name} (${p.position})</span><span style="color:var(--accent-cyan); font-weight:700;">+15% vendas</span></div>`;
      } else if (p.rating >= 83) {
        superstarsHtml += `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.02);"><span>⭐ ${p.name} (${p.position})</span><span style="color:var(--accent-cyan);">+5% vendas</span></div>`;
      }
    });

    if (superstarsHtml === "") {
      superstarsHtml = `<div style="font-size:12px; color:var(--text-muted); text-align:center; padding:10px 0;">Nenhum jogador superstar no elenco (Força >= 83) para engajar a torcida.</div>`;
    }

    // Streak hype evaluation
    let streakText = "Nenhum bônus ativo";
    let streakColor = "var(--text-muted)";
    if (userTeam.form && userTeam.form.length > 0) {
      const lastForm = userTeam.form[userTeam.form.length - 1];
      if (lastForm === 'W') {
        const wins = userTeam.form.filter(f => f === 'W').length;
        if (wins >= 3) {
          streakText = `🔥 Alta Demanda! Sequência vitoriosa (+45% vendas)`;
          streakColor = "var(--accent-gold)";
        } else {
          streakText = `📈 Hype Positivo! Vitória na última rodada (+20% vendas)`;
          streakColor = "var(--accent-emerald)";
        }
      } else if (lastForm === 'L') {
        streakText = `📉 Queda de Vendas! Derrota na última rodada (-10% vendas)`;
        streakColor = "var(--accent-rose)";
      }
    }

    rightCard.innerHTML = `
      <h3 class="card-title">Marketing & Merchandising</h3>
      <div style="display:flex; flex-direction:column; gap:16px; font-size:13px;">
        
        <div>
          <span style="font-size:11px; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Engajamento de Fãs</span>
          <div style="font-weight:700; margin-top:2px;">Fidelidade Atual: <span style="color:var(--accent-emerald);">${userTeam.fansLoyalty}%</span></div>
        </div>

        <div style="border-top:1px solid var(--border-glow); padding-top:12px;">
          <span style="font-size:11px; color:var(--text-muted); font-weight:600; text-transform:uppercase; display:block; margin-bottom:6px;">Impacto de Resultados</span>
          <div style="font-weight:700; color:${streakColor};">${streakText}</div>
        </div>

        <div style="border-top:1px solid var(--border-glow); padding-top:12px;">
          <span style="font-size:11px; color:var(--text-muted); font-weight:600; text-transform:uppercase; display:block; margin-bottom:8px;">Jogadores Populares (Superstars)</span>
          <div style="display:flex; flex-direction:column; gap:4px;">
            ${superstarsHtml}
          </div>
        </div>

        <div style="border-top:1px solid var(--border-glow); padding-top:12px; display:flex; justify-content:space-between; align-items:center;">
          <span>Vendas de Produtos na Temporada:</span>
          <strong style="color:var(--accent-emerald); font-size:15px;">${formatMoney(userTeam.financeLog.seasonTotal.merchandising)}</strong>
        </div>

      </div>
    `;

    wrapper.appendChild(leftCard);
    wrapper.appendChild(rightCard);
  }

  container.appendChild(wrapper);
}

// Render History (Histórico) View
function renderHistory(container) {
  const card = document.createElement("div");
  card.className = "glass-card";

  let trophiesHtml = "";
  game.state.manager.trophies.forEach(t => {
    trophiesHtml += `
      <div class="history-item">
        <span class="title">🏆 ${t.title} (Temporada S${t.year - 2025})</span>
        <span class="winner">Campeão com o ${t.team}</span>
      </div>
    `;
  });

  if (game.state.manager.trophies.length === 0) {
    trophiesHtml = `<div style="text-align:center; padding:30px; color:var(--text-muted); font-size:13px;">Sua galeria de troféus está vazia por enquanto. Conquiste sua primeira taça!</div>`;
  }

  card.innerHTML = `
    <h3 class="card-title">Galeria de Troféus</h3>
    <div>
      ${trophiesHtml}
    </div>
  `;
  container.appendChild(card);
}

// Player details Renewal Contract Modals
let activeRenewalPlayer = null;

function openContractRenewalModal(playerId) {
  const pDetails = game.findPlayerById(playerId);
  if (!pDetails) return;

  activeRenewalPlayer = pDetails.player;

  const modalContent = document.getElementById("modal-player-detail-content");
  
  // Demanded renewal salary based on rating and age
  const demandedSalary = Math.round(activeRenewalPlayer.salary * 1.1);

  modalContent.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:16px;">
      <div>
        <span style="font-weight:700; font-size:16px;">${activeRenewalPlayer.name}</span>
        <span class="badge badge-position" style="margin-left:8px;">${activeRenewalPlayer.position}</span>
        <span class="badge badge-rating" style="margin-left:4px;">${activeRenewalPlayer.rating}</span>
      </div>

      <div style="font-size:13px; color:var(--text-muted); line-height:1.6;">
        <div>Idade: <strong>${activeRenewalPlayer.age} anos</strong></div>
        <div>Nacionalidade: <strong>${activeRenewalPlayer.nationality}</strong></div>
        <div>Duração do contrato atual: <strong>${activeRenewalPlayer.contract} anos</strong></div>
        <div>Salário semanal atual: <strong>${formatMoney(activeRenewalPlayer.salary)}</strong></div>
      </div>

      <div style="border-top:1px solid var(--border-glow); padding-top:16px;">
        <h4 style="font-size:13px; font-weight:700; text-transform:uppercase; margin-bottom:12px;">Nova Proposta de Renovação</h4>
        <div class="form-group">
          <label>Salário Semanal Oferecido (Exigido: ~${formatMoney(demandedSalary)})</label>
          <input type="number" id="renew-salary-input" class="form-control" value="${demandedSalary}">
        </div>
        <div class="form-group">
          <label>Novo Contrato (Anos)</label>
          <select id="renew-contract-years" class="form-control">
            <option value="1">1 Ano</option>
            <option value="2">2 Anos</option>
            <option value="3" selected>3 Anos</option>
            <option value="4">4 Anos</option>
            <option value="5">5 Anos</option>
          </select>
        </div>
        <button class="btn-primary" onclick="confirmContractRenewal()">Confirmar Renovação</button>
      </div>
    </div>
  `;

  openModal("modal-player-detail");
}

function confirmContractRenewal() {
  const salary = parseInt(document.getElementById("renew-salary-input").value);
  const years = parseInt(document.getElementById("renew-contract-years").value);

  if (isNaN(salary) || salary <= 0) {
    alert("Digite um salário válido.");
    return;
  }

  // Renewal decision
  const demandSalary = Math.round(activeRenewalPlayer.salary * 1.05);
  if (salary >= demandSalary) {
    activeRenewalPlayer.salary = salary;
    activeRenewalPlayer.contract = years;
    activeRenewalPlayer.morale = Math.min(100, activeRenewalPlayer.morale + 15);
    game.saveGame();
    alert(`Contrato renovado com sucesso! ${activeRenewalPlayer.name} assinou por mais ${years} anos.`);
    closeModal("modal-player-detail");
    renderApp();
  } else {
    alert("O jogador rejeitou a sua proposta salarial. Aumente a proposta para renovar.");
  }
}

// Bids offer incoming modal
function showPendingOfferModal() {
  const offer = game.state.pendingOffer;
  if (!offer) return;

  const player = game.findPlayerById(offer.playerId).player;

  if (confirm(`PROPOSTA RECEBIDA!\n\nO ${offer.bidderName} oferece R$ ${offer.offerPrice.toLocaleString()} pelo jogador ${player.name} (${player.position}, f:${player.rating}).\n\nAceitar vender o jogador?`)) {
    // Sell!
    const userTeam = game.findTeamById(game.state.manager.teamId);
    
    // Remove from squad
    userTeam.squad = userTeam.squad.filter(p => p.id !== player.id);
    userTeam.budget += offer.offerPrice;

    // Remove from listed
    game.state.transferList = game.state.transferList.filter(item => item.playerId !== player.id);

    game.addNews("Transferência!", `${userTeam.name} vendeu o jogador ${player.name} para o ${offer.bidderName} por R$ ${offer.offerPrice.toLocaleString()}!`);
    alert(`Vendido! R$ ${offer.offerPrice.toLocaleString()} adicionados ao caixa.`);
  } else {
    alert("Você recusou a proposta pelo jogador.");
  }

  game.state.pendingOffer = null;
  game.saveGame();
  renderApp();
}

// Match Simulation Control
let matchSimSpeed = 1; // 1 = normal, 3 = fast, 10 = super-fast

function handlePlayNextMatch() {
  if (game.setupMatchSimulation()) {
    // Open Match overlay
    document.getElementById("app-container").style.display = "none";
    document.getElementById("match-screen").style.display = "flex";

    // Setup headers
    const match = game.currentMatch;
    document.getElementById("match-team-home-name").textContent = match.homeTeam.name;
    document.getElementById("match-team-away-name").textContent = match.awayTeam.name;
    
    // Set shields
    document.getElementById("match-team-home-shield").style.background = `linear-gradient(135deg, ${match.homeTeam.colors[0]} 50%, ${match.homeTeam.colors[1]} 50%)`;
    document.getElementById("match-team-away-shield").style.background = `linear-gradient(135deg, ${match.awayTeam.colors[0]} 50%, ${match.awayTeam.colors[1]} 50%)`;

    // Clear commentaries
    document.getElementById("match-commentary-log").innerHTML = "";
    document.getElementById("match-live-score").textContent = "0 - 0";
    document.getElementById("match-live-timer").textContent = "1'";

    // Tactical buttons highlight
    setMatchMentalityActiveButton(match.isUserHome ? match.homeTeam.mentality : match.awayTeam.mentality);

    // Render other live matches placeholder list
    renderOtherLiveMatchesList();

    // Reset end flag and Start Clock Tick
    matchEndHandled = false;
    startMatchTimer();
  }
}

function renderOtherLiveMatchesList() {
  const container = document.getElementById("match-live-other-scores");
  container.innerHTML = "";

  const allMatches = game.currentMatch.info.allMatches;
  const userMatch = game.currentMatch.info.match;

  allMatches.forEach(m => {
    if (m.homeId === userMatch.homeId && m.awayId === userMatch.awayId) return;

    const home = game.findTeamById(m.homeId) || { name: m.homeId || "A definir" };
    const away = game.findTeamById(m.awayId) || { name: m.awayId || "A definir" };

    const row = document.createElement("div");
    row.className = "sidebar-live-match-row";
    row.id = `other-match-${m.homeId}-${m.awayId}`;
    row.innerHTML = `
      <span>${home.name}</span>
      <span class="score" id="score-${m.homeId}-${m.awayId}">0 - 0</span>
      <span>${away.name}</span>
    `;
    container.appendChild(row);
  });
}

function updateOtherLiveMatchesScores() {
  const allMatches = game.currentMatch.info.allMatches;
  const userMatch = game.currentMatch.info.match;

  allMatches.forEach(m => {
    if (m.homeId === userMatch.homeId && m.awayId === userMatch.awayId) return;

    const el = document.getElementById(`score-${m.homeId}-${m.awayId}`);
    if (el) {
      el.textContent = `${m.scoreHome || 0} - ${m.scoreAway || 0}`;
    }
  });
}

let matchEndHandled = false;

function startMatchTimer() {
  // Clear any existing interval
  if (game.matchInterval) {
    clearInterval(game.matchInterval);
    game.matchInterval = null;
  }

  const delay = matchSimSpeed === 1 ? 1500 : (matchSimSpeed === 3 ? 500 : 150);

  game.matchInterval = setInterval(() => {
    if (!game.currentMatch) {
      clearInterval(game.matchInterval);
      game.matchInterval = null;
      return;
    }

    game.tickMatch();
    
    const match = game.currentMatch;
    if (!match) return;
    
    document.getElementById("match-live-timer").textContent = `${match.minute}'`;
    document.getElementById("match-live-score").textContent = `${match.scoreHome} - ${match.scoreAway}`;
    document.getElementById("match-live-stats-bar").textContent = `Chutes: ${match.shotsHome} x ${match.shotsAway} | Pos: ${match.possession}% - ${100 - match.possession}%`;

    // Render commentaries
    const log = document.getElementById("match-commentary-log");
    log.innerHTML = "";
    match.commentary.forEach(c => {
      const row = document.createElement("div");
      row.className = `commentary-row ${c.type}`;
      row.innerHTML = `
        <span class="minute-tag">${c.min}'</span>
        <span>${c.txt}</span>
      `;
      log.appendChild(row);
    });

    // Update other round scores
    updateOtherLiveMatchesScores();

    if (match.minute >= 90 && !matchEndHandled) {
      matchEndHandled = true;
      clearInterval(game.matchInterval);
      game.matchInterval = null;
      
      // Save reference before endMatch nullifies currentMatch
      const homeName = match.homeTeam.name;
      const awayName = match.awayTeam.name;
      const sH = match.scoreHome;
      const sA = match.scoreAway;
      
      setTimeout(() => {
        showCustomAlert(`Fim de jogo! Resultado final: ${homeName} ${sH} x ${sA} ${awayName}`, "Fim de Jogo", () => {
          game.endMatch();
          document.getElementById("match-screen").style.display = "none";
          document.getElementById("app-container").style.display = "flex";
          matchEndHandled = false;
          renderApp();
        });
      }, 800);
    }
  }, delay);
}

function pauseMatchSim() {
  if (game.matchInterval) {
    clearInterval(game.matchInterval);
    game.matchInterval = null;
  }
}

window.pauseMatchSim = pauseMatchSim; // expose globally for engine
window.startMatchTimer = startMatchTimer; // expose globally for engine

function setMatchSimSpeed(speed) {
  matchSimSpeed = speed;
  
  document.querySelectorAll(".sim-speed-btn").forEach(btn => {
    btn.classList.remove("active");
  });
  
  if (speed === 1) document.getElementById("btn-speed-1x").classList.add("active");
  else if (speed === 3) document.getElementById("btn-speed-3x").classList.add("active");
  else if (speed === 10) document.getElementById("btn-speed-10x").classList.add("active");

  if (game.currentMatch) {
    startMatchTimer();
  }
}

function skipMatchSim() {
  pauseMatchSim();
  if (game.currentMatch && !matchEndHandled) {
    matchEndHandled = true;
    // Jump minute to 90 and finish immediately
    const match = game.currentMatch;
    match.isSkipping = true;
    while (match.minute < 90) {
      match.minute++;
      game.simulateUserMatchMinute(match.minute);
      if (match.minute % 10 === 0 || match.minute === 90) {
        game.simulateOtherRoundMatchesStep(match.minute);
      }
    }
    
    // Trigger scoreboard refresh
    document.getElementById("match-live-score").textContent = `${match.scoreHome} - ${match.scoreAway}`;
    document.getElementById("match-live-timer").textContent = "90'";
    updateOtherLiveMatchesScores();

    // Save references before endMatch nullifies them
    const homeName = match.homeTeam.name;
    const awayName = match.awayTeam.name;
    const sH = match.scoreHome;
    const sA = match.scoreAway;

    setTimeout(() => {
      showCustomAlert(`Resultado Final: ${homeName} ${sH} x ${sA} ${awayName}`, "Fim de Jogo", () => {
        game.endMatch();
        document.getElementById("match-screen").style.display = "none";
        document.getElementById("app-container").style.display = "flex";
        matchEndHandled = false;
        renderApp();
      });
    }, 500);
  }
}

function changeMatchMentality(mentality) {
  if (game.currentMatch) {
    const userTeam = game.findTeamById(game.state.manager.teamId);
    userTeam.mentality = mentality;
    game.recalculateLiveForce();
    setMatchMentalityActiveButton(mentality);
    
    // Add commentary
    game.currentMatch.commentary.unshift({
      min: game.currentMatch.minute,
      txt: `TÁTICA: O técnico ${game.state.manager.name} alterou a mentalidade tática da equipe para ${mentality === 'defensive' ? 'Defensiva' : (mentality === 'balanced' ? 'Equilibrada' : 'Ofensiva')}.`,
      type: "system"
    });
  }
}

function setMatchMentalityActiveButton(mentality) {
  document.querySelectorAll(".match-quick-tactic-btn").forEach(btn => btn.classList.remove("active"));
  if (mentality === "defensive") document.getElementById("quick-tactic-defensive").classList.add("active");
  else if (mentality === "balanced") document.getElementById("quick-tactic-balanced").classList.add("active");
  else if (mentality === "offensive") document.getElementById("quick-tactic-offensive").classList.add("active");
}

// Mid-game Match Substitutions Modal
function openMatchSubModal() {
  pauseMatchSim();

  const userTeam = game.findTeamById(game.state.manager.teamId);
  const starters = userTeam.squad.filter(p => p.isStarter);

  const outSelect = document.getElementById("match-sub-out-select");
  outSelect.innerHTML = "";

  starters.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name} (${p.position}, f:${p.rating}, cond:${p.condition}%)`;
    outSelect.appendChild(opt);
  });

  updateMatchSubReserveDropdown();
  openModal("modal-match-sub");
}

function updateMatchSubReserveDropdown() {
  const userTeam = game.findTeamById(game.state.manager.teamId);
  // Get reserves who are marked as sub (bench) and not playing
  const bench = userTeam.squad.filter(p => p.isSub && !p.isStarter);

  const inSelect = document.getElementById("match-sub-in-select");
  inSelect.innerHTML = "";

  bench.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name} (${p.position}, f:${p.rating}, cond:${p.condition}%)`;
    inSelect.appendChild(opt);
  });

  if (bench.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "Nenhum suplente escalado no banco";
    inSelect.appendChild(opt);
  }
}

function confirmMatchSubstitution() {
  const outId = document.getElementById("match-sub-out-select").value;
  const inId = document.getElementById("match-sub-in-select").value;

  const userTeam = game.findTeamById(game.state.manager.teamId);
  const playerOut = userTeam.squad.find(p => p.id === outId);
  const playerIn = userTeam.squad.find(p => p.id === inId);

  if (playerOut && playerIn) {
    playerOut.isStarter = false;
    playerOut.isSub = true;

    playerIn.isStarter = true;
    playerIn.isSub = false;

    // Add match commentary
    game.currentMatch.commentary.unshift({
      min: game.currentMatch.minute,
      txt: `Substituição realizada: Sai ${playerOut.name}, entra ${playerIn.name} (${playerIn.position}).`,
      type: "system"
    });

    game.recalculateLiveForce();
    alert(`Substituição confirmada! Sai ${playerOut.name}, entra ${playerIn.name}.`);
    closeModal("modal-match-sub");
  } else {
    alert("Selecione jogadores válidos para a substituição.");
  }

  // Resume clock
  startMatchTimer();
}

// Modal Helpers
function openModal(modalId) {
  document.getElementById(modalId).classList.add("active");
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
  // If we closed match sub modal or bank loan modal, resume game clock
  if (modalId === "modal-match-sub") {
    startMatchTimer();
  }
}

function showCustomAlert(message, title = "Aviso", callback = null) {
  const msgStr = String(message);
  document.getElementById("modal-alert-title").textContent = title;
  document.getElementById("modal-alert-message").innerHTML = msgStr.replace(/\n/g, "<br>");
  
  const btn = document.getElementById("modal-alert-btn");
  btn.onclick = function() {
    closeModal("modal-alert");
    if (callback) callback();
  };
  
  openModal("modal-alert");
}

window.showCustomAlert = showCustomAlert;
window.alert = function(msg) {
  showCustomAlert(msg);
};

// ----------------------------------------------------
// NEWS & TRANSFERS OFFER INTERACTIVE COMPONENT
// ----------------------------------------------------

function renderNews(container) {
  const newsWrapper = document.createElement("div");
  newsWrapper.className = "glass-card";
  newsWrapper.style.padding = "24px";
  newsWrapper.style.minHeight = "400px";

  const titleHtml = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glow); padding-bottom:16px; margin-bottom:20px;">
      <div>
        <h2 style="font-size:22px; font-weight:800; color:var(--accent-cyan); display:flex; align-items:center; gap:8px;">
          📰 Portal de Notícias
        </h2>
        <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Acompanhe o que está acontecendo no mundo do futebol</p>
      </div>
      <span style="background:var(--accent-emerald-opaque); color:var(--accent-emerald); font-size:12px; font-weight:700; padding:6px 12px; border-radius:6px; border:1px solid rgba(16,185,129,0.2);">
        Temporada ${game.state.season}
      </span>
    </div>
  `;

  const newsList = game.state.news || [];
  if (newsList.length === 0) {
    newsWrapper.innerHTML = `
      ${titleHtml}
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px 20px; color:var(--text-muted);">
        <span style="font-size:48px; margin-bottom:16px;">📭</span>
        <div style="font-size:16px; font-weight:600;">Nenhuma notícia registrada</div>
        <p style="font-size:12px; text-align:center; max-width:300px; margin-top:8px;">Conclua rodadas e avance as semanas para receber as últimas notícias do mercado e das competições.</p>
      </div>
    `;
    container.appendChild(newsWrapper);
    return;
  }

  let itemsHtml = "";
  newsList.forEach(item => {
    let categoryColor = "var(--accent-cyan)";
    let categoryIcon = "📢";
    const titleLower = item.title.toLowerCase();

    if (titleLower.includes("contrata") || titleLower.includes("mercado")) {
      categoryColor = "var(--accent-blue)";
      categoryIcon = "🤝";
    } else if (titleLower.includes("campe") || titleLower.includes("vence") || titleLower.includes("título")) {
      categoryColor = "var(--accent-gold)";
      categoryIcon = "🏆";
    } else if (titleLower.includes("venda") || titleLower.includes("proposta")) {
      categoryColor = "var(--accent-emerald)";
      categoryIcon = "💰";
    } else if (titleLower.includes("rebaixamento") || titleLower.includes("rescis")) {
      categoryColor = "var(--accent-rose)";
      categoryIcon = "⚠️";
    } else if (titleLower.includes("obra") || titleLower.includes("estádio")) {
      categoryColor = "var(--accent-cyan)";
      categoryIcon = "🏗️";
    }

    itemsHtml += `
      <div style="background: rgba(255,255,255,0.02); border:1px solid var(--border-glow); border-radius:10px; padding:16px; margin-bottom:12px; display:flex; gap:16px; align-items:flex-start; transition: transform 0.2s, background-color 0.2s;" class="news-item-hover">
        <div style="font-size:24px; padding:10px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid var(--border-glow); display:flex; align-items:center; justify-content:center; width:48px; height:48px;">
          ${categoryIcon}
        </div>
        <div style="flex-grow:1;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <span style="font-size:12px; font-weight:700; text-transform:uppercase; color:${categoryColor}; letter-spacing:0.5px;">${item.title}</span>
            <span style="font-size:11px; color:var(--text-muted); font-weight:600; background:rgba(255,255,255,0.03); padding:2px 6px; border-radius:4px;">Semana ${item.week} | Ano ${item.year}</span>
          </div>
          <p style="font-size:13.5px; color:#e2e8f0; margin-top:6px; line-height:1.5;">${item.content}</p>
        </div>
      </div>
    `;
  });

  newsWrapper.innerHTML = `
    ${titleHtml}
    <div style="display:flex; flex-direction:column;">
      ${itemsHtml}
    </div>
  `;
  container.appendChild(newsWrapper);
}

function checkPendingOffers() {
  if (game.state && game.state.pendingOffer) {
    const offer = game.state.pendingOffer;
    const userTeam = game.findTeamById(game.state.manager.teamId);
    const player = userTeam.squad.find(p => p.id === offer.playerId);
    
    if (!player) {
      game.state.pendingOffer = null;
      game.saveGame();
      return;
    }

    const modalBody = document.getElementById("modal-pending-offer-body");
    if (modalBody) {
      modalBody.innerHTML = `
        <div style="text-align:center; margin-bottom:20px; padding: 0 16px;">
          <div style="font-size: 18px; font-weight:800; margin-bottom:6px; color:#fff;">${player.name}</div>
          <div style="font-size:12px; color:var(--text-muted); margin-bottom:20px;">
            Posição: <span style="color:#fff;">${player.position}</span> | 
            Força: <span style="color:var(--accent-emerald); font-weight:700;">${player.rating}</span> | 
            Idade: <span style="color:#fff;">${player.age} anos</span>
          </div>
          
          <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-glow); border-radius:12px; padding:20px; margin-bottom:24px; box-shadow: inset 0 2px 10px rgba(0,0,0,0.2);">
            <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:700; letter-spacing:0.5px;">Clube Interessado</div>
            <div style="font-size:18px; font-weight:800; color:var(--accent-cyan); margin:6px 0 16px 0;">${offer.bidderName}</div>
            
            <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top:16px;">
              <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:700; letter-spacing:0.5px;">Valor de Mercado</div>
              <div style="font-size:14px; font-weight:600; color:var(--text-muted); margin-top:2px;">${formatMoney(player.value)}</div>
            </div>
            
            <div style="margin-top:16px; border-top: 1px solid rgba(255,255,255,0.05); padding-top:16px;">
              <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:700; letter-spacing:0.5px;">Valor Oferecido</div>
              <div style="font-size:24px; font-weight:900; color:var(--accent-emerald); text-shadow: 0 0 10px rgba(16,185,129,0.3); margin-top:4px;">${formatMoney(offer.offerPrice)}</div>
            </div>
          </div>
        </div>
        
        <div style="display:flex; gap:16px; padding: 0 16px;">
          <button class="btn-primary" style="flex:1; background: var(--accent-emerald); font-weight:700;" onclick="handleAcceptPendingOffer()">Aceitar Venda</button>
          <button class="btn-primary" style="flex:1; background: var(--accent-rose); font-weight:700;" onclick="handleRejectPendingOffer()">Recusar Proposta</button>
        </div>
      `;
      openModal("modal-pending-offer");
    }
  }
}

function handleAcceptPendingOffer() {
  closeModal("modal-pending-offer");
  game.acceptPendingOffer();
}

function handleRejectPendingOffer() {
  closeModal("modal-pending-offer");
  game.rejectPendingOffer();
}

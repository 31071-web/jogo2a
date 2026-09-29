/* ========================================================
   ECOSHIFT — MOTOR PRINCIPAL DO JOGO (GAME ENGINE)
   Desenvolvido em JavaScript puro e Canvas HTML5 2D.
   Física sólida, transição de mundo fluida, partículas,
   suporte multiplataforma (desktop e touch mobile) e salvamento local.
   ======================================================== */

(function () {
  'use strict';

  // Polyfill para ctx.roundRect (garante compatibilidade total em qualquer navegador/dispositivo)
  if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      if (typeof r === 'undefined') r = 0;
      const radius = typeof r === 'number' ? r : 4;
      this.beginPath();
      this.moveTo(x + radius, y);
      this.lineTo(x + w - radius, y);
      this.quadraticCurveTo(x + w, y, x + w, y + radius);
      this.lineTo(x + w, y + h - radius);
      this.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      this.lineTo(x + radius, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - radius);
      this.lineTo(x, y + radius);
      this.quadraticCurveTo(x, y, x + radius, y);
      this.closePath();
      return this;
    };
  }

  // ========================================================
  // CONSTANTES & CONFIGURAÇÕES
  // ========================================================
  const V_WIDTH = 960;   // Resolução lógica de renderização (16:9)
  const V_HEIGHT = 540;
  const GRAVITY = 0.52;
  const PLAYER_SPEED = 4.2;
  const JUMP_FORCE = -11.2;
  const COYOTE_TIME = 8;    // Frames de tolerância para pulo após sair do chão
  const JUMP_BUFFER = 8;    // Frames de buffer para registrar pulo antecipado

  // ========================================================
  // ESTADO GLOBAL DO JOGO
  // ========================================================
  const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    LEVEL_CLEAR: 'level_clear',
    ENDING: 'ending'
  };

  const game = {
    state: GameState.MENU,
    currentLevelIdx: 0,
    currentLevel: null,
    world: 'polluted', // 'polluted' ou 'sustainable'

    // Transição de mundo
    shiftTimer: 0,
    shiftDuration: 24, // frames (~400ms a 60fps)
    shiftProgress: 1,
    shiftWaveRadius: 0,
    shiftWaveOrigin: { x: 0, y: 0 },

    // Estatísticas da partida
    levelStartTime: 0,
    elapsedSeconds: 0,
    shiftCount: 0,
    collectedSeedsInLevel: 0,

    // Câmera
    camera: { x: 0, y: 0 },

    // Partículas e Efeitos
    particles: [],
    ambientEntities: [], // pássaros, fumaça flutuante, folhas

    // Animação de transformação final (Fase 6)
    endingTransform: {
      active: false,
      progress: 0,
      wave: 0
    },

    // Dados salvos no localStorage
    saveData: {
      unlockedLevels: 1,
      bestTimes: {},
      collectedSeeds: {}
    }
  };

  // ========================================================
  // JOGADOR (PLAYER)
  // ========================================================
  const player = {
    x: 100,
    y: 300,
    w: 26,
    h: 46,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1, // 1: direita, -1: esquerda
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    walkFrame: 0,
    isMoving: false,
    checkpoint: { x: 100, y: 300 },
    invulnerableTimer: 0,

    // Reinicia posição
    reset(x, y) {
      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
      this.onGround = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.checkpoint = { x, y };
      this.invulnerableTimer = 0;
    }
  };

  // ========================================================
  // SISTEMA DE ENTRADA (INPUT)
  // ========================================================
  const input = {
    left: false,
    right: false,
    jump: false,
    shift: false,
    interact: false,
    // Teclas pressionadas no frame atual para pulo / shift único
    jumpPressed: false,
    shiftPressed: false,
    interactPressed: false
  };

  // ========================================================
  // ELEMENTOS DO DOM & CANVAS
  // ========================================================
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  // Overlays & UI
  const screenTitle = document.getElementById('screen-title');
  const screenPause = document.getElementById('screen-pause');
  const screenVictory = document.getElementById('screen-victory');
  const screenEnding = document.getElementById('screen-game-complete');
  const modalLevels = document.getElementById('modal-levels');
  const modalHowToPlay = document.getElementById('modal-howtoplay');
  const modalCredits = document.getElementById('modal-credits');
  const rotateOverlay = document.getElementById('rotate-device-overlay');
  const gameHud = document.getElementById('game-hud');
  const virtualControls = document.getElementById('virtual-controls');

  // HUD badges
  const hudLevelBadge = document.getElementById('hud-level-badge');
  const hudWorldBadge = document.getElementById('hud-world-badge');
  const hudSeedsBadge = document.getElementById('seeds-count');
  const hudSeedsTotal = document.getElementById('seeds-total');
  const hudHint = document.getElementById('hud-hint');
  const btnAudioToggle = document.getElementById('btn-audio-toggle');
  const btnPause = document.getElementById('btn-pause');

  // Touch buttons
  const touchLeft = document.getElementById('touch-left');
  const touchRight = document.getElementById('touch-right');
  const touchJump = document.getElementById('touch-jump');
  const touchShift = document.getElementById('touch-shift');
  const touchInteract = document.getElementById('touch-interact');

  // ========================================================
  // INICIALIZAÇÃO E PERSISTÊNCIA LOCAL
  // ========================================================
  function loadSavedData() {
    try {
      const raw = localStorage.getItem('ecoshift_save_data');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.unlockedLevels) game.saveData.unlockedLevels = parsed.unlockedLevels;
        if (parsed.bestTimes) game.saveData.bestTimes = parsed.bestTimes;
        if (parsed.collectedSeeds) game.saveData.collectedSeeds = parsed.collectedSeeds;
      }
    } catch (e) {
      console.warn('Erro ao carregar dados locais:', e);
    }
  }

  function saveGameProgress() {
    try {
      localStorage.setItem('ecoshift_save_data', JSON.stringify(game.saveData));
    } catch (e) {
      console.warn('Erro ao salvar progresso:', e);
    }
  }

  function resizeCanvas() {
    const container = document.getElementById('game-container');
    const cWidth = container.clientWidth;
    const cHeight = container.clientHeight;

    // Ajusta a resolução física interna do canvas para manter 16:9 nítido
    canvas.width = V_WIDTH;
    canvas.height = V_HEIGHT;

    // Verificação de orientação em telas de celular
    const isMobileDevice = /Android|iPhone|iPad|iPod|Touch/i.test(navigator.userAgent) || ('ontouchstart' in window);
    if (isMobileDevice && window.innerHeight > window.innerWidth) {
      rotateOverlay.classList.remove('hidden');
    } else {
      rotateOverlay.classList.add('hidden');
    }
  }

  // ========================================================
  // CONTROLE DE NÍVEIS (LEVEL MANAGEMENT)
  // ========================================================
  function startLevel(idx) {
    if (idx < 0 || idx >= GAME_LEVELS.length) idx = 0;
    game.currentLevelIdx = idx;
    game.currentLevel = JSON.parse(JSON.stringify(GAME_LEVELS[idx])); // Clone profundo

    // Estado inicial da fase: o jogo sempre inicia no mundo poluído para ser transformado!
    game.world = 'polluted';
    audioManager.setWorld('polluted');

    game.shiftCount = 0;
    game.collectedSeedsInLevel = 0;
    game.levelStartTime = Date.now();
    game.elapsedSeconds = 0;
    game.endingTransform.active = false;
    game.endingTransform.progress = 0;

    // Resetar jogador
    player.reset(game.currentLevel.spawn.x, game.currentLevel.spawn.y);

    // Resetar partículas & ambiente
    game.particles = [];
    initAmbientEntities();

    // Atualizar HUD
    hudLevelBadge.textContent = `FASE 0${game.currentLevel.id}`;
    updateWorldBadge();
    hudSeedsBadge.textContent = '0';
    hudSeedsTotal.textContent = game.currentLevel.seeds.length.toString();

    if (game.currentLevel.hint) {
      hudHint.innerHTML = `<span class="hint-key">SHIFT</span> ${game.currentLevel.hint}`;
      hudHint.style.display = 'flex';
    } else {
      hudHint.style.display = 'none';
    }

    // Ocultar menus, exibir tela de gameplay
    hideAllScreens();
    gameHud.classList.remove('hidden');

    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (isTouch) {
      virtualControls.classList.remove('hidden');
    } else {
      virtualControls.classList.add('hidden');
    }

    game.state = GameState.PLAYING;
  }

  function updateWorldBadge() {
    if (game.world === 'polluted') {
      hudWorldBadge.textContent = '🌫️ POLUÍDO';
      hudWorldBadge.className = 'hud-pill world-polluted';
    } else {
      hudWorldBadge.textContent = '🌱 SUSTENTÁVEL';
      hudWorldBadge.className = 'hud-pill world-sustainable';
    }
  }

  // ========================================================
  // MECÂNICA PRINCIPAL: SHIFT (ALTERNAR DE MUNDO)
  // ========================================================
  function triggerShift() {
    if (game.state !== GameState.PLAYING) return;

    // Alternar mundo
    game.world = game.world === 'polluted' ? 'sustainable' : 'polluted';
    game.shiftCount++;
    audioManager.setWorld(game.world);
    audioManager.playShift();

    // Iniciar animação da onda visual
    game.shiftTimer = game.shiftDuration;
    game.shiftProgress = 0;
    game.shiftWaveOrigin = {
      x: player.x + player.w / 2 - game.camera.x,
      y: player.y + player.h / 2 - game.camera.y
    };

    updateWorldBadge();

    // Explosão de partículas de transformação ao redor do jogador
    spawnShiftParticles(player.x + player.w / 2, player.y + player.h / 2);

    // Se o jogador estiver preso dentro de uma plataforma que surgiu no novo mundo,
    // impulsioná-lo suavemente para cima para evitar empacamento (stuck prevention)
    resolvePlayerStuckOnShift();
  }

  function resolvePlayerStuckOnShift() {
    const plats = game.currentLevel.platforms;
    for (const p of plats) {
      if (!isPlatformSolid(p)) continue;
      if (checkAABB(player.x, player.y, player.w, player.h, p.x, p.y, p.w, p.h)) {
        // Empurrar para cima da plataforma
        player.y = p.y - player.h;
        player.vy = 0;
        player.onGround = true;
      }
    }
  }

  function isPlatformSolid(p) {
    if (p.type === 'both') return true;
    if (p.type === 'polluted' && game.world === 'polluted') return true;
    if (p.type === 'sustainable' && game.world === 'sustainable') return true;
    if (p.type === 'door') {
      // Portão sólido enquanto não estiver ativado
      return !p.isOpened;
    }
    return false;
  }

  // ========================================================
  // FÍSICA & COLISÕES
  // ========================================================
  function updatePhysics() {
    // 1. Movimento Horizontal
    let moveDir = 0;
    if (input.left) moveDir -= 1;
    if (input.right) moveDir += 1;

    if (moveDir !== 0) {
      player.vx = moveDir * PLAYER_SPEED;
      player.facing = moveDir;
      player.isMoving = true;
      player.walkFrame += 0.22;
    } else {
      player.vx *= 0.55; // Atrito suave
      if (Math.abs(player.vx) < 0.2) player.vx = 0;
      player.isMoving = false;
      player.walkFrame = 0;
    }

    // 2. Buffer de Pulo & Coyote Time
    if (input.jumpPressed) {
      player.jumpBufferTimer = JUMP_BUFFER;
      input.jumpPressed = false;
    } else if (player.jumpBufferTimer > 0) {
      player.jumpBufferTimer--;
    }

    if (player.onGround) {
      player.coyoteTimer = COYOTE_TIME;
    } else if (player.coyoteTimer > 0) {
      player.coyoteTimer--;
    }

    // Executar Pulo
    if (player.jumpBufferTimer > 0 && player.coyoteTimer > 0) {
      player.vy = JUMP_FORCE;
      player.onGround = false;
      player.coyoteTimer = 0;
      player.jumpBufferTimer = 0;
      audioManager.playJump();
      spawnDustParticles(player.x + player.w / 2, player.y + player.h);
    }

    // 3. Gravidade
    player.vy += GRAVITY;
    if (player.vy > 12) player.vy = 12; // Velocidade terminal

    // 4. Integração do Movimento e Resolução de Colisão (Eixo por Eixo)
    // Eixo X
    player.x += player.vx;
    handleHorizontalCollisions();

    // Eixo Y
    player.y += player.vy;
    handleVerticalCollisions();

    // 5. Limites do Cenário
    if (player.x < 0) player.x = 0;
    if (player.x + player.w > game.currentLevel.width) {
      player.x = game.currentLevel.width - player.w;
    }

    // Queda no abismo
    if (player.y > game.currentLevel.height + 100) {
      respawnPlayer();
    }

    // 6. Verificar Perigos (Hazards: Água Tóxica, Espinhos)
    checkHazardCollisions();

    // 7. Verificar Coletáveis (Sementes)
    checkSeedCollections();

    // 8. Verificar Interativos (Painéis Solares, etc.)
    checkInteractives();

    // 9. Verificar Saída da Fase (Portal)
    checkPortalCollision();
  }

  function handleHorizontalCollisions() {
    const plats = game.currentLevel.platforms;
    for (const p of plats) {
      if (!isPlatformSolid(p)) continue;

      if (checkAABB(player.x, player.y, player.w, player.h, p.x, p.y, p.w, p.h)) {
        if (player.vx > 0) {
          player.x = p.x - player.w;
        } else if (player.vx < 0) {
          player.x = p.x + p.w;
        }
        player.vx = 0;
      }
    }
  }

  function handleVerticalCollisions() {
    player.onGround = false;
    const plats = game.currentLevel.platforms;

    for (const p of plats) {
      if (!isPlatformSolid(p)) continue;

      if (checkAABB(player.x, player.y, player.w, player.h, p.x, p.y, p.w, p.h)) {
        if (player.vy > 0) {
          // Aterrissagem no topo da plataforma
          player.y = p.y - player.h;
          player.vy = 0;
          player.onGround = true;
        } else if (player.vy < 0) {
          // Bateu a cabeça no teto
          player.y = p.y + p.h;
          player.vy = 0;
        }
      }
    }
  }

  function checkAABB(x1, y1, w1, h1, x2, y2, w2, h2) {
    return (
      x1 < x2 + w2 &&
      x1 + w1 > x2 &&
      y1 < y2 + h2 &&
      y1 + h1 > y2
    );
  }

  function checkHazardCollisions() {
    if (player.invulnerableTimer > 0) {
      player.invulnerableTimer--;
      return;
    }

    const hazards = game.currentLevel.hazards || [];
    for (const h of hazards) {
      const isActive = h.activeWorld === 'both' || h.activeWorld === game.world;
      if (!isActive) continue;

      if (checkAABB(player.x, player.y, player.w, player.h, h.x, h.y, h.w, h.h)) {
        audioManager.playHurt();
        spawnDustParticles(player.x + player.w / 2, player.y + player.h / 2, '#a34836');
        respawnPlayer();
        break;
      }
    }
  }

  function respawnPlayer() {
    player.x = player.checkpoint.x;
    player.y = player.checkpoint.y;
    player.vx = 0;
    player.vy = 0;
    player.invulnerableTimer = 30; // Proteção pós-queda
  }

  function checkSeedCollections() {
    const seeds = game.currentLevel.seeds || [];
    for (const s of seeds) {
      if (s.collected) continue;

      const dist = Math.hypot(
        (player.x + player.w / 2) - s.x,
        (player.y + player.h / 2) - s.y
      );

      if (dist < 32) {
        s.collected = true;
        game.collectedSeedsInLevel++;
        hudSeedsBadge.textContent = game.collectedSeedsInLevel.toString();
        audioManager.playCollect();
        spawnCollectParticles(s.x, s.y);
      }
    }
  }

  function checkInteractives() {
    const interactives = game.currentLevel.interactives || [];
    let nearInteractable = false;

    for (const obj of interactives) {
      // Verificar proximidade
      const inRange = checkAABB(
        player.x - 20, player.y - 10, player.w + 40, player.h + 20,
        obj.x, obj.y, obj.w, obj.h
      );

      if (inRange) {
        if (obj.type === 'solar_panel' && !obj.activated) {
          nearInteractable = true;
          // Se estiver no mundo sustentável e apertar interact (ou passar sobre ele)
          if (game.world === 'sustainable') {
            if (input.interactPressed || input.interact || inRange) {
              obj.activated = true;
              audioManager.playInteract();
              spawnSparkParticles(obj.x + obj.w / 2, obj.y + obj.h / 2);

              // Abrir portão alvo
              if (obj.targetDoor) {
                openDoor(obj.targetDoor);
              }
            }
          }
        }
      }
    }

    // Exibir/ocultar botão touch de interação quando perto
    if (nearInteractable && game.world === 'sustainable') {
      touchInteract.classList.remove('hidden');
    } else {
      touchInteract.classList.add('hidden');
    }

    input.interactPressed = false;
  }

  function openDoor(doorId) {
    const plats = game.currentLevel.platforms;
    for (const p of plats) {
      if (p.doorId === doorId) {
        p.isOpened = true;
      }
    }
  }

  function checkPortalCollision() {
    const portal = game.currentLevel.portal;
    if (!portal) return;

    if (checkAABB(player.x, player.y, player.w, player.h, portal.x, portal.y, portal.w, portal.h)) {
      if (portal.isFinal) {
        // Clímax da Fase 6: Iniciar cena cinematográfica de transformação do mundo!
        triggerEndingTransformation();
      } else {
        completeLevel();
      }
    }
  }

  function completeLevel() {
    game.state = GameState.LEVEL_CLEAR;
    audioManager.playLevelComplete();

    // Calcular tempo decorrido
    const totalSecs = Math.floor((Date.now() - game.levelStartTime) / 1000);
    const mins = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');
    const formattedTime = `${mins}:${secs}`;

    // Atualizar desbloqueio
    const nextIdx = game.currentLevelIdx + 1;
    if (nextIdx < GAME_LEVELS.length) {
      game.saveData.unlockedLevels = Math.max(game.saveData.unlockedLevels, nextIdx + 1);
    }
    // Salvar melhor tempo
    const lvlKey = `lvl_${game.currentLevel.id}`;
    if (!game.saveData.bestTimes[lvlKey] || totalSecs < game.saveData.bestTimes[lvlKey]) {
      game.saveData.bestTimes[lvlKey] = totalSecs;
    }
    game.saveData.collectedSeeds[lvlKey] = Math.max(
      game.saveData.collectedSeeds[lvlKey] || 0,
      game.collectedSeedsInLevel
    );
    saveGameProgress();

    // Preencher dados na tela de vitória
    document.getElementById('victory-level-name').textContent = `Fase ${game.currentLevel.id} — ${game.currentLevel.name}`;
    document.getElementById('stat-time').textContent = formattedTime;
    document.getElementById('stat-shifts').textContent = game.shiftCount.toString();
    document.getElementById('stat-seeds').textContent = `${game.collectedSeedsInLevel}/${game.currentLevel.seeds.length}`;

    // Mostrar tela de vitória
    screenVictory.classList.remove('hidden');
    virtualControls.classList.add('hidden');
  }

  function triggerEndingTransformation() {
    if (game.endingTransform.active) return;
    game.endingTransform.active = true;
    game.endingTransform.progress = 0;
    game.endingTransform.wave = 0;
    game.world = 'sustainable';
    audioManager.setWorld('sustainable');
    audioManager.playVictory();

    // Explosão massiva de sementes e brilhos ao redor do Purificador
    for (let i = 0; i < 60; i++) {
      spawnShiftParticles(game.currentLevel.portal.x + 30, game.currentLevel.portal.y + 40);
    }
  }

  // ========================================================
  // CÂMERA SUAVE (LERP)
  // ========================================================
  function updateCamera() {
    const targetX = player.x + player.w / 2 - V_WIDTH / 2;
    const targetY = player.y + player.h / 2 - V_HEIGHT * 0.58;

    game.camera.x += (targetX - game.camera.x) * 0.1;
    game.camera.y += (targetY - game.camera.y) * 0.1;

    // Limites da câmera para não mostrar além do mapa
    const maxCamX = Math.max(0, game.currentLevel.width - V_WIDTH);
    const maxCamY = Math.max(0, game.currentLevel.height - V_HEIGHT);

    game.camera.x = Math.max(0, Math.min(game.camera.x, maxCamX));
    game.camera.y = Math.max(0, Math.min(game.camera.y, maxCamY));
  }

  // ========================================================
  // SISTEMA DE PARTÍCULAS E ELEMENTOS AMBIENTAIS
  // ========================================================
  function initAmbientEntities() {
    game.ambientEntities = [];

    // Pássaros para o mundo sustentável
    for (let i = 0; i < 5; i++) {
      game.ambientEntities.push({
        type: 'bird',
        x: Math.random() * game.currentLevel.width,
        y: 40 + Math.random() * 120,
        speed: 1.2 + Math.random() * 0.8,
        wing: Math.random() * Math.PI,
        size: 8 + Math.random() * 4
      });
    }

    // Fumaça para o mundo poluído
    for (let i = 0; i < 18; i++) {
      game.ambientEntities.push({
        type: 'smog',
        x: Math.random() * game.currentLevel.width,
        y: Math.random() * game.currentLevel.height,
        vx: 0.3 + Math.random() * 0.4,
        vy: -0.2 - Math.random() * 0.3,
        size: 30 + Math.random() * 45,
        alpha: 0.15 + Math.random() * 0.25
      });
    }
  }

  function spawnShiftParticles(x, y) {
    const isSust = game.world === 'sustainable';
    const count = 28;
    const colors = isSust
      ? ['#52b788', '#74c69d', '#ffd166', '#d8f3dc']
      : ['#8f3b2c', '#c2673a', '#5f4d45', '#3d2e29'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      game.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        decay: 0.02 + Math.random() * 0.03,
        shape: isSust ? 'leaf' : 'smoke'
      });
    }
  }

  function spawnDustParticles(x, y, color = '#6b5e56') {
    for (let i = 0; i < 6; i++) {
      game.particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y - 2,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 1.5,
        size: 2 + Math.random() * 3,
        color,
        life: 1,
        decay: 0.05 + Math.random() * 0.04
      });
    }
  }

  function spawnCollectParticles(x, y) {
    for (let i = 0; i < 14; i++) {
      const angle = (Math.PI * 2 / 14) * i;
      const speed = 2 + Math.random() * 2;
      game.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 3,
        color: '#ffd166',
        life: 1,
        decay: 0.035,
        shape: 'spark'
      });
    }
  }

  function spawnSparkParticles(x, y) {
    for (let i = 0; i < 16; i++) {
      game.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 3,
        vy: -1 - Math.random() * 2.5,
        size: 3 + Math.random() * 3,
        color: '#74c69d',
        life: 1,
        decay: 0.03,
        shape: 'spark'
      });
    }
  }

  function updateParticles() {
    // 1. Partículas transitórias
    for (let i = game.particles.length - 1; i >= 0; i--) {
      const p = game.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) {
        game.particles.splice(i, 1);
      }
    }

    // 2. Transição visual de mundo (Shift wave)
    if (game.shiftTimer > 0) {
      game.shiftTimer--;
      game.shiftProgress = 1 - (game.shiftTimer / game.shiftDuration);
      game.shiftWaveRadius = game.shiftProgress * Math.hypot(V_WIDTH, V_HEIGHT);
    }

    // 3. Entidades ambientais
    for (const ent of game.ambientEntities) {
      if (ent.type === 'bird') {
        ent.x += ent.speed;
        ent.wing += 0.2;
        if (ent.x > game.currentLevel.width + 50) {
          ent.x = -50;
          ent.y = 40 + Math.random() * 140;
        }
      } else if (ent.type === 'smog') {
        ent.x += ent.vx;
        ent.y += ent.vy;
        if (ent.x > game.currentLevel.width + 100) ent.x = -100;
        if (ent.y < -50) ent.y = game.currentLevel.height + 50;
      }
    }

    // 4. Clímax da Fase 6: Cena de Transformação
    if (game.endingTransform.active) {
      game.endingTransform.progress += 0.006;
      game.endingTransform.wave += 8;

      // Gerar chuva contínua de folhas e flores
      if (Math.random() < 0.35) {
        game.particles.push({
          x: game.camera.x + Math.random() * V_WIDTH,
          y: game.camera.y - 10,
          vx: 0.5 + Math.random() * 1.5,
          vy: 1.2 + Math.random() * 1.8,
          size: 4 + Math.random() * 4,
          color: ['#ffd166', '#52b788', '#74c69d', '#d8f3dc'][Math.floor(Math.random() * 4)],
          life: 1,
          decay: 0.008,
          shape: 'leaf'
        });
      }

      if (game.endingTransform.progress >= 1) {
        // Exibir tela final do jogo
        game.endingTransform.active = false;
        game.state = GameState.ENDING;
        screenEnding.classList.remove('hidden');
        virtualControls.classList.add('hidden');
      }
    }
  }

  // ========================================================
  // RENDERIZAÇÃO NO CANVAS (2D GRAPHICS)
  // ========================================================
  function render() {
    ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);

    if (!game.currentLevel) {
      // No menu principal antes de iniciar fase, apenas limpa
      return;
    }

    // Salvar contexto global
    ctx.save();

    // 1. Céu e Cenário de Fundo (Parallax)
    renderSkyAndParallax();

    // 2. Aplicar deslocamento da Câmera aos objetos do mundo
    ctx.translate(-Math.floor(game.camera.x), -Math.floor(game.camera.y));

    // 3. Elementos de Cenário e Decoração de Fundo
    renderDecorations();

    // 4. Plataformas e Terrenos
    renderPlatforms();

    // 5. Perigos (Hazards: Água Tóxica, Espinhos)
    renderHazards();

    // 6. Elementos Interativos (Painéis Solares, etc.)
    renderInteractives();

    // 7. Sementes Coletáveis
    renderSeeds();

    // 8. Portal de Saída
    renderPortal();

    // 9. Personagem Principal
    renderPlayer();

    // 10. Partículas
    renderParticles();

    // Restaurar contexto (remover câmera)
    ctx.restore();

    // 11. Efeito Visual de Transição de Realidade (Shift Shockwave)
    renderShiftWaveEffect();

    // 12. Atmosfera e Efeitos da Tela Final
    renderScreenAtmosphere();
  }

  // ========================================================
  // RENDER: CÉU & PARALLAX
  // ========================================================
  function renderSkyAndParallax() {
    const isSust = game.world === 'sustainable';

    // Gradiente do Céu
    const skyGrad = ctx.createLinearGradient(0, 0, 0, V_HEIGHT);
    if (isSust) {
      skyGrad.addColorStop(0, '#102a1d');
      skyGrad.addColorStop(0.55, '#1e4832');
      skyGrad.addColorStop(1, '#34664a');
    } else {
      skyGrad.addColorStop(0, '#1b1716');
      skyGrad.addColorStop(0.55, '#2e2522');
      skyGrad.addColorStop(1, '#473630');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    // Sol / Luz suave no Sustentável
    if (isSust) {
      const sunGrad = ctx.createRadialGradient(V_WIDTH * 0.75, 120, 10, V_WIDTH * 0.75, 120, 180);
      sunGrad.addColorStop(0, 'rgba(255, 209, 102, 0.45)');
      sunGrad.addColorStop(0.5, 'rgba(255, 209, 102, 0.12)');
      sunGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);
    }

    // Camada Parallax 1: Silhuetas Distantes (Montanhas / Fábricas)
    const parallaxOffsetX = game.camera.x * 0.2;
    ctx.fillStyle = isSust ? 'rgba(16, 40, 28, 0.65)' : 'rgba(28, 20, 18, 0.75)';
    ctx.beginPath();
    ctx.moveTo(0, V_HEIGHT);
    for (let x = 0; x <= V_WIDTH; x += 60) {
      const worldX = x + parallaxOffsetX;
      const h = isSust
        ? Math.sin(worldX * 0.004) * 55 + 160
        : Math.cos(worldX * 0.007) * 45 + 175;
      ctx.lineTo(x, V_HEIGHT - h);
    }
    ctx.lineTo(V_WIDTH, V_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Pássaros voando no céu sustentável
    if (isSust) {
      ctx.strokeStyle = '#d8f3dc';
      ctx.lineWidth = 1.8;
      for (const ent of game.ambientEntities) {
        if (ent.type === 'bird') {
          const screenX = ent.x - game.camera.x * 0.5;
          const screenY = ent.y;
          if (screenX > -20 && screenX < V_WIDTH + 20) {
            const flap = Math.sin(ent.wing) * 4;
            ctx.beginPath();
            ctx.moveTo(screenX - ent.size, screenY + flap);
            ctx.quadraticCurveTo(screenX - ent.size / 2, screenY - flap, screenX, screenY);
            ctx.quadraticCurveTo(screenX + ent.size / 2, screenY - flap, screenX + ent.size, screenY + flap);
            ctx.stroke();
          }
        }
      }
    }
  }

  // ========================================================
  // RENDER: DECORAÇÕES & CENÁRIO
  // ========================================================
  function renderDecorations() {
    const decors = game.currentLevel.decor || [];
    const isSust = game.world === 'sustainable';

    for (const d of decors) {
      if (d.world && d.world !== 'both' && d.world !== game.world) continue;

      if (d.type === 'tree') {
        // Árvore viva exuberante
        drawLivingTree(d.x, d.y);
      } else if (d.type === 'dead_tree') {
        // Árvore ressecada e sombria
        drawDeadTree(d.x, d.y);
      } else if (d.type === 'flower_bush') {
        drawFlowerBush(d.x, d.y);
      } else if (d.type === 'trash_pile') {
        drawTrashPile(d.x, d.y);
      } else if (d.type === 'chimney' || d.type === 'smokestack') {
        drawChimney(d.x, d.y);
      } else if (d.type === 'solar_decor' || d.type === 'solar_farm') {
        drawSolarDecor(d.x, d.y);
      } else if (d.type === 'sign') {
        drawSignPost(d.x, d.y, d.text);
      } else if (d.type === 'cable_line') {
        drawCableLine(d.x, d.y, d.connects);
      } else if (d.type === 'master_purifier_globe') {
        drawMasterPurifierGlobe(d.x, d.y);
      }
    }
  }

  function drawLivingTree(x, y) {
    // Tronco
    ctx.fillStyle = '#4a3728';
    ctx.fillRect(x - 10, y - 90, 20, 90);
    // Copa exuberante em camadas
    ctx.fillStyle = '#2d6a4f';
    ctx.beginPath();
    ctx.arc(x, y - 110, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#52b788';
    ctx.beginPath();
    ctx.arc(x - 12, y - 125, 30, 0, Math.PI * 2);
    ctx.arc(x + 16, y - 120, 26, 0, Math.PI * 2);
    ctx.fill();
    // Frutinhas douradas
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(x - 15, y - 105, 4, 0, Math.PI * 2);
    ctx.arc(x + 10, y - 130, 4, 0, Math.PI * 2);
    ctx.arc(x + 20, y - 98, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawDeadTree(x, y) {
    ctx.strokeStyle = '#382f2c';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 75);
    ctx.lineTo(x - 24, y - 105);
    ctx.moveTo(x, y - 55);
    ctx.lineTo(x + 22, y - 95);
    ctx.stroke();
  }

  function drawFlowerBush(x, y) {
    ctx.fillStyle = '#40916c';
    ctx.beginPath();
    ctx.arc(x + 15, y - 12, 16, 0, Math.PI * 2);
    ctx.arc(x + 40, y - 15, 20, 0, Math.PI * 2);
    ctx.arc(x + 65, y - 10, 14, 0, Math.PI * 2);
    ctx.fill();
    // Flores coloridas
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(x + 20, y - 18, 3, 0, Math.PI * 2);
    ctx.arc(x + 42, y - 22, 4, 0, Math.PI * 2);
    ctx.arc(x + 58, y - 14, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTrashPile(x, y) {
    ctx.fillStyle = '#453833';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 35, y - 30);
    ctx.lineTo(x + 80, y);
    ctx.closePath();
    ctx.fill();
    // Barril enferrujado jogado
    ctx.fillStyle = '#8f3b2c';
    ctx.fillRect(x + 20, y - 22, 22, 18);
  }

  function drawChimney(x, y) {
    ctx.fillStyle = '#3a312d';
    ctx.fillRect(x - 14, y - 110, 28, 110);
    // Borda superior
    ctx.fillStyle = '#221c19';
    ctx.fillRect(x - 18, y - 116, 36, 8);
    // Fumaça saindo
    const t = Date.now() * 0.003;
    ctx.fillStyle = 'rgba(75, 60, 55, 0.45)';
    ctx.beginPath();
    ctx.arc(x + Math.sin(t) * 10, y - 130, 14, 0, Math.PI * 2);
    ctx.arc(x + Math.sin(t + 1) * 16, y - 155, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSolarDecor(x, y) {
    ctx.fillStyle = '#334139';
    ctx.fillRect(x, y - 35, 60, 35);
    ctx.fillStyle = '#52b788';
    ctx.fillRect(x + 4, y - 31, 52, 27);
  }

  function drawSignPost(x, y, text) {
    ctx.fillStyle = '#5a4638';
    ctx.fillRect(x + 8, y - 36, 6, 36);
    ctx.fillStyle = '#846c5b';
    ctx.fillRect(x - 10, y - 54, 42, 20);
    ctx.fillStyle = '#ffd166';
    ctx.font = '10px sans-serif';
    ctx.fillText('INFO', x - 4, y - 40);
  }

  function drawCableLine(x, y, targetDoorId) {
    const plats = game.currentLevel.platforms;
    const door = plats.find(p => p.doorId === targetDoorId);
    if (!door) return;

    ctx.strokeStyle = game.world === 'sustainable' ? '#52b788' : '#453833';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x + 30, y);
    ctx.lineTo(door.x + door.w / 2, y);
    ctx.lineTo(door.x + door.w / 2, door.y + door.h);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawMasterPurifierGlobe(x, y) {
    const t = Date.now() * 0.002;
    // Base da cúpula
    ctx.fillStyle = '#263d33';
    ctx.fillRect(x - 30, y - 20, 60, 20);

    // Globo planetário brilhante
    const glow = ctx.createRadialGradient(x, y - 55, 5, x, y - 55, 45);
    if (game.world === 'sustainable') {
      glow.addColorStop(0, '#ffd166');
      glow.addColorStop(0.5, '#52b788');
      glow.addColorStop(1, 'rgba(82, 183, 136, 0)');
    } else {
      glow.addColorStop(0, '#e76f51');
      glow.addColorStop(0.6, '#8f3b2c');
      glow.addColorStop(1, 'rgba(143, 59, 44, 0)');
    }
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y - 55, 45, 0, Math.PI * 2);
    ctx.fill();

    // Esfera central
    ctx.fillStyle = game.world === 'sustainable' ? '#d8f3dc' : '#4a3b36';
    ctx.beginPath();
    ctx.arc(x, y - 55, 18, 0, Math.PI * 2);
    ctx.fill();

    // Anéis orbitais
    ctx.strokeStyle = game.world === 'sustainable' ? '#ffd166' : '#c2673a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y - 55, 34, 12 + Math.sin(t) * 4, t, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ========================================================
  // RENDER: PLATAFORMAS & TERRENO
  // ========================================================
  function renderPlatforms() {
    const plats = game.currentLevel.platforms;
    const isSust = game.world === 'sustainable';

    for (const p of plats) {
      const isSolid = isPlatformSolid(p);

      // Se a plataforma não for sólida no mundo atual, podemos desenhar um fantasma sutil
      // ou ocultar totalmente dependendo do estilo
      if (!isSolid) {
        if (p.type === 'polluted' || p.type === 'sustainable') {
          // Contorno translúcido sutil indicando elemento na outra dimensão
          ctx.strokeStyle = p.type === 'sustainable' ? 'rgba(82, 183, 136, 0.18)' : 'rgba(143, 59, 44, 0.18)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 4]);
          ctx.strokeRect(p.x, p.y, p.w, p.h);
          ctx.setLineDash([]);
        }
        continue;
      }

      // Renderização estilizada de cada tipo de bloco sólido
      if (p.style === 'ground') {
        drawGroundBlock(p.x, p.y, p.w, p.h, isSust);
      } else if (p.style === 'vines') {
        drawVinePlatform(p.x, p.y, p.w, p.h);
      } else if (p.style === 'lilypad') {
        drawLilypadPlatform(p.x, p.y, p.w, p.h);
      } else if (p.style === 'rubble') {
        drawRubbleBlock(p.x, p.y, p.w, p.h);
      } else if (p.style === 'crates') {
        drawCratesBlock(p.x, p.y, p.w, p.h);
      } else if (p.style === 'metal') {
        drawMetalGirder(p.x, p.y, p.w, p.h);
      } else if (p.style === 'door') {
        drawSecurityDoor(p.x, p.y, p.w, p.h, p.isOpened);
      } else {
        // Fallback simples
        ctx.fillStyle = isSust ? '#2d6a4f' : '#38302c';
        ctx.fillRect(p.x, p.y, p.w, p.h);
      }
    }
  }

  function drawGroundBlock(x, y, w, h, isSust) {
    // Corpo do chão
    ctx.fillStyle = isSust ? '#1e382b' : '#2b2320';
    ctx.fillRect(x, y, w, h);

    // Borda superior (Grama verdejante vs Concreto rachado)
    if (isSust) {
      ctx.fillStyle = '#40916c';
      ctx.fillRect(x, y, w, 8);
      ctx.fillStyle = '#74c69d';
      ctx.fillRect(x, y, w, 3);
      // Pequenas pontas de grama orgânica
      ctx.fillStyle = '#52b788';
      for (let gx = x + 4; gx < x + w - 4; gx += 14) {
        ctx.fillRect(gx, y - 3, 4, 3);
      }
    } else {
      ctx.fillStyle = '#453833';
      ctx.fillRect(x, y, w, 8);
      ctx.fillStyle = '#66534b';
      ctx.fillRect(x, y, w, 2);
    }
  }

  function drawVinePlatform(x, y, w, h) {
    // Tronco/galho natural
    ctx.fillStyle = '#3a2b1f';
    ctx.beginPath();
    ctx.roundRect(x, y + 2, w, h - 2, 8);
    ctx.fill();

    // Folhagem viva em cima
    ctx.fillStyle = '#52b788';
    ctx.beginPath();
    ctx.roundRect(x - 2, y, w + 4, 10, 5);
    ctx.fill();

    // Pequenas flores ou gavinhas
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(x + 12, y + 5, 2.5, 0, Math.PI * 2);
    ctx.arc(x + w - 14, y + 5, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawLilypadPlatform(x, y, w, h) {
    // Vitória-régia verde no rio
    ctx.fillStyle = '#2d6a4f';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2 + 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#52b788';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2 - 2, w / 2 - 4, h / 2 - 1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flor aquática de lótus
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 3, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRubbleBlock(x, y, w, h) {
    ctx.fillStyle = '#382b26';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#8f3b2c';
    ctx.fillRect(x + 6, y + 8, w - 12, h - 16);
    // Linhas de entulho e sucata
    ctx.strokeStyle = '#221916';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
    // Placa de perigo
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(x + w / 2 - 8, y + h / 2 - 4, 16, 8);
  }

  function drawCratesBlock(x, y, w, h) {
    ctx.fillStyle = '#614838';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#38281d';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    // Diagonal de caixa de carga
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 2);
    ctx.lineTo(x + w - 2, y + h - 2);
    ctx.moveTo(x + w - 2, y + 2);
    ctx.lineTo(x + 2, y + h - 2);
    ctx.stroke();
  }

  function drawMetalGirder(x, y, w, h) {
    ctx.fillStyle = '#423b38';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#695f5a';
    ctx.fillRect(x, y, w, 3);
    // Parafusos industriais
    ctx.fillStyle = '#221d1b';
    for (let bx = x + 8; bx < x + w; bx += 22) {
      ctx.fillRect(bx, y + h / 2 - 2, 4, 4);
    }
  }

  function drawSecurityDoor(x, y, w, h, isOpened) {
    if (isOpened) {
      // Portão recolhido / campo de energia aberto
      ctx.fillStyle = 'rgba(82, 183, 136, 0.25)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#74c69d';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
    } else {
      // Portão trancado pesado
      ctx.fillStyle = '#2b2320';
      ctx.fillRect(x, y, w, h);
      // Lasers de trava vermelhos
      ctx.fillStyle = '#e76f51';
      for (let ly = y + 15; ly < y + h; ly += 24) {
        ctx.fillRect(x + 2, ly, w - 4, 4);
      }
      ctx.strokeStyle = '#a34836';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
    }
  }

  // ========================================================
  // RENDER: PERIGOS (HAZARDS)
  // ========================================================
  function renderHazards() {
    const hazards = game.currentLevel.hazards || [];
    const t = Date.now() * 0.004;

    for (const h of hazards) {
      const isActive = h.activeWorld === 'both' || h.activeWorld === game.world;
      if (!isActive) continue;

      if (h.type === 'toxic_water') {
        // Rio tóxico borbulhante
        const toxGrad = ctx.createLinearGradient(h.x, h.y, h.x, h.y + h.h);
        toxGrad.addColorStop(0, '#592e4a');
        toxGrad.addColorStop(0.5, '#3d1c31');
        toxGrad.addColorStop(1, '#200d19');
        ctx.fillStyle = toxGrad;
        ctx.fillRect(h.x, h.y, h.w, h.h);

        // Superfície ondulada com bolhas ácidas
        ctx.fillStyle = '#8f3b2c';
        for (let bx = h.x + 8; bx < h.x + h.w - 8; bx += 28) {
          const by = h.y + Math.sin(t + bx) * 3;
          ctx.beginPath();
          ctx.arc(bx, by, 4 + Math.sin(t * 2 + bx) * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (h.type === 'spikes') {
        // Espinhos de metal enferrujado
        ctx.fillStyle = '#8f3b2c';
        for (let sx = h.x; sx < h.x + h.w; sx += 14) {
          ctx.beginPath();
          ctx.moveTo(sx, h.y + h.h);
          ctx.lineTo(sx + 7, h.y);
          ctx.lineTo(sx + 14, h.y + h.h);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }

  // ========================================================
  // RENDER: INTERATIVOS (PAINÉIS SOLARES)
  // ========================================================
  function renderInteractives() {
    const interactives = game.currentLevel.interactives || [];
    const isSust = game.world === 'sustainable';

    for (const obj of interactives) {
      if (obj.type === 'solar_panel') {
        // Haste de suporte
        ctx.fillStyle = '#3a322c';
        ctx.fillRect(obj.x + obj.w / 2 - 4, obj.y + obj.h - 10, 8, 10);

        // Painel
        if (obj.activated) {
          // Ativado e brilhante
          ctx.fillStyle = '#1e5e40';
          ctx.fillRect(obj.x, obj.y, obj.w, obj.h - 10);
          ctx.fillStyle = '#74c69d';
          ctx.fillRect(obj.x + 2, obj.y + 2, obj.w - 4, obj.h - 14);

          // Brilho solar
          ctx.fillStyle = '#ffd166';
          ctx.beginPath();
          ctx.arc(obj.x + obj.w / 2, obj.y + 8, 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (isSust) {
          // No sustentável aguardando luz / interação
          ctx.fillStyle = '#2a4436';
          ctx.fillRect(obj.x, obj.y, obj.w, obj.h - 10);
          ctx.fillStyle = '#52b788';
          ctx.fillRect(obj.x + 2, obj.y + 2, obj.w - 4, obj.h - 14);

          // Efeito pulsante indicando que pode ser ativado
          const p = (Math.sin(Date.now() * 0.006) + 1) * 0.5;
          ctx.strokeStyle = `rgba(255, 209, 102, ${0.4 + p * 0.6})`;
          ctx.lineWidth = 2;
          ctx.strokeRect(obj.x - 2, obj.y - 2, obj.w + 4, obj.h - 6);
        } else {
          // No poluído: escuro e inativo
          ctx.fillStyle = '#221c1a';
          ctx.fillRect(obj.x, obj.y, obj.w, obj.h - 10);
          ctx.fillStyle = '#e76f51';
          ctx.fillRect(obj.x + obj.w / 2 - 3, obj.y + 6, 6, 6);
        }
      }
    }
  }

  // ========================================================
  // RENDER: SEMENTES COLETÁVEIS
  // ========================================================
  function renderSeeds() {
    const seeds = game.currentLevel.seeds || [];
    const t = Date.now() * 0.005;

    for (const s of seeds) {
      if (s.collected) continue;

      const floatY = s.y + Math.sin(t + s.x) * 4;

      // Aura brilhante
      const aura = ctx.createRadialGradient(s.x, floatY, 2, s.x, floatY, 14);
      aura.addColorStop(0, '#ffd166');
      aura.addColorStop(0.5, 'rgba(82, 183, 136, 0.5)');
      aura.addColorStop(1, 'transparent');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(s.x, floatY, 14, 0, Math.PI * 2);
      ctx.fill();

      // Semente estilizada (gota / núcleo)
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(s.x, floatY, 5, 0, Math.PI * 2);
      ctx.fill();

      // Folhinha brotando da semente
      ctx.fillStyle = '#52b788';
      ctx.beginPath();
      ctx.ellipse(s.x + 3, floatY - 4, 3, 2, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ========================================================
  // RENDER: PORTAL DE SAÍDA (ECO-PORTAL)
  // ========================================================
  function renderPortal() {
    const p = game.currentLevel.portal;
    if (!p) return;

    const t = Date.now() * 0.003;
    const isSust = game.world === 'sustainable';

    // Pilares do portal
    ctx.fillStyle = '#3a322c';
    ctx.fillRect(p.x, p.y, 8, p.h);
    ctx.fillRect(p.x + p.w - 8, p.y, 8, p.h);
    ctx.fillRect(p.x, p.y, p.w, 8);

    // Vórtice de energia dimensional
    const vortGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    if (isSust) {
      vortGrad.addColorStop(0, 'rgba(82, 183, 136, 0.7)');
      vortGrad.addColorStop(0.5, 'rgba(255, 209, 102, 0.85)');
      vortGrad.addColorStop(1, 'rgba(45, 106, 79, 0.7)');
    } else {
      vortGrad.addColorStop(0, 'rgba(143, 59, 44, 0.6)');
      vortGrad.addColorStop(0.5, 'rgba(194, 103, 58, 0.75)');
      vortGrad.addColorStop(1, 'rgba(95, 77, 69, 0.6)');
    }
    ctx.fillStyle = vortGrad;
    ctx.fillRect(p.x + 8, p.y + 8, p.w - 16, p.h - 8);

    // Ícone indicador no topo
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y - 6, 7 + Math.sin(t * 3) * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // ========================================================
  // RENDER: PERSONAGEM PRINCIPAL (ORIGINAL & ESTILIZADO)
  // ========================================================
  function renderPlayer() {
    const px = Math.floor(player.x);
    const py = Math.floor(player.y);
    const w = player.w;
    const h = player.h;
    const facing = player.facing;
    const walk = player.isMoving && player.onGround ? Math.sin(player.walkFrame) : 0;
    const isJumping = !player.onGround;

    ctx.save();
    ctx.translate(px + w / 2, py + h);
    ctx.scale(facing, 1);

    // 1. Mochila (Backpack) do ecologista
    ctx.fillStyle = '#8f5b34';
    ctx.beginPath();
    ctx.roundRect(-w / 2 - 5, -h + 14 + (walk * 2), 7, 18, 3);
    ctx.fill();
    // Fivela da mochila
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(-w / 2 - 5, -h + 20 + (walk * 2), 3, 4);

    // 2. Pernas / Botas
    ctx.fillStyle = '#1f2d24'; // Calça escura
    if (isJumping) {
      // Pernas flexionadas no pulo
      ctx.fillRect(-7, -14, 5, 8);
      ctx.fillRect(2, -16, 5, 8);
      ctx.fillStyle = '#4a3728'; // Botas
      ctx.fillRect(-8, -7, 7, 5);
      ctx.fillRect(1, -9, 7, 5);
    } else {
      // Animação de caminhada
      const leg1Offset = walk * 5;
      const leg2Offset = -walk * 5;
      ctx.fillRect(-7, -14, 5, 10 + leg1Offset);
      ctx.fillRect(2, -14, 5, 10 + leg2Offset);
      ctx.fillStyle = '#4a3728'; // Botas
      ctx.fillRect(-8, -4 + leg1Offset, 7, 5);
      ctx.fillRect(1, -4 + leg2Offset, 7, 5);
    }

    // 3. Tronco e Jaqueta Verde/Azul Sustentável
    ctx.fillStyle = '#2d6a4f'; // Verde floresta
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 2, -h + 12 + (walk * 1.5), w - 4, 20, 4);
    ctx.fill();

    // Detalhe azul suave no peito (faixa de expedição)
    ctx.fillStyle = '#4ea8de';
    ctx.fillRect(-w / 2 + 5, -h + 16 + (walk * 1.5), 5, 12);

    // 4. Cabeça / Rosto estilizado
    ctx.fillStyle = '#ffd6a5'; // Tom de pele acolhedor
    ctx.beginPath();
    ctx.arc(0, -h + 7 + (walk * 1.2), 9, 0, Math.PI * 2);
    ctx.fill();

    // Olhos com direção do olhar
    ctx.fillStyle = '#1a1614';
    ctx.fillRect(2, -h + 6 + (walk * 1.2), 2.5, 3);

    // Bandana / Cabelo estilizado
    ctx.fillStyle = '#1b4332';
    ctx.beginPath();
    ctx.arc(0, -h + 4 + (walk * 1.2), 9.5, Math.PI, 0);
    ctx.fill();
    // Faixa da bandana amarela
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(-9, -h + 3 + (walk * 1.2), 18, 3);

    // Aura especial caso esteja em transição de mundo
    if (game.shiftTimer > 0) {
      ctx.strokeStyle = game.world === 'sustainable' ? '#74c69d' : '#e76f51';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -h / 2, 26 + (1 - game.shiftProgress) * 12, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ========================================================
  // RENDER: PARTÍCULAS
  // ========================================================
  function renderParticles() {
    for (const p of game.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;

      if (p.shape === 'leaf') {
        // Folhinha caindo e girando
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size, p.size * 0.5, p.life * 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'smoke') {
        // Puf de fumaça arredondado
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Ponto / faísca brilhante
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.restore();
    }
  }

  // ========================================================
  // RENDER: ONDA DE TRANSIÇÃO (SHIFT SHOCKWAVE)
  // ========================================================
  function renderShiftWaveEffect() {
    if (game.shiftTimer <= 0) return;

    ctx.save();
    const ox = game.shiftWaveOrigin.x;
    const oy = game.shiftWaveOrigin.y;
    const r = game.shiftWaveRadius;
    const alpha = (1 - game.shiftProgress) * 0.75;

    // Anel de choque de realidade
    ctx.strokeStyle = game.world === 'sustainable'
      ? `rgba(116, 198, 157, ${alpha})`
      : `rgba(226, 111, 81, ${alpha})`;
    ctx.lineWidth = 14 * (1 - game.shiftProgress);
    ctx.beginPath();
    ctx.arc(ox, oy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  // ========================================================
  // RENDER: ATMOSFERA & EFEITO FINAL
  // ========================================================
  function renderScreenAtmosphere() {
    // Efeito de vinheta leve e névoa do mundo poluído
    if (game.world === 'polluted') {
      const grad = ctx.createRadialGradient(V_WIDTH / 2, V_HEIGHT / 2, V_HEIGHT * 0.45, V_WIDTH / 2, V_HEIGHT / 2, V_WIDTH * 0.75);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, 'rgba(28, 18, 14, 0.45)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);
    }

    // Cena de Transformação Final (Fase 6)
    if (game.endingTransform.active) {
      const p = game.endingTransform.progress;
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, p * 1.2)})`;
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);
    }
  }

  // ========================================================
  // CONTROLES DE TECLADO & TOUCH
  // ========================================================
  function setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      audioManager.init(); // Ativar áudio no 1º toque

      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        input.left = true;
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        input.right = true;
      } else if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        if (!input.jump) input.jumpPressed = true;
        input.jump = true;
        e.preventDefault();
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        triggerShift();
        e.preventDefault();
      } else if (e.code === 'KeyE') {
        input.interact = true;
        input.interactPressed = true;
      } else if (e.code === 'Escape') {
        togglePause();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        input.left = false;
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        input.right = false;
      } else if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        input.jump = false;
      } else if (e.code === 'KeyE') {
        input.interact = false;
      }
    });
  }

  function setupTouchControls() {
    function bindTouch(btn, onDown, onUp) {
      if (!btn) return;

      const handleStart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        audioManager.init();
        btn.classList.add('active');
        onDown();
      };

      const handleEnd = (e) => {
        e.preventDefault();
        e.stopPropagation();
        btn.classList.remove('active');
        if (onUp) onUp();
      };

      btn.addEventListener('touchstart', handleStart, { passive: false });
      btn.addEventListener('touchend', handleEnd, { passive: false });
      btn.addEventListener('touchcancel', handleEnd, { passive: false });

      // Suporte a mouse também nos botões virtuais
      btn.addEventListener('mousedown', handleStart);
      btn.addEventListener('mouseup', handleEnd);
      btn.addEventListener('mouseleave', handleEnd);
    }

    bindTouch(touchLeft, () => { input.left = true; }, () => { input.left = false; });
    bindTouch(touchRight, () => { input.right = true; }, () => { input.right = false; });
    bindTouch(touchJump, () => {
      if (!input.jump) input.jumpPressed = true;
      input.jump = true;
    }, () => {
      input.jump = false;
    });
    bindTouch(touchShift, () => {
      triggerShift();
    });
    bindTouch(touchInteract, () => {
      input.interact = true;
      input.interactPressed = true;
    }, () => {
      input.interact = false;
    });
  }

  // ========================================================
  // SISTEMA DE UI E MODAIS
  // ========================================================
  function hideAllScreens() {
    screenTitle.classList.add('hidden');
    screenPause.classList.add('hidden');
    screenVictory.classList.add('hidden');
    screenEnding.classList.add('hidden');
    modalLevels.classList.add('hidden');
    modalHowToPlay.classList.add('hidden');
    modalCredits.classList.add('hidden');
  }

  function togglePause() {
    if (game.state === GameState.PLAYING) {
      game.state = GameState.PAUSED;
      screenPause.classList.remove('hidden');
      virtualControls.classList.add('hidden');
      audioManager.playClick();
    } else if (game.state === GameState.PAUSED) {
      game.state = GameState.PLAYING;
      screenPause.classList.add('hidden');
      if (('ontouchstart' in window) || navigator.maxTouchPoints > 0) {
        virtualControls.classList.remove('hidden');
      }
      audioManager.playClick();
    }
  }

  function renderLevelSelectGrid() {
    const container = document.getElementById('levels-container');
    container.innerHTML = '';

    GAME_LEVELS.forEach((lvl, idx) => {
      const isUnlocked = idx < game.saveData.unlockedLevels;
      const card = document.createElement('button');
      card.className = `level-card-btn ${isUnlocked ? '' : 'locked'}`;

      const bestTimeSec = game.saveData.bestTimes[`lvl_${lvl.id}`];
      const timeStr = bestTimeSec ? `${Math.floor(bestTimeSec / 60)}:${(bestTimeSec % 60).toString().padStart(2, '0')}` : '--:--';
      const seeds = game.saveData.collectedSeeds[`lvl_${lvl.id}`] || 0;

      card.innerHTML = `
        <span class="level-num">0${lvl.id}</span>
        <span class="level-name">${lvl.name}</span>
        <span class="level-stars">${isUnlocked ? `🌱 ${seeds}/${lvl.seeds.length}` : '🔒'}</span>
      `;

      if (isUnlocked) {
        card.addEventListener('click', () => {
          modalLevels.classList.add('hidden');
          startLevel(idx);
          audioManager.playClick();
        });
      }

      container.appendChild(card);
    });
  }

  function setupUIListeners() {
    // Tela Inicial - Botão Jogar
    document.getElementById('btn-play-game').addEventListener('click', () => {
      audioManager.init();
      audioManager.playClick();
      startLevel(0);
    });

    // Seletor de Fases
    document.getElementById('btn-level-select').addEventListener('click', () => {
      audioManager.init();
      audioManager.playClick();
      renderLevelSelectGrid();
      modalLevels.classList.remove('hidden');
    });

    // Como Jogar
    document.getElementById('btn-how-to-play').addEventListener('click', () => {
      audioManager.init();
      audioManager.playClick();
      modalHowToPlay.classList.remove('hidden');
    });

    // Créditos
    document.getElementById('btn-credits').addEventListener('click', () => {
      audioManager.init();
      audioManager.playClick();
      modalCredits.classList.remove('hidden');
    });

    // Fechar modais
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-close');
        const modal = document.getElementById(targetId);
        if (modal) modal.classList.add('hidden');
        audioManager.playClick();
      });
    });

    // Alternar áudio no HUD e na Pausa
    const handleAudioToggle = () => {
      audioManager.init();
      const unmuted = audioManager.toggleMute();
      btnAudioToggle.textContent = unmuted ? '🔊' : '🔇';
      document.getElementById('btn-pause-mute').textContent = unmuted ? 'Alternar Som (🔊)' : 'Alternar Som (🔇)';
      audioManager.playClick();
    };

    btnAudioToggle.addEventListener('click', handleAudioToggle);
    document.getElementById('btn-pause-mute').addEventListener('click', handleAudioToggle);

    // Botão Pausa HUD
    btnPause.addEventListener('click', () => {
      togglePause();
    });

    // Botões da Tela de Pausa
    document.getElementById('btn-pause-resume').addEventListener('click', () => {
      togglePause();
    });

    document.getElementById('btn-pause-restart').addEventListener('click', () => {
      screenPause.classList.add('hidden');
      startLevel(game.currentLevelIdx);
      audioManager.playClick();
    });

    document.getElementById('btn-pause-menu').addEventListener('click', () => {
      screenPause.classList.add('hidden');
      gameHud.classList.add('hidden');
      virtualControls.classList.add('hidden');
      screenTitle.classList.remove('hidden');
      game.state = GameState.MENU;
      audioManager.playClick();
    });

    // Botões da Tela de Vitória
    document.getElementById('btn-victory-next').addEventListener('click', () => {
      screenVictory.classList.add('hidden');
      const next = game.currentLevelIdx + 1;
      if (next < GAME_LEVELS.length) {
        startLevel(next);
      } else {
        startLevel(0);
      }
      audioManager.playClick();
    });

    document.getElementById('btn-victory-replay').addEventListener('click', () => {
      screenVictory.classList.add('hidden');
      startLevel(game.currentLevelIdx);
      audioManager.playClick();
    });

    document.getElementById('btn-victory-menu').addEventListener('click', () => {
      screenVictory.classList.add('hidden');
      gameHud.classList.add('hidden');
      virtualControls.classList.add('hidden');
      screenTitle.classList.remove('hidden');
      game.state = GameState.MENU;
      audioManager.playClick();
    });

    // Botões da Tela Final (Game Complete)
    document.getElementById('btn-ending-play-again').addEventListener('click', () => {
      screenEnding.classList.add('hidden');
      startLevel(0);
      audioManager.playClick();
    });

    document.getElementById('btn-ending-menu').addEventListener('click', () => {
      screenEnding.classList.add('hidden');
      gameHud.classList.add('hidden');
      virtualControls.classList.add('hidden');
      screenTitle.classList.remove('hidden');
      game.state = GameState.MENU;
      audioManager.playClick();
    });

    document.getElementById('btn-ending-credits').addEventListener('click', () => {
      screenEnding.classList.add('hidden');
      modalCredits.classList.remove('hidden');
      audioManager.playClick();
    });
  }

  // ========================================================
  // LOOP PRINCIPAL DO JOGO (REQUEST ANIMATION FRAME)
  // ========================================================
  function gameLoop() {
    if (game.state === GameState.PLAYING) {
      updatePhysics();
      updateCamera();
      updateParticles();
    } else if (game.state === GameState.MENU) {
      // Pequena animação no menu
      updateParticles();
    }

    render();
    requestAnimationFrame(gameLoop);
  }

  // ========================================================
  // BOOTSTRAP DO PROJETO
  // ========================================================
  function initGame() {
    loadSavedData();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', resizeCanvas);

    setupKeyboard();
    setupTouchControls();
    setupUIListeners();

    // Iniciar loop de renderização
    requestAnimationFrame(gameLoop);

    // Suporte a testes visuais automatizados via URL (?test=play, ?test=shift, etc.)
    handleTestQueryParams();
  }

  function handleTestQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const testMode = params.get('test');
    if (!testMode) return;

    setTimeout(() => {
      if (testMode === 'play') {
        startLevel(0);
        // Simular movimento para a direita
        input.right = true;
        setTimeout(() => { input.right = false; }, 800);
      } else if (testMode === 'shift') {
        startLevel(0);
        input.right = true;
        setTimeout(() => {
          input.right = false;
          triggerShift();
        }, 600);
      } else if (testMode === 'howtoplay') {
        modalHowToPlay.classList.remove('hidden');
      } else if (testMode === 'credits') {
        modalCredits.classList.remove('hidden');
      } else if (testMode === 'levels') {
        renderLevelSelectGrid();
        modalLevels.classList.remove('hidden');
      } else if (testMode === 'pause') {
        startLevel(0);
        setTimeout(() => { togglePause(); }, 300);
      }
    }, 150);
  }

  // Iniciar após carregamento do DOM
  window.addEventListener('DOMContentLoaded', initGame);

})();

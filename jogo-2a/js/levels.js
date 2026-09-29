/* ========================================================
   ECOSHIFT — DADOS DAS FASES (LEVELS)
   6 fases cuidadosamente desenhadas com curva de aprendizado suave,
   puzzles de troca de mundo e sementes de exploração.
   ======================================================== */

const GAME_LEVELS = [
  // ========================================================
  // FASE 1: PRIMEIRO SHIFT
  // ========================================================
  {
    id: 1,
    name: "Primeiro Shift",
    subtitle: "Aprenda a transformar o mundo",
    hint: "Pressione SHIFT para alternar entre os mundos e abrir passagem!",
    width: 1800,
    height: 600,
    spawn: { x: 100, y: 440 },
    portal: { x: 1620, y: 410, w: 50, h: 70 },
    checkpoints: [{ x: 100, y: 440 }, { x: 800, y: 440 }],
    signs: [
      { x: 220, y: 420, text: "A / D para andar | ESPAÇO para pular" },
      { x: 550, y: 420, text: "SHIFT: Mude a realidade para remover o entulho!" }
    ],
    platforms: [
      // Chão contínuo principal
      { x: 0, y: 480, w: 1800, h: 120, type: 'both', style: 'ground' },

      // Pequenas elevações para treinar pulo
      { x: 340, y: 400, w: 120, h: 80, type: 'both', style: 'ground' },

      // OBSTÁCULO CHAVE 1:
      // No mundo poluído: entulho de lixo tóxico intransponível (parede alta)
      // No mundo sustentável: vira um pequeno canteiro de flores floridas por onde se passa livremente!
      { x: 680, y: 280, w: 90, h: 200, type: 'polluted', style: 'rubble', label: 'Entulho Tóxico' },

      // Plataforma no Sustentável: galho florido que permite pegar a 1ª semente no alto
      { x: 920, y: 340, w: 140, h: 24, type: 'sustainable', style: 'vines' },

      // Segundo obstáculo: Pilha de caixas industriais no poluído bloqueia o caminho baixo,
      // mas no sustentável há uma passagem limpa sob uma árvore frutífera
      { x: 1240, y: 320, w: 100, h: 160, type: 'polluted', style: 'crates' },
      { x: 1200, y: 220, w: 180, h: 24, type: 'sustainable', style: 'vines' }
    ],
    hazards: [],
    interactives: [],
    seeds: [
      { id: '1-1', x: 390, y: 340, collected: false },
      { id: '1-2', x: 980, y: 280, collected: false },
      { id: '1-3', x: 1450, y: 420, collected: false }
    ],
    decor: [
      { x: 150, y: 480, type: 'sign', text: 'Eco-Posto 01' },
      { x: 680, y: 480, type: 'flower_bush', world: 'sustainable' },
      { x: 680, y: 480, type: 'trash_pile', world: 'polluted' },
      { x: 1100, y: 480, type: 'tree', world: 'sustainable' },
      { x: 1100, y: 480, type: 'dead_tree', world: 'polluted' }
    ]
  },

  // ========================================================
  // FASE 2: A PONTE
  // ========================================================
  {
    id: 2,
    name: "A Ponte",
    subtitle: "Dois caminhos, duas realidades",
    hint: "A ponte de madeira ruiu no mundo poluído, mas raízes vivas crescem no sustentável!",
    width: 2000,
    height: 650,
    spawn: { x: 100, y: 440 },
    portal: { x: 1840, y: 290, w: 50, h: 70 },
    checkpoints: [{ x: 100, y: 440 }, { x: 980, y: 440 }, { x: 1450, y: 440 }],
    signs: [
      { x: 420, y: 420, text: "O abismo é intransponível... a menos que raízes o conectem!" },
      { x: 1360, y: 420, text: "Suba usando as caixas no mundo poluído!" }
    ],
    platforms: [
      // Margem esquerda
      { x: 0, y: 480, w: 480, h: 170, type: 'both', style: 'ground' },

      // O Grande Vão (Abismo):
      // No mundo sustentável: uma ponte orgânica de cipós e raízes robustas
      { x: 500, y: 470, w: 160, h: 22, type: 'sustainable', style: 'vines' },
      { x: 690, y: 460, w: 170, h: 22, type: 'sustainable', style: 'vines' },

      // Ilha central
      { x: 880, y: 480, w: 320, h: 170, type: 'both', style: 'ground' },

      // Segundo Vão:
      // No poluído há uma viga de ferro instável
      { x: 1220, y: 470, w: 140, h: 20, type: 'polluted', style: 'metal' },
      // No sustentável há cogumelos gigantes para salto
      { x: 1210, y: 450, w: 150, h: 24, type: 'sustainable', style: 'vines' },

      // Margem direita
      { x: 1380, y: 480, w: 620, h: 170, type: 'both', style: 'ground' },

      // Paredão final com saída no alto:
      // Para subir, o jogador precisa das caixas de carga que só existem no MUNDO POLUÍDO!
      { x: 1540, y: 420, w: 90, h: 60, type: 'polluted', style: 'crates' },
      { x: 1610, y: 350, w: 90, h: 130, type: 'polluted', style: 'crates' },

      // No sustentável, há uma árvore que dá acesso à semente secreta do teto
      { x: 1560, y: 250, w: 130, h: 20, type: 'sustainable', style: 'vines' },

      // Patamar superior do portal
      { x: 1730, y: 360, w: 270, h: 120, type: 'both', style: 'ground' }
    ],
    hazards: [
      // Fundo do abismo: precipício
      { x: 480, y: 620, w: 400, h: 50, activeWorld: 'both', type: 'void' },
      { x: 1200, y: 620, w: 180, h: 50, activeWorld: 'both', type: 'void' }
    ],
    interactives: [],
    seeds: [
      { id: '2-1', x: 600, y: 410, collected: false },
      { id: '2-2', x: 1040, y: 420, collected: false },
      { id: '2-3', x: 1620, y: 190, collected: false }
    ],
    decor: [
      { x: 920, y: 480, type: 'solar_decor', world: 'sustainable' },
      { x: 920, y: 480, type: 'chimney', world: 'polluted' }
    ]
  },

  // ========================================================
  // FASE 3: ENERGIA
  // ========================================================
  {
    id: 3,
    name: "Energia Solar",
    subtitle: "Poder da luz solar",
    hint: "No mundo sustentável, ative o painel solar para energizar o portão!",
    width: 2100,
    height: 600,
    spawn: { x: 100, y: 440 },
    portal: { x: 1950, y: 410, w: 50, h: 70 },
    checkpoints: [{ x: 100, y: 440 }, { x: 1000, y: 440 }],
    signs: [
      { x: 280, y: 420, text: "O portão de segurança está bloqueado sem energia limpa." },
      { x: 620, y: 420, text: "Fique sobre o Painel Solar no Mundo Sustentável para ativá-lo (E)" }
    ],
    platforms: [
      // Chão
      { x: 0, y: 480, w: 850, h: 120, type: 'both', style: 'ground' },

      // Plataforma do Painel Solar (acima de uma colina)
      { x: 580, y: 390, w: 160, h: 90, type: 'both', style: 'ground' },

      // Escadaria de folhas sustentáveis para alcançar o bônus
      { x: 420, y: 320, w: 90, h: 18, type: 'sustainable', style: 'vines' },
      { x: 300, y: 250, w: 90, h: 18, type: 'sustainable', style: 'vines' },

      // Portão de Energia 1 (bloqueia o chão até ligar o painel)
      { x: 800, y: 260, w: 28, h: 220, type: 'door', style: 'door', doorId: 'door-1' },

      // Chão continuação após portão
      { x: 828, y: 480, w: 1272, h: 120, type: 'both', style: 'ground' },

      // Segundo trecho: Barreira de fumaça sólida no poluído
      { x: 1150, y: 360, w: 120, h: 120, type: 'polluted', style: 'rubble' },

      // No sustentável, plataformas flutuantes de energia para passar por cima
      { x: 1120, y: 310, w: 80, h: 18, type: 'sustainable', style: 'vines' },
      { x: 1240, y: 270, w: 80, h: 18, type: 'sustainable', style: 'vines' },

      // Estrutura do segundo painel
      { x: 1450, y: 380, w: 140, h: 100, type: 'both', style: 'ground' },

      // Portão de Energia 2
      { x: 1720, y: 260, w: 28, h: 220, type: 'door', style: 'door', doorId: 'door-2' }
    ],
    hazards: [],
    interactives: [
      // Painel solar 1
      {
        id: 'panel-1',
        x: 630,
        y: 350,
        w: 60,
        h: 40,
        type: 'solar_panel',
        targetDoor: 'door-1',
        activated: false,
        requiredWorld: 'sustainable'
      },
      // Painel solar 2
      {
        id: 'panel-2',
        x: 1490,
        y: 340,
        w: 60,
        h: 40,
        type: 'solar_panel',
        targetDoor: 'door-2',
        activated: false,
        requiredWorld: 'sustainable'
      }
    ],
    seeds: [
      { id: '3-1', x: 260, y: 200, collected: false },
      { id: '3-2', x: 1280, y: 220, collected: false },
      { id: '3-3', x: 1620, y: 420, collected: false }
    ],
    decor: [
      { x: 630, y: 480, type: 'cable_line', connects: 'door-1' },
      { x: 1490, y: 480, type: 'cable_line', connects: 'door-2' }
    ]
  },

  // ========================================================
  // FASE 4: O RIO
  // ========================================================
  {
    id: 4,
    name: "O Rio",
    subtitle: "Águas contaminadas vs Nascente limpa",
    hint: "O rio é tóxico e perigoso no mundo poluído! No mundo sustentável, vitórias-régias florescem para você atravessar.",
    width: 2200,
    height: 600,
    spawn: { x: 100, y: 440 },
    portal: { x: 2050, y: 410, w: 50, h: 70 },
    checkpoints: [{ x: 100, y: 440 }, { x: 920, y: 440 }, { x: 1550, y: 440 }],
    signs: [
      { x: 280, y: 420, text: "Atenção: Águas industriais altamente corrosivas!" },
      { x: 950, y: 420, text: "No mundo sustentável, o rio despoluído gera vitórias-régias firmes." }
    ],
    platforms: [
      // Margem inicial
      { x: 0, y: 480, w: 420, h: 120, type: 'both', style: 'ground' },

      // RIO PARTE 1 (Vão de 420 a 880)
      // Plataformas de vitórias-régias no SUSTENTÁVEL
      { x: 480, y: 460, w: 85, h: 20, type: 'sustainable', style: 'lilypad' },
      { x: 620, y: 450, w: 90, h: 20, type: 'sustainable', style: 'lilypad' },
      { x: 760, y: 460, w: 85, h: 20, type: 'sustainable', style: 'lilypad' },

      // No poluído há apenas um cano de esgoto pingando ácido no alto
      { x: 590, y: 350, w: 130, h: 24, type: 'polluted', style: 'metal' },

      // Ilha intermediária
      { x: 880, y: 480, w: 260, h: 120, type: 'both', style: 'ground' },

      // RIO PARTE 2 (Vão de 1140 a 1640)
      // Vitórias-régias e troncos naturais
      { x: 1200, y: 460, w: 80, h: 20, type: 'sustainable', style: 'lilypad' },
      { x: 1340, y: 430, w: 90, h: 20, type: 'sustainable', style: 'vines' },
      { x: 1480, y: 460, w: 80, h: 20, type: 'sustainable', style: 'lilypad' },

      // No poluído há uma balsa enferrujada no meio, mas com cerca farpada
      { x: 1300, y: 460, w: 120, h: 25, type: 'polluted', style: 'metal' },
      { x: 1380, y: 370, w: 20, h: 90, type: 'polluted', style: 'rubble' },

      // Margem final
      { x: 1640, y: 480, w: 560, h: 120, type: 'both', style: 'ground' },

      // Pequena elevação com semente
      { x: 1780, y: 380, w: 100, h: 100, type: 'both', style: 'ground' }
    ],
    hazards: [
      // Trecho 1 do Rio Tóxico (Poluído)
      { x: 420, y: 490, w: 460, h: 110, activeWorld: 'polluted', type: 'toxic_water' },
      // Trecho 2 do Rio Tóxico (Poluído)
      { x: 1140, y: 490, w: 500, h: 110, activeWorld: 'polluted', type: 'toxic_water' }
    ],
    interactives: [],
    seeds: [
      { id: '4-1', x: 650, y: 300, collected: false },
      { id: '4-2', x: 1350, y: 360, collected: false },
      { id: '4-3', x: 1830, y: 330, collected: false }
    ],
    decor: [
      { x: 650, y: 540, type: 'water_stream', world: 'both' },
      { x: 1390, y: 540, type: 'water_stream', world: 'both' }
    ]
  },

  // ========================================================
  // FASE 5: A CIDADE
  // ========================================================
  {
    id: 5,
    name: "A Cidade",
    subtitle: "Entre escombros e telhados verdes",
    hint: "Use os guindastes industriais e os terraços verdes para subir os prédios revitalizados!",
    width: 2400,
    height: 700,
    spawn: { x: 100, y: 540 },
    portal: { x: 2240, y: 210, w: 50, h: 70 },
    checkpoints: [{ x: 100, y: 540 }, { x: 800, y: 540 }, { x: 1500, y: 380 }],
    signs: [
      { x: 240, y: 520, text: "A cidade abandonada guarda novas possibilidades ecológicas." }
    ],
    platforms: [
      // Base térrea da cidade
      { x: 0, y: 580, w: 720, h: 120, type: 'both', style: 'ground' },

      // Prédio 1 (Ruínas industriais vs Centro Comunitário)
      { x: 420, y: 460, w: 180, h: 120, type: 'both', style: 'ground' },
      // Andaimes de ferro no poluído
      { x: 340, y: 370, w: 90, h: 18, type: 'polluted', style: 'metal' },
      // Jardins verticais no sustentável
      { x: 460, y: 360, w: 120, h: 20, type: 'sustainable', style: 'vines' },

      // Abismo entre prédios com água servida
      { x: 720, y: 580, w: 300, h: 120, type: 'both', style: 'ground' },

      // Prédio 2 (Central de Força)
      { x: 820, y: 470, w: 180, h: 110, type: 'both', style: 'ground' },
      { x: 860, y: 370, w: 120, h: 22, type: 'both', style: 'ground' },

      // Painel solar no topo do prédio 2
      // Portão que bloqueia o acesso à passarela do prédio 3
      { x: 1220, y: 250, w: 26, h: 230, type: 'door', style: 'door', doorId: 'city-door' },

      // Chão do setor intermediário
      { x: 1020, y: 580, w: 450, h: 120, type: 'both', style: 'ground' },

      // Ponte pênsil de cipó no sustentável
      { x: 1030, y: 360, w: 170, h: 20, type: 'sustainable', style: 'vines' },
      // No poluído: cano de gás vazando
      { x: 1080, y: 430, w: 120, h: 20, type: 'polluted', style: 'metal' },

      // Prédio 3 (Arranha-céu Revitalizado)
      { x: 1470, y: 480, w: 930, h: 220, type: 'both', style: 'ground' },
      { x: 1580, y: 400, w: 240, h: 80, type: 'both', style: 'ground' },
      { x: 1750, y: 320, w: 200, h: 80, type: 'both', style: 'ground' },

      // Passarelas para o topo
      // No poluído: guindaste enferrujado
      { x: 1980, y: 340, w: 100, h: 20, type: 'polluted', style: 'metal' },
      // No sustentável: copa de carvalho ancestral
      { x: 1960, y: 260, w: 140, h: 24, type: 'sustainable', style: 'vines' },

      // Terraço final do portal
      { x: 2140, y: 280, w: 260, h: 200, type: 'both', style: 'ground' }
    ],
    hazards: [
      { x: 620, y: 570, w: 100, h: 30, activeWorld: 'polluted', type: 'spikes' }
    ],
    interactives: [
      {
        id: 'city-panel',
        x: 890,
        y: 330,
        w: 60,
        h: 40,
        type: 'solar_panel',
        targetDoor: 'city-door',
        activated: false,
        requiredWorld: 'sustainable'
      }
    ],
    seeds: [
      { id: '5-1', x: 380, y: 310, collected: false },
      { id: '5-2', x: 1100, y: 300, collected: false },
      { id: '5-3', x: 2010, y: 190, collected: false }
    ],
    decor: [
      { x: 500, y: 580, type: 'building_facade', world: 'both' },
      { x: 1650, y: 480, type: 'solar_farm', world: 'sustainable' },
      { x: 1650, y: 480, type: 'smokestack', world: 'polluted' }
    ]
  },

  // ========================================================
  // FASE 6: TRANSFORMAÇÃO (CLÍMAX FINAL)
  // ========================================================
  {
    id: 6,
    name: "Transformação",
    subtitle: "O Purificador Planetário",
    hint: "Ative a Grande Usina Limpa no topo para transformar permanentemente todo o ecossistema!",
    width: 2700,
    height: 750,
    spawn: { x: 120, y: 580 },
    portal: { x: 2520, y: 240, w: 60, h: 80, isFinal: true },
    checkpoints: [{ x: 120, y: 580 }, { x: 950, y: 580 }, { x: 1750, y: 460 }],
    signs: [
      { x: 260, y: 560, text: "O coração industrial do mundo antigo. Una as duas realidades!" },
      { x: 1050, y: 560, text: "Ative as duas células solares gêmeas para dissipar a barreira mestre." }
    ],
    platforms: [
      // Chão de entrada
      { x: 0, y: 620, w: 600, h: 130, type: 'both', style: 'ground' },

      // Seção 1: Alternância rápida de plataformas
      { x: 320, y: 530, w: 100, h: 20, type: 'polluted', style: 'metal' },
      { x: 460, y: 480, w: 110, h: 22, type: 'sustainable', style: 'vines' },

      // Fossa tóxica central
      { x: 600, y: 620, w: 320, h: 130, type: 'both', style: 'ground' },
      { x: 640, y: 520, w: 110, h: 20, type: 'sustainable', style: 'lilypad' },
      { x: 790, y: 470, w: 110, h: 20, type: 'polluted', style: 'crates' },

      // Estação de Controle 1
      { x: 920, y: 620, w: 460, h: 130, type: 'both', style: 'ground' },
      { x: 1020, y: 520, w: 140, h: 100, type: 'both', style: 'ground' },

      // Portão Mestre 1
      { x: 1360, y: 390, w: 28, h: 230, type: 'door', style: 'door', doorId: 'master-door-1' },

      // Setor 2: Subida da Grande Torre
      { x: 1388, y: 620, w: 480, h: 130, type: 'both', style: 'ground' },
      { x: 1480, y: 510, w: 130, h: 24, type: 'sustainable', style: 'vines' },
      { x: 1650, y: 440, w: 120, h: 22, type: 'polluted', style: 'metal' },

      // Patamar Médio
      { x: 1770, y: 500, w: 340, h: 120, type: 'both', style: 'ground' },
      { x: 1820, y: 410, w: 140, h: 90, type: 'both', style: 'ground' },

      // Portão Mestre 2
      { x: 2100, y: 260, w: 28, h: 240, type: 'door', style: 'door', doorId: 'master-door-2' },

      // Setor 3: Ponte para a Cúpula do Purificador
      { x: 2128, y: 500, w: 572, h: 250, type: 'both', style: 'ground' },
      { x: 2200, y: 410, w: 120, h: 22, type: 'sustainable', style: 'vines' },
      { x: 2340, y: 350, w: 110, h: 22, type: 'sustainable', style: 'vines' },

      // Altar do Purificador Planetário
      { x: 2480, y: 320, w: 180, h: 180, type: 'both', style: 'ground' }
    ],
    hazards: [
      { x: 600, y: 630, w: 320, h: 40, activeWorld: 'polluted', type: 'toxic_water' }
    ],
    interactives: [
      {
        id: 'final-panel-1',
        x: 1060,
        y: 480,
        w: 60,
        h: 40,
        type: 'solar_panel',
        targetDoor: 'master-door-1',
        activated: false,
        requiredWorld: 'sustainable'
      },
      {
        id: 'final-panel-2',
        x: 1860,
        y: 370,
        w: 60,
        h: 40,
        type: 'solar_panel',
        targetDoor: 'master-door-2',
        activated: false,
        requiredWorld: 'sustainable'
      }
    ],
    seeds: [
      { id: '6-1', x: 500, y: 420, collected: false },
      { id: '6-2', x: 1530, y: 440, collected: false },
      { id: '6-3', x: 2250, y: 340, collected: false }
    ],
    decor: [
      { x: 1060, y: 620, type: 'cable_line', connects: 'master-door-1' },
      { x: 1860, y: 500, type: 'cable_line', connects: 'master-door-2' },
      { x: 2570, y: 320, type: 'master_purifier_globe', world: 'both' }
    ]
  }
];

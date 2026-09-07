/* ============================================================
   Panda Heist — Level definitions
   Grid-based stealth levels. Tile codes: 0 floor, 1 wall, 2 vent
   (vent tiles are only passable by Bamboo). Props (candy, safes,
   bushes, lamps, cameras) are tracked as separate entity lists.
   ============================================================ */
(function (PH) {
  'use strict';

  const FLOOR = 0, WALL = 1, VENT = 2;

  function blankGrid(w, h) {
    const grid = [];
    for (let y = 0; y < h; y++) {
      const row = [];
      for (let x = 0; x < w; x++) {
        row.push((x === 0 || y === 0 || x === w - 1 || y === h - 1) ? WALL : FLOOR);
      }
      grid.push(row);
    }
    return grid;
  }

  function fillRect(grid, x1, y1, x2, y2, tile) {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        if (grid[y] && grid[y][x] !== undefined) grid[y][x] = tile;
      }
    }
  }

  function setTiles(grid, coords, tile) {
    coords.forEach(([x, y]) => { if (grid[y] && grid[y][x] !== undefined) grid[y][x] = tile; });
  }

  function pts(...coords) {
    // helper: pairs of numbers -> [[x,y],...]
    const out = [];
    for (let i = 0; i < coords.length; i += 2) out.push([coords[i], coords[i + 1]]);
    return out;
  }

  function makeLevel(def) {
    const grid = blankGrid(def.width, def.height);
    (def.wallBlocks || []).forEach(([x1, y1, x2, y2]) => fillRect(grid, x1, y1, x2, y2, WALL));
    setTiles(grid, def.vents || [], VENT);

    const candies = (def.candies || []).map(([x, y]) => ({ x, y, taken: false }));
    const safes = (def.safes || []).map(([x, y]) => ({ x, y, opened: false, value: def.safeValue || 6 }));
    const bushes = (def.bushes || []).map(([x, y]) => ({ x, y }));
    const lamps = (def.lamps || []).map(([x, y]) => ({ x, y }));
    const guards = (def.guards || []).map(g => ({
      x: g.patrol[0][0], y: g.patrol[0][1],
      patrol: g.patrol, speed: g.speed || 1.6,
      visionRange: g.visionRange || 4.4, visionSpread: g.visionSpread || (Math.PI / 2.6),
      wait: g.wait || 0.6
    }));
    const cameras = (def.cameras || []).map(c => ({
      x: c.x, y: c.y, from: c.from, to: c.to, speed: c.speed || 0.7,
      visionRange: c.visionRange || 4.6, visionSpread: c.visionSpread || (Math.PI / 3.4),
      angle: c.from, dir: 1
    }));

    const totalCandyValue = candies.length + safes.reduce((s, sf) => s + sf.value, 0);

    return {
      id: def.id, name: def.name, theme: def.theme, desc: def.desc,
      width: def.width, height: def.height, grid,
      playerStart: def.playerStart, exit: def.exit,
      timeLimit: def.timeLimit,
      candies, safes, bushes, lamps, guards, cameras,
      totalCandyValue
    };
  }

  const LEVELS = [
    makeLevel({
      id: 'lollipop-lane',
      name: 'Lollipop Lane',
      theme: 'Tutorial Sneak',
      desc: 'A quiet candy street. Learn the ropes before the real jobs begin.',
      width: 16, height: 10,
      playerStart: [1.5, 1.5],
      exit: [14, 8],
      timeLimit: 100,
      wallBlocks: [[5, 3, 9, 5]],
      vents: [],
      candies: pts(3, 1, 11, 1, 2, 6, 12, 2, 7, 7, 13, 6),
      safes: [],
      bushes: pts(7, 4),
      lamps: pts(4, 7, 11, 7),
      guards: [
        { patrol: [[6, 2], [12, 2], [12, 2], [6, 2]], speed: 1.5, visionRange: 4.2 }
      ],
      cameras: []
    }),

    makeLevel({
      id: 'chocolate-factory',
      name: 'Chocolate Factory',
      theme: 'Vents & Vaults',
      desc: 'Steamy conveyor belts hide a vent shortcut — perfect for a small panda.',
      width: 19, height: 12,
      playerStart: [1.5, 1.5],
      exit: [17, 10],
      timeLimit: 120,
      wallBlocks: [[4, 2, 4, 8], [8, 4, 14, 4], [8, 7, 14, 7]],
      vents: pts(4, 5),
      candies: pts(2, 8, 6, 1, 10, 1, 16, 1, 6, 9, 10, 9, 15, 5, 2, 4),
      safes: pts(11, 5),
      safeValue: 8,
      bushes: pts(6, 6, 13, 9),
      lamps: pts(9, 2, 16, 8),
      guards: [
        { patrol: [[9, 3], [13, 3], [13, 3], [9, 3]], speed: 1.7, visionRange: 4.4 },
        { patrol: [[9, 8], [13, 8], [13, 8], [9, 8]], speed: 1.9, visionRange: 4.6 }
      ],
      cameras: []
    }),

    makeLevel({
      id: 'gummy-warehouse',
      name: 'Gummy Bear Warehouse',
      theme: 'Crates & Shadows',
      desc: 'Towering crates of gummy bears cast long shadows across the floor.',
      width: 21, height: 13,
      playerStart: [1.5, 1.5],
      exit: [19, 11],
      timeLimit: 135,
      wallBlocks: [[3, 3, 5, 5], [9, 2, 11, 4], [15, 3, 17, 5], [3, 8, 5, 10], [9, 9, 11, 11], [15, 8, 17, 10]],
      vents: pts(6, 4, 14, 9),
      candies: pts(2, 6, 7, 1, 13, 1, 18, 1, 2, 11, 7, 11, 18, 6, 12, 6, 8, 6, 5, 2, 17, 11),
      safes: pts(10, 6),
      safeValue: 8,
      bushes: pts(2, 9, 18, 3, 12, 8),
      lamps: pts(6, 2, 14, 2, 6, 10, 14, 10),
      guards: [
        { patrol: [[7, 2], [7, 12], [7, 12], [7, 2]], speed: 1.8, visionRange: 4.6 },
        { patrol: [[13, 12], [13, 2], [13, 2], [13, 12]], speed: 1.8, visionRange: 4.6 },
        { patrol: [[2, 6], [18, 6], [18, 6], [2, 6]], speed: 2.0, visionRange: 4.2 }
      ],
      cameras: []
    }),

    makeLevel({
      id: 'dessert-boutique',
      name: 'Gourmet Dessert Boutique',
      theme: 'Cameras & Corridors',
      desc: 'Fancy pastry cases hide rotating security cameras. Watch the red light!',
      width: 20, height: 13,
      playerStart: [1.5, 1.5],
      exit: [18, 11],
      timeLimit: 140,
      wallBlocks: [[6, 1, 6, 6], [13, 1, 13, 6], [3, 7, 9, 8], [11, 7, 17, 8], [6, 9, 6, 11], [13, 9, 13, 11]],
      vents: pts(6, 8, 13, 4),
      candies: pts(2, 3, 9, 2, 16, 3, 2, 10, 9, 11, 16, 10, 4, 6, 15, 6, 10, 9),
      safes: pts(3, 4, 16, 8),
      safeValue: 7,
      bushes: pts(2, 6, 17, 6),
      lamps: pts(9, 1, 9, 11, 16, 6),
      guards: [
        { patrol: [[8, 2], [11, 2], [11, 2], [8, 2]], speed: 1.9, visionRange: 4.4 },
        { patrol: [[8, 10], [11, 10], [11, 10], [8, 10]], speed: 1.9, visionRange: 4.4 }
      ],
      cameras: [
        { x: 9.5, y: 7.5, from: -Math.PI / 2.4, to: Math.PI / 2.4, speed: 0.8, visionRange: 4.8 }
      ]
    }),

    makeLevel({
      id: 'grand-palace',
      name: 'Grand Candy Palace',
      theme: 'The Final Score',
      desc: 'Every trick, every guard, every camera. The biggest haul of the night.',
      width: 23, height: 14,
      playerStart: [1.5, 1.5],
      exit: [21, 12],
      timeLimit: 160,
      wallBlocks: [[5, 2, 7, 4], [11, 2, 13, 4], [17, 2, 19, 4], [5, 6, 7, 8], [15, 6, 17, 8], [10, 9, 12, 11], [3, 10, 5, 12], [19, 9, 21, 11]],
      vents: pts(9, 3, 6, 7, 18, 10),
      candies: pts(2, 5, 9, 1, 15, 1, 21, 5, 2, 8, 9, 6, 14, 6, 21, 8, 2, 12, 9, 12, 15, 12, 8, 4, 16, 4, 4, 7, 18, 7),
      safes: pts(6, 3, 16, 3, 11, 10),
      safeValue: 8,
      bushes: pts(3, 6, 19, 6, 11, 8),
      lamps: pts(9, 2, 13, 2, 9, 12, 13, 12, 21, 2),
      guards: [
        { patrol: [[8, 2], [14, 2], [14, 2], [8, 2]], speed: 2.0, visionRange: 4.6 },
        { patrol: [[6, 5], [6, 9], [6, 9], [6, 5]], speed: 1.9, visionRange: 4.4 },
        { patrol: [[16, 5], [16, 9], [16, 9], [16, 5]], speed: 1.9, visionRange: 4.4 },
        { patrol: [[8, 12], [14, 12], [14, 12], [8, 12]], speed: 2.1, visionRange: 4.8 }
      ],
      cameras: [
        { x: 11.5, y: 6, from: -Math.PI / 2.2, to: Math.PI / 2.2, speed: 0.9, visionRange: 5 },
        { x: 4, y: 4, from: 0, to: Math.PI / 1.6, speed: 0.6, visionRange: 4.4 }
      ]
    })
  ];

  PH.TILE = { FLOOR, WALL, VENT };
  PH.LEVELS = LEVELS;
})(window.PH = window.PH || {});

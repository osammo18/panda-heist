/* ============================================================
   Panda Heist — Characters & Costumes
   Palette-swap costume system (no external texture files needed).
   ============================================================ */
(function (PH) {
  'use strict';

  // Base character definitions
  const CHARACTERS = {
    bamboo: {
      id: 'bamboo',
      name: 'Bamboo',
      title: 'The Sneak',
      accent: '#7bc043',
      desc: 'Small and quick. Squeezes through vents other pandas can\'t fit.',
      ability: 'Roll Dash',
      abilityDesc: 'Quick burst dash to slip past a guard\'s gaze.',
      cooldown: 4000,
      passive: 'vent'
    },
    bao: {
      id: 'bao',
      name: 'Bao',
      title: 'The Distractor',
      accent: '#ffb703',
      desc: 'Charms guards with adorable antics and tasty decoys.',
      ability: 'Decoy Toss',
      abilityDesc: 'Throws a candy decoy that lures nearby guards to investigate.',
      cooldown: 6000,
      passive: 'distract'
    },
    mei: {
      id: 'mei',
      name: 'Mei',
      title: 'The Hacker',
      accent: '#ff5fa2',
      desc: 'Hacks electronic locks and candy vaults with homemade gadgets.',
      ability: 'Vault EMP',
      abilityDesc: 'Briefly blinds every guard\'s vision cone in the room.',
      cooldown: 10000,
      passive: 'hack'
    }
  };

  // Costume palettes per character - simple recolors + accessory glyphs.
  // cost: candy currency required to unlock. First of each list is free.
  const COSTUMES = {
    bamboo: [
      { id: 'classic', name: 'Classic Green', cost: 0, body: '#f5f5f0', patch: '#232323', accent: '#7bc043', accessory: null },
      { id: 'ninja', name: 'Shadow Ninja', cost: 80, body: '#e8e8e8', patch: '#151515', accent: '#3a3a3a', accessory: 'mask' },
      { id: 'bandit', name: 'Red Bandit', cost: 120, body: '#f5f5f0', patch: '#232323', accent: '#d6304a', accessory: 'bandana' },
      { id: 'winter', name: 'Winter Scout', cost: 160, body: '#f2f6ff', patch: '#233', accent: '#5aa9e6', accessory: 'scarf' },
      { id: 'jungle', name: 'Jungle Vine', cost: 200, body: '#eef5e6', patch: '#20301f', accent: '#3f8f3f', accessory: 'leaf' },
      { id: 'neon', name: 'Neon Prowler', cost: 260, body: '#dff9ff', patch: '#0c1f22', accent: '#22e6c8', accessory: 'visor' },
      { id: 'candyfloss', name: 'Candy Floss', cost: 320, body: '#ffe9f5', patch: '#5a2540', accent: '#ff8fd1', accessory: 'bow' },
      { id: 'golden', name: 'Golden Legend', cost: 500, body: '#fff3cf', patch: '#5a4413', accent: '#ffcf3f', accessory: 'crown' }
    ],
    bao: [
      { id: 'classic', name: 'Classic Cap', cost: 0, body: '#f5f5f0', patch: '#232323', accent: '#ffb703', accessory: 'cap' },
      { id: 'chef', name: 'Sweet Chef', cost: 80, body: '#fff8f0', patch: '#232323', accent: '#ffffff', accessory: 'chefhat' },
      { id: 'party', name: 'Party Panda', cost: 120, body: '#f5f5f0', patch: '#232323', accent: '#ff5fa2', accessory: 'partyhat' },
      { id: 'royal', name: 'Royal Cape', cost: 160, body: '#f5f5f0', patch: '#232323', accent: '#8a4fff', accessory: 'cape' },
      { id: 'summer', name: 'Summer Vibes', cost: 200, body: '#fff8ee', patch: '#332', accent: '#ffd23f', accessory: 'shades' },
      { id: 'neon', name: 'Neon Hustler', cost: 260, body: '#eafcff', patch: '#102', accent: '#4fe0c5', accessory: 'visor' },
      { id: 'gummy', name: 'Gummy Bear Suit', cost: 320, body: '#ffd9e6', patch: '#7a1f3d', accent: '#ff4d7a', accessory: 'bow' },
      { id: 'golden', name: 'Golden Legend', cost: 500, body: '#fff3cf', patch: '#5a4413', accent: '#ffcf3f', accessory: 'crown' }
    ],
    mei: [
      { id: 'classic', name: 'Classic Pink', cost: 0, body: '#f5f5f0', patch: '#232323', accent: '#ff5fa2', accessory: 'headphones' },
      { id: 'cyber', name: 'Cyberpunk', cost: 80, body: '#e7f0ff', patch: '#141b2e', accent: '#7b5bff', accessory: 'visor' },
      { id: 'retro', name: 'Retro Gamer', cost: 120, body: '#f5f5f0', patch: '#232323', accent: '#4fe0c5', accessory: 'headphones' },
      { id: 'winter', name: 'Winter Techie', cost: 160, body: '#f2f6ff', patch: '#233', accent: '#5aa9e6', accessory: 'scarf' },
      { id: 'lab', name: 'Candy Lab Coat', cost: 200, body: '#ffffff', patch: '#222', accent: '#ffd23f', accessory: 'labcoat' },
      { id: 'neon', name: 'Neon Circuit', cost: 260, body: '#101018', patch: '#000', accent: '#22e6c8', accessory: 'visor' },
      { id: 'starlight', name: 'Starlight', cost: 320, body: '#f2e9ff', patch: '#2c1a4a', accent: '#c48bff', accessory: 'bow' },
      { id: 'golden', name: 'Golden Legend', cost: 500, body: '#fff3cf', patch: '#5a4413', accent: '#ffcf3f', accessory: 'crown' }
    ]
  };

  PH.CHARACTERS = CHARACTERS;
  PH.COSTUMES = COSTUMES;
})(window.PH = window.PH || {});

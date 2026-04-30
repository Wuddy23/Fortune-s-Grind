const RARITIES = {
    common:    { key: 'common',    label: 'Common',    color: '#aaaaaa', weight: 60, mult: 1.0  },
    uncommon:  { key: 'uncommon',  label: 'Uncommon',  color: '#1eff00', weight: 25, mult: 1.7  },
    rare:      { key: 'rare',      label: 'Rare',      color: '#2979ff', weight: 10, mult: 3.0  },
    epic:      { key: 'epic',      label: 'Epic',      color: '#aa44ee', weight: 4,  mult: 5.0  },
    legendary: { key: 'legendary', label: 'Legendary', color: '#ff8800', weight: 1,  mult: 9.0  }
};

const GEAR_TYPES = {
    weapon: {
        key: 'weapon', icon: '⚔️', label: 'Weapon',
        baseStats: { attack: 5 },
        names: {
            common:    ['Rusty Sword', 'Old Dagger', 'Bent Shortsword', 'Cracked Axe'],
            uncommon:  ['Iron Longsword', 'Steel Dagger', 'Battle Axe', 'War Pick'],
            rare:      ['Enchanted Blade', 'Shadowfang', 'Rune Axe', "Warrior's Saber"],
            epic:      ['Soulreaper', 'Voidfang', 'Chaos Blade', 'Demonslayer'],
            legendary: ['Excalibur', 'Dragonbane', 'Godslayer', 'The Last Sword']
        }
    },
    shield: {
        key: 'shield', icon: '🛡️', label: 'Shield',
        baseStats: { defense: 4 },
        names: {
            common:    ['Wooden Shield', 'Cracked Buckler', 'Old Round Shield', 'Tin Shield'],
            uncommon:  ['Iron Buckler', 'Steel Round Shield', 'Reinforced Shield', 'Battle Shield'],
            rare:      ['Enchanted Bulwark', 'Stormguard', 'Rune Shield', "Knight's Kite"],
            epic:      ['Aegis Fragment', 'Voidward', 'Chaos Ward', 'Soulbarrier'],
            legendary: ['Divine Aegis', "Titan's Bulwark", "God's Shield", 'The Eternal Ward']
        }
    },
    armor: {
        key: 'armor', icon: '🥋', label: 'Armor',
        baseStats: { defense: 2, maxHp: 20 },
        names: {
            common:    ['Torn Tunic', 'Old Leather Vest', 'Worn Chainmail', 'Dented Breastplate'],
            uncommon:  ['Leather Armor', 'Chainmail Vest', 'Iron Breastplate', 'Studded Leather'],
            rare:      ['Enchanted Chainmail', 'Mithril Vest', 'Rune Breastplate', "Knight's Plate"],
            epic:      ['Soulforged Plate', 'Voidweave Armor', 'Chaos Mail', 'Demonhide'],
            legendary: ['Dragon Scale Armor', "Titan's Plate", "God's Chestpiece", 'Immortal Armor']
        }
    },
    shoes: {
        key: 'shoes', icon: '👢', label: 'Shoes',
        baseStats: { defense: 1, speed: 0.08 },
        names: {
            common:    ['Worn Boots', 'Old Sandals', 'Tattered Shoes', 'Cracked Leather Boots'],
            uncommon:  ['Leather Boots', 'Iron-Tipped Boots', 'Swift Sandals', "Traveler's Boots"],
            rare:      ['Enchanted Greaves', 'Windstep Boots', 'Rune Boots', 'Quickstep Sabatons'],
            epic:      ['Soulstep Boots', 'Voidwalker Shoes', 'Chaos Greaves', 'Shadowstep'],
            legendary: ["Mercury's Sandals", "Titan's Greaves", "God's Footsteps", 'Eternal Stride']
        }
    },
    gloves: {
        key: 'gloves', icon: '🧤', label: 'Gloves',
        baseStats: { attack: 2, critChance: 0.025 },
        names: {
            common:    ['Torn Gloves', 'Old Wraps', 'Worn Gauntlets', 'Padded Gloves'],
            uncommon:  ['Leather Gloves', 'Chain Gauntlets', 'Iron Fists', "Fighter's Wraps"],
            rare:      ['Enchanted Gauntlets', 'Strikefist Gloves', 'Rune Gauntlets', "Crusher's Fists"],
            epic:      ['Soulgrip Gauntlets', 'Voidfist Gloves', 'Chaos Gauntlets', 'Demonhand'],
            legendary: ["Titan's Fists", "God's Hands", 'The Iron Grip', 'Eternal Gauntlets']
        }
    },
    helmet: {
        key: 'helmet', icon: '🪖', label: 'Helmet',
        baseStats: { defense: 2, maxHp: 15 },
        names: {
            common:    ['Rusty Helmet', 'Old Hood', 'Dented Cap', 'Worn Circlet'],
            uncommon:  ['Iron Helmet', 'Steel Cap', 'Chainmail Coif', 'Leather Helm'],
            rare:      ['Enchanted Helm', 'Stormcrown', 'Rune Helmet', "Knight's Visage"],
            epic:      ['Soulcrown', 'Voidhelm', 'Chaos Helmet', 'Demonface'],
            legendary: ["Dragon's Crown", "Titan's Helm", "God's Crown", 'The Eternal Helm']
        }
    }
};

const GEAR_TYPE_KEYS = Object.keys(GEAR_TYPES);

const MONSTERS = [
    {
        key: 'rat',        name: 'Giant Rat',   emoji: '🐀',
        floorMin: 1,  floorMax: 3,
        baseHp: 28,  baseAtk: 4,  baseDef: 1,  baseSpeed: 0.75,
        goldMin: 1,  goldMax: 4,  xp: 10,  sizeMult: 0.80
    },
    {
        key: 'goblin',     name: 'Goblin',       emoji: '👺',
        floorMin: 1,  floorMax: 6,
        baseHp: 45,  baseAtk: 6,  baseDef: 2,  baseSpeed: 0.85,
        goldMin: 2,  goldMax: 6,  xp: 15,  sizeMult: 0.85
    },
    {
        key: 'skeleton',   name: 'Skeleton',     emoji: '💀',
        floorMin: 3,  floorMax: 9,
        baseHp: 60,  baseAtk: 9,  baseDef: 3,  baseSpeed: 0.90,
        goldMin: 3,  goldMax: 8,  xp: 22,  sizeMult: 0.90
    },
    {
        key: 'zombie',     name: 'Zombie',       emoji: '🧟',
        floorMin: 5,  floorMax: 12,
        baseHp: 90,  baseAtk: 11, baseDef: 4,  baseSpeed: 0.65,
        goldMin: 4,  goldMax: 10, xp: 30,  sizeMult: 0.95
    },
    {
        key: 'orc',        name: 'Orc',          emoji: '👹',
        floorMin: 8,  floorMax: 15,
        baseHp: 130, baseAtk: 15, baseDef: 6,  baseSpeed: 0.80,
        goldMin: 6,  goldMax: 14, xp: 45,  sizeMult: 1.00
    },
    {
        key: 'darkKnight', name: 'Dark Knight',  emoji: '🗡️',
        floorMin: 11, floorMax: 19,
        baseHp: 175, baseAtk: 20, baseDef: 10, baseSpeed: 0.95,
        goldMin: 9,  goldMax: 20, xp: 65,  sizeMult: 1.00
    },
    {
        key: 'vampire',    name: 'Vampire',      emoji: '🧛',
        floorMin: 14, floorMax: 23,
        baseHp: 230, baseAtk: 26, baseDef: 13, baseSpeed: 1.10,
        goldMin: 13, goldMax: 28, xp: 90,  sizeMult: 0.95
    },
    {
        key: 'demon',      name: 'Demon',        emoji: '😈',
        floorMin: 18, floorMax: 29,
        baseHp: 310, baseAtk: 34, baseDef: 17, baseSpeed: 1.00,
        goldMin: 18, goldMax: 38, xp: 125, sizeMult: 1.05
    },
    {
        key: 'lich',       name: 'Lich',         emoji: '☠️',
        floorMin: 23, floorMax: 36,
        baseHp: 420, baseAtk: 44, baseDef: 22, baseSpeed: 0.90,
        goldMin: 24, goldMax: 50, xp: 170, sizeMult: 1.00
    },
    {
        key: 'dragon',     name: 'Dragon',       emoji: '🐉',
        floorMin: 30, floorMax: 999,
        baseHp: 600, baseAtk: 58, baseDef: 30, baseSpeed: 0.85,
        goldMin: 35, goldMax: 70, xp: 240, sizeMult: 1.20
    }
];

const KILLS_PER_FLOOR  = 10;
const GEAR_DROP_CHANCE = 0.28;

// XP required to advance from level N (index N-1)
const XP_TABLE = (() => {
    const t = [];
    let v = 100;
    for (let i = 0; i < 100; i++) {
        t.push(Math.floor(v));
        v *= 1.22;
    }
    return t;
})();

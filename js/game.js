let state;
let lastTime = 0;
const SAVE_KEY = 'fortunes_grind_v1';

function createState() {
    return {
        player: {
            level: 1, xp: 0,
            baseHp: 100, hp: 100,
            baseAtk: 10, baseDef: 3, baseSpd: 1.0, baseCrit: 0.05,
            critMult: 2.0,
            gold: 0, totalGold: 0, totalKills: 0,
            equipment: { weapon: null, shield: null, armor: null, shoes: null, gloves: null, helmet: null },
            inventory: [],
            // derived
            maxHp: 100, attack: 10, defense: 3, speed: 1.0, critChance: 0.05
        },
        dungeon: { floor: 1, kills: 0, canAdvance: false },
        monster: null,
        combat: {
            playerTimer: 0, monsterTimer: 0, log: [],
            paused: false, pauseTimer: 0, playerDead: false
        },
        anim: { floats: [], playerHit: 0, monsterHit: 0, playerX: 0, monsterX: 0 },
        ui: { nextId: 1, sortMode: 'new' }
    };
}

// ─── Init ───────────────────────────────────────────────────────────────────

function initGame() {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
        try {
            state = JSON.parse(saved);
            if (!state.player.totalGold)   state.player.totalGold = 0;
            if (!state.player.totalKills)  state.player.totalKills = 0;
            if (!state.ui)                 state.ui = { nextId: 1000, sortMode: 'new' };
            if (!state.anim)               state.anim = { floats: [], playerHit: 0, monsterHit: 0, playerX: 0, monsterX: 0 };
            state.combat.paused = false;
            state.combat.playerDead = false;
            state.combat.pauseTimer = 0;
            state.monster = null;
            recalcStats();
        } catch (_) {
            state = createState();
        }
    } else {
        state = createState();
    }

    spawnMonster();
    initRenderer();
    initUI();
    requestAnimationFrame(gameLoop);
    setInterval(saveGame, 30000);
}

// ─── Game Loop ───────────────────────────────────────────────────────────────

function gameLoop(ts) {
    requestAnimationFrame(gameLoop);          // schedule next frame first so errors can't kill the loop
    const dt = Math.min((ts - lastTime) / 1000, 0.1);
    lastTime = ts;
    updateCombat(dt);
    renderFrame(ts);
    updateUI();
}

// ─── Combat ──────────────────────────────────────────────────────────────────

function updateCombat(dt) {
    const c   = state.combat;
    const anim = state.anim;

    // Decay visuals
    anim.playerHit  = Math.max(0, anim.playerHit  - dt * 6);
    anim.monsterHit = Math.max(0, anim.monsterHit - dt * 6);
    anim.playerX  += (-anim.playerX)  * Math.min(1, dt * 12);
    anim.monsterX += (-anim.monsterX) * Math.min(1, dt * 12);
    anim.floats = anim.floats.filter(f => {
        f.life -= dt;
        f.y    -= dt * 45;
        return f.life > 0;
    });

    // Between-fight or death pause
    if (c.paused) {
        c.pauseTimer -= dt;
        if (c.pauseTimer <= 0) {
            c.paused = false;
            if (c.playerDead) {
                c.playerDead = false;
                state.player.hp = Math.floor(state.player.maxHp * 0.55);
                addLog('You rise again, wounded...', 'system');
            }
            spawnMonster();
        }
        return;
    }

    if (!state.monster) return;

    c.playerTimer -= dt;
    if (c.playerTimer <= 0) {
        c.playerTimer = 1 / state.player.speed;
        doPlayerAttack();
    }

    if (state.monster) {
        c.monsterTimer -= dt;
        if (c.monsterTimer <= 0) {
            c.monsterTimer = 1 / state.monster.speed;
            doMonsterAttack();
        }
    }
}

function doPlayerAttack() {
    const p = state.player;
    const m = state.monster;
    if (!m) return;

    let dmg = Math.max(1, Math.floor((p.attack - m.defense) * (0.8 + Math.random() * 0.4)));
    dmg = Math.max(1, dmg);
    const isCrit = Math.random() < p.critChance;
    if (isCrit) dmg = Math.floor(dmg * p.critMult);

    m.hp = Math.max(0, m.hp - dmg);
    state.anim.playerX  = 18;
    state.anim.monsterHit = 1;
    spawnFloat(0.74, 0.50, isCrit ? `💥${dmg}` : `-${dmg}`, isCrit ? '#f39c12' : '#ff6666');

    if (isCrit) addLog(`⚡ CRIT! You strike ${m.type.name} for ${dmg}!`, 'crit');
    else        addLog(`You attack ${m.type.name} for ${dmg}.`, 'player');

    if (m.hp <= 0) killMonster();
}

function doMonsterAttack() {
    const p = state.player;
    const m = state.monster;
    if (!m) return;

    let dmg = Math.max(1, Math.floor((m.attack - p.defense) * (0.8 + Math.random() * 0.4)));
    dmg = Math.max(1, dmg);

    p.hp = Math.max(0, p.hp - dmg);
    state.anim.monsterX = -18;
    state.anim.playerHit = 1;
    spawnFloat(0.22, 0.50, `-${dmg}`, '#ff4444');

    addLog(`${m.type.name} hits you for ${dmg}.`, 'monster');

    if (p.hp <= 0) playerDied();
}

function killMonster() {
    const m     = state.monster;
    const floor = state.dungeon.floor;

    // Gold
    const gold = Math.floor(
        (m.type.goldMin + Math.random() * (m.type.goldMax - m.type.goldMin)) * (1 + floor * 0.12)
    );
    state.player.gold      += gold;
    state.player.totalGold += gold;
    addLog(`${m.type.name} defeated! +${gold}💰`, 'kill');
    spawnFloat(0.74, 0.38, `+${gold}💰`, '#ffd700');

    // Gear drop
    if (Math.random() < GEAR_DROP_CHANCE) {
        const item    = generateGear(floor);
        state.player.inventory.push(item);
        const logType = { legendary: 'legendary', epic: 'epic', rare: 'rare' }[item.rarity] || 'loot';
        addLog(`🎁 ${GEAR_TYPES[item.typeKey].icon} ${item.name} [${RARITIES[item.rarity].label}]`, logType);
    }

    // XP
    gainXP(Math.floor(m.type.xp * (1 + floor * 0.18)));

    // Progress
    state.player.totalKills++;
    state.dungeon.kills++;
    if (state.dungeon.kills >= KILLS_PER_FLOOR) state.dungeon.canAdvance = true;

    state.monster = null;
    state.combat.paused      = true;
    state.combat.playerDead  = false;
    state.combat.pauseTimer  = 0.65;
}

function playerDied() {
    state.player.hp         = 0;
    state.monster           = null;
    state.combat.paused     = true;
    state.combat.playerDead = true;
    state.combat.pauseTimer = 3.0;
    addLog('💀 Defeated! Respawning in 3s...', 'death');
}

// ─── Monster Spawning ────────────────────────────────────────────────────────

function spawnMonster() {
    const floor    = state.dungeon.floor;
    const eligible = MONSTERS.filter(m => m.floorMin <= floor && m.floorMax >= floor);
    const type     = eligible[Math.floor(Math.random() * eligible.length)];
    const scale    = 1 + floor * 0.18;

    state.monster = {
        type,
        hp:      Math.floor(type.baseHp  * scale),
        maxHp:   Math.floor(type.baseHp  * scale),
        attack:  Math.floor(type.baseAtk * (1 + floor * 0.14)),
        defense: Math.floor(type.baseDef * (1 + floor * 0.11)),
        speed:   type.baseSpeed
    };

    state.combat.playerTimer  = 0.4;
    state.combat.monsterTimer = 1.0;
}

// ─── Loot Generation ─────────────────────────────────────────────────────────

function generateGear(floor) {
    const typeKey    = GEAR_TYPE_KEYS[Math.floor(Math.random() * GEAR_TYPE_KEYS.length)];
    const rarity     = rollRarity(floor);
    const gearType   = GEAR_TYPES[typeKey];
    const rarityData = RARITIES[rarity];
    const names      = gearType.names[rarity];
    const name       = names[Math.floor(Math.random() * names.length)];
    const floorMult  = 1 + floor * 0.13;
    const v          = () => 0.85 + Math.random() * 0.3;

    const stats = {};
    for (const [stat, base] of Object.entries(gearType.baseStats)) {
        const val = base * rarityData.mult * floorMult * v();
        stats[stat] = (stat === 'speed' || stat === 'critChance')
            ? Math.round(val * 1000) / 1000
            : Math.max(1, Math.floor(val));
    }

    return { id: state.ui.nextId++, typeKey, name, rarity, stats, floor, timestamp: Date.now() };
}

function rollRarity(floor) {
    const bonus = Math.min(floor * 0.8, 28);
    const w = {
        common:    Math.max(5,  60 - bonus * 1.5),
        uncommon:  25 + bonus * 0.3,
        rare:      10 + bonus * 0.65,
        epic:       4 + bonus * 0.35,
        legendary:  1 + bonus * 0.20
    };
    const total = Object.values(w).reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (const [key, weight] of Object.entries(w)) {
        r -= weight;
        if (r <= 0) return key;
    }
    return 'common';
}

// ─── Equipment ───────────────────────────────────────────────────────────────

function equipItem(itemId) {
    const inv  = state.player.inventory;
    const idx  = inv.findIndex(i => i.id === itemId);
    if (idx === -1) return;
    const item    = inv.splice(idx, 1)[0];
    const slot    = item.typeKey;
    const current = state.player.equipment[slot];
    state.player.equipment[slot] = item;
    if (current) inv.push(current);
    recalcStats();
    addLog(`Equipped ${GEAR_TYPES[item.typeKey].icon} ${item.name}`, 'system');
}

function unequipItem(slot) {
    const item = state.player.equipment[slot];
    if (!item) return;
    state.player.equipment[slot] = null;
    state.player.inventory.push(item);
    recalcStats();
    addLog(`Unequipped ${item.name}`, 'system');
}

function recalcStats() {
    const p = state.player;
    let bAtk = 0, bDef = 0, bHp = 0, bSpd = 0, bCrit = 0;
    for (const item of Object.values(p.equipment)) {
        if (!item) continue;
        if (item.stats.attack)     bAtk  += item.stats.attack;
        if (item.stats.defense)    bDef  += item.stats.defense;
        if (item.stats.maxHp)      bHp   += item.stats.maxHp;
        if (item.stats.speed)      bSpd  += item.stats.speed;
        if (item.stats.critChance) bCrit += item.stats.critChance;
    }
    const lvl    = p.level - 1;
    p.maxHp      = p.baseHp  + bHp   + lvl * 12;
    p.attack     = p.baseAtk + bAtk  + lvl * 2;
    p.defense    = p.baseDef + bDef  + Math.floor(lvl * 0.5);
    p.speed      = Math.min(3.0, p.baseSpd + bSpd);
    p.critChance = Math.min(0.75, p.baseCrit + bCrit);
    p.hp         = Math.min(p.hp, p.maxHp);
}

function gainXP(amount) {
    const p = state.player;
    p.xp += amount;
    while (p.level < 100 && p.xp >= XP_TABLE[p.level - 1]) {
        p.xp    -= XP_TABLE[p.level - 1];
        p.level++;
        p.baseAtk += 2;
        p.baseDef += 1;
        p.baseHp  += 10;
        recalcStats();
        p.hp = p.maxHp;
        addLog(`⭐ LEVEL UP! Now Level ${p.level}!`, 'levelup');
        spawnFloat(0.22, 0.32, `Lvl ${p.level}!`, '#f1c40f');
    }
}

// ─── Dungeon ─────────────────────────────────────────────────────────────────

function advanceFloor() {
    if (!state.dungeon.canAdvance) return;
    state.dungeon.floor++;
    state.dungeon.kills      = 0;
    state.dungeon.canAdvance = false;
    addLog(`⬇️ Descending to Floor ${state.dungeon.floor}...`, 'system');
    spawnMonster();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addLog(msg, type) {
    state.combat.log.unshift({ msg, type: type || 'system' });
    if (state.combat.log.length > 60) state.combat.log.pop();
}

function spawnFloat(xFrac, yFrac, text, color) {
    state.anim.floats.push({ xFrac, yFrac, text, color, life: 1.3, y: 0 });
}

// ─── Sell Menu ───────────────────────────────────────────────────────────────

const RARITY_SELL_ORDER = ['common', 'uncommon', 'rare', 'epic'];
const SELL_MULTS = { common: 2, uncommon: 6, rare: 18, epic: 50 };

function toggleSellMenu() {
    const menu = document.getElementById('sell-menu');
    if (menu.classList.contains('hidden')) {
        buildSellMenu();
        menu.classList.remove('hidden');
        setTimeout(() => document.addEventListener('click', closeSellMenuOutside, { once: true }), 0);
    } else {
        menu.classList.add('hidden');
    }
}

function buildSellMenu() {
    const menu = document.getElementById('sell-menu');
    const inv  = state.player.inventory;
    let html   = '<div class="sell-menu-title">Sell items up to rarity…</div>';
    let cumItems = 0, cumGold = 0;

    for (const rarity of RARITY_SELL_ORDER) {
        const items = inv.filter(i => i.rarity === rarity);
        const gold  = items.reduce((s, i) => s + Math.max(1, Math.floor(i.floor * SELL_MULTS[rarity])), 0);
        cumItems += items.length;
        cumGold  += gold;
        const col      = RARITIES[rarity].color;
        const disabled = cumItems === 0 ? 'disabled' : '';
        const label    = RARITIES[rarity].label;
        html +=
            `<button class="sell-option" ${disabled} onclick="sellUpTo('${rarity}')" style="border-color:${col}33">` +
                `<span class="sell-rarity" style="color:${col}">${label}</span>` +
                `<span class="sell-info">${cumItems} item${cumItems !== 1 ? 's' : ''} · +${cumGold}💰</span>` +
            `</button>`;
    }

    html += '<button class="sell-cancel" onclick="closeSellMenu()">Cancel</button>';
    menu.innerHTML = html;
}

function sellUpTo(maxRarity) {
    const maxIdx = RARITY_SELL_ORDER.indexOf(maxRarity);
    const toSell = state.player.inventory.filter(i => RARITY_SELL_ORDER.indexOf(i.rarity) <= maxIdx);
    if (!toSell.length) { closeSellMenu(); return; }
    const gold = toSell.reduce((s, i) => s + Math.max(1, Math.floor(i.floor * SELL_MULTS[i.rarity])), 0);
    state.player.inventory = state.player.inventory.filter(i => RARITY_SELL_ORDER.indexOf(i.rarity) > maxIdx);
    state.player.gold      += gold;
    state.player.totalGold += gold;
    addLog(`Sold ${toSell.length} items for ${gold}💰`, 'gold');
    closeSellMenu();
}

function closeSellMenu() {
    document.getElementById('sell-menu')?.classList.add('hidden');
}

function closeSellMenuOutside(e) {
    const menu = document.getElementById('sell-menu');
    const btn  = document.getElementById('sell-junk-btn');
    if (!menu?.contains(e.target) && e.target !== btn) closeSellMenu();
}

function setSortMode(mode) {
    state.ui.sortMode = mode;
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.toggle('active', b.dataset.sort === mode));
}

function saveGame() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function confirmReset() {
    if (confirm('Start a new game? All progress will be lost.')) {
        localStorage.removeItem(SAVE_KEY);
        location.reload();
    }
}

window.addEventListener('load', initGame);

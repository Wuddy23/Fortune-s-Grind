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
        ui: { nextId: 1, sortMode: 'new', autosell: null }
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
            if (!state.ui)                 state.ui = { nextId: 1000, sortMode: 'new', autosell: null };
            if (!('autosell' in state.ui)) state.ui.autosell = null;
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
    updateAutosellBtn();
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
        const item     = generateGear(floor);
        const maxIdx   = state.ui.autosell ? RARITY_SELL_ORDER.indexOf(state.ui.autosell) : -1;
        const itemIdx  = RARITY_SELL_ORDER.indexOf(item.rarity); // -1 for legendary (never auto-sold)
        if (maxIdx >= 0 && itemIdx >= 0 && itemIdx <= maxIdx) {
            const gold = Math.max(1, Math.floor(item.floor * SELL_MULTS[item.rarity]));
            state.player.gold      += gold;
            state.player.totalGold += gold;
            addLog(`⚡ Auto-sold ${GEAR_TYPES[item.typeKey].icon} ${item.name} +${gold}💰`, 'gold');
        } else {
            state.player.inventory.push(item);
            const logType = { legendary: 'legendary', epic: 'epic', rare: 'rare' }[item.rarity] || 'loot';
            addLog(`🎁 ${GEAR_TYPES[item.typeKey].icon} ${item.name} [${RARITIES[item.rarity].label}]`, logType);
        }
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
        legendary:  0.2 + bonus * 0.06
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

function floorDescendCost(floor) {
    return Math.floor(floor * floor / 2 + floor * 10);
}

function advanceFloor() {
    if (!state.dungeon.canAdvance) return;
    const cost = floorDescendCost(state.dungeon.floor);
    if (state.player.gold < cost) {
        addLog(`⚠️ Need ${cost.toLocaleString()}💰 to descend!`, 'system');
        return;
    }
    state.player.gold -= cost;
    state.dungeon.floor++;
    state.dungeon.kills      = 0;
    state.dungeon.canAdvance = false;
    addLog(`⬇️ Descending to Floor ${state.dungeon.floor}... (-${cost.toLocaleString()}💰)`, 'system');
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

// ─── Autosell ────────────────────────────────────────────────────────────────

const RARITY_SELL_ORDER = ['common', 'uncommon', 'rare', 'epic'];
const SELL_MULTS = { common: 2, uncommon: 6, rare: 18, epic: 50, legendary: 120 };

function toggleAutosellMenu() {
    const overlay = document.getElementById('sell-overlay');
    if (overlay.classList.contains('hidden')) {
        buildAutosellMenu();
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

function buildAutosellMenu() {
    const sheet   = document.getElementById('sell-menu');
    const current = state.ui.autosell;
    let html = '<div class="sell-handle"></div><div class="sell-menu-title">Auto-sell threshold</div>';

    html +=
        `<button class="sell-option${!current ? ' autosell-active' : ''}" onclick="setAutosell(null)">` +
            `<span class="sell-rarity" style="color:var(--muted)">${!current ? '✓ ' : ''}Off</span>` +
            `<span class="sell-info">Keep all drops</span>` +
        `</button>`;

    for (const rarity of RARITY_SELL_ORDER) {
        const active = current === rarity;
        const col    = RARITIES[rarity].color;
        html +=
            `<button class="sell-option${active ? ' autosell-active' : ''}" onclick="setAutosell('${rarity}')" style="border-color:${col}44">` +
                `<span class="sell-rarity" style="color:${col}">${active ? '✓ ' : ''}≤ ${RARITIES[rarity].label}</span>` +
                `<span class="sell-info">Auto-sell ${RARITIES[rarity].label} and below</span>` +
            `</button>`;
    }

    html += '<button class="sell-cancel" onclick="closeAutosellMenu()">Cancel</button>';
    sheet.innerHTML = html;
}

function setAutosell(rarity) {
    state.ui.autosell = rarity;

    // Immediately sell any existing inventory items that fall within the new threshold
    if (rarity) {
        const maxIdx = RARITY_SELL_ORDER.indexOf(rarity);
        const toSell = state.player.inventory.filter(i => {
            const idx = RARITY_SELL_ORDER.indexOf(i.rarity);
            return idx >= 0 && idx <= maxIdx;
        });
        if (toSell.length > 0) {
            const gold = toSell.reduce((s, i) => s + Math.max(1, Math.floor(i.floor * SELL_MULTS[i.rarity])), 0);
            state.player.inventory = state.player.inventory.filter(i => {
                const idx = RARITY_SELL_ORDER.indexOf(i.rarity);
                return !(idx >= 0 && idx <= maxIdx);
            });
            state.player.gold      += gold;
            state.player.totalGold += gold;
            addLog(`⚡ Autosell ≤${RARITIES[rarity].label} — sold ${toSell.length} items for ${gold}💰`, 'gold');
        } else {
            addLog(`⚡ Autosell: ≤${RARITIES[rarity].label}`, 'system');
        }
    } else {
        addLog(`⚡ Autosell: Off`, 'system');
    }

    updateAutosellBtn();
    closeAutosellMenu();
}

function closeAutosellMenu() {
    document.getElementById('sell-overlay')?.classList.add('hidden');
}

function updateAutosellBtn() {
    const btn = document.getElementById('autosell-btn');
    if (!btn) return;
    const r = state.ui.autosell;
    if (r) {
        btn.textContent    = `⚡ ≤${RARITIES[r].label}`;
        btn.style.color    = RARITIES[r].color;
        btn.style.borderColor = RARITIES[r].color + '99';
    } else {
        btn.textContent    = '⚡ Autosell';
        btn.style.color    = '';
        btn.style.borderColor = '';
    }
}

function sellItem(itemId) {
    const inv = state.player.inventory;
    const idx = inv.findIndex(i => i.id === itemId);
    if (idx === -1) return;
    const item = inv[idx];
    const gold = Math.max(1, Math.floor(item.floor * SELL_MULTS[item.rarity]));
    inv.splice(idx, 1);
    state.player.gold      += gold;
    state.player.totalGold += gold;
    addLog(`Sold ${GEAR_TYPES[item.typeKey].icon} ${item.name} for ${gold}💰`, 'gold');
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

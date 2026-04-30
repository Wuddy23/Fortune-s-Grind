let lastLogMsg = '';
let lastInvLen = -1;
let lastInvSort = '';
let lastEquipHash = '';

// ─── Init ────────────────────────────────────────────────────────────────────

function initUI() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tab));
        });
    });

    // Equipment slot tap to unequip
    document.querySelectorAll('.equip-slot').forEach(slot => {
        slot.addEventListener('click', () => {
            const s = slot.dataset.slot;
            if (state && state.player.equipment[s]) unequipItem(s);
        });
    });

    // Sort buttons
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', () => setSortMode(btn.dataset.sort));
    });
}

// ─── Main update (called every frame) ────────────────────────────────────────

function updateUI() {
    updateHeader();
    updateStats();
    updateEquipment();
    updateInventory();
    updateDungeon();
    updateLog();
}

// ─── Header ──────────────────────────────────────────────────────────────────

function updateHeader() {
    document.getElementById('gold-val').textContent  = state.player.gold.toLocaleString();
    document.getElementById('floor-val').textContent = state.dungeon.floor;
}

// ─── Player Stats ─────────────────────────────────────────────────────────────

function updateStats() {
    const p      = state.player;
    const hpPct  = Math.max(0, (p.hp / p.maxHp) * 100);
    const xpMax  = XP_TABLE[Math.min(p.level - 1, XP_TABLE.length - 1)];
    const xpPct  = xpMax > 0 ? (p.xp / xpMax) * 100 : 100;

    setEl('p-level',      p.level);
    setEl('p-hp',         p.hp);
    setEl('p-maxhp',      p.maxHp);
    setEl('p-xp',         p.xp);
    setEl('p-xpnext',     xpMax);
    setStyle('hp-fill',   'width', Math.min(100, hpPct) + '%');
    setStyle('xp-fill',   'width', Math.min(100, xpPct) + '%');
    setEl('p-atk',        p.attack);
    setEl('p-def',        p.defense);
    setEl('p-spd',        p.speed.toFixed(2) + '/s');
    setEl('p-crit',       Math.round(p.critChance * 100) + '%');
    setEl('p-total-gold', p.totalGold.toLocaleString());
    setEl('p-total-kills', p.totalKills.toLocaleString());
}

// ─── Equipment ───────────────────────────────────────────────────────────────

function updateEquipment() {
    const hash = JSON.stringify(state.player.equipment);
    if (hash === lastEquipHash) return;
    lastEquipHash = hash;

    const slots = ['helmet', 'armor', 'weapon', 'shield', 'gloves', 'shoes'];
    for (const slot of slots) {
        const item    = state.player.equipment[slot];
        const nameEl  = document.getElementById(`eq-${slot}-name`);
        const statsEl = document.getElementById(`eq-${slot}-stats`);
        const slotEl  = document.querySelector(`.equip-slot[data-slot="${slot}"]`);

        if (item) {
            nameEl.textContent  = item.name;
            nameEl.style.color  = RARITIES[item.rarity].color;
            statsEl.textContent = fmtStats(item.stats);
            slotEl.classList.add('has-item');
        } else {
            nameEl.textContent  = 'Empty';
            nameEl.style.color  = '';
            statsEl.textContent = '';
            slotEl.classList.remove('has-item');
        }
    }
}

// ─── Inventory ───────────────────────────────────────────────────────────────

function updateInventory() {
    const inv    = state.player.inventory;
    const sort   = state.ui.sortMode;
    if (inv.length === lastInvLen && sort === lastInvSort) return;
    lastInvLen  = inv.length;
    lastInvSort = sort;

    document.getElementById('inv-count-label').textContent = `${inv.length} item${inv.length !== 1 ? 's' : ''}`;

    const sorted = [...inv];
    if (sort === 'rarity') {
        const order = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
        sorted.sort((a, b) => order[a.rarity] - order[b.rarity]);
    } else if (sort === 'type') {
        sorted.sort((a, b) => a.typeKey.localeCompare(b.typeKey));
    }

    const list = document.getElementById('inv-list');
    const frag = document.createDocumentFragment();

    for (const item of sorted) {
        const equipped   = state.player.equipment[item.typeKey];
        const upgrade    = isUpgrade(item, equipped);
        const sellGold   = Math.max(1, Math.floor(item.floor * SELL_MULTS[item.rarity]));
        const div        = document.createElement('div');
        div.className    = `inv-item rarity-border-${item.rarity}`;
        div.innerHTML    =
            `<div class="inv-item-head">` +
                `<span class="inv-icon">${GEAR_TYPES[item.typeKey].icon}</span>` +
                `<span class="inv-name" style="color:${RARITIES[item.rarity].color}">${item.name}</span>` +
                `<span class="inv-badge badge-${item.rarity}">${RARITIES[item.rarity].label}</span>` +
                (upgrade ? `<span class="upgrade-tag">▲UP</span>` : '') +
            `</div>` +
            `<div class="inv-stats">${fmtStats(item.stats)}</div>` +
            `<div class="inv-floor">Dropped on floor ${item.floor}</div>` +
            `<div class="inv-item-actions">` +
                `<button class="equip-btn" data-id="${item.id}">Equip</button>` +
                `<button class="sell-item-btn" data-id="${item.id}">Sell ${sellGold}💰</button>` +
            `</div>`;
        frag.appendChild(div);
    }

    list.innerHTML = '';
    list.appendChild(frag);

    list.querySelectorAll('.equip-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            equipItem(parseInt(btn.dataset.id));
            lastInvLen = -1; // force re-render
        });
    });

    list.querySelectorAll('.sell-item-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            sellItem(parseInt(btn.dataset.id));
        });
    });
}

// ─── Dungeon Panel ───────────────────────────────────────────────────────────

function updateDungeon() {
    const d          = state.dungeon;
    const m          = state.monster;
    const pct        = Math.min(100, (d.kills / KILLS_PER_FLOOR) * 100);
    const cost       = floorDescendCost(d.floor);
    const canAfford  = state.player.gold >= cost;

    setEl('d-floor',         d.floor);
    setEl('d-kills',         `${d.kills} / ${KILLS_PER_FLOOR}`);
    setStyle('prog-fill',    'width', pct + '%');
    setEl('next-floor-num',  d.floor + 1);

    const costEl = document.getElementById('descend-cost');
    if (costEl) {
        costEl.textContent = cost.toLocaleString() + '💰';
        costEl.style.color = d.canAdvance && !canAfford ? '#e74c3c' : '';
    }

    document.getElementById('advance-btn').disabled = !d.canAdvance || !canAfford;

    if (m) {
        setEl('d-monster-name', `${m.type.emoji} ${m.type.name}`);
        setEl('d-monster-hp',   `${m.hp} / ${m.maxHp}`);
        setEl('d-monster-atk',  m.attack);
        setEl('d-monster-def',  m.defense);
    } else {
        ['d-monster-name','d-monster-hp','d-monster-atk','d-monster-def'].forEach(id => setEl(id, '—'));
    }
}

// ─── Combat Log ──────────────────────────────────────────────────────────────

function updateLog() {
    const log     = state.combat.log;
    const topMsg  = log.length > 0 ? log[0].msg : '';
    if (topMsg === lastLogMsg) return;
    lastLogMsg = topMsg;

    const colorMap = {
        player: '#5dade2', monster: '#e74c3c', crit: '#f5b041',
        kill: '#2ecc71',   gold: '#ffd700',    loot: '#aaaaaa',
        rare: '#2979ff',   epic: '#aa44ee',    legendary: '#ff8800',
        levelup: '#f1c40f', death: '#e74c3c',  system: '#556'
    };

    document.getElementById('log-inner').innerHTML =
        log.slice(0, 40).map(e =>
            `<div class="log-line" style="color:${colorMap[e.type] || '#aaa'}">${e.msg}</div>`
        ).join('');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setEl(id, val) {
    const el = document.getElementById(id);
    if (el && el.textContent != val) el.textContent = val;
}

function setStyle(id, prop, val) {
    const el = document.getElementById(id);
    if (el && el.style[prop] !== val) el.style[prop] = val;
}

function fmtStats(stats) {
    const p = [];
    if (stats.attack)     p.push(`+${stats.attack} ATK`);
    if (stats.defense)    p.push(`+${stats.defense} DEF`);
    if (stats.maxHp)      p.push(`+${stats.maxHp} HP`);
    if (stats.speed)      p.push(`+${stats.speed.toFixed(2)} SPD`);
    if (stats.critChance) p.push(`+${Math.round(stats.critChance * 100)}% CRIT`);
    return p.join(' · ');
}

function isUpgrade(item, equipped) {
    if (!equipped) return true;
    const score = s =>
        (s.attack     || 0) * 2.0 +
        (s.defense    || 0) * 1.5 +
        (s.maxHp      || 0) * 0.4 +
        (s.speed      || 0) * 25  +
        (s.critChance || 0) * 100;
    return score(item.stats) > score(equipped.stats);
}

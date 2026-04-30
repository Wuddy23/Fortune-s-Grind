let canvas, ctx;
let CWIDTH = 560, CHEIGHT = 240;

// ─── Init ────────────────────────────────────────────────────────────────────

function initRenderer() {
    canvas = document.getElementById('battle-canvas');
    ctx    = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    const wrap = document.getElementById('battle-wrap');
    const w    = wrap.clientWidth;
    const h    = Math.round(w * (240 / 560));
    CWIDTH     = w;
    CHEIGHT    = h;
    const dpr  = window.devicePixelRatio || 1;
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ─── Main render ─────────────────────────────────────────────────────────────

function renderFrame(ts) {
    if (!ctx || !state) return;
    ctx.clearRect(0, 0, CWIDTH, CHEIGHT);

    drawBackground();
    drawTorches(ts);

    const px = CWIDTH * 0.21 + state.anim.playerX;
    const py = CHEIGHT * 0.70;
    const mx = CWIDTH * 0.77 + state.anim.monsterX;
    const my = CHEIGHT * 0.70;
    const sc = CWIDTH / 560;

    if (state.monster) {
        drawMonster(mx, my, sc);
        drawHealthBar(
            CWIDTH * 0.53, CHEIGHT * 0.06, CWIDTH * 0.41,
            state.monster.hp, state.monster.maxHp,
            '#c0392b', '#200000'
        );
    }

    drawPlayer(px, py, sc);
    drawHealthBar(
        CWIDTH * 0.06, CHEIGHT * 0.06, CWIDTH * 0.41,
        state.player.hp, state.player.maxHp,
        '#27ae60', '#002000'
    );

    drawFloats();
}

// ─── Background ──────────────────────────────────────────────────────────────

function drawBackground() {
    // Wall
    const wallGrad = ctx.createLinearGradient(0, 0, 0, CHEIGHT * 0.76);
    wallGrad.addColorStop(0, '#07071a');
    wallGrad.addColorStop(1, '#12123a');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, CWIDTH, CHEIGHT * 0.76);

    // Stone tile lines
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#3a3a66';
    ctx.lineWidth = 1;
    const tw = CWIDTH / 6, th = CHEIGHT * 0.14;
    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 7; col++) {
            const ox = (row % 2) * (tw / 2);
            ctx.strokeRect(col * tw - ox + 1, row * th + 1, tw - 2, th - 2);
        }
    }
    ctx.restore();

    // Floor
    const floorGrad = ctx.createLinearGradient(0, CHEIGHT * 0.75, 0, CHEIGHT);
    floorGrad.addColorStop(0, '#141414');
    floorGrad.addColorStop(1, '#080808');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, CHEIGHT * 0.75, CWIDTH, CHEIGHT * 0.25);

    // Floor edge highlight
    ctx.strokeStyle = '#2a2a50';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, CHEIGHT * 0.75);
    ctx.lineTo(CWIDTH, CHEIGHT * 0.75);
    ctx.stroke();
}

// ─── Torches ─────────────────────────────────────────────────────────────────

function drawTorches(ts) {
    drawTorch(CWIDTH * 0.13, CHEIGHT * 0.20, ts);
    drawTorch(CWIDTH * 0.87, CHEIGHT * 0.20, ts);
}

function drawTorch(x, y, ts) {
    const f1 = Math.sin(ts * 0.007);
    const f2 = Math.sin(ts * 0.013);
    const flicker = f1 * 0.25 + f2 * 0.15;

    // Ambient glow
    const glow = ctx.createRadialGradient(x, y - 5, 0, x, y - 5, CWIDTH * 0.13);
    glow.addColorStop(0, 'rgba(255,160,50,0.18)');
    glow.addColorStop(1, 'rgba(255,80,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y - 5, CWIDTH * 0.13, 0, Math.PI * 2);
    ctx.fill();

    // Stick
    ctx.fillStyle = '#5C3317';
    ctx.fillRect(x - 2, y, 4, 14);

    const fh = 13 + flicker * 3;
    const fw = 7  + flicker * 2;
    const fx = flicker * 2;

    // Outer flame
    ctx.fillStyle = 'rgba(255,110,20,0.92)';
    ctx.beginPath();
    ctx.moveTo(x - fw / 2, y);
    ctx.quadraticCurveTo(x - fw * 0.25 + fx, y - fh * 0.5, x + fx, y - fh);
    ctx.quadraticCurveTo(x + fw * 0.25 + fx, y - fh * 0.5, x + fw / 2, y);
    ctx.closePath();
    ctx.fill();

    // Inner flame
    ctx.fillStyle = 'rgba(255,220,60,0.95)';
    ctx.beginPath();
    ctx.moveTo(x - fw * 0.28, y);
    ctx.quadraticCurveTo(x - fw * 0.1 + fx * 0.5, y - fh * 0.55, x + fx * 0.5, y - fh * 0.88);
    ctx.quadraticCurveTo(x + fw * 0.1 + fx * 0.5, y - fh * 0.55, x + fw * 0.28, y);
    ctx.closePath();
    ctx.fill();
}

// ─── Player ───────────────────────────────────────────────────────────────────

function drawPlayer(x, y, sc) {
    ctx.save();
    ctx.translate(x, y);
    const s = sc * 0.85;

    if (state.anim.playerHit > 0) {
        ctx.filter = `brightness(${1 + state.anim.playerHit * 3}) sepia(0.5) hue-rotate(330deg)`;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 6 * s, 18 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.filter = 'none';

    if (state.anim.playerHit > 0) {
        ctx.filter = `brightness(${1 + state.anim.playerHit * 3}) sepia(0.5) hue-rotate(330deg)`;
    }

    // Legs
    ctx.fillStyle = '#2a3d70';
    ctx.fillRect(-11 * s, 20 * s, 9 * s, 22 * s);
    ctx.fillRect(2 * s,   20 * s, 9 * s, 22 * s);

    // Boots
    ctx.fillStyle = '#181828';
    ctx.fillRect(-12 * s, 38 * s, 12 * s, 8 * s);
    ctx.fillRect(1 * s,   38 * s, 12 * s, 8 * s);

    // Torso
    ctx.fillStyle = '#3a5a99';
    ctx.fillRect(-13 * s, -6 * s, 26 * s, 27 * s);
    // Chest shine
    ctx.fillStyle = '#5a7ab5';
    ctx.fillRect(-9 * s, -4 * s, 9 * s, 23 * s);

    // Left arm
    ctx.fillStyle = '#2a4a80';
    ctx.fillRect(-22 * s, -4 * s, 9 * s, 22 * s);

    // Shield
    ctx.fillStyle = '#7B3A10';
    ctx.beginPath();
    ctx.moveTo(-32 * s, -8 * s);
    ctx.lineTo(-22 * s, -8 * s);
    ctx.lineTo(-22 * s, 14 * s);
    ctx.lineTo(-27 * s, 20 * s);
    ctx.lineTo(-32 * s, 14 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#DAA520';
    ctx.lineWidth = 1.5 * s;
    ctx.stroke();
    ctx.fillStyle = '#DAA520';
    ctx.beginPath();
    ctx.arc(-27 * s, 5 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();

    // Right arm
    ctx.fillStyle = '#2a4a80';
    ctx.fillRect(13 * s, -4 * s, 9 * s, 20 * s);

    // Sword handle
    ctx.fillStyle = '#5C2A10';
    ctx.fillRect(15 * s, -24 * s, 5 * s, 13 * s);
    // Guard
    ctx.fillStyle = '#888';
    ctx.fillRect(11 * s, -14 * s, 13 * s, 3 * s);
    // Blade
    ctx.fillStyle = '#c8c8c8';
    ctx.fillRect(16 * s, -52 * s, 4 * s, 28 * s);
    ctx.fillStyle = '#eeeeee';
    ctx.fillRect(16 * s, -52 * s, 2 * s, 28 * s);
    // Tip
    ctx.fillStyle = '#c8c8c8';
    ctx.beginPath();
    ctx.moveTo(16 * s, -52 * s);
    ctx.lineTo(20 * s, -52 * s);
    ctx.lineTo(18 * s, -63 * s);
    ctx.closePath();
    ctx.fill();

    // Helmet
    ctx.fillStyle = '#b0bac8';
    ctx.beginPath();
    ctx.arc(0, -20 * s, 14 * s, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-14 * s, -20 * s, 28 * s, 11 * s);
    // Visor
    ctx.fillStyle = '#141424';
    ctx.fillRect(-9 * s, -23 * s, 18 * s, 8 * s);
    // Plume
    ctx.lineWidth = 2 * s;
    for (let i = -2; i <= 2; i++) {
        ctx.strokeStyle = i % 2 === 0 ? '#c0392b' : '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(i * 2.5 * s, -33 * s);
        ctx.quadraticCurveTo((i * 2 - 1.5) * s, -46 * s, i * 1.5 * s, -54 * s);
        ctx.stroke();
    }

    ctx.restore();
}

// ─── Monster ──────────────────────────────────────────────────────────────────

function drawMonster(x, y, sc) {
    if (!state.monster) return;
    const m  = state.monster;
    const s  = sc * (m.type.sizeMult || 1.0);

    ctx.save();
    ctx.translate(x, y);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 22 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    if (state.anim.monsterHit > 0) {
        ctx.filter = `brightness(${1 + state.anim.monsterHit * 5})`;
    }

    const emojiSize = Math.round(62 * s);
    ctx.font = `${emojiSize}px serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(m.type.emoji, 0, 4);

    // Name label + tap hint below the monster
    ctx.filter = 'none';
    const nameSize = Math.max(10, Math.round(sc * 13));
    ctx.font         = `bold ${nameSize}px sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.strokeStyle  = 'rgba(0,0,0,0.9)';
    ctx.lineWidth    = 3;
    ctx.strokeText(m.type.name, 0, 20);
    ctx.fillStyle    = '#e0e0ff';
    ctx.fillText(m.type.name, 0, 20);

    const hintSize = Math.max(8, Math.round(sc * 10));
    ctx.font      = `${hintSize}px sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeText('👊 tap to attack', 0, 20 + nameSize + 3);
    ctx.fillText('👊 tap to attack', 0, 20 + nameSize + 3);

    ctx.restore();
}

// ─── Health Bar ───────────────────────────────────────────────────────────────

function drawHealthBar(x, y, w, current, maxVal, fill, bg) {
    if (maxVal <= 0) return;
    const h   = Math.max(10, Math.round(CHEIGHT * 0.055));
    const pct = Math.max(0, Math.min(1, current / maxVal));
    const r   = h / 2;

    roundRect(x, y, w, h, r, bg);
    if (pct > 0) roundRect(x, y, w * pct, h, r, fill);

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth   = 1;
    roundRectStroke(x, y, w, h, r);

    ctx.fillStyle    = 'white';
    ctx.font         = `bold ${Math.round(h * 0.65)}px sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${current}/${maxVal}`, x + w / 2, y + h / 2);
}

function roundRect(x, y, w, h, r, color) {
    ctx.fillStyle = color;
    if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y,     x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x,     y + h, r);
        ctx.arcTo(x,     y + h, x,     y,     r);
        ctx.arcTo(x,     y,     x + w, y,     r);
        ctx.closePath();
        ctx.fill();
    }
}

function roundRectStroke(x, y, w, h, r) {
    if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y,     x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x,     y + h, r);
        ctx.arcTo(x,     y + h, x,     y,     r);
        ctx.arcTo(x,     y,     x + w, y,     r);
        ctx.closePath();
        ctx.stroke();
    }
}

// ─── Floating Text ────────────────────────────────────────────────────────────

function drawFloats() {
    for (const f of state.anim.floats) {
        const fx    = f.xFrac * CWIDTH;
        const fy    = f.yFrac * CHEIGHT + f.y;
        const alpha = Math.min(1, f.life * 1.5);
        const size  = Math.round(CWIDTH * 0.040);

        ctx.save();
        ctx.globalAlpha  = alpha;
        ctx.font         = `bold ${size}px sans-serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle  = 'rgba(0,0,0,0.85)';
        ctx.lineWidth    = 3;
        ctx.strokeText(f.text, fx, fy);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, fx, fy);
        ctx.restore();
    }
}

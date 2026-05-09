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
    const eq = state.player.equipment;
    const s  = sc * 0.85;

    // -1=none, 0=common … 4=legendary
    const ri = it => it ? ['common','uncommon','rare','epic','legendary'].indexOf(it.rarity) : -1;
    const wr = ri(eq.weapon), sr = ri(eq.shield);
    const ar = ri(eq.armor),  hr = ri(eq.helmet);
    const gr = ri(eq.gloves), br = ri(eq.shoes);

    // [primary, highlight, glow|null]
    const RT = [
        ['#777','#aaa',null],
        ['#3a6a3a','#60aa60',null],
        ['#1e3e88','#4488ff','#2979ff'],
        ['#4a1478','#bb44ff','#aa44ee'],
        ['#7a5500','#ffd700','#ff8800'],
    ];
    const ath = ar >= 0 ? RT[ar] : null;
    const wth = wr >= 0 ? RT[wr] : null;
    const sth = sr >= 0 ? RT[sr] : null;
    const gth = gr >= 0 ? RT[gr] : null;
    const bth = br >= 0 ? RT[br] : null;

    ctx.save();
    ctx.translate(x, y);

    // Shadow (drawn outside hit filter)
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(2*s, 6*s, 22*s, 5*s, 0, 0, Math.PI*2);
    ctx.fill();

    if (state.anim.playerHit > 0)
        ctx.filter = `brightness(${1 + state.anim.playerHit * 3}) sepia(0.5) hue-rotate(330deg)`;

    // ── CAPE ──
    const capeDk = ar >= 3 ? '#200040' : '#6b0000';
    const capeLt = ar >= 3 ? '#5500aa' : '#950000';
    ctx.fillStyle = capeDk;
    ctx.beginPath();
    ctx.moveTo(-3*s,-20*s);
    ctx.bezierCurveTo(-12*s,-8*s,-24*s,8*s,-20*s,32*s);
    ctx.lineTo(-3*s,30*s);
    ctx.bezierCurveTo(-1*s,8*s,1*s,-6*s,3*s,-18*s);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = capeLt;
    ctx.beginPath();
    ctx.moveTo(-3*s,-20*s);
    ctx.bezierCurveTo(-7*s,-8*s,-10*s,4*s,-9*s,20*s);
    ctx.lineTo(-3*s,20*s);
    ctx.bezierCurveTo(-1*s,4*s,1*s,-6*s,3*s,-18*s);
    ctx.closePath(); ctx.fill();

    // ── BOOTS ──
    const bootMain = bth ? bth[0] : '#2a1808';
    const bootTrim = bth ? bth[1] : '#5a3a20';
    if (br >= 4) { ctx.save(); ctx.shadowBlur=8*s; ctx.shadowColor=bth[2]; }
    ctx.fillStyle = bootMain;
    ctx.fillRect(-12*s,34*s,11*s,12*s); ctx.fillRect(1*s,34*s,11*s,12*s);
    ctx.fillRect(-13*s,40*s,13*s,6*s); ctx.fillRect(0*s,40*s,13*s,6*s);
    ctx.fillStyle = bootTrim;
    ctx.fillRect(-12*s,33.5*s,11*s,1.5*s); ctx.fillRect(1*s,33.5*s,11*s,1.5*s);
    if (br >= 4) ctx.restore();

    // ── LEGS ──
    const legMain = ar >= 0 ? ath[0] : '#3a2810';
    const legHi   = ar >= 0 ? ath[1] : '#5a4030';
    ctx.fillStyle = legMain;
    ctx.fillRect(-11*s,18*s,10*s,17*s); ctx.fillRect(1*s,18*s,10*s,17*s);
    ctx.fillStyle = legHi;
    ctx.fillRect(-9*s,18*s,5*s,17*s); ctx.fillRect(2*s,18*s,5*s,17*s);
    // Knee guards only with armor
    if (ar >= 0) {
        const kc = ar>=4?'#ffd700':ar>=2?ath[1]:'#999';
        if (ar >= 3) { ctx.save(); ctx.shadowBlur=5*s; ctx.shadowColor=ath[2]; }
        ctx.fillStyle = kc;
        ctx.beginPath(); ctx.arc(-6*s,24*s,4.5*s,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc( 6*s,24*s,4.5*s,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = ar>=4?'#fffaaa':'#fff';
        ctx.beginPath(); ctx.arc(-6*s,24*s,2.2*s,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc( 6*s,24*s,2.2*s,0,Math.PI*2); ctx.fill();
        if (ar >= 3) ctx.restore();
    }

    // ── TORSO ──
    if (ar >= 0) {
        ctx.fillStyle = ar>=4?'#2a2000':ar>=3?'#18002e':'#1a1c2e';
        ctx.fillRect(-14*s,-9*s,28*s,28*s);
        const tg = ctx.createLinearGradient(-12*s,-8*s,10*s,18*s);
        if      (ar>=4) { tg.addColorStop(0,'#7a6000'); tg.addColorStop(0.5,'#4a3a00'); tg.addColorStop(1,'#1e1800'); }
        else if (ar>=3) { tg.addColorStop(0,'#5a1a8a'); tg.addColorStop(0.5,'#30085a'); tg.addColorStop(1,'#160428'); }
        else if (ar>=2) { tg.addColorStop(0,'#1e3a7a'); tg.addColorStop(0.5,'#0e1e4a'); tg.addColorStop(1,'#060c20'); }
        else if (ar>=1) { tg.addColorStop(0,'#28482a'); tg.addColorStop(0.5,'#182818'); tg.addColorStop(1,'#081008'); }
        else            { tg.addColorStop(0,'#555'); tg.addColorStop(0.5,'#333'); tg.addColorStop(1,'#1a1a1a'); }
        ctx.fillStyle = tg;
        ctx.fillRect(-12*s,-8*s,24*s,27*s);
        const trimC = ar>=4?'#ffd700':ar>=3?'#bb44ff':ar>=2?'#4488ff':ar>=1?'#60aa60':'#888';
        if (ar>=4) { ctx.save(); ctx.shadowBlur=7*s; ctx.shadowColor=ath[2]; }
        ctx.strokeStyle = trimC; ctx.lineWidth = 1.5*s;
        ctx.strokeRect(-12*s,-8*s,24*s,27*s);
        ctx.lineWidth = 0.8*s;
        ctx.beginPath(); ctx.moveTo(0,-8*s); ctx.lineTo(0,18*s); ctx.stroke();
        if (ar>=4) ctx.restore();
        // Chest gem
        const gOut = ar>=4?'#ffd700':ar>=3?'#cc66ff':ar>=2?'#4499ff':ar>=1?'#44cc44':'#aaa';
        const gIn  = ar>=4?'#ff7700':ar>=3?'#8800ff':ar>=2?'#0055ff':ar>=1?'#006600':'#555';
        if (ar>=2) { ctx.save(); ctx.shadowBlur=6*s; ctx.shadowColor=ath[2]; }
        ctx.fillStyle = gOut;
        ctx.beginPath(); ctx.moveTo(0,-2*s); ctx.lineTo(5*s,5*s); ctx.lineTo(0,10*s); ctx.lineTo(-5*s,5*s); ctx.closePath(); ctx.fill();
        ctx.fillStyle = gIn;
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(3.2*s,5*s); ctx.lineTo(0,8.5*s); ctx.lineTo(-3.2*s,5*s); ctx.closePath(); ctx.fill();
        if (ar>=2) ctx.restore();
    } else {
        // Unarmored: leather vest
        ctx.fillStyle = '#3a2208';
        ctx.fillRect(-12*s,-8*s,24*s,27*s);
        ctx.fillStyle = '#5a3818';
        ctx.fillRect(-10*s,-6*s,20*s,24*s);
        ctx.strokeStyle = '#281408'; ctx.lineWidth = 0.8*s;
        ctx.beginPath(); ctx.moveTo(0,-8*s); ctx.lineTo(0,18*s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-8*s,-1*s); ctx.lineTo(8*s,-1*s); ctx.stroke();
    }

    // ── PAULDRONS (only with armor) ──
    if (ar >= 0) {
        const pHi = ar>=4?'#aa8800':ar>=3?'#7722bb':ar>=2?'#3366cc':ar>=1?'#4a8a4a':'#666';
        const pTrim = ar>=4?'#ffd700':ar>=3?'#bb44ff':ar>=2?'#4488ff':ar>=1?'#60aa60':'#888';
        ctx.fillStyle = '#14141e';
        ctx.beginPath(); ctx.ellipse(-16*s,-9*s,8*s,5*s,-0.35,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = pHi;
        ctx.beginPath(); ctx.ellipse(-16*s,-10*s,7*s,4*s,-0.35,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle = pTrim; ctx.lineWidth = 1*s; ctx.stroke();
        ctx.fillStyle = '#14141e';
        ctx.beginPath(); ctx.ellipse(16*s,-9*s,8*s,5*s,0.35,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = pHi;
        ctx.beginPath(); ctx.ellipse(16*s,-10*s,7*s,4*s,0.35,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle = pTrim; ctx.stroke();
    }

    // ── LEFT ARM ──
    const armMain = gth ? gth[0] : (ar>=0 ? ath[0] : '#4a2e10');
    const armHi   = gth ? gth[1] : (ar>=0 ? ath[1] : '#7a5030');
    ctx.fillStyle = armMain;
    ctx.fillRect(-22*s,-5*s,8*s,22*s);
    ctx.fillStyle = armHi;
    ctx.fillRect(-21*s,-5*s,4*s,22*s);
    ctx.fillStyle = ar>=0 ? ath[0] : '#2a1808';
    ctx.fillRect(-23*s,15*s,10*s,8*s);
    ctx.fillStyle = gth ? gth[1] : '#888';
    ctx.fillRect(-23*s,15*s,10*s,1.5*s);

    // ── SHIELD ──
    if (sr >= 0) {
        const sTrim = sr>=4?'#ffd700':sr>=3?'#cc88ff':sr>=2?'#4488ff':sr>=1?'#60aa60':'#aaa';
        if (sr>=4) { ctx.save(); ctx.shadowBlur=10*s; ctx.shadowColor=sth[2]; }
        ctx.fillStyle = '#08080e';
        ctx.beginPath();
        ctx.moveTo(-40*s,-14*s); ctx.lineTo(-24*s,-14*s);
        ctx.lineTo(-24*s,12*s);  ctx.lineTo(-32*s,25*s);
        ctx.lineTo(-40*s,12*s);  ctx.closePath(); ctx.fill();
        const shG = ctx.createLinearGradient(-40*s,-14*s,-24*s,25*s);
        if      (sr>=4) { shG.addColorStop(0,'#7a6000'); shG.addColorStop(1,'#3a2c00'); }
        else if (sr>=3) { shG.addColorStop(0,'#4a1280'); shG.addColorStop(1,'#200840'); }
        else if (sr>=2) { shG.addColorStop(0,'#1a3870'); shG.addColorStop(1,'#080e30'); }
        else if (sr>=1) { shG.addColorStop(0,'#284828'); shG.addColorStop(1,'#0a180a'); }
        else            { shG.addColorStop(0,'#4a2e08'); shG.addColorStop(1,'#221408'); }
        ctx.fillStyle = shG;
        ctx.beginPath();
        ctx.moveTo(-38*s,-12*s); ctx.lineTo(-26*s,-12*s);
        ctx.lineTo(-26*s,11*s);  ctx.lineTo(-32*s,23*s);
        ctx.lineTo(-38*s,11*s);  ctx.closePath(); ctx.fill();
        ctx.strokeStyle = sTrim; ctx.lineWidth = 1.5*s;
        ctx.beginPath();
        ctx.moveTo(-38*s,-12*s); ctx.lineTo(-26*s,-12*s);
        ctx.lineTo(-26*s,11*s);  ctx.lineTo(-32*s,23*s);
        ctx.lineTo(-38*s,11*s);  ctx.closePath(); ctx.stroke();
        ctx.lineWidth = 2*s;
        ctx.beginPath(); ctx.moveTo(-32*s,-8*s); ctx.lineTo(-32*s,18*s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-39*s,5*s);  ctx.lineTo(-25*s,5*s);  ctx.stroke();
        // Center gem
        const sgGlow = sr>=4?'#ff8800':sr>=3?'#cc44ff':sr>=2?'#0088ff':sr>=1?'#00bb00':'#cc8800';
        const sgFill = sr>=4?'#ffcc00':sr>=3?'#ee88ff':sr>=2?'#22aaff':sr>=1?'#44ee44':'#ddaa22';
        ctx.save();
        ctx.shadowBlur=(sr>=2?8:3)*s; ctx.shadowColor=sgGlow;
        ctx.fillStyle = sgFill;
        ctx.beginPath(); ctx.arc(-32*s,5*s,3.5*s,0,Math.PI*2); ctx.fill();
        ctx.restore();
        if (sr>=4) ctx.restore();
    } else {
        // No shield: bare forearm raised
        ctx.fillStyle = '#c07850';
        ctx.fillRect(-34*s,-2*s,9*s,10*s);
        ctx.beginPath(); ctx.arc(-29*s,8*s,5*s,0,Math.PI*2); ctx.fill();
    }

    // ── RIGHT ARM ──
    ctx.fillStyle = armMain;
    ctx.fillRect(14*s,-5*s,8*s,20*s);
    ctx.fillStyle = armHi;
    ctx.fillRect(14*s,-5*s,4*s,20*s);
    ctx.fillStyle = ar>=0 ? ath[0] : '#2a1808';
    ctx.fillRect(13*s,13*s,10*s,8*s);
    ctx.fillStyle = gth ? gth[1] : '#888';
    ctx.fillRect(13*s,13*s,10*s,1.5*s);

    // ── WEAPON ──
    if (wr >= 0) {
        ctx.save();
        if (wth[2]) { ctx.shadowBlur=(wr>=4?18:wr>=2?12:0)*s; ctx.shadowColor=wth[2]; }
        const bladeG = ctx.createLinearGradient(17*s,-65*s,22*s,-10*s);
        if      (wr>=4) { bladeG.addColorStop(0,'#fff8aa'); bladeG.addColorStop(0.3,'#ffd700'); bladeG.addColorStop(0.7,'#ff8800'); bladeG.addColorStop(1,'#cc3300'); }
        else if (wr>=3) { bladeG.addColorStop(0,'#f0ccff'); bladeG.addColorStop(0.35,'#cc55ff'); bladeG.addColorStop(1,'#660099'); }
        else if (wr>=2) { bladeG.addColorStop(0,'#ddeeff'); bladeG.addColorStop(0.35,'#7aadee'); bladeG.addColorStop(1,'#aaaacc'); }
        else if (wr>=1) { bladeG.addColorStop(0,'#eeeeff'); bladeG.addColorStop(0.35,'#bbbbcc'); bladeG.addColorStop(1,'#777788'); }
        else            { bladeG.addColorStop(0,'#aa9988'); bladeG.addColorStop(0.35,'#887766'); bladeG.addColorStop(1,'#554433'); }
        ctx.fillStyle = bladeG;
        ctx.beginPath();
        ctx.moveTo(17*s,-10*s); ctx.lineTo(22*s,-10*s); ctx.lineTo(19.5*s,-65*s); ctx.closePath(); ctx.fill();
        ctx.fillStyle = wr>=4?'rgba(255,255,200,0.9)':wr>=3?'rgba(240,180,255,0.7)':'rgba(210,235,255,0.75)';
        ctx.beginPath();
        ctx.moveTo(17*s,-11*s); ctx.lineTo(18.5*s,-11*s); ctx.lineTo(19.5*s,-65*s); ctx.closePath(); ctx.fill();
        ctx.restore();
        // Guard
        const guardC = wr>=4?'#ffd700':wr>=3?'#aa44ee':wr>=2?'#4488ff':wr>=1?'#aaaaaa':'#887766';
        ctx.fillStyle = guardC;
        ctx.fillRect(11*s,-12*s,17*s,4*s);
        ctx.fillStyle = wr>=4?'#fff8aa':wr>=3?'#ee88ff':wr>=2?'#88ccff':'#cccccc';
        ctx.beginPath(); ctx.arc(19.5*s,-10*s,3*s,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = wr>=4?'#ff4400':wr>=3?'#8800ff':'#cc2222';
        ctx.beginPath(); ctx.arc(19.5*s,-10*s,1.5*s,0,Math.PI*2); ctx.fill();
        // Handle
        ctx.fillStyle = '#3a1808';
        ctx.fillRect(17*s,-8*s,5*s,14*s);
        ctx.strokeStyle = '#6b3520'; ctx.lineWidth = 1.2*s;
        for (let i=0; i<4; i++) {
            ctx.beginPath(); ctx.moveTo(17*s,(-7+i*3.5)*s); ctx.lineTo(22*s,(-7+i*3.5)*s); ctx.stroke();
        }
        // Pommel
        ctx.fillStyle = wr>=4?'#ffd700':wr>=3?'#aa44ee':wr>=2?'#4488ff':'#888';
        ctx.beginPath(); ctx.arc(19.5*s,6*s,5*s,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = wr>=4?'#ff4400':wr>=3?'#cc00ff':'#cc2222';
        ctx.beginPath(); ctx.arc(19.5*s,6*s,3*s,0,Math.PI*2); ctx.fill();
    } else {
        // No weapon: bare fist
        ctx.fillStyle = '#c07850';
        ctx.fillRect(17*s,-4*s,8*s,10*s);
        ctx.beginPath(); ctx.arc(21*s,10*s,5*s,0,Math.PI*2); ctx.fill();
    }

    // ── HELMET ──
    if (hr >= 0) {
        const hTrim = hr>=4?'#ffd700':hr>=3?'#cc88ff':hr>=2?'#4488ff':hr>=1?'#aaaaaa':'#888';
        const eyeC  = hr>=4?'#ff9900':hr>=3?'#dd44ff':hr>=2?'#00ddff':'#ffaa00';
        const eyeGl = hr>=4?'#ff6600':hr>=3?'#aa00ff':hr>=2?'#00bbff':null;
        ctx.fillStyle = '#14141e';
        ctx.beginPath(); ctx.arc(0,-22*s,16*s,Math.PI,0); ctx.closePath(); ctx.fill();
        ctx.fillRect(-16*s,-22*s,32*s,14*s);
        const hG = ctx.createLinearGradient(-14*s,-36*s,14*s,-8*s);
        if      (hr>=4) { hG.addColorStop(0,'#8a7000'); hG.addColorStop(0.5,'#4a3800'); hG.addColorStop(1,'#201800'); }
        else if (hr>=3) { hG.addColorStop(0,'#5a1a8a'); hG.addColorStop(0.5,'#2e0858'); hG.addColorStop(1,'#140428'); }
        else if (hr>=2) { hG.addColorStop(0,'#1e3a7a'); hG.addColorStop(0.5,'#0e1e4a'); hG.addColorStop(1,'#060c20'); }
        else if (hr>=1) { hG.addColorStop(0,'#575d7a'); hG.addColorStop(0.5,'#303452'); hG.addColorStop(1,'#181a28'); }
        else            { hG.addColorStop(0,'#666'); hG.addColorStop(0.5,'#444'); hG.addColorStop(1,'#222'); }
        ctx.fillStyle = hG;
        ctx.beginPath(); ctx.arc(0,-22*s,14*s,Math.PI,0); ctx.closePath(); ctx.fill();
        ctx.fillRect(-14*s,-22*s,28*s,12*s);
        ctx.strokeStyle = hTrim; ctx.lineWidth = 1.5*s;
        ctx.beginPath(); ctx.arc(0,-22*s,14*s,Math.PI,0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-14*s,-10*s); ctx.lineTo(14*s,-10*s); ctx.stroke();
        // Visor + grill
        ctx.fillStyle = '#04040e';
        ctx.fillRect(-11*s,-27.5*s,22*s,5*s);
        ctx.fillRect(-9*s,-20*s,18*s,9*s);
        ctx.strokeStyle = '#181830'; ctx.lineWidth = 1*s;
        for (let i=0; i<3; i++) {
            ctx.beginPath(); ctx.moveTo(-9*s,(-18.5+i*3)*s); ctx.lineTo(9*s,(-18.5+i*3)*s); ctx.stroke();
        }
        // Eyes
        ctx.save();
        if (eyeGl) { ctx.shadowBlur=9*s; ctx.shadowColor=eyeGl; }
        ctx.fillStyle = eyeC;
        ctx.fillRect(-10*s,-27*s,7.5*s,4*s);
        ctx.fillRect( 2.5*s,-27*s,7.5*s,4*s);
        ctx.restore();
        // Crest + plume (uncommon+)
        if (hr >= 1) {
            const crestC  = hr>=4?'#ffd700':hr>=3?'#cc88ff':hr>=2?'#4488ff':'#aaa';
            const plumeA  = hr>=4?'#ff6600':hr>=3?'#9900ff':hr>=2?'#0033ff':'#bb0000';
            const plumeB  = hr>=4?'#ffaa00':hr>=3?'#cc88ff':hr>=2?'#4488ff':'#ee2222';
            if (hr>=4) { ctx.save(); ctx.shadowBlur=8*s; ctx.shadowColor=ath ? ath[2] : '#ff8800'; }
            ctx.fillStyle = crestC;
            ctx.fillRect(-2*s,-38*s,4*s,16*s);
            ctx.fillStyle = hr>=4?'#fffaaa':hr>=3?'#eeccff':hr>=2?'#88ccff':'#cccccc';
            ctx.fillRect(-1*s,-38*s,2*s,16*s);
            if (hr>=4) ctx.restore();
            ctx.lineWidth = 2.5*s;
            for (let i=-2; i<=2; i++) {
                ctx.strokeStyle = i%2===0 ? plumeA : plumeB;
                ctx.beginPath();
                ctx.moveTo(i*3*s,-36*s);
                ctx.quadraticCurveTo((i*2-1)*s,-50*s,i*1.5*s,-62*s);
                ctx.stroke();
            }
        }
        // Legendary: dragon horns
        if (hr >= 4) {
            ctx.save(); ctx.shadowBlur=10*s; ctx.shadowColor='#ff8800';
            ctx.fillStyle = '#ffd700';
            ctx.beginPath(); ctx.moveTo(-8*s,-34*s); ctx.quadraticCurveTo(-22*s,-52*s,-14*s,-60*s); ctx.lineTo(-11*s,-56*s); ctx.quadraticCurveTo(-18*s,-50*s,-6*s,-34*s); ctx.fill();
            ctx.beginPath(); ctx.moveTo( 8*s,-34*s); ctx.quadraticCurveTo( 22*s,-52*s, 14*s,-60*s); ctx.lineTo(11*s,-56*s); ctx.quadraticCurveTo( 18*s,-50*s, 6*s,-34*s); ctx.fill();
            ctx.restore();
        }
    } else {
        // No helmet: human head with face
        ctx.fillStyle = '#c07050'; // neck
        ctx.fillRect(-4*s,-14*s,8*s,6*s);
        ctx.fillStyle = '#d4956b'; // face
        ctx.beginPath(); ctx.ellipse(0,-24*s,11*s,13*s,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#b87050'; // jaw shadow
        ctx.beginPath(); ctx.ellipse(0,-15*s,7*s,4*s,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#1a0e00'; // hair (dark)
        ctx.beginPath(); ctx.ellipse(0,-30*s,11*s,7*s,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#2a1800';
        ctx.beginPath(); ctx.ellipse(0,-32*s,9*s,5*s,0,0,Math.PI*2); ctx.fill();
        // Eyes
        ctx.fillStyle = '#1a1000';
        ctx.beginPath(); ctx.ellipse(-4*s,-25*s,2.5*s,1.5*s,0,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse( 4*s,-25*s,2.5*s,1.5*s,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(-4.5*s,-25.5*s,0.8*s,0.8*s,0,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse( 3.5*s,-25.5*s,0.8*s,0.8*s,0,0,Math.PI*2); ctx.fill();
        // Nose
        ctx.strokeStyle = '#9a5030'; ctx.lineWidth = 0.8*s;
        ctx.beginPath(); ctx.moveTo(-1.5*s,-22*s); ctx.quadraticCurveTo(-3*s,-20*s,-1*s,-19*s); ctx.stroke();
        // Mouth
        ctx.strokeStyle = '#7a2200'; ctx.lineWidth = 1*s;
        ctx.beginPath(); ctx.moveTo(-4*s,-17*s); ctx.quadraticCurveTo(0,-15*s,4*s,-17*s); ctx.stroke();
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

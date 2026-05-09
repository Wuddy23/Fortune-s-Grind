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
    const wallGrad = ctx.createLinearGradient(0, 0, 0, CHEIGHT * 0.76);
    wallGrad.addColorStop(0, '#07071a');
    wallGrad.addColorStop(1, '#12123a');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, CWIDTH, CHEIGHT * 0.76);

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

    const floorGrad = ctx.createLinearGradient(0, CHEIGHT * 0.75, 0, CHEIGHT);
    floorGrad.addColorStop(0, '#141414');
    floorGrad.addColorStop(1, '#080808');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, CHEIGHT * 0.75, CWIDTH, CHEIGHT * 0.25);

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

    const glow = ctx.createRadialGradient(x, y - 5, 0, x, y - 5, CWIDTH * 0.13);
    glow.addColorStop(0, 'rgba(255,160,50,0.18)');
    glow.addColorStop(1, 'rgba(255,80,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y - 5, CWIDTH * 0.13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#5C3317';
    ctx.fillRect(x - 2, y, 4, 14);

    const fh = 13 + flicker * 3;
    const fw = 7  + flicker * 2;
    const fx = flicker * 2;

    ctx.fillStyle = 'rgba(255,110,20,0.92)';
    ctx.beginPath();
    ctx.moveTo(x - fw / 2, y);
    ctx.quadraticCurveTo(x - fw * 0.25 + fx, y - fh * 0.5, x + fx, y - fh);
    ctx.quadraticCurveTo(x + fw * 0.25 + fx, y - fh * 0.5, x + fw / 2, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,220,60,0.95)';
    ctx.beginPath();
    ctx.moveTo(x - fw * 0.28, y);
    ctx.quadraticCurveTo(x - fw * 0.1 + fx * 0.5, y - fh * 0.55, x + fx * 0.5, y - fh * 0.88);
    ctx.quadraticCurveTo(x + fw * 0.1 + fx * 0.5, y - fh * 0.55, x + fw * 0.28, y);
    ctx.closePath();
    ctx.fill();
}

// ─── Player (pixel art, equipment-reactive) ───────────────────────────────────

function drawPlayer(x, y, sc) {
    const eq = state.player.equipment;
    const u  = Math.max(2, Math.round(2.5 * sc)); // 1 "pixel" in canvas px

    const ri = it => it ? ['common','uncommon','rare','epic','legendary'].indexOf(it.rarity) : -1;
    const wr = ri(eq.weapon), sr = ri(eq.shield), ar = ri(eq.armor);
    const hr = ri(eq.helmet), gr = ri(eq.gloves), br = ri(eq.shoes);

    // [primary, highlight, dark, glow|null]
    const RC = [
        ['#888','#bbb','#444',null],
        ['#3a7a3a','#66bb66','#1a4a1a',null],
        ['#2255cc','#5599ff','#0a2266','#2979ff'],
        ['#7722bb','#cc55ff','#330066','#aa44ee'],
        ['#aa7700','#ffdd00','#553300','#ff8800'],
    ];

    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.imageSmoothingEnabled = false;

    const B = (gx, gy, gw, gh, c) => {
        ctx.fillStyle = c;
        ctx.fillRect(Math.round(gx*u), Math.round(gy*u), Math.round(gw*u), Math.round(gh*u));
    };

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(Math.round(-7*u), Math.round(-1*u), Math.round(14*u), Math.round(2*u));

    if (state.anim.playerHit > 0)
        ctx.filter = `brightness(${1 + state.anim.playerHit * 3}) sepia(0.5) hue-rotate(330deg)`;

    // ── CAPE ──
    const cDk = ar >= 3 ? '#440088' : '#8b0000';
    const cLt = ar >= 3 ? '#8800cc' : '#cc0000';
    B(-4,-20,1,20,cDk); B(-3,-20,1,20,cLt);
    B( 2,-20,1,20,cLt); B( 3,-20,1,20,cDk);

    // ── BOOTS ──
    const bP = br>=0 ? RC[br][0] : '#222233';
    const bH = br>=0 ? RC[br][1] : '#444466';
    const bD = br>=0 ? RC[br][2] : '#111122';
    if (br >= 4) { ctx.save(); ctx.shadowBlur=7*u; ctx.shadowColor=RC[br][3]; }
    B(-6,-3,5,3,bP); B(1,-3,5,3,bP);
    if (br >= 4) ctx.restore();
    B(-6,-3,5,1,bH); B(1,-3,5,1,bH);
    B(-7,-1,7,1,bD); B(0,-1,7,1,bD);

    // ── LEGS ──
    const lP = ar>=0 ? RC[ar][0] : '#3a2208';
    const lH = ar>=0 ? RC[ar][1] : '#6a4428';
    B(-5,-9,4,6,lP); B(-5,-9,2,6,lH);
    B( 1,-9,4,6,lP); B( 1,-9,2,6,lH);
    if (ar >= 0) {
        const kc = ar>=4 ? '#ffdd00' : RC[ar][1];
        if (ar >= 3) { ctx.save(); ctx.shadowBlur=4*u; ctx.shadowColor=RC[ar][3]; }
        B(-4,-7,2,2,kc); B(-4,-7,1,1,'#fff');
        B( 2,-7,2,2,kc); B( 2,-7,1,1,'#fff');
        if (ar >= 3) ctx.restore();
    }

    // ── TORSO ──
    const aP = ar>=0 ? RC[ar][0] : '#553311';
    const aH = ar>=0 ? RC[ar][1] : '#886633';
    const aD = ar>=0 ? RC[ar][2] : '#2a1808';
    B(-6,-19,12,10,aD);
    B(-5,-18,10,8,aD);
    B(-5,-18,5,8,aP); B(-5,-18,2,8,aH);
    B( 0,-18,5,8,ar>=0?aD:aP);
    if (ar < 0) { B(-3,-17,1,4,'#775533'); B(-1,-16,1,2,'#775533'); }
    if (ar >= 0) {
        const gc = ar>=4?'#ffcc00':ar>=3?'#ff44ff':ar>=2?'#44aaff':ar>=1?'#44ff44':'#cc2222';
        if (ar >= 2) { ctx.save(); ctx.shadowBlur=5*u; ctx.shadowColor=RC[ar][3]; }
        B(-1,-15,2,2,gc); B(-1,-15,1,1,'#fff');
        if (ar >= 2) ctx.restore();
    }

    // ── PAULDRONS (armor only) ──
    if (ar >= 0) {
        B(-9,-20,3,3,aD); B(-8,-19,2,2,aH);
        B( 6,-20,3,3,aD); B( 6,-19,2,2,aH);
        if (ar >= 3) {
            ctx.save(); ctx.shadowBlur=5*u; ctx.shadowColor=RC[ar][3];
            B(-8,-19,2,2,aH); B(6,-19,2,2,aH);
            ctx.restore();
        }
    }

    // ── ARMS ──
    const gP = gr>=0 ? RC[gr][0] : aP;
    const gH = gr>=0 ? RC[gr][1] : aH;
    const gD = gr>=0 ? RC[gr][2] : aD;
    B(-9,-18,3,9,gP); B(-9,-18,1,9,gH); B(-9,-10,3,1,gD);
    B( 6,-18,3,9,gP); B( 8,-18,1,9,gH); B( 6,-10,3,1,gD);

    // ── SHIELD ──
    if (sr >= 0) {
        const sP = RC[sr][0], sH = RC[sr][1], sD = RC[sr][2];
        const sT = sr>=4?'#ffdd00':sr>=3?'#cc55ff':sr>=2?'#5599ff':sr>=1?'#66bb66':'#aaa';
        if (sr >= 4) { ctx.save(); ctx.shadowBlur=10*u; ctx.shadowColor=RC[sr][3]; }
        B(-16,-20,7,17,sD);
        B(-15,-19,6,14,sP); B(-15,-19,2,14,sH);
        B(-15,-5,5,1,sP); B(-14,-4,4,1,sP); B(-14,-3,3,1,sP); B(-13,-2,2,1,sP); B(-13,-1,1,1,sP);
        B(-13,-18,1,9,sT); B(-15,-13,5,1,sT);
        const sgc = sr>=4?'#ffaa00':sr>=3?'#ee88ff':sr>=2?'#44bbff':sr>=1?'#44ff44':'#cc8800';
        if (sr >= 2) { ctx.save(); ctx.shadowBlur=5*u; ctx.shadowColor=RC[sr][3]; }
        B(-14,-13,1,1,sgc); B(-13,-13,1,1,'#fff');
        if (sr >= 2) ctx.restore();
        if (sr >= 4) ctx.restore();
    } else {
        B(-12,-16,3,6,gP); B(-12,-10,3,2,'#c07050');
    }

    // ── WEAPON ──
    if (wr >= 0) {
        const wP = RC[wr][0], wH = RC[wr][1];
        if (RC[wr][3]) { ctx.save(); ctx.shadowBlur=(wr>=4?16:9)*u; ctx.shadowColor=RC[wr][3]; }
        B(9,-30,2,18,wP); B(9,-30,1,18,wH);
        if (RC[wr][3]) ctx.restore();
        const gC = wr>=4?'#ffdd00':wr>=3?'#cc55ff':wr>=2?'#5599ff':wr>=1?'#aaa':'#887755';
        B(7,-12,6,2,gC); B(7,-12,1,1,'#fff');
        B(9,-10,2,4,'#3a1808'); B(10,-10,1,4,'#553322');
        const pC = wr>=4?'#ffdd00':wr>=3?'#cc55ff':wr>=2?'#5599ff':'#888';
        if (RC[wr][3]) { ctx.save(); ctx.shadowBlur=5*u; ctx.shadowColor=RC[wr][3]; }
        B(8,-6,4,3,pC); B(9,-5,1,1,'#fff');
        if (RC[wr][3]) ctx.restore();
    } else {
        B(9,-12,3,2,'#c07050'); B(9,-10,3,3,gP);
    }

    // ── HELMET ──
    if (hr >= 0) {
        const hP = RC[hr][0], hH = RC[hr][1], hD = RC[hr][2];
        const eyeC = hr>=4?'#ff9900':hr>=3?'#dd44ff':hr>=2?'#00ddff':'#ffaa00';
        const hT   = hr>=4?'#ffdd00':hr>=3?'#cc55ff':hr>=2?'#5599ff':hr>=1?'#aaa':'#888';
        B(-4,-33,8,2,hP); B(-4,-33,4,2,hH); B(-5,-31,10,2,hD);
        B(-6,-31,12,13,hD);
        B(-5,-30,10,12,hP); B(-5,-30,4,12,hH);
        B(-4,-28,8,2,'#050510'); // visor
        if (hr >= 2) { ctx.save(); ctx.shadowBlur=6*u; ctx.shadowColor=RC[hr][3]; }
        ctx.fillStyle = eyeC;
        ctx.fillRect(Math.round(-4*u),Math.round(-28*u),Math.round(2*u),Math.round(2*u));
        ctx.fillRect(Math.round( 2*u),Math.round(-28*u),Math.round(2*u),Math.round(2*u));
        if (hr >= 2) ctx.restore();
        B(-4,-24,8,5,'#050510'); // grill
        [-3,-1,1,3].forEach(xi => B(xi,-24,1,5,hD));
        B(-6,-33,1,15,hT); B(5,-33,1,15,hT); // side trim
        if (hr >= 1) {
            const crC = hr>=4?'#ffdd00':hr>=3?'#cc55ff':hr>=2?'#5599ff':'#aaa';
            if (hr >= 4) { ctx.save(); ctx.shadowBlur=8*u; ctx.shadowColor=RC[hr][3]; }
            B(-1,-36,2,5,crC); B(-1,-36,1,5,'#fff');
            if (hr >= 4) ctx.restore();
            const pA = hr>=4?'#ff5500':hr>=3?'#8800ff':hr>=2?'#0033ff':'#aa0000';
            const pB = hr>=4?'#ffaa00':hr>=3?'#cc88ff':hr>=2?'#4488ff':'#ee2222';
            for (let i = -2; i <= 2; i++)
                B(i, -40+Math.abs(i), 1, 4+Math.abs(i), i%2===0?pA:pB);
        }
        if (hr >= 4) {
            ctx.save(); ctx.shadowBlur=8*u; ctx.shadowColor=RC[hr][3];
            B(-7,-33,1,1,'#ffdd00'); B(-8,-34,1,1,'#ffdd00'); B(-9,-35,1,2,'#ffdd00');
            B( 6,-33,1,1,'#ffdd00'); B( 7,-34,1,1,'#ffdd00'); B( 8,-35,1,2,'#ffdd00');
            ctx.restore();
        }
    } else {
        B(-4,-33,8,3,'#1a0e00');
        B(-5,-32,1,2,'#1a0e00'); B(4,-32,1,2,'#1a0e00');
        B(-4,-30,8,10,'#d4956b'); B(-4,-30,4,10,'#e0aa80');
        B(-3,-28,2,2,'#1a1000'); B( 1,-28,2,2,'#1a1000');
        B(-3,-28,1,1,'#fff');    B( 1,-28,1,1,'#fff');
        B(-1,-26,1,2,'#b07050');
        B(-3,-23,1,1,'#882200'); B(-1,-23,1,1,'#882200'); B(1,-23,1,1,'#882200');
        B(-2,-21,4,2,'#c07050');
    }

    ctx.restore();
}

// ─── Monster (pixel art) ──────────────────────────────────────────────────────

function drawMonster(x, y, sc) {
    if (!state.monster) return;
    const m = state.monster;
    const u = Math.max(2, Math.round(2.5 * sc * (m.type.sizeMult || 1.0)));

    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.fillRect(Math.round(-8*u), 0, Math.round(16*u), Math.round(2*u));

    if (state.anim.monsterHit > 0)
        ctx.filter = `brightness(${1 + state.anim.monsterHit * 5})`;

    ctx.save();
    ctx.scale(-1, 1); // flip to face left toward hero
    const B = (gx, gy, gw, gh, c) => {
        ctx.fillStyle = c;
        ctx.fillRect(Math.round(gx*u), Math.round(gy*u), Math.round(gw*u), Math.round(gh*u));
    };
    const key = m.type.key;
    if      (key === 'rat')        _mRat(B, u);
    else if (key === 'goblin')     _mGoblin(B, u);
    else if (key === 'skeleton')   _mSkeleton(B, u);
    else if (key === 'zombie')     _mZombie(B, u);
    else if (key === 'orc')        _mOrc(B, u);
    else if (key === 'darkKnight') _mDarkKnight(B, u);
    else if (key === 'vampire')    _mVampire(B, u);
    else if (key === 'demon')      _mDemon(B, u);
    else if (key === 'lich')       _mLich(B, u);
    else if (key === 'dragon')     _mDragon(B, u);
    ctx.restore(); // undo scale(-1,1)

    ctx.filter = 'none';
    const nameSize = Math.max(10, Math.round(sc * 13));
    ctx.font = `bold ${nameSize}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.lineWidth = 3;
    ctx.strokeText(m.type.name, 0, Math.round(4*u) + 4);
    ctx.fillStyle = '#e0e0ff';
    ctx.fillText(m.type.name, 0, Math.round(4*u) + 4);
    const hintSize = Math.max(8, Math.round(sc * 10));
    ctx.font = `${hintSize}px sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2;
    ctx.strokeText('👊 tap to attack', 0, Math.round(4*u) + 4 + nameSize + 3);
    ctx.fillText('👊 tap to attack', 0, Math.round(4*u) + 4 + nameSize + 3);

    ctx.restore();
}

// ─── Monster pixel art sprites ────────────────────────────────────────────────

function _mRat(B, u) {
    B(-4,-5, 8,4,'#7a5530'); B(-4,-5,4,4,'#9a7550'); // body
    B( 2,-8, 4,3,'#7a5530'); B( 2,-8,3,3,'#9a7550'); // head
    B( 5,-7, 1,1,'#ff2222');                          // eye
    B( 4,-9, 1,2,'#ffaaaa');                          // ear
    B( 6,-7, 2,1,'#ccc'); B(6,-6,2,1,'#ccc');         // whiskers
    B(-3,-1, 1,3,'#5a3a18'); B(-1,-1,1,3,'#5a3a18'); // back legs
    B( 2,-1, 1,3,'#6a4a28'); B( 4,-1,1,3,'#6a4a28'); // front legs
    B(-5,-3, 2,1,'#c07050'); B(-6,-4,1,1,'#c07050'); B(-7,-5,1,1,'#c07050'); // tail
}

function _mGoblin(B, u) {
    B(-5,-24,1,4,'#2a6622'); B(4,-24,1,4,'#2a6622');   // ears
    B(-4,-24,8,8,'#3a8a3a'); B(-4,-24,4,8,'#55aa55');  // head
    B(-3,-21,2,2,'#ffff44'); B( 1,-21,2,2,'#ffff44');  // eyes
    B(-3,-21,1,1,'#000');    B( 1,-21,1,1,'#000');      // pupils
    B(-3,-18,1,1,'#cc4444'); B( 1,-18,1,1,'#cc4444');  // teeth
    B(-5,-16,10,6,'#3a7a3a'); B(-5,-16,5,6,'#55aa55'); // body
    B(-7,-14,2,5,'#2a6a2a'); B( 5,-14,2,5,'#2a6a2a');  // arms
    B(-8,-12,3,3,'#cc8800'); B( 5,-12,3,3,'#cc8800');  // clubs/fists
    B(-4,-10,3,10,'#3a8a3a'); B( 1,-10,3,10,'#3a8a3a');// legs
    B(-4,-10,1,10,'#55aa55'); B( 1,-10,1,10,'#55aa55');
    B(-5,-1, 4,1,'#226622'); B( 1,-1, 4,1,'#226622');  // feet
}

function _mSkeleton(B, u) {
    B(-4,-25,8,7,'#e8dfc0'); B(-4,-25,4,7,'#f5f0da');  // skull
    B(-3,-23,2,2,'#111');    B( 1,-23,2,2,'#111');      // eye sockets
    B(-2,-21,4,1,'#111');                               // nose gap
    B(-3,-20,1,1,'#d8cfb0'); B(-1,-20,1,1,'#d8cfb0'); B(1,-20,1,1,'#d8cfb0'); // teeth
    B(-2,-19,4,2,'#d8cfb0'); B(-1,-18,1,2,'#888');     // neck + gap
    B(-5,-17,10,5,'#d8cfb0'); B(-5,-17,5,5,'#e8dfc0'); // ribcage
    [-4,-2,0,2].forEach(xi => B(xi,-16,1,4,'#333'));    // ribs
    B(-7,-15,2,5,'#d8cfb0'); B( 5,-15,2,5,'#d8cfb0');  // arms
    B(-7,-15,1,5,'#e8dfc0'); B( 6,-15,1,5,'#e8dfc0');
    B(-4,-12,3,12,'#c8bf9a'); B( 1,-12,3,12,'#c8bf9a');// leg bones
    B(-4,-12,1,12,'#e8dfc0'); B( 1,-12,1,12,'#e8dfc0');
    B(-4,-6, 1,1,'#888');    B( 1,-6, 1,1,'#888');     // knee gap
    B(-5,-1, 4,1,'#c8bf9a'); B( 1,-1, 4,1,'#c8bf9a');  // feet
}

function _mZombie(B, u) {
    B(-4,-25,8,7,'#7a9a6a'); B(-4,-25,4,7,'#9aaa8a');  // head
    B(-3,-23,2,2,'#cc3333'); B( 1,-23,2,2,'#cc3333');  // eyes
    B(-3,-23,1,1,'#000');    B( 1,-23,1,1,'#000');      // pupils
    B(-2,-21,1,1,'#558855'); B( 0,-21,1,1,'#333'); B(1,-21,1,1,'#558855'); // mouth
    B(-5,-18,11,7,'#6a8a5a'); B(-5,-18,5,7,'#7a9a6a'); // body (uneven)
    B(-7,-16,2,6,'#5a7a4a'); B( 5,-16,3,5,'#5a7a4a');  // arms (uneven)
    B(-4,-11,3,11,'#6a8a5a'); B( 1,-11,3,11,'#6a8a5a');
    B(-4,-11,1,11,'#7a9a6a'); B( 1,-11,1,11,'#7a9a6a');
    B(-5,-1, 4,1,'#4a6a3a'); B( 1,-1, 4,1,'#4a6a3a');
    B(-2,-22,1,1,'#aa3333'); B( 3,-16,1,2,'#aa3333');  // wounds
}

function _mOrc(B, u) {
    B(-5,-26,10,9,'#2a5a2a'); B(-5,-26,5,9,'#3a7a3a');  // big head
    B(-3,-23,2,3,'#ff3333'); B( 1,-23,2,3,'#ff3333');   // eyes
    B(-3,-23,1,1,'#111');    B( 1,-23,1,1,'#111');
    B(-2,-21,4,2,'#1a4a1a');                             // nose
    B(-3,-19,1,3,'#eeeeaa'); B( 2,-19,1,3,'#eeeeaa');   // tusks
    B(-7,-17,14,9,'#2a5a2a'); B(-7,-17,7,9,'#3a7a3a');  // wide body
    B(-9,-15,3,8,'#2a5a2a'); B( 6,-15,3,8,'#2a5a2a');   // thick arms
    B(-9,-15,1,8,'#3a7a3a'); B( 8,-15,1,8,'#3a7a3a');
    B(-10,-10,4,4,'#448844'); B( 6,-10,4,4,'#448844');  // fists
    B(-5,-8, 4,8,'#2a5a2a'); B( 1,-8, 4,8,'#2a5a2a');  // thick legs
    B(-5,-8, 2,8,'#3a7a3a'); B( 1,-8, 2,8,'#3a7a3a');
    B(-6,-1, 5,1,'#1a3a1a'); B( 1,-1, 5,1,'#1a3a1a');  // feet
}

function _mDarkKnight(B, u) {
    B(-5,-31,10,12,'#0a0a12'); B(-4,-30,8,11,'#1a1a28'); B(-4,-30,4,11,'#252538'); // helmet
    B(-4,-28,8,2,'#050508');  // visor
    ctx.save(); ctx.shadowBlur=6*u; ctx.shadowColor='#ff0000'; ctx.fillStyle='#ff0000';
    ctx.fillRect(Math.round(-4*u),Math.round(-28*u),Math.round(2*u),Math.round(2*u));
    ctx.fillRect(Math.round( 2*u),Math.round(-28*u),Math.round(2*u),Math.round(2*u));
    ctx.restore();
    B(-4,-23,8,4,'#050508');  // grill
    [-3,-1,1,3].forEach(xi => B(xi,-23,1,4,'#0a0a14'));
    B(-6,-19,12,9,'#0a0a12'); B(-5,-18,10,7,'#1a1a28'); B(-5,-18,5,7,'#252538'); // body
    B(-9,-18,3,8,'#1a1a28'); B(-9,-18,1,8,'#252538');  // left arm
    B( 6,-18,3,8,'#1a1a28'); B( 8,-18,1,8,'#252538');  // right arm
    ctx.save(); ctx.shadowBlur=8*u; ctx.shadowColor='#8800ff';
    B(-12,-28,2,18,'#550088'); B(-12,-28,1,18,'#cc44ff'); // void sword
    B(-14,-12,7,2,'#444');    B(-13,-10,2,4,'#1a0a0a'); B(-14,-6,4,3,'#550088');
    ctx.restore();
    B(-5,-10,4,10,'#0a0a12'); B( 1,-10,4,10,'#0a0a12');
    B(-5,-10,2,10,'#1a1a28'); B( 1,-10,2,10,'#1a1a28');
    B(-6,-1, 5,1,'#050508'); B( 1,-1, 5,1,'#050508');
}

function _mVampire(B, u) {
    B(-5,-23,1,21,'#220033'); B(-4,-23,1,21,'#440066'); // cape L
    B( 3,-23,1,21,'#440066'); B( 4,-23,1,21,'#220033'); // cape R
    B(-4,-25,8,7,'#ddbba0'); B(-4,-25,4,7,'#eeccbb');   // head
    ctx.save(); ctx.shadowBlur=5*u; ctx.shadowColor='#cc0000'; ctx.fillStyle='#cc0000';
    ctx.fillRect(Math.round(-3*u),Math.round(-23*u),Math.round(2*u),Math.round(2*u));
    ctx.fillRect(Math.round( 1*u),Math.round(-23*u),Math.round(2*u),Math.round(2*u));
    ctx.restore();
    B(-3,-23,1,1,'#550000'); B( 1,-23,1,1,'#550000');
    B(-3,-20,1,1,'#ffffff'); B( 2,-20,1,1,'#ffffff');   // fangs
    B(-5,-18,10,9,'#220033'); B(-4,-17,8,7,'#330044'); B(-4,-17,4,7,'#440066'); // body
    B(-7,-17,2,8,'#220033'); B( 5,-17,2,8,'#220033');   // arms
    B(-8,-10,3,3,'#ddbba0'); B( 5,-10,3,3,'#ddbba0');   // hands
    B(-4,-9, 3,9,'#1a0022'); B( 1,-9, 3,9,'#1a0022');
    B(-4,-9, 1,9,'#2a0033'); B( 1,-9, 1,9,'#2a0033');
    B(-5,-1, 4,1,'#110011'); B( 1,-1, 4,1,'#110011');
}

function _mDemon(B, u) {
    ctx.save(); ctx.shadowBlur=8*u; ctx.shadowColor='#ff2200';
    B(-5,-33,2,4,'#cc2200'); B(-6,-34,1,2,'#cc2200'); // horn L
    B( 3,-33,2,4,'#cc2200'); B( 5,-34,1,2,'#cc2200'); // horn R
    ctx.restore();
    B(-5,-29,10,8,'#aa2200'); B(-5,-29,5,8,'#cc3300'); // head
    ctx.save(); ctx.shadowBlur=5*u; ctx.shadowColor='#ffff00'; ctx.fillStyle='#ffff00';
    ctx.fillRect(Math.round(-3*u),Math.round(-27*u),Math.round(2*u),Math.round(2*u));
    ctx.fillRect(Math.round( 1*u),Math.round(-27*u),Math.round(2*u),Math.round(2*u));
    ctx.restore();
    B(-3,-27,1,1,'#000'); B( 1,-27,1,1,'#000');         // pupils
    B(-5,-22,10,2,'#661100');                            // mouth
    B(-4,-22,1,1,'#ff9900'); B(-2,-22,1,1,'#ff9900'); B(1,-22,1,1,'#ff9900'); B(3,-22,1,1,'#ff9900');
    B(-7,-20,14,10,'#880000'); B(-6,-19,12,8,'#aa2200'); B(-6,-19,6,8,'#cc3300'); // body
    B(-10,-19,4,8,'#770000'); B( 6,-19,4,8,'#770000');  // wings
    B(-9,-18,3,7,'#880000'); B( 6,-18,3,7,'#880000');   // arms
    B(-5,-10,4,10,'#880000'); B( 1,-10,4,10,'#880000');
    B(-5,-10,2,10,'#aa2200'); B( 1,-10,2,10,'#aa2200');
    B(-6,-1, 5,1,'#550000'); B( 1,-1, 5,1,'#550000');
}

function _mLich(B, u) {
    ctx.save(); ctx.shadowBlur=10*u; ctx.shadowColor='#8800ff';
    B( 7,-34,2,30,'#440088'); B(7,-34,1,30,'#9933ff'); // staff
    B( 5,-35,5,3,'#aa44ff'); B(6,-34,1,1,'#fff');      // orb
    ctx.restore();
    B(-4,-30,8,9,'#ccbbaa'); B(-4,-30,4,9,'#ddd0c0');  // skull
    ctx.save(); ctx.shadowBlur=6*u; ctx.shadowColor='#8800ff'; ctx.fillStyle='#550088';
    ctx.fillRect(Math.round(-3*u),Math.round(-28*u),Math.round(2*u),Math.round(2*u));
    ctx.fillRect(Math.round( 1*u),Math.round(-28*u),Math.round(2*u),Math.round(2*u));
    ctx.restore();
    B(-3,-28,2,2,'#000'); B( 1,-28,2,2,'#000');         // sockets
    B(-2,-24,4,1,'#aa9988');                             // nasal
    B(-3,-23,1,1,'#cba'); B(-1,-23,1,1,'#cba'); B(1,-23,1,1,'#cba'); // teeth
    B(-6,-21,12,9,'#220044'); B(-5,-20,10,7,'#330066'); B(-5,-20,5,7,'#440088'); // robes
    B(-8,-19,2,7,'#ccbbaa'); B( 6,-19,2,7,'#ccbbaa');  // bone hands
    B(-8,-19,1,7,'#ddd0c0'); B( 7,-19,1,7,'#ddd0c0');
    B(-7,-12,14,12,'#220044'); B(-6,-11,12,10,'#330066');
    B(-5,-1, 4,1,'#ccbbaa'); B( 1,-1, 4,1,'#ccbbaa');  // feet
}

function _mDragon(B, u) {
    B(-14,-21,6,11,'#3a1a00'); B(-13,-21,5,11,'#552200'); // left wing
    B(  8,-21,6,11,'#3a1a00'); B(  8,-21,5,11,'#552200'); // right wing
    B(-15,-18,2,3,'#221100'); B(13,-18,2,3,'#221100');    // wing tips
    B(-7,-19,14,13,'#2a5500'); B(-6,-18,12,11,'#3a7700'); B(-6,-18,6,11,'#55aa00'); // body
    [-4,-2,0,2,4].forEach(xi => [-17,-15,-13,-11,-9].forEach(yi => B(xi,yi,1,1,'#1a4400'))); // scales
    B(-3,-23,6,6,'#3a7700'); B(-3,-23,3,6,'#55aa00');     // neck
    B(-5,-31,10,9,'#2a5500'); B(-4,-30,8,7,'#3a7700'); B(-4,-30,4,7,'#55aa00'); // head
    B(-4,-32,2,2,'#557700'); B( 2,-32,2,2,'#557700');     // horns
    B(-4,-34,1,2,'#557700'); B( 3,-34,1,2,'#557700');
    ctx.save(); ctx.shadowBlur=8*u; ctx.shadowColor='#ff4400'; ctx.fillStyle='#ff6600';
    ctx.fillRect(Math.round(-3*u),Math.round(-28*u),Math.round(2*u),Math.round(2*u));
    ctx.fillRect(Math.round( 1*u),Math.round(-28*u),Math.round(2*u),Math.round(2*u));
    ctx.restore();
    B(-3,-28,1,1,'#ffaa00'); B( 1,-28,1,1,'#ffaa00');     // eye highlight
    B(-5,-25,10,4,'#2a5500'); B(-5,-25,5,4,'#3a7700');    // snout
    B(-4,-22,2,1,'#ffffcc'); B(-1,-22,2,1,'#ffffcc'); B(2,-22,2,1,'#ffffcc'); // teeth
    B(-6,-8, 3,8,'#2a5500'); B(-6,-8, 1,8,'#3a7700');     // front legs L
    B( 3,-8, 3,8,'#2a5500'); B( 5,-8, 1,8,'#3a7700');     // front legs R
    B(-7,-1, 4,1,'#1a4400'); B( 3,-1, 4,1,'#1a4400');     // feet
    B(-5,-4, 2,4,'#2a5500'); B( 3,-4, 2,4,'#2a5500');     // back legs
    B( 7,-9, 4,2,'#2a5500'); B(10,-8, 3,2,'#2a5500'); B(12,-7,2,1,'#2a5500'); // tail
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

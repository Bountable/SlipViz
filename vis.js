
// ============================================================================

const MULT = 0.25;       // multiplier applied to readout values + waveform height
const BG_DECAY = 0.82;  // how fast the kick-flash fades between beats

// ============================================================================
//  COLORS 
// ============================================================================
const COLORS = {
    up:     [57, 255, 20],  
    down:   [255, 0, 0],     
    green:  [57, 255, 20],   
    acid:   [150, 255, 40], 
    purple: [130, 20, 180], 
    bruise: [90, 10, 140],  
    brown:  [120, 90, 25],    
    yellow: [175, 150, 40],   
    grid:   [77, 75, 75],     
};

// aggressively clashing palette for the low-poly blob (built from COLORS)
const PALETTE = [
    COLORS.up, COLORS.acid, COLORS.purple, COLORS.bruise,
    COLORS.down, COLORS.down, COLORS.brown, COLORS.yellow,
];
const pcol = (i) => PALETTE[((i % PALETTE.length) + PALETTE.length) % PALETTE.length];

// --- audio ------------------------------------------------------------------
let audio, amplitude, fft, peakDetect;
let started = false;
let blackholeIndex = -1;

let bgBrightness = 0;   // kick-flash level (persists across frames)
let kick = false;       // was a kick detected this frame
let level = 0, bass = 0, mid = 0, treble = 0;

// --- visual state -----------------------------------------------------------
let creature;           // WEBGL buffer for the low-poly blob
let sphere = [];        // base unit-sphere vertex grid
const RINGS = 16, SECTORS = 16;
let light = 1;          // flickering green light intensity
let nowPlayingText = "...";


function preload() {
  star = loadImage("officer-down-star.png");
}


let x;
let y;
let xspeed;
let yspeed;
let dvd;
let r, g, b;

let profitLoss = 0;
let pnpPop = 0;          // P/NP text size animation; spikes with each money hit

// breaking-news chyron
const HEADLINES = [
    "FED CONFIRMS NOTHING IS REAL",
    "MARKETS SCREAM INTO THE VOID",
    "ANALYST EATS OWN TIE LIVE ON AIR",
    "BItCOIN NOW BACKED BY VIBES",
    "GOLD REPLACED BY SHINY ROCKS",
    "TRADER ASCENDS TO HIGHER PLANE",
    "ECONOMY DEEMED 'A SOCIAL CONSTRUCT'",
    "OFFICER DOWN ON THE TRADING FLOOR",
];
let chyronText = HEADLINES.join("   ///   ") + "   ///   ";
let chyronX = 0;

// top finance-bro news marquee
const FINANCE_NEWS = [
    "BRO JUST LEVERAGED HIS KIDNEY 100X",
    "AI SAYS BUY EVERYTHING IMMEDIATELY",
    "QUANT FUND REPLACED BY MAGIC 8-BALL",
    "CEO 'FEELS BULLISH' AFTER FOURTH REDBULL",
    "HEDGE FUND PIVOTS TO BEANIE BABIES",
    "INTERN ACCIDENTALLY SHORTS THE SUN",
    "GUY ON YOUTUBE CONFIRMS RECESSION CANCELLED",
    "DIAMOND HANDS NOW A MEDICAL CONDITION",
    "MARKET UP ON NEWS, ALSO DOWN ON NEWS",
    "FUCK YOUU",
    "NOT ACTUAL FINANCIAL ADVISE",
    "WAGMI UNTIL THE MARGIN CALL HITS",
    "DEFI YIELD FARMING IS JUST A CASINO WITH TAXES",
    "THE DIP IS DIP-PING INTO ANOTHER DIP",
    "QUANT TEAM DISCOVERS PRICE ACTION IS JUST VIBES",
    "RETAIL INVESTORS BOUGHT THE TOP AGAIN",
    "IT'S NOT A LOSS UNTIL YOU SELL",
    "THE ALGO IS LITERALLY JUST AN IF/ELSE STATEMENT",
    "CENTRAL BANK ANNOUNCES MONEY PRINTER IS REPAIRING",
    "BUYING THE RUMOR, SELLING THE EXISTENTIAL CRISIS",
    "YOUR PORTFOLIO IS NOW A NFT",
    "TECHNICAL ANALYSIS IS JUST HOROSCOPES FOR MEN",
    "PROFITS ARE FICTIONAL, LIQUIDATION IS FOREVER",
    "THE SEC IS A COVEN OF WITCHES CASTING CURSES ON RETAIL",
    "INFLATION IS THE SMELL OF BURNING SOULS IN THE FED BASEMENT",
    "THE YIELD CURVE INVERSION IS THE RITUAL KNIFE AT YOUR THROAT",
    "CRYPTO WAS BUILT TO TRAP YOUR ETERNAL ESSENCE IN BLOCKCHAIN",
    "WALL STREET IS A GIANT ALTAR FOR MASS HUMAN SACRIFICE",
    "EVERY BULL RUN IS POWERED BY THE SCREAMS OF THE DAMNED",
    "THEY'RE NOT SHORTING STOCKS THEY'RE SHORTING YOUR LIFEFORCE",
    "THE YELLEN CLONE IS MALFUNCTIONING AND DRINKING BABY BLOOD",
    " YER PORTFOLIO IS ALREADY DEAD YOU JUST HAVEN'T REALIZED IT YET",
    "THEY TURNED THE MONEY PRINTER INTO A SOUL SHREDDER IN 2020",
    " YHEYRE HARVESTING YOUR DOPAMINE THROUGH GREEN CANDLES",
    "THEYRE GONNA CRASH IT ALL TO BUILD THE NEW WORLD ORDER ON YOUR BONES",
    "EVERY MARGIN CALL IS A DEMON COLLECTING ON YOUR SOUL CONTRACT",
    "NONE OF THIS IS REAL AND WE'RE ALL GONNA DIE",
    "THE CIA GLOW IN ThE DARK YOU JUST GOTTA HIT EM WITH YOUR CAR"


];
let newsText = FINANCE_NEWS.join("   •   ") + "   •   ";
let newsX = 0;

// BUY / SELL / LIQUIDATED stamp that slams on the kick
let stamp = null;        // { txt, col, life }
const STAMP_LIFE = 18;

let shake = 0;           // screenshake intensity (spikes on kick, decays)

// equity curve (running profitLoss history drawn in the background)
let equity = [];
const EQUITY_MAX = 900;





// ===========================================================================
function setup() {
    createCanvas(windowWidth, windowHeight);
    pixelDensity(1);
    noSmooth();
    textFont("Georgia");

    audio = new p5.AudioIn();
    amplitude = new p5.Amplitude();
    fft = new p5.FFT(0.85, 1024);
    peakDetect = new p5.PeakDetect(20, 40, 0.5, 0.02); // sub-bass kick detect

    audio.getSources((list) => {
        blackholeIndex = list.findIndex((d) => /blackhole/i.test(d.label));
    });

    // low-poly creature rendered small, then scaled up for that crusty 2000s blur
    creature = createGraphics(360, 360, WEBGL);
    creature.pixelDensity(1);
    creature.noSmooth();
    buildSphere();

    setInterval(fetchNowPlaying, 2000);

    


    x = random(width);
    y = random(height);
    xspeed = 4;
    yspeed = 4;

}

// horizontal finance grid lines — must run every frame in draw(), because
// background() in draw() wipes anything drawn in setup().
function drawFinanceLines() {
    stroke(COLORS.grid[0], COLORS.grid[1], COLORS.grid[2]);
    strokeWeight(1);
    for (let i = 0; i < height; i += 50) {
        line(0, i, width, i);
    }

    for (let i = 0; i < width; i += 50) {
        line(i, 0, i, height);
    }
}


function pickcolor() {
  r = random(255);
  g = random(255);
  b = random(255);

}


// ===========================================================================
function draw() {
    updateBeat();
    updateLight();

    // plain black background that pulses green on the bass kick
    background(0, bgBrightness, 0);

    // record equity history (one sample per frame -> stepped P/L line)
    equity.push(profitLoss);
    if (equity.length > EQUITY_MAX) equity.shift();

    // screenshake: spike on the kick, decay each frame
    if (kick) shake = 16;
    shake *= 0.85;

    // --- shaken "world" layers ---
    push();
    if (shake > 0.4) translate(random(-shake, shake), random(-shake, shake));
    drawFinanceLines();
    drawEquityCurve();          // background P/L graph
    if (started) drawWaves();
    officerDown();
    drawMoney();
    drawStamp();
    pop();

    // --- anchored UI (no shake) ---
    if (started) drawHUD(); else drawPrompt();
    drawGlitch();
    drawVignette();
    drawChyron();
    drawClock();
    drawTopMarquee();
}

// running equity / P&L curve drawn faintly across the background
function drawEquityCurve() {
    if (equity.length < 2) return;
    let lo = Infinity, hi = -Infinity;
    for (const v of equity) { lo = min(lo, v); hi = max(hi, v); }
    if (hi === lo) { hi += 1; lo -= 1; }

    const top = height * 0.18, bot = height * 0.82;
    const col = profitLoss >= 0 ? COLORS.up : COLORS.down;

    push();
    // filled area under the curve, very dim
    noStroke();
    fill(col[0], col[1], col[2], 28);
    beginShape();
    vertex(0, bot);
    for (let i = 0; i < equity.length; i++) {
        const x = map(i, 0, equity.length - 1, 0, width);
        const y = map(equity[i], lo, hi, bot, top);
        vertex(x, y);
    }
    vertex(width, bot);
    endShape(CLOSE);

    // the line itself
    noFill();
    stroke(col[0], col[1], col[2], 90);
    strokeWeight(2);
    beginShape();
    for (let i = 0; i < equity.length; i++) {
        const x = map(i, 0, equity.length - 1, 0, width);
        const y = map(equity[i], lo, hi, bot, top);
        vertex(x, y);
    }
    endShape();
    pop();
}

// analog world clocks, stacked down the right side, top to bottom (green HUD)
const CLOCKS = [
    { tz: "America/New_York", label: "NYC" },
    { tz: "Europe/London",    label: "LDN" },
    { tz: "Asia/Tokyo",       label: "TYO" },
    { tz: "Australia/Sydney", label: "SYD" },
    { tz: "Asia/Makassar", label: "BPN" },   // Balikpapan (WITA, UTC+8)


];
function drawClock() {
    const R = 48;                 // smaller so several fit stacked
    const cx = width - R - 40;
    let cy = R + 40;
    const gap = R * 2 + 40;        // vertical spacing including label
    for (const c of CLOCKS) {
        drawOneClock(cx, cy, R, c.tz, c.label);
        cy += gap;
    }
}

function drawOneClock(cx, cy, R, tz, label) {
    const green = COLORS.green;

    // current time in this timezone
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz, hour12: false,
        hour: "numeric", minute: "numeric", second: "numeric",
    }).formatToParts(new Date());
    const get = (t) => Number(parts.find((p) => p.type === t).value);
    const hr = get("hour") % 12, mn = get("minute"), sc = get("second");

    push();
    translate(cx, cy);

    // face
    noFill();
    stroke(green[0], green[1], green[2]);
    strokeWeight(1);
    circle(0, 0, R * 2);

    // tick marks
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TWO_PI - HALF_PI;
        strokeWeight(2);
        line(cos(a) * R * 0.88, sin(a) * R * 0.88, cos(a) * R, sin(a) * R);
    }

    // hour numbers
    noStroke();
    fill(green[0], green[1], green[2]);
    textFont("system-ui");
    textAlign(CENTER, CENTER);
    textSize(R * 0.18);
    for (let n = 1; n <= 12; n++) {
        const a = (n / 12) * TWO_PI - HALF_PI;
        text(n, cos(a) * R * 0.72, sin(a) * R * 0.72);
    }

    // hands
    const hrA = ((hr + mn / 60) / 12) * TWO_PI - HALF_PI;
    const mnA = ((mn + sc / 60) / 60) * TWO_PI - HALF_PI;
    const scA = (sc / 60) * TWO_PI - HALF_PI;
    stroke(green[0], green[1], green[2]);
    strokeWeight(3); line(0, 0, cos(hrA) * R * 0.5, sin(hrA) * R * 0.5);
    strokeWeight(2); line(0, 0, cos(mnA) * R * 0.72, sin(mnA) * R * 0.72);
    strokeWeight(1); line(0, 0, cos(scA) * R * 0.85, sin(scA) * R * 0.85);
    noStroke();
    fill(green[0], green[1], green[2]);
    circle(0, 0, 5);

    // timezone label under the clock
    textSize(R * 0.26);
    text(label, 0, R + 14);
    pop();
}

const MONEY_LIFE = 90;   // frames each money string lingers (higher = longer)
let moneys = [];         // active money particles

function officerDown() {
    if (bgBrightness < 8) return;
    const t = bgBrightness / 255;
    const w = width * (0.45 + 0.45 * t);
    const h = w * (star.height / star.width);
    push();
    imageMode(CENTER);
    tint(255, bgBrightness);
    image(star, width / 2, height / 2, w / 2, h / 2);
    pop();

    // spawn ONE lingering money ticker per kick — green if up, red if down
    if (kick) {
        const up = random() < 0.5;
        const amount = floor(random(10, 100));
        profitLoss += up ? amount : -amount; 
        pnpPop = amount;                      

        // slam a BUY/SELL/LIQUIDATED stamp; big losses get LIQUIDATED
        if (!up && amount > 70) {
            stamp = { txt: "LIQUIDATED", col: COLORS.down, life: STAMP_LIFE };
        } else {
            stamp = up
                ? { txt: "BUY", col: COLORS.up, life: STAMP_LIFE }
                : { txt: "SELL", col: COLORS.down, life: STAMP_LIFE };
        }

        moneys.push({
            txt: (up ? "+$" : "-$") + amount,
            x: random(width),
            y: random(height),
            col: up ? COLORS.up : COLORS.down, // green up / red down
            life: MONEY_LIFE,
        });
    }
}

// draw + age every money particle so they linger and fade out
function drawMoney() {
    textSize(32);
    textAlign(CENTER, CENTER);
    for (let i = moneys.length - 1; i >= 0; i--) {
        const m = moneys[i];
        const alpha = map(m.life, 0, MONEY_LIFE, 0, 255);
        fill(m.col[0], m.col[1], m.col[2], alpha);
        text(m.txt, m.x, m.y);
        m.y -= 0.6;          // drift upward as it fades
        m.life--;
        if (m.life <= 0) moneys.splice(i, 1);
    }
}

// big BUY/SELL/LIQUIDATED stamp, slams big on the kick then snaps away
function drawStamp() {
    if (!stamp) return;
    const t = stamp.life / STAMP_LIFE;          // 1 -> 0
    push();
    translate(width / 2, height / 2);
    rotate(-0.12);                               // slight stamped tilt
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textFont("Arial");
    textSize(120 + (1 - t) * 120);               // punches outward as it fades
    drawingContext.shadowBlur = 30;
    drawingContext.shadowColor = `rgba(${stamp.col[0]},${stamp.col[1]},${stamp.col[2]},0.9)`;
    fill(stamp.col[0], stamp.col[1], stamp.col[2], 255 * t);
    text(stamp.txt, 0, 0);
    drawingContext.shadowBlur = 0;
    pop();
    stamp.life--;
    if (stamp.life <= 0) stamp = null;
}

// finance-bro news marquee scrolling along the TOP
function drawTopMarquee() {
    const barH = 40;
    push();
    noStroke();
    fill(0);
    rect(0, 0, width, barH);

    textFont("Arial");
    textSize(22);
    textAlign(LEFT, CENTER);

    // scrolling text (drawn twice for a seamless loop)
    const tw = textWidth(newsText);
    let off = newsX % tw;
    fill(...COLORS.up);
    text(newsText, 160 + off, barH / 2);
    text(newsText, 160 + off + tw, barH / 2);
    newsX -= 2.5;

    // accent underline + MARKETS label
    stroke(...COLORS.green);
    strokeWeight(2);
    line(0, barH, width, barH);
    noStroke();
    fill(...COLORS.down);
    rect(0, 0, 150, barH);
    fill(255);
    textStyle(BOLD);
    text("MARKETS", 14, barH / 2);
    pop();
}

// breaking-news chyron scrolling along the bottom
function drawChyron() {
    const barH = 42;
    const y = height - barH;

    push();
    textFont("Arial");
    textSize(22);
    textAlign(LEFT, CENTER);

    // scrolling headline text (drawn twice for a seamless loop)
    const tw = textWidth(chyronText);
    let off = chyronX % tw;
    fill(...COLORS.green);
    text(chyronText, 175 + off, y + barH / 2);
    text(chyronText, 175 + off + tw, y + barH / 2);
    chyronX -= 3;

    // BREAKING label box on top (hides the left overflow)
    noStroke();
    fill(...COLORS.down);
    rect(0, y, 165, barH);
    fill(255);
    textStyle(BOLD);
    text("BREAKING", 16, y + barH / 2);
    pop();
}

function updateBeat() {
    fft.analyze();
    peakDetect.update(fft);
    kick = peakDetect.isDetected;

    bgBrightness *= BG_DECAY;
    if (kick) bgBrightness = 255;

    if (started) {
        level = amplitude.getLevel() * MULT;
        bass = fft.getEnergy("bass") * MULT;
        mid = fft.getEnergy("mid") * MULT;
        treble = fft.getEnergy("treble") * MULT;
    }
}

// flickering, green-shifted lighting — strobes and dips for nausea
function updateLight() {
    light = 0.72 + 0.22 * sin(frameCount * 0.31) + 0.06 * sin(frameCount * 1.7);
    if (random() < 0.05) light *= 0.45;          // random brown-out flicker
    if (kick) light = 1.25;                        // glare on the kick
    light = constrain(light, 0.25, 1.3);
}

// push a color through the green-shifted flickering light
function lit(c, extra = 1) {
    return [
        constrain(c[0] * light * extra, 0, 255),
        constrain(c[1] * light * 1.25 * extra, 0, 255), // green boost
        constrain(c[2] * light * extra, 0, 255),
    ];
}


function buildSphere() {
    sphere = [];
    for (let i = 0; i <= RINGS; i++) {
        const theta = (i / RINGS) * PI;
        const row = [];
        for (let j = 0; j <= SECTORS; j++) {
            const phi = (j / SECTORS) * TWO_PI;
            row.push({
                x: sin(theta) * cos(phi),
                y: cos(theta),
                z: sin(theta) * sin(phi),
            });
        }
        sphere.push(row);
    }
}

function drawCreature() {
    const g = creature;
    g.clear();
    g.noStroke();

    const ay = frameCount * 0.011;
    const ax = frameCount * 0.007 + sin(frameCount * 0.02) * 0.4;
    const t = frameCount * 0.02;
    const R = 105 * (1 + level * 0.6 + (kick ? 0.18 : 0));
    const ldir = norm([cos(frameCount * 0.04) * 0.4, -0.5, 0.8]); // wandering light

    // displace + rotate every vertex once
    const P = [];
    for (let i = 0; i <= RINGS; i++) {
        const row = [];
        for (let j = 0; j <= SECTORS; j++) {
            const v = sphere[i][j];
            // lumpy biological deformation: noise + audio bands by latitude
            const band = i < RINGS * 0.33 ? treble : i < RINGS * 0.66 ? mid : bass;
            const disp = 0.32 * noise(v.x * 1.6 + t, v.y * 1.6, v.z * 1.6)
                       + (band / 255) * 0.5;
            const rr = 1 + disp;
            row.push(rotate3(v.x * rr, v.y * rr, v.z * rr, ax, ay));
        }
        P.push(row);
    }

    // draw flat-shaded triangles with clashing per-face palette
    let face = 0;
    for (let i = 0; i < RINGS; i++) {
        for (let j = 0; j < SECTORS; j++) {
            const a = P[i][j], b = P[i + 1][j], c = P[i + 1][j + 1], d = P[i][j + 1];
            tri(g, a, b, c, R, ldir, face++);
            tri(g, a, c, d, R, ldir, face++);
        }
    }

    // crusty: render small, blow up huge and off-center for claustrophobia
    const cs = min(width, height) * (0.92 + level * 0.25);
    const cx = width / 2 + sin(frameCount * 0.013) * width * 0.04;
    const cy = height / 2 + cos(frameCount * 0.017) * height * 0.04;
    push();
    blendMode(BLEND);
    noSmooth();
    image(g, cx - cs / 2, cy - cs / 2, cs, cs);
    pop();
}

// wireframe-only triangle: transparent faces, clashing flickering edges
function tri(g, p1, p2, p3, R, ldir, face) {
    const n = faceNormal(p1, p2, p3);
    const facing = constrain(dot(n, ldir) * 0.5 + 0.5, 0, 1);
    const sh = 0.4 + 0.6 * facing;         // edges fade with facing for depth
    const base = pcol(face + floor(frameCount * 0.05));
    const col = lit([base[0] * sh, base[1] * sh, base[2] * sh]);
    g.noFill();                             // hollow blob — lines only
    g.stroke(col[0], col[1], col[2], 200);
    g.strokeWeight(1);
    g.beginShape(TRIANGLES);
    g.vertex(p1.x * R, p1.y * R, p1.z * R);
    g.vertex(p2.x * R, p2.y * R, p2.z * R);
    g.vertex(p3.x * R, p3.y * R, p3.z * R);
    g.endShape();
}

// ===========================================================================
//  LAYER 3 — three waveforms: bass (low), main (middle), treble (high)
// ===========================================================================
function drawWaves() {
    const wave = fft.waveform();

    // split the single time-domain waveform into low/high bands with a
    // one-pole low-pass; the remainder is the high band (treble).
    const n = wave.length;
    const bassWave = new Float32Array(n);
    const trebWave = new Float32Array(n);
    let lp = 0;
    const a = 0.025; // smaller = lower cutoff (more bass content captured)
    for (let i = 0; i < n; i++) {
        lp += a * (wave[i] - lp);
        bassWave[i] = lp;          // low frequencies
        trebWave[i] = wave[i] - lp; // high frequencies
    }

    // treble — top third, acid green, thin & jittery, scaled up (it's quiet)
    drawWave(trebWave, height * 0.25, height * 0.5 * 4, COLORS.acid, 2);
    // main — middle, neon green
    drawWave(wave, height * 0.5, height * 0.5, COLORS.green, 2 + (kick ? 3 : 0));
    // bass — bottom third, stock-market red, fat, big range for quiet kicks
    drawWave(bassWave, height * 0.75, height * 0.5 * 5, COLORS.down, 4);
}

// draw one waveform centered on baseY with the given vertical amplitude
function drawWave(buf, baseY, amp, col, weight) {
    noFill();
    stroke(col[0], col[1], col[2]);
    strokeWeight(weight);
    drawingContext.shadowBlur = 14;
    drawingContext.shadowColor = `rgba(${col[0]},${col[1]},${col[2]},0.9)`;
    beginShape();
    for (let i = 0; i < buf.length; i++) {
        const x = map(i, 0, buf.length, 0, width);
        const y = baseY + buf[i] * amp * MULT + random(-1, 1) * level * 20;
        vertex(x, y);
    }
    endShape();
    drawingContext.shadowBlur = 0;
}

// ===========================================================================
//  LAYER 4 — datamosh / RGB-split glitch
// ===========================================================================
function drawGlitch() {
    // horizontal datamosh slices: copy bands of the canvas and shove them sideways
    const slices = kick ? 9 : (random() < 0.25 ? 3 : 0);
    for (let s = 0; s < slices; s++) {
        const sy = random(height);
        const sh = random(6, 46);
        const dx = random(-60, 60) * (kick ? 1.8 : 1);
        copy(0, sy, width, sh, dx, sy, width, sh);
    }

    // occasional RGB split smear across the whole frame on kicks
    if (kick) {
        push();
        blendMode(SCREEN);
        tint(255, 0, 0, 60);
        image(get(), -8, 0);
        tint(0, 120, 255, 60);
        image(get(), 8, 0);
        pop();
    }
}

// ===========================================================================
//  LAYER 5 — claustrophobic green-rot vignette
// ===========================================================================
function drawVignette() {
    const ctx = drawingContext;
    const grad = ctx.createRadialGradient(
        width / 2, height / 2, min(width, height) * 0.18,
        width / 2, height / 2, max(width, height) * 0.72
    );
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.7, "rgba(10,18,0,0.45)");
    grad.addColorStop(1, "rgba(2,5,0,0.95)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // scanlines for the cheap-CRT hostility
    stroke(0, 0, 0, 60);
    strokeWeight(1);
    for (let y = 0; y < height; y += 3) line(0, y, width, y);
}


function drawHUD() {
    push();
    textFont("serif");
    noStroke();
    fill(...COLORS.green);

    // now-playing near the top
    textAlign(CENTER, TOP);
    textSize(24);
    text(nowPlayingText, width / 2, 50);

    // Profit: green when up, red when down, FLASHES toward white on each hit
    const pnpCol = profitLoss >= 0 ? COLORS.up : COLORS.down;
    const flash = constrain(pnpPop / 80, 0, 1);   // 0..1 hit strength
    fill(
        lerp(pnpCol[0], 255, flash),
        lerp(pnpCol[1], 255, flash),
        lerp(pnpCol[2], 255, flash)
    );
    textSize(24 + pnpPop);                 // amount (10-99) adds to base size
    text("Profit: " + "₽ " + profitLoss.toFixed(0), width / 2, 70);
    textSize(24);
    fill(...COLORS.green);                  // restore green for the rows below
    pnpPop *= 0.88;                         // ease the pop back to base each frame



    pop();

    // readouts as a spreadsheet-style table, top-left
    drawSpreadsheet();
}

// spreadsheet/terminal table of the live audio metrics
function drawSpreadsheet() {
    const rows = [
        ["METRIC", "VALUE", "Δ"],                       // header
        ["AMPLITUDE", level.toFixed(2), "амплітуда"],
        ["BASS", bass.toFixed(0), "бас"],
        ["MID", mid.toFixed(0), "сярэдні"],
        ["TREBLE", treble.toFixed(0), "частоты"],
    ];
    const cols = [120, 90, 110];                         // column widths
    const ox = 24, oy = 90, rh = 26;                     // origin + row height
    const tw = cols[0] + cols[1] + cols[2];
    const green = COLORS.green;

    push();
    textFont("Courier New");
    textSize(14);
    textAlign(LEFT, CENTER);

    for (let i = 0; i < rows.length; i++) {
        const ry = oy + i * rh;
        const header = i === 0;

        // cell background: header solid green, body alternating dim stripes
        noStroke();
        if (header) fill(green[0], green[1], green[2], 220);
        else fill(green[0], green[1], green[2], i % 2 ? 22 : 10);
        rect(ox, ry, tw, rh);

        // cell text
        let cx = ox;
        for (let c = 0; c < rows[i].length; c++) {
            if (header) fill(0);                          // black on green header
            else if (c === 1) fill(...green);             // value column = bright
            else fill(green[0], green[1], green[2], 160);
            text(rows[i][c], cx + 8, ry + rh / 2);
            cx += cols[c];
        }
    }

    // grid lines (cell borders)
    stroke(green[0], green[1], green[2], 120);
    strokeWeight(1);
    for (let i = 0; i <= rows.length; i++) line(ox, oy + i * rh, ox + tw, oy + i * rh);
    let cx = ox;
    for (let c = 0; c <= cols.length; c++) {
        line(cx, oy, cx, oy + rows.length * rh);
        if (c < cols.length) cx += cols[c];
    }
    pop();
}

function drawPrompt() {
    push();
    textFont("serif");
    noStroke();
    fill(...COLORS.green);
    textAlign(CENTER, CENTER);
    textSize(24);
    text("click to start", width / 2, height / 2);
    pop();
}

// ===========================================================================
//  math helpers
// ===========================================================================
function rotate3(x, y, z, ax, ay) {
    const x1 = x * cos(ay) + z * sin(ay);
    const z1 = -x * sin(ay) + z * cos(ay);
    const y2 = y * cos(ax) - z1 * sin(ax);
    const z2 = y * sin(ax) + z1 * cos(ax);
    return { x: x1, y: y2, z: z2 };
}
function faceNormal(a, b, c) {
    const u = [b.x - a.x, b.y - a.y, b.z - a.z];
    const v = [c.x - a.x, c.y - a.y, c.z - a.z];
    return norm([
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
    ]);
}
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function norm(a) {
    const m = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / m, a[1] / m, a[2] / m];
}
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function mousePressed() {
    if (started) return;
    userStartAudio();
    if (blackholeIndex >= 0) audio.setSource(blackholeIndex);
    audio.start(() => {
        amplitude.setInput(audio);
        fft.setInput(audio);
        started = true;
    });
}

// now playing from a traktor_nowplaying script; updates every 2 seconds
function fetchNowPlaying() {
    fetch('nowplaying.txt?nocache=' + Date.now())
        .then((r) => r.text())
        .then((d) => { if (d && d.trim()) nowPlayingText = d.trim(); })
        .catch(() => {});
}

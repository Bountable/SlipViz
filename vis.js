
const MULT = 1.0;   // multiplier applied to all values + waveform height

let audio;          // p5.AudioIn
let amplitude;      // overall volume
let fft;            // frequency analysis

let started = false;
let blackholeIndex = -1;

let peakDetect;              
let bgBrightness = 0;       // current background pulse level (persists across frames)
const BG_DECAY = 0.82;      // how fast the pulse fades between beats (lower = snappier)

const addGlow = false;   

let nowPlayingText = "Waiting for track..."; 


function setup() {

    setInterval(fetchNowPlaying, 2000);
    const physicalWidth = window.screen.width;
    const physicalHeight = window.screen.height;

    createCanvas(physicalWidth, physicalHeight);

    audio = new p5.AudioIn();
    amplitude = new p5.Amplitude();
    fft = new p5.FFT();

    // detect kicks in the sub-backbass band (~20-40 Hz); lower threshold = more sensitive
    peakDetect = new p5.PeakDetect(20, 40, 0.5, 0.02);

    audio.getSources((list) => {
        blackholeIndex = list.findIndex((d) => /blackhole/i.test(d.label));
    });

    textFont("serif");
    textSize(16);
}

function draw() {

    // --- pulsing background ---
    fft.analyze();
    peakDetect.update(fft);
    bgBrightness *= BG_DECAY;                
    if (peakDetect.isDetected) bgBrightness = 255; 
    background(0, bgBrightness, 0, 100);
    noStroke(); 

    if (!started) {
        fill(0, 255, 0);
        text("click to start", 20, 40);
        return;
    }

    const waveform = fft.waveform();

    const level = amplitude.getLevel() * MULT;
    const bass = fft.getEnergy("bass") * MULT;
    const mid = fft.getEnergy("mid") * MULT;
    const treble = fft.getEnergy("treble") * MULT;

    // readout text
    fill(0, 255, 0);
    noStroke();
    textAlign(LEFT);
    let ty = 40;
    text("multiplier множитель: " + MULT.toFixed(2) + "x", 20, ty);  ty += 24;
    text("amplitude амплитуда:  " + level.toFixed(2), 20, ty);       ty += 24;
    text("bass: бас      " + bass.toFixed(2), 20, ty);        ty += 24;
    text("mid: середина      " + mid.toFixed(2), 20, ty);         ty += 24;
    text("treble: высокие частоты    " + treble.toFixed(2), 20, ty);



    noFill();
    stroke(0, 255, 0);
    strokeWeight(2);
    const midY = height / 2;
    const amp = height / 2; // full-screen vertical coverage at MULT = 1


    //waveform of current audio
    beginShape();
        for (let i = 0; i < waveform.length; i++) {
            let x = map(i, 0, waveform.length, 0, width);
            let y = midY + waveform[i] * amp * MULT;
            vertex(x, y);
        }
    endShape();

    // bass wave form 
    stroke(57, 255, 20); 
    beginShape();
        for (let i = 0; i < bass.length; i++) {
            let x = map(i, 0, bass.length, 0, width);
            let y = midY + (bass[i] / 255) * amp;
            vertex(x, y);
        }
    endShape();


    if(addGlow)
    {
        drawingContext.shadowBlur = 10;
        drawingContext.shadowColor = color(57, 255, 20);  // your green
        stroke(57, 255, 20);
    }
   

    textAlign(CENTER);     // Center the text
    text(nowPlayingText, width / 2, 80); // near the top middle
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

function updateStatus(msg) {
    document.getElementById("status").textContent = msg;
}

// now playing from traktor_nowplaying script; updates every 2 seconds
function fetchNowPlaying() {
    fetch('nowplaying.txt?nocache=' + new Date().getTime())
        .then(response => response.text())
        .then(data => {
            nowPlayingText = data;
        })
        .catch(err => console.log("File not found yet"));
}
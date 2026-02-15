import { useState, useEffect, useRef, useCallback } from "react";

const BASE_W = 800;
const BASE_H = 300;
const GROUND = 230;
const GRAVITY = 0.6;
const JUMP_VEL = -12;
const NIGHT_SCORE = 17;

let audioCtx = null;

function playTone(freq, duration, type, volume, delay) {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || "square";
    osc.frequency.value = freq;
    gain.gain.value = volume || 0.12;
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (delay || 0) + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime + (delay || 0));
    osc.stop(audioCtx.currentTime + (delay || 0) + duration);
  } catch (e) {}
}

function soundJump() {
  playTone(523, 0.08, "square", 0.12, 0);
  playTone(659, 0.06, "square", 0.1, 0.05);
}

function soundScore() {
  playTone(784, 0.06, "square", 0.1, 0);
  playTone(1047, 0.08, "square", 0.12, 0.06);
}

function soundCrash() {
  if (!audioCtx) return;
  try {
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.2, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    src.buffer = buf;
    gain.gain.value = 0.15;
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    src.connect(gain);
    gain.connect(audioCtx.destination);
    src.start();
  } catch (e) {}
  playTone(131, 0.15, "sawtooth", 0.1, 0.05);
}

function soundNight() {
  playTone(330, 0.5, "sine", 0.08, 0);
  playTone(392, 0.4, "sine", 0.07, 0.3);
  playTone(494, 0.6, "sine", 0.08, 0.6);
}

function lerp(a, b, t) {
  return a + (b - a) * Math.min(Math.max(t, 0), 1);
}

function drawBearSprite(ctx, bx, by, frame, jumping, isDark) {
  var bf = Math.floor(frame) % 4;
  var bodyC = isDark ? "#7A5232" : "#8B5E3C";
  var darkC = isDark ? "#5A3820" : "#6B4226";
  var snoutC = isDark ? "#C4855A" : "#D4956A";

  // Body
  ctx.fillStyle = bodyC;
  ctx.fillRect(bx, by - 32, 28, 24);
  // Head
  ctx.fillRect(bx + 20, by - 42, 18, 18);
  // Ears
  ctx.fillStyle = darkC;
  ctx.fillRect(bx + 20, by - 48, 6, 6);
  ctx.fillRect(bx + 32, by - 48, 6, 6);
  // Inner ears
  ctx.fillStyle = snoutC;
  ctx.fillRect(bx + 21, by - 47, 4, 4);
  ctx.fillRect(bx + 33, by - 47, 4, 4);
  // Snout
  ctx.fillRect(bx + 30, by - 36, 10, 8);
  // Nose
  ctx.fillStyle = "#222";
  ctx.fillRect(bx + 36, by - 36, 4, 3);
  // Eye
  ctx.fillStyle = isDark ? "#FFF" : "#222";
  ctx.fillRect(bx + 28, by - 40, 3, 3);
  if (isDark) {
    ctx.fillStyle = "#222";
    ctx.fillRect(bx + 29, by - 39, 1, 1);
  }
  // Legs
  ctx.fillStyle = darkC;
  if (jumping) {
    ctx.fillRect(bx + 4, by - 8, 6, 8);
    ctx.fillRect(bx + 16, by - 8, 6, 8);
  } else {
    var a = bf < 2 ? 0 : 4;
    var b = bf < 2 ? 4 : 0;
    ctx.fillRect(bx + 2, by - 8 + a, 6, 8 - a);
    ctx.fillRect(bx + 10, by - 8 + b, 6, 8 - b);
    ctx.fillRect(bx + 16, by - 8 + b, 6, 8 - b);
    ctx.fillRect(bx + 24, by - 8 + a, 6, 8 - a);
  }
  // Tail
  ctx.fillStyle = bodyC;
  ctx.fillRect(bx - 4, by - 28, 6, 6);
}

function drawStaticScene(ctx) {
  // Blue sky
  ctx.fillStyle = "rgb(135,206,235)";
  ctx.fillRect(0, 0, BASE_W, GROUND);

  // Clouds
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillRect(150, 40, 40, 12);
  ctx.fillRect(158, 34, 24, 8);
  ctx.fillRect(500, 75, 40, 12);
  ctx.fillRect(508, 69, 24, 8);

  // Mountains back
  ctx.fillStyle = "rgb(107,163,104)";
  for (var i = 0; i < 4; i++) {
    var mx = i * 250;
    ctx.beginPath();
    ctx.moveTo(mx, GROUND);
    ctx.lineTo(mx + 80, GROUND - 80);
    ctx.lineTo(mx + 160, GROUND);
    ctx.fill();
  }

  // Mountains front
  ctx.fillStyle = "rgb(123,184,120)";
  for (var j = 0; j < 5; j++) {
    var fx = j * 200;
    ctx.beginPath();
    ctx.moveTo(fx, GROUND);
    ctx.lineTo(fx + 50, GROUND - 50);
    ctx.lineTo(fx + 100, GROUND);
    ctx.fill();
  }

  // Ground
  ctx.fillStyle = "rgb(93,138,78)";
  ctx.fillRect(0, GROUND, BASE_W, 4);
  ctx.fillStyle = "rgb(74,115,64)";
  ctx.fillRect(0, GROUND + 4, BASE_W, BASE_H - GROUND - 4);

  // Grass tufts
  ctx.fillStyle = "rgb(107,163,104)";
  for (var k = 0; k < 12; k++) {
    var gx = k * 70;
    ctx.fillRect(gx, GROUND - 4, 2, 4);
    ctx.fillRect(gx + 3, GROUND - 6, 2, 6);
  }

  // Bear standing
  drawBearSprite(ctx, 80, GROUND, 0, false, false);
}

export default function BearRun() {
  var canvasRef = useRef(null);
  var starsRef = useRef([]);
  var nightDone = useRef(false);
  var rafRef = useRef(null);
  var gameRef = useRef({
    bearX: 80, bearY: GROUND, bearVY: 0, jumping: false, frame: 0,
    logs: [], score: 0, best: 0, speed: 5,
    running: false, dead: false, tick: 0, nightBlend: 0
  });

  var [score, setScore] = useState(0);
  var [best, setBest] = useState(0);
  var [started, setStarted] = useState(false);
  var [dead, setDead] = useState(false);
  var [canvasWidth, setCanvasWidth] = useState(BASE_W);
  var [isMobile, setIsMobile] = useState(false);
  var [mounted, setMounted] = useState(false);

  // Responsive
  useEffect(function() {
    function handleResize() {
      var w = window.innerWidth;
      setIsMobile(w < 500);
      setCanvasWidth(w < 820 ? Math.min(w - 24, BASE_W) : BASE_W);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return function() { window.removeEventListener("resize", handleResize); };
  }, []);

  // Stars
  useEffect(function() {
    var s = [];
    for (var i = 0; i < 50; i++) {
      s.push({
        x: Math.random() * BASE_W,
        y: Math.random() * (GROUND - 20),
        size: Math.random() * 1.5 + 0.5,
        phase: Math.random() * 6.28,
        speed: Math.random() * 0.03 + 0.01
      });
    }
    starsRef.current = s;
  }, []);

  // Draw initial scene with bear visible
  useEffect(function() {
    setMounted(true);
    var timer = setTimeout(function() {
      var canvas = canvasRef.current;
      if (canvas) {
        var ctx = canvas.getContext("2d");
        if (ctx) {
          drawStaticScene(ctx);
        }
      }
    }, 100);
    return function() { clearTimeout(timer); };
  }, []);

  var render = useCallback(function(ctx) {
    var g = gameRef.current;
    var n = g.nightBlend;
    var r = Math.round;

    ctx.fillStyle = "rgb(" + r(lerp(135,15,n)) + "," + r(lerp(206,15,n)) + "," + r(lerp(235,45,n)) + ")";
    ctx.fillRect(0, 0, BASE_W, GROUND);

    if (n > 0.1) {
      starsRef.current.forEach(function(s) {
        s.phase += s.speed;
        var alpha = n * (0.5 + 0.5 * Math.sin(s.phase));
        ctx.fillStyle = "rgba(255,255,220," + alpha + ")";
        ctx.fillRect(r(s.x), r(s.y), Math.ceil(s.size), Math.ceil(s.size));
      });
    }

    if (n > 0.3) {
      var moonA = Math.min((n - 0.3) / 0.4, 1);
      ctx.fillStyle = "rgba(255,248,200," + (moonA * 0.9) + ")";
      ctx.beginPath(); ctx.arc(680, 50, 22, 0, 6.28); ctx.fill();
      ctx.fillStyle = "rgb(" + r(lerp(135,15,n)) + "," + r(lerp(206,15,n)) + "," + r(lerp(235,45,n)) + ")";
      ctx.beginPath(); ctx.arc(690, 45, 18, 0, 6.28); ctx.fill();
    }

    var cloudAlpha = Math.max(1 - n * 1.5, 0);
    if (cloudAlpha > 0) {
      ctx.fillStyle = "rgba(255,255,255," + cloudAlpha + ")";
      var cx1 = ((g.tick * 0.3) % (BASE_W + 100)) - 50;
      var cx2 = ((g.tick * 0.2 + 300) % (BASE_W + 100)) - 50;
      ctx.fillRect(cx1, 40, 40, 12); ctx.fillRect(cx1 + 8, 34, 24, 8);
      ctx.fillRect(cx2, 75, 40, 12); ctx.fillRect(cx2 + 8, 69, 24, 8);
    }

    ctx.fillStyle = "rgb(" + r(lerp(107,25,n)) + "," + r(lerp(163,40,n)) + "," + r(lerp(104,30,n)) + ")";
    for (var i = 0; i < 4; i++) {
      var mx = i * 250 - (g.tick * 0.5 % 250);
      ctx.beginPath(); ctx.moveTo(mx, GROUND); ctx.lineTo(mx+80, GROUND-80); ctx.lineTo(mx+160, GROUND); ctx.fill();
    }
    ctx.fillStyle = "rgb(" + r(lerp(123,35,n)) + "," + r(lerp(184,55,n)) + "," + r(lerp(120,40,n)) + ")";
    for (var j = 0; j < 5; j++) {
      var fx = j * 200 - (g.tick * 0.8 % 200);
      ctx.beginPath(); ctx.moveTo(fx, GROUND); ctx.lineTo(fx+50, GROUND-50); ctx.lineTo(fx+100, GROUND); ctx.fill();
    }

    ctx.fillStyle = "rgb(" + r(lerp(93,20,n)) + "," + r(lerp(138,45,n)) + "," + r(lerp(78,25,n)) + ")";
    ctx.fillRect(0, GROUND, BASE_W, 4);
    ctx.fillStyle = "rgb(" + r(lerp(74,15,n)) + "," + r(lerp(115,35,n)) + "," + r(lerp(64,20,n)) + ")";
    ctx.fillRect(0, GROUND+4, BASE_W, BASE_H-GROUND-4);

    ctx.fillStyle = "rgb(" + r(lerp(61,12,n)) + "," + r(lerp(98,30,n)) + "," + r(lerp(52,15,n)) + ")";
    for (var d = 0; d < 20; d++) {
      var dx = (d*45 - (g.tick*g.speed)%45 + 900) % 900 - 50;
      ctx.fillRect(dx, GROUND+6, 8, 2);
    }

    ctx.fillStyle = "rgb(" + r(lerp(107,25,n)) + "," + r(lerp(163,55,n)) + "," + r(lerp(104,30,n)) + ")";
    for (var gr = 0; gr < 12; gr++) {
      var gx = (gr*70 - (g.tick*g.speed*0.8)%70 + 900) % 900 - 60;
      ctx.fillRect(gx, GROUND-4, 2, 4); ctx.fillRect(gx+3, GROUND-6, 2, 6);
    }

    if (n > 0.5) {
      for (var fi = 0; fi < 6; fi++) {
        var ffx = (Math.sin(g.tick*0.02 + fi*2.5)*0.5+0.5) * BASE_W;
        var ffy = (Math.cos(g.tick*0.015 + fi*3.1)*0.3+0.5) * (GROUND-30);
        var ffa = (Math.sin(g.tick*0.05 + fi*1.7)*0.5+0.5) * n;
        ctx.fillStyle = "rgba(200,255,100," + (ffa*0.6) + ")";
        ctx.fillRect(r(ffx)-1, r(ffy)-1, 3, 3);
      }
    }

    var isDark = n > 0.5;
    g.logs.forEach(function(log) {
      var lx = log.x;
      ctx.fillStyle = isDark ? "#4A2E14" : "#5C3A1E";
      ctx.fillRect(lx, GROUND-20, 30, 20);
      ctx.fillStyle = isDark ? "#3A2010" : "#4A2E14";
      ctx.fillRect(lx+3, GROUND-18, 2, 16);
      ctx.fillRect(lx+14, GROUND-18, 2, 16);
      ctx.fillRect(lx+25, GROUND-18, 2, 16);
      ctx.fillStyle = isDark ? "#7B5330" : "#8B6340";
      ctx.fillRect(lx+8, GROUND-16, 14, 12);
      ctx.fillStyle = isDark ? "#906840" : "#A07850";
      ctx.fillRect(lx+11, GROUND-13, 8, 6);
      if (log.dbl) {
        ctx.fillStyle = isDark ? "#5A3620" : "#6B4226";
        ctx.fillRect(lx+2, GROUND-38, 26, 18);
        ctx.fillStyle = isDark ? "#3A2010" : "#4A2E14";
        ctx.fillRect(lx+6, GROUND-36, 2, 14);
        ctx.fillRect(lx+16, GROUND-36, 2, 14);
        ctx.fillStyle = isDark ? "#906840" : "#A07850";
        ctx.fillRect(lx+10, GROUND-32, 10, 8);
      }
    });

    drawBearSprite(ctx, g.bearX, g.bearY, g.frame, g.jumping, isDark);

    ctx.fillStyle = isDark ? "#ddd" : "#333";
    ctx.font = "bold 16px 'Courier New', monospace";
    ctx.textAlign = "right";
    ctx.fillText("Score: " + g.score, BASE_W - 20, 30);
    ctx.fillText("Best: " + g.best, BASE_W - 20, 50);
  }, []);

  var gameLoop = useCallback(function() {
    var g = gameRef.current;
    var ctx = canvasRef.current ? canvasRef.current.getContext("2d") : null;
    if (!ctx || !g.running) return;

    g.tick++;

    if (g.score >= NIGHT_SCORE) {
      g.nightBlend = Math.min(g.nightBlend + 0.005, 1);
      if (!nightDone.current) { nightDone.current = true; soundNight(); }
    } else {
      g.nightBlend = 0;
    }

    if (g.jumping) {
      g.bearVY += GRAVITY;
      g.bearY += g.bearVY;
      if (g.bearY >= GROUND) { g.bearY = GROUND; g.bearVY = 0; g.jumping = false; }
    }
    if (!g.jumping) g.frame += 0.15 * g.speed;

    var last = g.logs.length > 0 ? g.logs[g.logs.length - 1] : null;
    var gap = Math.max(280 - g.speed * 8, 180);
    if (!last || last.x < BASE_W - gap) {
      if (Math.random() < 0.02 * g.speed) {
        g.logs.push({ x: BASE_W + 20, dbl: g.score > 5 && Math.random() > 0.6, scored: false });
      }
    }

    for (var m = 0; m < g.logs.length; m++) { g.logs[m].x -= g.speed; }
    g.logs = g.logs.filter(function(l) { return l.x > -40; });

    for (var s = 0; s < g.logs.length; s++) {
      var sl = g.logs[s];
      if (!sl.scored && sl.x + 30 < g.bearX) {
        sl.scored = true; g.score++;
        setScore(g.score); soundScore();
        if (g.score > g.best) { g.best = g.score; setBest(g.score); }
      }
    }

    g.speed = 5 + Math.floor(g.score / 5) * 0.5;

    for (var c = 0; c < g.logs.length; c++) {
      var cl = g.logs[c];
      var lh = cl.dbl ? 38 : 20;
      if (g.bearX + 34 > cl.x + 4 && g.bearX + 6 < cl.x + 26 && g.bearY > GROUND - lh + 4) {
        g.running = false; g.dead = true; setDead(true); soundCrash(); break;
      }
    }

    render(ctx);
    if (g.running) rafRef.current = requestAnimationFrame(gameLoop);
  }, [render]);

  var jump = useCallback(function() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
    var g = gameRef.current;

    if (g.dead) {
      g.bearX = 80; g.bearY = GROUND; g.bearVY = 0; g.jumping = false; g.frame = 0;
      g.logs = []; g.score = 0; g.speed = 5; g.dead = false; g.running = true;
      g.tick = 0; g.nightBlend = 0; nightDone.current = false;
      setScore(0); setDead(false); setStarted(true);
      rafRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    if (!g.running) {
      g.running = true; setStarted(true);
      rafRef.current = requestAnimationFrame(gameLoop);
    }

    if (!g.jumping) { g.jumping = true; g.bearVY = JUMP_VEL; soundJump(); }
  }, [gameLoop]);

  // Keyboard
  useEffect(function() {
    function handler(e) {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); }
    }
    window.addEventListener("keydown", handler);
    return function() {
      window.removeEventListener("keydown", handler);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [jump]);

  var scale = canvasWidth / BASE_W;

  return (
    <div
      onClick={jump}
      onTouchStart={function(e) { e.preventDefault(); jump(); }}
      style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#1a1a2e", fontFamily: "'Courier New', monospace",
        padding: 12, boxSizing: "border-box",
        userSelect: "none", WebkitUserSelect: "none",
        touchAction: "manipulation", cursor: "pointer"
      }}
    >
      <h1 style={{ color: "#8B5E3C", fontSize: isMobile ? 22 : 28, fontWeight: 800, margin: "0 0 4px", letterSpacing: 2 }}>
        🐻 BEAR RUN
      </h1>
      <p style={{ color: "#888", fontSize: isMobile ? 11 : 12, margin: "0 0 12px" }}>
        {isMobile ? "Tap anywhere to jump!" : "Jump over the logs!"}
      </p>

      <div style={{
        position: "relative", borderRadius: 12, overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)", border: "3px solid #333",
        width: canvasWidth, height: Math.round(BASE_H * scale)
      }}>
        <canvas
          ref={canvasRef}
          width={BASE_W}
          height={BASE_H}
          style={{ display: "block", width: canvasWidth, height: Math.round(BASE_H * scale) }}
        />

        {!started && !dead && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)",
            pointerEvents: "none"
          }}>
            <div style={{ fontSize: isMobile ? 36 : 44, marginBottom: 10 }}>🐻</div>
            <div style={{ color: "#fff", fontSize: isMobile ? 16 : 18, fontWeight: 700, marginBottom: 6 }}>
              {isMobile ? "TAP to start!" : "Press SPACE or TAP to start"}
            </div>
            <div style={{ color: "#ccc", fontSize: isMobile ? 11 : 12 }}>Jump over logs to score!</div>
            <div style={{ color: "#aaa", fontSize: 10, marginTop: 6 }}>🌙 Reach 17 for a surprise...</div>
          </div>
        )}

        {dead && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)",
            pointerEvents: "none"
          }}>
            <div style={{ color: "#E63946", fontSize: isMobile ? 22 : 26, fontWeight: 800, marginBottom: 4 }}>GAME OVER</div>
            <div style={{ color: "#fff", fontSize: isMobile ? 14 : 16, marginBottom: 4 }}>Score: {score}</div>
            <div style={{ color: "#aaa", fontSize: 13, marginBottom: 14 }}>Best: {best}</div>
            <div style={{ color: "#ccc", fontSize: isMobile ? 12 : 13 }}>
              {isMobile ? "TAP to retry" : "SPACE or TAP to retry"}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 20, marginTop: 14 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#666", fontSize: 10, textTransform: "uppercase" }}>Score</div>
          <div style={{ color: "#8B5E3C", fontSize: isMobile ? 20 : 24, fontWeight: 800 }}>{score}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#666", fontSize: 10, textTransform: "uppercase" }}>Best</div>
          <div style={{ color: "#4CD964", fontSize: isMobile ? 20 : 24, fontWeight: 800 }}>{best}</div>
        </div>
      </div>
      <p style={{ color: "#555", fontSize: 10, marginTop: 12 }}>
        {isMobile ? "TAP anywhere to jump" : "SPACE / UP / TAP to jump"}
      </p>
    </div>
  );
}

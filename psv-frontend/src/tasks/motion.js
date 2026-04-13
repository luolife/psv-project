// frontend/src/tasks/motion.js
//
// Motion Coherence Task
// Equivalente direto de: Task - Motion Coherence (1).py
//
// Paradigma:
//   Estímulo: campo de pontos com coerência direcional (DotStim)
//   F = movimento para ESQUERDA | J = movimento para DIREITA
//   Prática: 10 trials com feedback | Principal: 80 trials sem feedback
//   Pausa automática a cada 40 trials

import {
  balancedSequence, pseudorandomizeMaxRun,
  clearContainer, showText, showBlank, showFeedback,
  showPause, showProgressBar, showInstructions, showCompletion,
  waitForResponse, showTouchHint, hideTouchHint, calcMetrics, delay,
} from "./_engine.js";

// ---------------------------------------------------------------------------
// Parâmetros — espelho exato do Python
// ---------------------------------------------------------------------------
const PRACTICE_TRIALS  = 10;
const MAIN_TRIALS      = 80;
const STIM_DURATION_MS = 800;
const RESPONSE_WIN_MS  = 2500;
const ISI_MS           = 800;
const PAUSE_INTERVAL   = 40;

// ---------------------------------------------------------------------------
// Parâmetros — espelho direto do Python (Task - Motion Coherence (1).py)
//   n_dots=300, dot_size=4 (diâmetro, pix), dot_speed=5 (px/frame @60fps)
//   dot_life=60 (frames), field_size=(350,350) circle → raio=175px @1080p
//   coherence=0.4, units='pix'
//
// Todos os valores em pixels são escalados proporcionalmente:
//   PX_SCALE = min(w,h) / 1080  →  1.0 em 1920×1080, ~0.67 em 1280×720
//
// Velocidade convertida de px/frame para px/segundo para ser independente
// de framerate (PsychoPy corre a 60Hz fixo; browsers variam 60-144Hz):
//   300 px/s = 5px/frame × 60fps    (base a 1080p)
// ---------------------------------------------------------------------------
const PX_SCALE      = Math.min(window.innerWidth, window.innerHeight) / 1080;
const N_DOTS        = 300;
const COHERENCE     = 0.4;
const FIELD_RADIUS  = Math.round(175 * PX_SCALE);        // field_size=(350,350)/2 → 175px @1080p
const DOT_SIZE      = Math.max(1, Math.round(2 * PX_SCALE)); // dot_size=4px diâm → raio=2px @1080p
const DOT_SPEED_PS  = 400 * PX_SCALE;                    // ~6.7px/frame@60fps, +33% vs PsychoPy original
const DOT_LIFE_MS   = 1000;                               // dot_life=60frames × (1000ms/60fps)

const LABELS = ["esquerda", "direita"];

// Ruído majoritariamente vertical (cima/baixo), com uma fração pequena horizontal.
// NOISE_HORIZ_RATIO=0.15 → 15% do ruído vai esq/dir, 85% vai cima/baixo.
// Isso cria ambiguidade sutil sem o efeito de "mts pontos dos dois lados ao mesmo tempo".
const NOISE_HORIZ_RATIO = 0.15;

function _randCardinal() {
  if (Math.random() < NOISE_HORIZ_RATIO) {
    return Math.random() < 0.5 ? 0 : 180;   // esquerda ou direita (minoria)
  }
  return Math.random() < 0.5 ? 90 : 270;    // cima ou baixo (maioria)
}

// ---------------------------------------------------------------------------
// DotStim — implementação equivalente ao visual.DotStim do PsychoPy
//
// Lógica:
//   - N_DOTS pontos distribuídos aleatoriamente num campo circular
//   - COHERENCE * N_DOTS pontos movem-se coerentemente na direção do trial
//   - Restante move-se em direções aleatórias
//   - Pontos que saem do campo reaparecem aleatoriamente (dotLife=60 frames)
//   - Renderizado via Canvas 2D + requestAnimationFrame
// ---------------------------------------------------------------------------

class DotStim {
  constructor(canvas, direction) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext("2d");
    this.dirDeg = direction === "esquerda" ? 180 : 0;
    this.radius = FIELD_RADIUS;
    this.dots   = [];
    this._init();
  }

  _init() {
    for (let i = 0; i < N_DOTS; i++) {
      this.dots.push(this._newDot(i));
    }
  }

  _newDot(idx) {
    const angle = Math.random() * 2 * Math.PI;
    const r     = Math.sqrt(Math.random()) * this.radius;
    return {
      x:        r * Math.cos(angle),
      y:        r * Math.sin(angle),
      // lifeMs escalonado aleatoriamente para evitar reinícios síncronos
      lifeMs:   Math.random() * DOT_LIFE_MS,
      coherent: idx < Math.round(N_DOTS * COHERENCE),
      noiseDeg: _randCardinal(),
    };
  }

  _moveDot(dot, deltaMs) {
    dot.lifeMs += deltaMs;

    // Expirou dotLife → teleporta para posição aleatória no campo
    if (dot.lifeMs >= DOT_LIFE_MS) {
      const angle   = Math.random() * 2 * Math.PI;
      const r       = Math.sqrt(Math.random()) * this.radius;
      dot.x         = r * Math.cos(angle);
      dot.y         = r * Math.sin(angle);
      dot.lifeMs    = 0;
      dot.noiseDeg  = _randCardinal();
      return;
    }

    // Pontos de ruído têm direção CARDINAL fixa (0°/90°/180°/270°) durante
    // toda a sua vida → movimento exclusivamente horizontal ou vertical.
    // Sorteiam nova direção apenas quando expiram ou saem do campo.
    const moveRad = dot.coherent
      ? (this.dirDeg   * Math.PI) / 180
      : (dot.noiseDeg  * Math.PI) / 180;

    const move = DOT_SPEED_PS * (deltaMs / 1000);  // px neste frame
    dot.x += move * Math.cos(moveRad);
    dot.y += move * Math.sin(moveRad);

    // Saiu do campo circular → teleporta
    if (dot.x * dot.x + dot.y * dot.y > this.radius * this.radius) {
      const angle  = Math.random() * 2 * Math.PI;
      const r      = Math.sqrt(Math.random()) * this.radius;
      dot.x        = r * Math.cos(angle);
      dot.y        = r * Math.sin(angle);
      dot.lifeMs   = 0;
      dot.noiseDeg = _randCardinal();
    }
  }

  // deltaMs: tempo desde o frame anterior (capped em 50ms para evitar
  // saltos grandes se a aba ficou em background)
  drawFrame(deltaMs) {
    const dt = Math.min(deltaMs, 50);

    const { canvas, ctx, radius } = this;
    const cx = canvas.width  / 2;
    const cy = canvas.height / 2;

    // Limpa o canvas inteiro — sem transform, coordenadas físicas diretas.
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = "#fff";
    for (const dot of this.dots) {
      this._moveDot(dot, dt);
      ctx.beginPath();
      ctx.arc(cx + dot.x, cy + dot.y, DOT_SIZE, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Apresentação animada do DotStim
// ---------------------------------------------------------------------------
function presentDots(container, direction, durationMs) {
  return new Promise((resolve) => {
    clearContainer(container);
    container.style.position = "relative";

    const dpr  = window.devicePixelRatio || 1;
    const size = FIELD_RADIUS * 2 + 40;   // campo (350px @1080p) + margem

    const canvas = document.createElement("canvas");
    canvas.width  = size;
    canvas.height = size;
    canvas.style.cssText = `
      width: ${size}px; height: ${size}px;
      position: absolute; left: 50%; top: 50%;
      transform: translate(-50%, -50%);
      border: none; outline: none;
    `;
    const ctx = canvas.getContext("2d");
    container.appendChild(canvas);

    const stim  = new DotStim(canvas, direction);
    const t0    = performance.now();
    let animId  = null;
    let lastTs  = null;

    // Loop time-based: passa deltaMs para o DotStim normalizar velocidade
    // Throttle a 60fps fixo — em monitores de 120/144Hz o rAF dispara mais vezes,
    // mas só renderizamos a cada ~16.67ms. Isso garante que o passo por frame
    // é sempre o mesmo (6.7px @400px/s), evitando rastro em displays de alta taxa.
    const FRAME_MS = 1000 / 60;
    let lastRender = null;

    const loop = (ts) => {
      const elapsed = lastRender !== null ? ts - lastRender : FRAME_MS;

      if (elapsed >= FRAME_MS) {
        stim.drawFrame(Math.min(elapsed, 50));
        lastRender = ts - (elapsed % FRAME_MS); // mantém alinhamento ao grid de 60fps
      }

      if (performance.now() - t0 < durationMs) {
        animId = requestAnimationFrame(loop);
      } else {
        cancelAnimationFrame(animId);
        resolve();
      }
    };
    animId = requestAnimationFrame(loop);
  });
}

// ---------------------------------------------------------------------------
// Trial
// ---------------------------------------------------------------------------
async function runTrial(container, direction, trialIdx, total, fase) {
  const correctResp = direction === "esquerda" ? "arrowleft" : "arrowright";

  showProgressBar(container, trialIdx, total);

  // Apresenta dots animados
  await presentDots(container, direction, STIM_DURATION_MS);

  // Limpa e aguarda resposta
  clearContainer(container);
  container.style.position = "relative";
  showProgressBar(container, trialIdx, total);

  showTouchHint(container);
  const { key, rt_ms } = await waitForResponse(["arrowleft", "arrowright"], RESPONSE_WIN_MS);
  hideTouchHint(container);

  const acerto_erro =
    key === null        ? "sem_resposta" :
    key === correctResp ? "acerto"       : "erro";

  return {
    fase, trial: trialIdx,
    direcao_estimulo: direction, stimulus: direction,
    resposta: key ?? "sem_resposta",
    resposta_correta: correctResp,
    acerto_erro, tempo_resposta: rt_ms,
  };
}

// ---------------------------------------------------------------------------
// Sequência
// ---------------------------------------------------------------------------
async function runSequence(container, seq, fase, feedback) {
  const results = [];
  for (let i = 0; i < seq.length; i++) {
    const trial = await runTrial(container, seq[i], i + 1, seq.length, fase);
    results.push(trial);
    if ((i + 1) % PAUSE_INTERVAL === 0 && i + 1 < seq.length) {
      await showPause(container);
    }
    if (feedback) await showFeedback(container, trial.acerto_erro);
    await showBlank(container, ISI_MS);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Entrada pública
// ---------------------------------------------------------------------------
export async function runMotionTask(container) {
  await showInstructions(container, [
    `<p style="font-size:1.1rem">Esta é uma atividade sobre <strong>percepção visual de movimento</strong>.</p>
     <p style="color:#aaa;margin-top:1rem;font-size:0.95rem">
       Mantenha o olhar no centro da tela durante toda a tarefa.<br>
       Se sentir qualquer desconforto, fique à vontade para contatar o pesquisador.
     </p>
     <p style="color:#555;margin-top:2rem;font-size:0.8rem">Pressione qualquer tecla para continuar</p>`,

    `<p>Faremos alguns exercícios de <strong>treino</strong>.</p>
     <p style="color:#aaa;margin-top:1rem;font-size:0.95rem">
       No treino, aparecerão mensagens de
       <span style="color:#22c55e">Certo</span> ou
       <span style="color:#ef4444">Errado</span>.
     </p>
     <p style="color:#555;margin-top:2rem;font-size:0.8rem">Pressione qualquer tecla para continuar</p>`,

    `<p>Você verá pontos se movendo na tela.</p>
     <br>
     <p style="color:#ccc;font-size:1rem;line-height:2.2">
       <kbd style="background:#222;padding:6px 14px;border-radius:4px;font-size:1.3rem">←</kbd>
       → pontos movendo para a <strong>ESQUERDA</strong> ←<br>
       <kbd style="background:#222;padding:6px 14px;border-radius:4px;font-size:1.3rem">→</kbd>
       → pontos movendo para a <strong>DIREITA</strong> →
     </p>
     <p style="color:#555;margin-top:2rem;font-size:0.8rem">Pressione qualquer tecla para iniciar</p>`,
  ]);

  const seqPractice = pseudorandomizeMaxRun(balancedSequence(PRACTICE_TRIALS, LABELS), 3);
  const seqMain     = pseudorandomizeMaxRun(balancedSequence(MAIN_TRIALS, LABELS), 3);

  const practiceResults = await runSequence(container, seqPractice, "treino", true);

  await showText(container,
    `<p>Muito bem! Você finalizou o <strong>treinamento</strong>.</p>
     <p style="color:#aaa;margin-top:1rem;font-size:0.95rem">
       Agora vamos iniciar a parte principal.<br>
       <strong>Não haverá mensagens de acerto ou erro.</strong><br>
       Responda com atenção e precisão.
     </p>
     <p style="color:#555;margin-top:2rem;font-size:0.8rem">Pressione qualquer tecla para continuar</p>`,
    true
  );

  const mainResults = await runSequence(container, seqMain, "principal", false);

  await showCompletion(container);
  return calcMetrics([...practiceResults, ...mainResults]);
}

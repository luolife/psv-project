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

// DotStim params — espelho do Python
const N_DOTS       = 300;
const DOT_SIZE     = 2;      // pixels — menor para telas de alta resolução
const DOT_SPEED    = 6;      // pixels por frame (+20% sobre original)
const DOT_LIFE     = 60;     // frames
const COHERENCE    = 0.4;    // 40% dos dots coerentes

const LABELS = ["esquerda", "direita"];

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
    this.canvas  = canvas;
    this.ctx     = canvas.getContext("2d");
    this.dir     = direction;   // "esquerda" | "direita"
    this.dirDeg  = direction === "esquerda" ? 180 : 0;
    const FIELD_SIZE = Math.min(window.innerWidth, window.innerHeight) * 0.50 | 0;
    this.fieldSize = FIELD_SIZE;
    this.radius  = FIELD_SIZE / 2;
    this.dots    = [];
    this.frame   = 0;
    this._init();
  }

  _init() {
    for (let i = 0; i < N_DOTS; i++) {
      this.dots.push(this._newDot(i));
    }
  }

  _newDot(idx) {
    // Posição aleatória dentro do campo circular
    const angle = Math.random() * 2 * Math.PI;
    const r     = Math.sqrt(Math.random()) * this.radius;
    const isCoherent = idx < Math.round(N_DOTS * COHERENCE);
    return {
      x:    r * Math.cos(angle),
      y:    r * Math.sin(angle),
      life: Math.floor(Math.random() * DOT_LIFE),
      coherent: isCoherent,
      // Direção aleatória para pontos incoerentes
      noiseDeg: Math.random() * 360,
    };
  }

  _moveDot(dot) {
    dot.life++;

    // Reset após dotLife frames
    if (dot.life > DOT_LIFE) {
      const angle = Math.random() * 2 * Math.PI;
      const r     = Math.sqrt(Math.random()) * this.radius;
      dot.x    = r * Math.cos(angle);
      dot.y    = r * Math.sin(angle);
      dot.life = 0;
      dot.noiseDeg = Math.random() * 360;
      return;
    }

    const moveDeg = dot.coherent ? this.dirDeg : dot.noiseDeg;
    const moveRad = (moveDeg * Math.PI) / 180;
    dot.x += DOT_SPEED * Math.cos(moveRad);
    dot.y += DOT_SPEED * Math.sin(moveRad);  // Y positivo = baixo em canvas

    // Se saiu do campo circular, reinicia
    const dist = Math.sqrt(dot.x * dot.x + dot.y * dot.y);
    if (dist > this.radius) {
      const angle  = Math.random() * 2 * Math.PI;
      const r      = Math.sqrt(Math.random()) * this.radius;
      dot.x    = r * Math.cos(angle);
      dot.y    = r * Math.sin(angle);
      dot.life = 0;
      dot.noiseDeg = Math.random() * 360;
    }
  }

  drawFrame() {
    const { canvas, ctx, radius } = this;
    const dpr = window.devicePixelRatio || 1;
    const cx = canvas.width  / 2;
    const cy = canvas.height / 2;

    // Fundo preto
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clip circular
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // Desenha pontos como círculos suaves
    ctx.fillStyle = "#fff";
    const dotR = Math.max(1, DOT_SIZE * dpr / 2);
    for (const dot of this.dots) {
      this._moveDot(dot);
      ctx.beginPath();
      ctx.arc(
        cx + dot.x,
        cy + dot.y,
        dotR, 0, Math.PI * 2
      );
      ctx.fill();
    }
    ctx.restore();
    this.frame++;
  }
}

// ---------------------------------------------------------------------------
// Apresentação animada do DotStim
// ---------------------------------------------------------------------------
function presentDots(container, direction, durationMs) {
  return new Promise((resolve) => {
    clearContainer(container);
    container.style.position = "relative";

    const canvas = document.createElement("canvas");
    const dpr    = window.devicePixelRatio || 1;
    const FIELD_SIZE = Math.min(window.innerWidth, window.innerHeight) * 0.50 | 0;
    const size   = FIELD_SIZE + 40;
    // Escala o canvas pelos pixels físicos da tela (resolve pixelação)
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width  = size + "px";
    canvas.style.height = size + "px";
    canvas.style.cssText += `
      position: absolute; left: 50%; top: 50%;
      transform: translate(-50%, -50%);
    `;
    // Escala o contexto para compensar o DPR
    const ctxScale = canvas.getContext("2d");
    ctxScale.scale(dpr, dpr);
    container.appendChild(canvas);

    const stim  = new DotStim(canvas, direction);
    const t0    = performance.now();
    let animId  = null;

    const loop = () => {
      stim.drawFrame();
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
  const correctResp = direction === "esquerda" ? "f" : "j";

  showProgressBar(container, trialIdx, total);

  // Apresenta dots animados
  await presentDots(container, direction, STIM_DURATION_MS);

  // Limpa e aguarda resposta
  clearContainer(container);
  container.style.position = "relative";
  showProgressBar(container, trialIdx, total);

  showTouchHint(container);
  const { key, rt_ms } = await waitForResponse(["f", "j"], RESPONSE_WIN_MS);
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
       <kbd style="background:#222;padding:3px 10px;border-radius:4px;font-family:monospace">F</kbd>
       → pontos movendo para a <strong>ESQUERDA</strong> ←<br>
       <kbd style="background:#222;padding:3px 10px;border-radius:4px;font-family:monospace">J</kbd>
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

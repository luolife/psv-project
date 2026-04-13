// frontend/src/tasks/contrast.js
//
// Equivalente exato de: visual.GratingStim(tex="sin", mask="gauss", sf=0.05, opacity=contrast, size=100)
//
// - size=100px fixo
// - sf=0.05 cycles/pixel fixo
// - mask="gauss" fixa — define a forma circular com bordas suaves
// - opacity=contrast — APENAS a opacidade muda entre trials

import {
  balancedSequence, pseudorandomizeMaxRun,
  clearContainer, showText, showBlank, showFeedback,
  showPause, showProgressBar, showInstructions, showCompletion,
  waitForResponse, showTouchHint, hideTouchHint, calcMetrics, delay,
} from "./_engine.js";

const PRACTICE_TRIALS  = 10;
const MAIN_TRIALS      = 80;
const CONTRAST_LEVELS  = [0.09, 0.16, 0.28, 0.51, 0.90];  // log ~0.25 steps a partir de 0.09
const STIM_DURATION_MS = 800;
const RESPONSE_WIN_MS  = 2000;
const ISI_MS           = 800;
const PAUSE_INTERVAL   = 40;

// Parâmetros fixos do GratingStim — não mudam entre trials
// size=100px foi definido para 1920×1080. Escala proporcionalmente à tela atual.
const STIM_SIZE = Math.round(Math.min(window.innerWidth, window.innerHeight) * (100 / 1080));
const SF        = 0.05;  // cycles/pixel — sf=0.05 do PsychoPy

// Randomização balanceada: 40 sem estímulo + 8 por nível = 80 total
function buildBalancedLabels() {
  const labels = [];
  for (const c of CONTRAST_LEVELS) {
    for (let i = 0; i < 8; i++) labels.push(`contraste_${c}`);
  }
  for (let i = 0; i < 40; i++) labels.push("nenhum_estimulo");
  return labels;
}
const LABELS = buildBalancedLabels();

// ---------------------------------------------------------------------------
// Pré-computa a máscara gaussiana UMA VEZ — é fixa para todos os trials
// Equivalente ao mask="gauss" do PsychoPy
// ---------------------------------------------------------------------------
const GAUSS_MASK = (() => {
  const size  = STIM_SIZE;
  const cx    = size / 2;
  const cy    = size / 2;
  const sigma = size / 4;  // contorno circular mais suave nos cantos
  const mask  = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      mask[y * size + x] = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
    }
  }
  return mask;
})();

// Pré-computa o grating senoidal UMA VEZ — é fixo para todos os trials
// Equivalente ao tex="sin", sf=0.05 do PsychoPy
const SINE_GRATING = (() => {
  const size = STIM_SIZE;
  const g    = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Cosseno centrado: cos(0)=1 → pico brilhante exatamente no centro,
      // padrão simétrico com picos em cx±20px e cx±40px (5 listras).
      // sin(0)=0 colocaria o centro numa transição cinza → assimétrico.
      g[y * size + x] = Math.cos(2 * Math.PI * SF * (x - size / 2));
    }
  }
  return g;
})();

// ---------------------------------------------------------------------------
// Cria canvas com opacity=contrast — igual ao PsychoPy
// Grating e máscara são fixos; só opacity (contrast) varia
// ---------------------------------------------------------------------------
function createGratingCanvas(contrast) {
  const size   = STIM_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width  = size;
  canvas.height = size;

  const ctx       = canvas.getContext("2d");
  const imageData = ctx.createImageData(size, size);
  const data      = imageData.data;

  for (let i = 0; i < size * size; i++) {
    const sine  = SINE_GRATING[i];   // -1 a +1
    const gauss = GAUSS_MASK[i];     // 0 a 1

    // PsychoPy: pixel = (sine * contrast * gauss + 1) / 2 × 255
    // → fundo médio cinza (127) quando gauss=0 e sine=0
    // → mas com fundo preto (opacity sobre preto), resultado é:
    // pixel_rgb = (sine + 1) / 2 × 255   (grating completo)
    // pixel_alpha = gauss × contrast × 255  (opacidade controlada por contrast e gauss)
    const rgb   = Math.round((sine + 1) / 2 * 255);
    const alpha = Math.round(gauss * contrast * 255);

    data[i * 4]     = rgb;
    data[i * 4 + 1] = rgb;
    data[i * 4 + 2] = rgb;
    data[i * 4 + 3] = alpha;
  }

  ctx.putImageData(imageData, 0, 0);

  canvas.style.cssText = `
    position: absolute; left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    image-rendering: pixelated;
  `;
  return canvas;
}

// ---------------------------------------------------------------------------
// Trial
// ---------------------------------------------------------------------------
async function runTrial(container, condition, trialIdx, total, fase) {
  const hasStim     = condition !== "nenhum_estimulo";
  const contrast    = hasStim ? parseFloat(condition.split("_")[1]) : null;
  const correctResp = hasStim ? "arrowleft" : "arrowright";

  clearContainer(container);
  container.style.position = "relative";
  showProgressBar(container, trialIdx, total);

  if (hasStim) container.appendChild(createGratingCanvas(contrast));
  await delay(STIM_DURATION_MS);

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
    condicao: condition, stimulus: condition,
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
export async function runContrastTask(container) {
  await showInstructions(container, [
    `<p style="font-size:1.1rem">Esta é uma atividade sobre <strong>percepção visual de contraste</strong>.</p>
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

    `<p>Durante o teste, olhe para o <strong>centro da tela</strong>.</p>
     <br>
     <p style="color:#ccc;font-size:1rem;line-height:2.2">
       <kbd style="background:#222;padding:6px 14px;border-radius:4px;font-size:1.3rem">←</kbd>
       → se <strong>enxergar</strong> o estímulo<br>
       <kbd style="background:#222;padding:6px 14px;border-radius:4px;font-size:1.3rem">→</kbd>
       → se <strong>não enxergar nada</strong>
     </p>
     <p style="color:#555;margin-top:2rem;font-size:0.8rem">Pressione qualquer tecla para iniciar</p>`,
  ]);

  const seqPractice = pseudorandomizeMaxRun(balancedSequence(PRACTICE_TRIALS, [
    ...CONTRAST_LEVELS.map(c => `contraste_${c}`), "nenhum_estimulo"
  ]), 3);

  const seqMain = pseudorandomizeMaxRun(
    [...LABELS].sort(() => Math.random() - 0.5), 3
  );

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

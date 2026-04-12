// frontend/src/tasks/contrast.js
//
// Contrast Sensitivity Task
//
// Estímulo: grating senoidal retangular, sem máscara
// Contraste controla a luminância do padrão (quanto se destaca do fundo preto)
// Níveis: [0.05, 0.08, 0.16, 0.32, 0.64]
// ← = detectou | → = não detectou nada

import {
  balancedSequence, pseudorandomizeMaxRun,
  clearContainer, showText, showBlank, showFeedback,
  showPause, showProgressBar, showInstructions, showCompletion,
  waitForResponse, showTouchHint, hideTouchHint, calcMetrics, delay,
} from "./_engine.js";

const PRACTICE_TRIALS  = 10;
const MAIN_TRIALS      = 80;
const CONTRAST_LEVELS  = [0.05, 0.08, 0.16, 0.32, 0.64];
const SF               = 0.05;   // cycles/pixel
const STIM_DURATION_MS = 800;
const RESPONSE_WIN_MS  = 2000;
const ISI_MS           = 800;
const PAUSE_INTERVAL   = 40;

// ~5% da largura x ~8% da altura da tela
function calcStimSize() {
  return {
    w: Math.round(window.innerWidth  * 0.05),
    h: Math.round(window.innerHeight * 0.08),
  };
}

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
// Grating senoidal com gaussiana suave nas bordas
//
// A gaussiana é FIXA — só suaviza as bordas visualmente
// O que varia entre trials é APENAS o contraste (luminância)
//
// pixel = contrast × gauss_borda × (0.5 + 0.5 × sin) × 255
//
// - Contraste 0.05 → pico ~13/255 → quase invisível
// - Contraste 0.64 → pico ~163/255 → bem visível
// - gauss_borda = 1 no centro, decai suavemente só nas bordas
// ---------------------------------------------------------------------------
function createGratingCanvas(contrast) {
  const stim   = calcStimSize();
  // Canvas um pouco maior para a borda suave ter espaço
  const pad    = Math.round(Math.min(stim.w, stim.h) * 0.5);
  const w      = stim.w + pad * 2;
  const h      = stim.h + pad * 2;

  const canvas  = document.createElement("canvas");
  canvas.width  = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  const imageData = ctx.createImageData(w, h);
  const data      = imageData.data;
  const cx        = w / 2;
  const cy        = h / 2;
  // Sigma grande — gaussiana plana no centro, decai só nas bordas
  const sigmaX    = stim.w / 1.5;
  const sigmaY    = stim.h / 1.5;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx    = x - cx;
      const dy    = y - cy;
      // Gaussiana elíptica: plana no centro, suaviza só as bordas
      const gauss = Math.exp(-(dx * dx) / (2 * sigmaX * sigmaX)
                             -(dy * dy) / (2 * sigmaY * sigmaY));
      const sine  = Math.sin(2 * Math.PI * SF * x);
      const val   = Math.round(contrast * gauss * (0.5 + 0.5 * sine) * 255);
      const idx   = (y * w + x) * 4;
      data[idx]     = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
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

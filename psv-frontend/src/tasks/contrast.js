// frontend/src/tasks/contrast.js
//
// Contrast Sensitivity Task
// Equivalente direto de: Task - Contraste (1).py
//
// Paradigma:
//   Estímulo: grating senoidal com envelope gaussiano (GratingStim)
//   Contrastes: [0.05, 0.08, 0.16, 0.32, 0.64] + trials sem estímulo
//   F = detectou estímulo | J = não detectou nada
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
const CONTRAST_LEVELS  = [0.05, 0.08, 0.16, 0.32, 0.64];
const STIM_DURATION_MS = 800;
const RESPONSE_WIN_MS  = 2000;
const ISI_MS           = 800;
const PAUSE_INTERVAL   = 40;

// Tamanho do estímulo: ~5% da largura x ~8% da altura da tela
function calcStimSize() {
  return {
    w: Math.round(window.innerWidth  * 0.05),
    h: Math.round(window.innerHeight * 0.08),
  };
}
const SF               = 0.05;  // cycles/pixel — espelho do PsychoPy sf=0.05

// Randomização balanceada:
// 40 trials sem estímulo + 8 trials por nível de contraste (5×8=40) = 80 total
// Isso garante proporção igual entre presença/ausência e entre níveis
function buildBalancedLabels() {
  const labels = [];
  // 8 de cada contraste
  for (const c of CONTRAST_LEVELS) {
    for (let i = 0; i < 8; i++) labels.push(`contraste_${c}`);
  }
  // 40 sem estímulo
  for (let i = 0; i < 40; i++) labels.push("nenhum_estimulo");
  return labels;
}
const LABELS = buildBalancedLabels();

// ---------------------------------------------------------------------------
// Grating senoidal + envelope gaussiano via Canvas 2D
// Equivalente: visual.GratingStim(tex="sin", mask="gauss", sf=0.05, size=100)
// ---------------------------------------------------------------------------
function createGratingCanvas(contrast) {
  const stim   = calcStimSize();
  // Canvas 2x para o envelope gaussiano ter espaço nas bordas
  const w      = stim.w * 2;
  const h      = stim.h * 2;
  const canvas = document.createElement("canvas");
  canvas.width  = w;
  canvas.height = h;
  const ctx    = canvas.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  const imageData = ctx.createImageData(w, h);
  const data   = imageData.data;
  const cx     = w / 2;
  const cy     = h / 2;
  // Sigma baseado na menor dimensão do estímulo
  const sigma  = Math.min(stim.w, stim.h) / 3;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx    = x - cx;
      const dy    = y - cy;
      const gauss = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      const sine  = Math.sin(2 * Math.PI * SF * dx);
      // Centro: grating senoidal em cinza médio modulado pelo contraste
      // Bordas: gauss→0, pixel→preto (funde com fundo)
      // Fórmula correta do GratingStim do PsychoPy:
      // pixel = background + contrast * sine * gaussian_mask
      // background = 0 (preto), então:
      // pixel = contrast * sine * gauss → varia de -contrast*gauss a +contrast*gauss
      // Mapeado para 0-255: 128 + contrast * sine * gauss * 128
      const val = Math.round(128 + contrast * sine * gauss * 128);
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
    background: transparent;
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

  // Apresenta estímulo ou tela preta
  clearContainer(container);
  container.style.position = "relative";
  showProgressBar(container, trialIdx, total);

  if (hasStim) {
    container.appendChild(createGratingCanvas(contrast));
  }
  await delay(STIM_DURATION_MS);

  // Limpa e aguarda resposta
  clearContainer(container);
  container.style.position = "relative";
  showProgressBar(container, trialIdx, total);

  showTouchHint(container);
  const { key, rt_ms } = await waitForResponse(["arrowleft", "arrowright"], RESPONSE_WIN_MS);
  hideTouchHint(container);

  const acerto_erro =
    key === null          ? "sem_resposta" :
    key === correctResp   ? "acerto"       : "erro";

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

  // Treino: balanceado simples com os labels disponíveis
  const seqPractice = pseudorandomizeMaxRun(balancedSequence(PRACTICE_TRIALS, [
    ...CONTRAST_LEVELS.map(c => `contraste_${c}`), "nenhum_estimulo"
  ]), 3);
  // Principal: usa a lista pré-balanceada (40 sem + 8 de cada contraste) embaralhada
  const seqMain = pseudorandomizeMaxRun([...LABELS].sort(() => Math.random() - 0.5), 3);

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

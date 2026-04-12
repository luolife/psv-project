// frontend/src/tasks/gabor.js
//
// Gabor Patch Discrimination Task
// Equivalente direto de: Task - Gabor (1).py
//
// Paradigma:
//   Estímulo: GratingStim orientado a -45° (esquerda) ou +45° (direita)
//   F = inclinado para ESQUERDA | J = inclinado para DIREITA
//   Prática: 10 trials com feedback | Principal: 80 trials sem feedback
//   Pausa automática a cada 40 trials

import {
  balancedSequence, pseudorandomizeMaxRun,
  clearContainer, showText, showBlank, showFeedback,
  showPause, showProgressBar, showInstructions, showCompletion,
  waitForResponse, calcMetrics, delay,
} from "./_engine.js";

// ---------------------------------------------------------------------------
// Parâmetros — espelho exato do Python
// ---------------------------------------------------------------------------
const PRACTICE_TRIALS  = 10;
const MAIN_TRIALS      = 80;
const STIM_DURATION_MS = 300;   // 0.3s — idêntico ao Python
const RESPONSE_WIN_MS  = 2500;  // 2.5s
const ISI_MS           = 800;
const PAUSE_INTERVAL   = 40;
const STIM_SIZE_PX     = 200;   // equivalente ao gabor_size=150 em pix do PsychoPy
const SF               = 0.05;  // gabor_sf=0.05
const CONTRAST         = 1.0;   // gabor_contrast=1.0

const LABELS = ["esquerda", "direita"];

// ---------------------------------------------------------------------------
// Grating orientado + envelope gaussiano via Canvas 2D
// Equivalente: visual.GratingStim(tex="sin", mask="gauss", ori=angle, contrast=1.0)
// ori=-45 → esquerda, ori=+45 → direita
// ---------------------------------------------------------------------------
function createGaborCanvas(direction) {
  const angleDeg = direction === "esquerda" ? -45 : 45;
  const angleRad = (angleDeg * Math.PI) / 180;
  const size     = STIM_SIZE_PX;
  const canvas   = document.createElement("canvas");
  canvas.width   = size;
  canvas.height  = size;
  const ctx      = canvas.getContext("2d");
  const imageData = ctx.createImageData(size, size);
  const data     = imageData.data;
  const cx       = size / 2;
  const cy       = size / 2;
  const sigma    = size / 6;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;

      // Envelope gaussiano
      const gauss = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));

      // Componente ao longo da orientação (rotação do grating)
      const xRot = dx * Math.cos(angleRad) + dy * Math.sin(angleRad);
      const sine  = Math.sin(2 * Math.PI * SF * xRot);

      const val = Math.round(128 + CONTRAST * gauss * sine * 128);
      const idx = (y * size + x) * 4;
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
async function runTrial(container, direction, trialIdx, total, fase) {
  const correctResp = direction === "esquerda" ? "f" : "j";

  // Apresenta Gabor
  clearContainer(container);
  container.style.position = "relative";
  showProgressBar(container, trialIdx, total);
  container.appendChild(createGaborCanvas(direction));
  await delay(STIM_DURATION_MS);

  // Limpa e aguarda resposta
  clearContainer(container);
  container.style.position = "relative";
  showProgressBar(container, trialIdx, total);

  const { key, rt_ms } = await waitForResponse(["f", "j"], RESPONSE_WIN_MS);

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
export async function runGaborTask(container) {
  await showInstructions(container, [
    `<p style="font-size:1.1rem">Esta é uma atividade sobre <strong>percepção visual de orientação</strong>.</p>
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

    `<p>Você verá padrões de listras inclinadas.</p>
     <br>
     <p style="color:#ccc;font-size:1rem;line-height:2.2">
       <kbd style="background:#222;padding:3px 10px;border-radius:4px;font-family:monospace">F</kbd>
       → listras inclinadas para a <strong>ESQUERDA</strong> (╲)<br>
       <kbd style="background:#222;padding:3px 10px;border-radius:4px;font-family:monospace">J</kbd>
       → listras inclinadas para a <strong>DIREITA</strong> (╱)
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

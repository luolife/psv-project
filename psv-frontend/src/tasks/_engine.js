// frontend/src/tasks/_engine.js
//
// Motor compartilhado por todas as três tasks.
// Implementa: sequenciamento balanceado, pseudorandomização,
// apresentação de telas de texto, coleta de resposta com RT,
// feedback de treino, pausa automática e estrutura de resultado.

// ---------------------------------------------------------------------------
// Sequenciamento — equivalente ao Python
// ---------------------------------------------------------------------------

export function balancedSequence(nTrials, labels) {
  const per = Math.floor(nTrials / labels.length);
  let seq = [];
  for (const lab of labels) {
    for (let i = 0; i < per; i++) seq.push(lab);
  }
  const remaining = nTrials - seq.length;
  for (let i = 0; i < remaining; i++) {
    seq.push(labels[i % labels.length]);
  }
  return shuffle(seq);
}

export function pseudorandomizeMaxRun(seq, maxRun = 3, maxAttempts = 2000) {
  let arr = [...seq];
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let ok = true;
    let run = 1;
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] === arr[i - 1]) {
        run++;
        if (run > maxRun) { ok = false; break; }
      } else {
        run = 1;
      }
    }
    if (ok) return arr;
    arr = shuffle([...arr]);
  }
  return arr;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------------------------------------------------------------------------
// Primitivas de UI
// ---------------------------------------------------------------------------

export function clearContainer(container) {
  container.innerHTML = "";
  container.style.cssText = `
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; background: #000; color: #fff;
    width: 100%; height: 100%; font-family: 'DM Sans', sans-serif;
    user-select: none; overflow: hidden;
  `;
}

export function showText(container, html, waitForKey = true) {
  clearContainer(container);
  const div = document.createElement("div");
  div.style.cssText = `
    max-width: 640px; text-align: center; line-height: 1.7;
    font-size: 1.1rem; color: #fff; padding: 2rem;
  `;
  div.innerHTML = html;
  container.appendChild(div);

  if (!waitForKey) return Promise.resolve();

  return new Promise((resolve) => {
    const handler = (e) => {
      // Ignora teclas modificadoras e Escape
      if (["Shift","Control","Alt","Meta"].includes(e.key)) return;
      document.removeEventListener("keydown", handler);
      resolve(e.key);
    };
    setTimeout(() => document.addEventListener("keydown", handler), 300);
  });
}

export function showTextTimed(container, html, durationMs) {
  clearContainer(container);
  const div = document.createElement("div");
  div.style.cssText = `
    max-width: 640px; text-align: center; line-height: 1.7;
    font-size: 1.3rem; color: #fff; padding: 2rem;
  `;
  div.innerHTML = html;
  container.appendChild(div);
  return delay(durationMs);
}

export function showFixation(container, durationMs = 500) {
  clearContainer(container);
  const cross = document.createElement("div");
  cross.style.cssText = `
    font-size: 2.5rem; color: #666; line-height: 1;
  `;
  cross.textContent = "+";
  container.appendChild(cross);
  return delay(durationMs);
}

export function showBlank(container, durationMs) {
  clearContainer(container);
  return delay(durationMs);
}

// ---------------------------------------------------------------------------
// Coleta de resposta com RT
// ---------------------------------------------------------------------------

export function waitForResponse(validKeys, timeoutMs) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    let resolved = false;

    const timeout = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      document.removeEventListener("keydown", handler);
      resolve({ key: null, rt_ms: null }); // omissão
    }, timeoutMs);

    const handler = (e) => {
      if (!validKeys.includes(e.key.toLowerCase())) return;
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      document.removeEventListener("keydown", handler);
      resolve({
        key: e.key.toLowerCase(),
        rt_ms: Math.round(performance.now() - t0),
      });
    };

    document.addEventListener("keydown", handler);
  });
}

// ---------------------------------------------------------------------------
// Feedback de treino
// ---------------------------------------------------------------------------

export async function showFeedback(container, outcome, durationMs = 800) {
  const map = {
    acerto:       { text: "Certo",         color: "#22c55e" },
    erro:         { text: "Errado",        color: "#ef4444" },
    sem_resposta: { text: "Sem resposta",  color: "#f59e0b" },
  };
  const { text, color } = map[outcome] || { text: "", color: "#fff" };
  clearContainer(container);
  const div = document.createElement("div");
  div.style.cssText = `font-size: 1.6rem; font-weight: 600; color: ${color};`;
  div.textContent = text;
  container.appendChild(div);
  await delay(durationMs);
}

// ---------------------------------------------------------------------------
// Pausa automática
// ---------------------------------------------------------------------------

export async function showPause(container) {
  await showText(
    container,
    `<p style="font-size:1.1rem; color:#aaa;">
      Você chegou até a metade. Ótimo trabalho!<br><br>
      Respire, relaxe um pouco e pressione qualquer tecla para continuarmos.
    </p>`,
    true
  );
}

// ---------------------------------------------------------------------------
// Barra de progresso
// ---------------------------------------------------------------------------

export function showProgressBar(container, current, total, label = "") {
  let bar = container.querySelector("#psv-progress");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "psv-progress";
    bar.style.cssText = `
      position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
      display: flex; align-items: center; gap: 10px;
    `;
    const fill = document.createElement("div");
    fill.id = "psv-progress-fill";
    fill.style.cssText = `
      width: 160px; height: 3px; background: #222; border-radius: 999px; overflow: hidden;
    `;
    const inner = document.createElement("div");
    inner.id = "psv-progress-inner";
    inner.style.cssText = `height: 100%; background: #2563A8; border-radius: 999px; transition: width 0.2s;`;
    fill.appendChild(inner);
    const txt = document.createElement("span");
    txt.id = "psv-progress-txt";
    txt.style.cssText = `font-size: 0.7rem; color: #444; font-family: monospace;`;
    bar.appendChild(fill);
    bar.appendChild(txt);
    container.style.position = "relative";
    container.appendChild(bar);
  }
  const pct = Math.round((current / total) * 100);
  const inner = container.querySelector("#psv-progress-inner");
  const txt   = container.querySelector("#psv-progress-txt");
  if (inner) inner.style.width = `${pct}%`;
  if (txt)   txt.textContent   = `${current}/${total}`;
}

// ---------------------------------------------------------------------------
// Telas padronizadas de instrução e encerramento
// ---------------------------------------------------------------------------

export async function showInstructions(container, lines) {
  for (const line of lines) {
    await showText(container, line, true);
  }
}

export async function showCompletion(container) {
  await showText(
    container,
    `<h2 style="font-size:1.6rem; margin-bottom:1rem;">✓ Tarefa concluída</h2>
     <p style="color:#aaa; font-size:0.95rem;">
       Parabéns! Seus dados foram registrados.<br>
       Aguarde o próximo passo.
     </p>`,
    false
  );
  await delay(2000);
}

// ---------------------------------------------------------------------------
// Cálculo de métricas — mesmo critério do Python
// ---------------------------------------------------------------------------

export function calcMetrics(trials) {
  // Apenas trials da fase principal
  const main = trials.filter((t) => t.fase === "principal");
  const hits      = main.filter((t) => t.acerto_erro === "acerto").length;
  const errors    = main.filter((t) => t.acerto_erro === "erro").length;
  const omissions = main.filter((t) => t.acerto_erro === "sem_resposta").length;
  const rts       = main.filter((t) => t.tempo_resposta !== null).map((t) => t.tempo_resposta);
  const mean_rt   = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : null;

  return {
    total_trials: main.length,
    hits,
    errors,
    omissions,
    mean_rt_ms: mean_rt,
    raw_trials: trials.map((t, i) => ({
      trial:    i,
      stimulus: t.stimulus ?? t.condicao ?? t.direcao_estimulo ?? "",
      response: t.resposta === "sem_resposta" ? null : t.resposta,
      correct:  t.acerto_erro === "acerto",
      rt_ms:    t.tempo_resposta,
      fase:     t.fase,
    })),
  };
}

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

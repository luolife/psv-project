// frontend/src/pages/Checklist.jsx
// Fluxo: Triagem Visual -> Recomendações Mínimas -> Tarefas
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import FlowSteps from "../components/FlowSteps";
import SiteFooter from "../components/SiteFooter";
import { checklistApi, sessionsApi } from "../api/client";

const YES_NO = [
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" },
];

const SCALE_OPTIONS = [
  { value: "0", label: "0", description: "Nunca" },
  { value: "1", label: "1", description: "Raramente" },
  { value: "2", label: "2", description: "Às vezes" },
  { value: "3", label: "3", description: "Frequentemente" },
  { value: "4", label: "4", description: "Sempre" },
];

const MINIMUM_ITEMS = [
  {
    id: "uses_correction",
    question: "Você utiliza óculos ou lentes corretivas no dia a dia?",
    options: YES_NO,
  },
  {
    id: "wearing_correction_now",
    question: "Caso utilize óculos ou lentes, você está usando sua correção visual habitual neste momento?",
    options: YES_NO,
  },
  {
    id: "visual_condition",
    question: "Você possui alguma condição visual ou oftalmológica que possa interferir na realização de tarefas em tela?",
    options: YES_NO,
  },
  {
    id: "visual_reaction_history",
    question: "Você já teve crises, convulsões ou reações importantes desencadeadas por luzes piscando, telas ou estímulos visuais intensos?",
    options: YES_NO,
  },
  {
    id: "current_discomfort",
    question: "Neste momento, você está com dor de cabeça intensa, tontura, náusea, sonolência importante ou desconforto visual que possa dificultar a realização das tarefas?",
    options: YES_NO,
  },
];

const SCREENING_BLOCKS = [
  {
    title: "Desconforto Visual Ambiental",
    items: [
      "Luzes fortes, como sol intenso, lâmpadas brancas ou iluminação muito clara, costumam causar desconforto em você?",
      "Reflexos em telas, vidros, pisos ou superfícies brilhantes costumam incomodar você?",
      "Mudanças rápidas de iluminação, como entrar em um ambiente muito claro ou muito escuro, causam desconforto ou dificuldade de adaptação visual?",
      "O brilho de telas, como computador, celular, televisão ou tablet, costuma causar cansaço visual, irritação ou necessidade de reduzir a luminosidade?",
    ],
  },
  {
    title: "Sobrecarga Visual Contextual",
    items: [
      "Ambientes com muitas informações visuais, como supermercados, shoppings, salas cheias ou locais movimentados, costumam ser cansativos para você?",
      "Quando há muitas cores, objetos, placas, luzes ou pessoas no mesmo ambiente, você sente dificuldade para manter a atenção?",
      "Em locais visualmente carregados, você sente vontade de sair, fazer pausa ou procurar um ambiente mais calmo?",
      "Após permanecer em ambientes com muitos estímulos visuais, você costuma sentir fadiga, irritação, ansiedade ou necessidade de ficar em local com menos estímulos?",
    ],
  },
  {
    title: "Contraste, Padrões e Organização Visual",
    items: [
      "Você sente dificuldade para perceber informações visuais com pouco contraste, como letras claras, objetos discretos ou diferenças sutis entre tons?",
      "Padrões repetitivos, como listras, grades, pisos geométricos, estampas ou fileiras muito próximas, causam incômodo, confusão visual ou desconforto?",
      "Quando há muitos detalhes no mesmo espaço, você sente dificuldade para localizar rapidamente o que precisa observar?",
      "A organização visual de páginas, telas, formulários, aplicativos ou ambientes muito cheios costuma dificultar sua compreensão ou localização de informações?",
    ],
  },
  {
    title: "Movimento Visual",
    items: [
      "Pessoas, objetos ou imagens em movimento no seu campo de visão dificultam sua concentração?",
      "Ambientes com muita movimentação, como corredores, filas, trânsito de pessoas ou locais públicos, costumam causar desconforto visual ou cansaço?",
      "Vídeos rápidos, rolagem de tela, animações, jogos ou mudanças visuais rápidas costumam incomodar você?",
      "Em ambientes movimentados, você sente dificuldade para acompanhar visualmente a direção ou a organização do movimento ao redor?",
    ],
  },
  {
    title: "Interesse, Atração ou Fixação por Estímulos Visuais",
    items: [
      "Detalhes visuais pequenos, como padrões, sombras, reflexos, linhas ou movimentos discretos, chamam muito sua atenção?",
      "Você costuma observar luzes, reflexos, sombras, objetos girando ou movimentos repetitivos por interesse ou prazer?",
      "Você sente vontade de se aproximar de telas, luzes, objetos ou padrões visuais para observar melhor os detalhes?",
      "Alguns estímulos visuais, como brilhos, movimentos, formas ou padrões, conseguem prender sua atenção por bastante tempo?",
    ],
  },
  {
    title: "Impacto Funcional da Experiência Visual",
    items: [
      "A sensibilidade visual interfere na sua permanência em ambientes de estudo, trabalho, atendimento ou convivência social?",
      "Você evita determinados lugares por causa da iluminação, excesso de estímulos visuais ou movimentação intensa?",
      "Quando sente desconforto visual, você precisa fazer pausas, reduzir estímulos, fechar os olhos, desviar o olhar ou sair do ambiente?",
      "O desconforto visual interfere na sua atenção, comunicação, desempenho em tarefas ou interação com outras pessoas?",
    ],
  },
];

const SCALE_ITEMS = SCREENING_BLOCKS.flatMap((block) => block.items);

function ChoiceGroup({ name, options, value, onChange, disabled = false }) {
  return (
    <div className="screening-choice-row">
      {options.map((option) => {
        const checked = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={`screening-choice ${checked ? "is-selected" : ""}`}
            onClick={() => onChange(option.value)}
            disabled={disabled}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function SectionTitle({ n, children }) {
  return (
    <div className="screening-question-title">
      <span className="screening-question-title__number">{n}</span>
      <span className="screening-question-title__text">
        {children}
      </span>
    </div>
  );
}

function ScaleQuestion({ number, question, value, onChange, disabled = false }) {
  return (
    <div className="screening-scale-item">
      <SectionTitle n={number}>{question}</SectionTitle>
      <div className="screening-scale-options" role="group" aria-label={`Resposta da pergunta ${number}`}>
        {SCALE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`scale-btn screening-scale-btn ${value === option.value ? "selected" : ""}`}
            onClick={() => onChange(option.value)}
            title={option.description}
            disabled={disabled}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ScaleGuide() {
  return (
    <div className="screening-scale-guide">
      <span className="about-card__label">Escala de Resposta</span>
      <div className="screening-scale-guide__items">
        {SCALE_OPTIONS.map((option) => (
          <span key={option.value}>
            <strong>{option.label}</strong>
            {option.description}
          </span>
        ))}
      </div>
    </div>
  );
}

function buildInitialScaleResponses() {
  return SCALE_ITEMS.reduce((responses, _item, index) => ({
    ...responses,
    [`q${index + 1}`]: "",
  }), {});
}

function buildInitialMinimumResponses() {
  return MINIMUM_ITEMS.reduce((values, item) => ({ ...values, [item.id]: "" }), {});
}

function buildEmptyScreening() {
  return {
    minimum: buildInitialMinimumResponses(),
    scale: buildInitialScaleResponses(),
    open_response: "",
  };
}

function parseMaybeJson(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function parseStoredScreening(rawResponses) {
  if (!rawResponses) return null;
  const parsedEntries = Object.values(rawResponses).map(parseMaybeJson);
  const direct = parseMaybeJson(rawResponses);
  const minimum = direct?.minimum
    || parsedEntries.find((entry) => entry?.minimum)?.minimum
    || null;
  const scale = direct?.scale
    || parsedEntries.find((entry) => entry?.scale)?.scale
    || null;
  const openResponse = direct?.open_response
    || parsedEntries.find((entry) => Object.prototype.hasOwnProperty.call(entry || {}, "open_response"))?.open_response
    || "";

  if (!minimum && !scale) return null;
  return {
    minimum: { ...buildInitialMinimumResponses(), ...(minimum || {}) },
    scale: { ...buildInitialScaleResponses(), ...(scale || {}) },
    open_response: openResponse,
  };
}

function buildChecklistPayload(screeningData) {
  return screeningData
    ? Object.fromEntries(Object.entries(screeningData).map(([key, value], index) => [
      index + 1,
      typeof value === "string" ? value : JSON.stringify({ [key]: value }),
    ]))
    : { 1: "triagem_concluida" };
}

function loadScreeningDraft(sessionId) {
  const saved = localStorage.getItem(`psv_screening_${sessionId}`);
  const parsed = saved ? parseMaybeJson(saved) : null;
  if (!parsed || typeof parsed !== "object") return null;
  return {
    minimum: { ...buildInitialMinimumResponses(), ...(parsed.minimum || {}) },
    scale: { ...buildInitialScaleResponses(), ...(parsed.scale || {}) },
    open_response: parsed.open_response || "",
  };
}

function VisualScreening({ onNext, onBack, initialData, onChange, locked = false, saving = false }) {
  const [data, setData] = useState(initialData || buildEmptyScreening());

  useEffect(() => {
    if (initialData) setData(initialData);
  }, [initialData]);

  useEffect(() => {
    onChange?.(data);
  }, [data, onChange]);

  const setMinimum = (field, value) => {
    if (locked) return;
    setData((current) => ({
      ...current,
      minimum: { ...current.minimum, [field]: value },
    }));
  };

  const setScale = (field, value) => {
    if (locked) return;
    setData((current) => ({
      ...current,
      scale: { ...current.scale, [field]: value },
    }));
  };

  const requiredFilled = () => (
    Object.values(data.minimum).every(Boolean)
    && Object.values(data.scale).every(Boolean)
  );

  let scaleNumber = 1;

  return (
    <>
    <div className="card screening-card">
      <div className="section-card-header section-card-header--screening">
        <h2>Triagem de Sensibilidade Visual</h2>
        <p className="screening-note">
          Registre a experiência visual do participante antes da aplicação das tarefas
        </p>
      </div>

      <section className="screening-intro">
        <span className="about-card__label">Instrução ao participante</span>
        <p>
          A seguir, serão apresentadas algumas perguntas sobre sua experiência com estímulos visuais no dia a dia. Não existem respostas certas ou erradas. Responda considerando como essas situações costumam ocorrer para você, principalmente nos últimos meses.
        </p>
        <p>
          Esta etapa tem finalidade descritiva e serve para contextualizar a aplicação das tarefas computadorizadas do Protocolo Sensorial Visual. As respostas não possuem finalidade diagnóstica.
        </p>
      </section>

      <section className="screening-block">
        <div className="screening-block__header">
          <h3>Condições Mínimas para Aplicação</h3>
        </div>

        <div className="screening-question-list">
          {MINIMUM_ITEMS.map((item, index) => (
            <div className="screening-minimum-item" key={item.id}>
              <SectionTitle n={index + 1}>
                {item.question}
              </SectionTitle>
              <ChoiceGroup
                name={item.id}
                options={item.options}
                value={data.minimum[item.id]}
                onChange={(value) => setMinimum(item.id, value)}
                disabled={locked}
              />
            </div>
          ))}
        </div>
      </section>

      {SCREENING_BLOCKS.map((block) => (
        <section key={block.title} className="screening-block">
          <div className="screening-block__header">
            <h3>{block.title}</h3>
          </div>

          <ScaleGuide />

          <div className="screening-question-list">
            {block.items.map((question) => {
              const number = scaleNumber++;
              return (
                <ScaleQuestion
                  key={question}
                  number={number}
                  question={question}
                  value={data.scale[`q${number}`]}
                  onChange={(value) => setScale(`q${number}`, value)}
                  disabled={locked}
                />
              );
            })}
          </div>
        </section>
      ))}

      <section className="screening-block">
        <div className="screening-block__header">
          <h3>Experiência visual do participante</h3>
        </div>
        <div>
          <SectionTitle n={25}>
            Existe algum tipo de luz, tela, ambiente, movimento, padrão visual ou situação que costuma causar desconforto, interesse intenso, cansaço ou dificuldade para você?
          </SectionTitle>
          <textarea
            className="form-input screening-open-response"
            rows={4}
            value={data.open_response}
            onChange={(event) => setData((current) => ({ ...current, open_response: event.target.value }))}
            readOnly={locked}
          />
        </div>
      </section>
    </div>

      <div className="flow-action-row flow-action-row--split">
        <button
          type="button"
          className="flow-secondary-button"
          onClick={onBack}
        >
          Voltar
        </button>
        <button
          className="flow-next-button"
          onClick={() => onNext(data)}
          disabled={!requiredFilled() || saving}
        >
          {saving ? "Registrando..." : "Próximo"}
        </button>
      </div>
    </>
  );
}

const MIN_RECOMMENDATIONS = [
  {
    label: "Ambiente",
    detail: "Local silencioso, com iluminação estável e sem reflexos diretos na tela.",
  },
  {
    label: "Modo da Tela",
    detail: "Computador ou notebook em tela cheia, com brilho fixo e notificações desativadas.",
  },
  {
    label: "Filtros Visuais",
    detail: "Tela sem modo noturno, filtro de luz azul, brilho automático ou economia de energia.",
  },
  {
    label: "Posicionamento",
    detail: "Participante sentado de frente para a tela, a aproximadamente 50-60 cm de distância.",
  },
  {
    label: "Correção Visual",
    detail: "Uso da correção visual habitual, quando necessário, como óculos ou lentes de contato.",
  },
  {
    label: "Condição Atual",
    detail: "Não iniciar a aplicação em caso de dor de cabeça intensa, tontura, náusea, fadiga visual importante ou desconforto significativo.",
  },
  {
    label: "Interrupção",
    detail: "Interromper a aplicação se houver desconforto visual, mal-estar ou solicitação do participante.",
  },
];

function MinRecommendations({ onConfirm, onBack, loading }) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <>
    <div className="card recommendations-card">
      <div className="section-card-header section-card-header--screening">
        <h2>Recomendações Mínimas</h2>
        <p className="screening-note">
          Confira as condições de aplicação antes de iniciar as tarefas
        </p>
      </div>

      <div className="application-settings">
        {MIN_RECOMMENDATIONS.map((rec, i) => (
          <div
            key={rec.label}
            className={`application-settings__row ${i % 2 === 0 ? "is-soft" : ""}`}
          >
            <span className="application-settings__label">
              {rec.label}
            </span>
            <span className="application-settings__detail">
              {rec.detail}
            </span>
          </div>
        ))}
      </div>

      <label className={`recommendation-confirm ${confirmed ? "is-confirmed" : ""}`}>
        <input
          type="checkbox" checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        <span>
          Confirmo que as recomendações mínimas foram verificadas.
        </span>
      </label>

    </div>

      <div className="flow-action-row flow-action-row--split">
        <button
          type="button"
          className="flow-secondary-button"
          onClick={onBack}
        >
          Voltar
        </button>
        <button
          className="flow-next-button"
          onClick={onConfirm}
          disabled={!confirmed || loading}
        >
          {loading ? "Registrando..." : "Próximo"}
        </button>
      </div>
    </>
  );
}

export default function Checklist() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const draftKey = `psv_screening_${sessionId}`;
  const [phase, setPhase] = useState(
    new URLSearchParams(location.search).get("etapa") === "recomendacoes"
      ? "recommendations"
      : "screening"
  );
  const [screening, setScreening] = useState(() => loadScreeningDraft(sessionId));
  const [checklistSubmitted, setChecklistSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    sessionsApi.summary(sessionId)
      .then((summary) => {
        if (summary.checklist) {
          setChecklistSubmitted(true);
          const stored = parseStoredScreening(summary.checklist.raw_responses);
          if (stored) {
            setScreening(stored);
            localStorage.setItem(draftKey, JSON.stringify(stored));
          }
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [sessionId, draftKey]);

  useEffect(() => {
    setPhase(
      new URLSearchParams(location.search).get("etapa") === "recomendacoes"
        ? "recommendations"
        : "screening"
    );
  }, [location.search]);

  const saveDraft = useCallback((screeningData) => {
    setScreening(screeningData);
    localStorage.setItem(draftKey, JSON.stringify(screeningData));
  }, [draftKey]);

  const handleScreeningNext = async (screeningData) => {
    saveDraft(screeningData);
    setError("");

    if (!checklistSubmitted) {
      setLoading(true);
      try {
        await checklistApi.submit(sessionId, buildChecklistPayload(screeningData));
        setChecklistSubmitted(true);
      } catch (err) {
        const detail = err.response?.data?.detail || "";
        if (detail.includes("já foi submetido") || detail.includes("jÃ¡ foi submetido")) {
          setChecklistSubmitted(true);
        } else {
          setError(detail || "Erro ao registrar triagem");
          setLoading(false);
          return;
        }
      } finally {
        setLoading(false);
      }
    }

    setPhase("recommendations");
    navigate(`/sessions/${sessionId}/checklist?etapa=recomendacoes`);
  };

  const handleRecommendationsBack = () => {
    setPhase("screening");
    navigate(`/sessions/${sessionId}/checklist`);
  };

  const handleConfirm = async () => {
    if (checklistSubmitted) {
      navigate(`/sessions/${sessionId}/tasks`);
      return;
    }

    setLoading(true);
    setError("");
    try {
      await checklistApi.submit(sessionId, buildChecklistPayload(screening));
      setChecklistSubmitted(true);
      navigate(`/sessions/${sessionId}/tasks`);
    } catch (err) {
      const detail = err.response?.data?.detail || "";
      if (detail.includes("já foi submetido")) {
        navigate(`/sessions/${sessionId}/tasks`);
      } else {
        setError(detail || "Erro ao registrar triagem");
        setLoading(false);
      }
    }
  };

  if (checking) {
    return (
      <div className="page">
        <Navbar />
        <main className="container mt-4" style={{ maxWidth: 720 }}>
          <p className="text-muted text-small text-center">Carregando sessão...</p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="page">
      <Navbar />
      <main className="container mt-4" style={{ maxWidth: 760 }}>
        <FlowSteps
          sessionId={sessionId}
          current={phase === "recommendations" ? "recomendacoes" : "triagem"}
          completed={phase === "recommendations" ? ["triagem"] : []}
        />
        {error && (
          <p className="form-error" style={{ marginBottom: "1rem" }}>{error}</p>
        )}
        {phase === "screening" ? (
          <VisualScreening
            onNext={handleScreeningNext}
            onBack={() => navigate("/")}
            initialData={screening}
            onChange={saveDraft}
            locked={checklistSubmitted}
            saving={loading}
          />
        ) : (
          <MinRecommendations
            onConfirm={handleConfirm}
            onBack={handleRecommendationsBack}
            loading={loading}
          />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

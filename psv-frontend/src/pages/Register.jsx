import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/client";
import { PsvLogo } from "../components/Navbar";
import { COUNTRY_OPTIONS, getCityOptions, getStateOptions } from "../data/locations";

const AREAS = [
  "ABA (Análise do Comportamento Aplicada)",
  "Neuropsicologia", "Reabilitação Sensorial",
  "Terapia Ocupacional Pediátrica", "Psicomotricidade",
  "Saúde Mental Infantil", "Outro",
];
const PROFESSIONS = [
  "Terapeuta Ocupacional", "Psicólogo(a)", "Fonoaudiólogo(a)",
  "Neurologista", "Psiquiatra", "Neuropsicólogo(a)", "Outro",
];
const COUNCILS = ["CREFITO", "CRP", "CRFa", "CFM", "CRM", "Outro"];
const TITULATIONS = [
  "Graduação", "Especialização", "Mestrado", "Doutorado", "Pós-doutorado",
];
const TERM_TEXT = `Ao criar uma conta no Protocolo Sensorial Visual (PSV), o profissional declara ter lido, compreendido e aceitado o Termo de Uso Profissional do PSV, bem como declara ciência da Política de Privacidade da plataforma.

O PSV é uma ferramenta digital de apoio técnico à investigação e caracterização descritiva do processamento sensorial visual. Seus resultados possuem caráter complementar, devem ser interpretados por profissional habilitado e não substituem avaliação clínica, psicológica, neuropsicológica, médica, oftalmológica, educacional ou funcional completa.

Ao prosseguir, o profissional declara que:

1. Possui formação, habilitação ou competência técnica compatível com o uso do PSV em sua área de atuação;

2. Utilizará o PSV de forma ética, responsável e compatível com sua finalidade técnica, científica, clínica, educacional ou institucional.

3. Reconhece que o PSV não possui finalidade diagnóstica isolada e não deve ser utilizado como fonte única para emissão de diagnóstico, laudo, parecer conclusivo, seleção, exclusão, restrição de direitos ou tomada de decisão isolada;

4. É responsável pelas informações inseridas no sistema, pela condução adequada da aplicação, pela interpretação técnica dos resultados gerados e pelo uso dos documentos emitidos pela plataforma;

5. Compromete-se a seguir as Recomendações Mínimas para Aplicação e os parâmetros técnicos, operacionais e ético-legais do PSV, incluindo condições adequadas de ambiente, equipamento, sistema operacional, navegador, tela, conexão com a internet, dispositivo de resposta, posicionamento do participante, instrução prévia e interrupção da tarefa em caso de desconforto, fadiga, mal-estar ou solicitação do participante;

6. Compromete-se a obter autorização, assentimento, consentimento informado ou consentimento livre e esclarecido do participante ou de seu responsável legal, quando aplicável;

7. Compromete-se a preservar a privacidade, a confidencialidade e a segurança dos dados inseridos no sistema, observando a legislação brasileira de proteção de dados pessoais;

8. Declara ciência e concordância com o registro eletrônico de seu aceite, incluindo nome completo, CPF, profissão, área de atuação, conselho profissional, número de registro, e-mail, data e horário do aceite, versão dos documentos aceitos, endereço IP, identificadores técnicos do acesso e código de verificação, quando disponíveis;

9. Reconhece que o uso inadequado do PSV, a aplicação fora das condições recomendadas, a inserção incorreta de dados ou a interpretação indevida dos resultados são de responsabilidade do profissional aplicador.

10. Declara ciência de que os dados e relatórios gerados pela plataforma poderão permanecer armazenados em ambiente digital seguro por até 60 dias contados da data de geração do relatório, com a finalidade de permitir acesso pelo profissional, download do relatório, manutenção do histórico de aplicações, rastreabilidade técnica, suporte operacional e funcionamento adequado da plataforma;

11. Declara ciência e concordância de que dados gerados pelo uso do PSV poderão ser utilizados, de forma anonimizada ou agregada, para fins de aprimoramento técnico da plataforma, análise de usabilidade, desenvolvimento do produto, segurança do sistema, produção de estatísticas internas e estudos futuros, sem identificação direta dos participantes ou profissionais;

12. Reconhece que a visualização dos resultados e a emissão dos relatórios em PDF devem ocorrer mediante revisão e confirmação profissional, cabendo ao aplicador analisar os dados apresentados, as condições de aplicação, eventuais intercorrências e os limites metodológicos do PSV. Após visualização, download, impressão, envio, arquivamento ou anexação a registros profissionais, a guarda, a confidencialidade, a proteção e a utilização adequada do relatório passam a ser de responsabilidade do profissional aplicador.

Ao finalizar o cadastro, o aceite eletrônico será registrado e os documentos ficarão disponíveis para consulta no ambiente do profissional, na área Documentos e Aceites.`;

function maskCPF(value) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function generateVerificationCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function generateTermPdf(formData, acceptedAt, verificationCode) {
  // Dynamically import jsPDF
  const { jsPDF } = await import("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 20;

  const addText = (text, opts = {}) => {
    const {
      fontSize = 10,
      bold = false,
      color = [30, 30, 30],
      lineHeight = 6,
      indent = 0,
    } = opts;
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, contentW - indent);
    lines.forEach((line) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, margin + indent, y);
      y += lineHeight;
    });
    y += 1;
  };

  const divider = () => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
  };

  // Título
  addText("Comprovante de Aceite do Termo de Uso e", { fontSize: 14, bold: true, lineHeight: 7 });
  addText("Responsabilidade Técnica — PSV", { fontSize: 14, bold: true, lineHeight: 7 });
  y += 2;
  divider();

  // Dados do profissional
  addText("Dados do Profissional", { fontSize: 11, bold: true, lineHeight: 7, color: [60, 60, 60] });
  y += 1;

  const fields = [
    ["Nome e Sobrenome", formData.name],
    ["CPF", formData.cpf],
    ["Área de Atuação", formData.area || "—"],
    ["Registro Profissional", formData.council_register || "—"],
    ["E-mail", formData.email],
  ];

  fields.forEach(([label, value]) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text(label + ":", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(String(value || "—"), margin + 50, y);
    y += 6;
  });

  y += 3;
  divider();

  // Dados do aceite
  addText("Dados do Aceite", { fontSize: 11, bold: true, lineHeight: 7, color: [60, 60, 60] });
  y += 1;

  const acceptDate = acceptedAt.toLocaleDateString("pt-BR");
  const acceptTime = acceptedAt.toLocaleTimeString("pt-BR");

  [
    ["Data do aceite", acceptDate],
    ["Horário do aceite", acceptTime],
    ["Código de verificação", verificationCode],
  ].forEach(([label, value]) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text(label + ":", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(String(value), margin + 50, y);
    y += 6;
  });

  y += 3;
  divider();

  // Texto integral do termo
  addText("Texto Integral do Termo Aceito", { fontSize: 11, bold: true, lineHeight: 7, color: [60, 60, 60] });
  addText("Termo de Uso e Responsabilidade Técnica — Protocolo Sensorial Visual (PSV)", { fontSize: 9, bold: true, lineHeight: 6 });
  y += 1;
  addText(
    "Ao criar uma conta no Protocolo Sensorial Visual (PSV), o profissional declara estar ciente das condições de uso, dos limites técnicos do protocolo e de sua responsabilidade na aplicação, interpretação e proteção dos dados inseridos no sistema.",
    { fontSize: 9, lineHeight: 5.5 }
  );
  y += 1;
  addText(TERM_TEXT, { fontSize: 9, lineHeight: 5.5 });

  y += 3;
  divider();

  // Declaração registrada
  addText("Declaração Registrada", { fontSize: 11, bold: true, lineHeight: 7, color: [60, 60, 60] });
  addText(
    `O profissional declarou que leu e aceitou o Termo de Uso e Responsabilidade Técnica do PSV, responsabilizando-se pelo uso adequado do protocolo e autorizando o registro eletrônico do aceite em ${acceptDate} às ${acceptTime}, com código de verificação ${verificationCode}.`,
    { fontSize: 9, lineHeight: 5.5 }
  );

  doc.save(`PSV_Termo_Aceite_${formData.name?.replace(/\s+/g, "_") || "profissional"}.pdf`);
}

function downloadFile(path, filename) {
  const link = document.createElement("a");
  link.href = path;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function joinName(firstName, lastName) {
  return [firstName, lastName].map((part) => part.trim()).filter(Boolean).join(" ");
}

function humanizeValidationMessage(message) {
  const text = String(message).replace(/^Value error,\s*/i, "");
  const lower = text.toLowerCase();

  if (lower.includes("email address") || lower.includes("valid email")) {
    return "Informe um e-mail válido, com @ e domínio.";
  }
  if (lower.includes("password") || lower.includes("senha")) {
    return "A senha deve ter, no mínimo, 8 caracteres.";
  }
  if (lower.includes("field required")) {
    return "Preencha todos os campos obrigatórios.";
  }

  return text;
}

function getErrorMessage(err) {
  const detail = err.response?.data?.detail;
  if (typeof detail === "string") return humanizeValidationMessage(detail);
  if (Array.isArray(detail)) {
    return detail
      .map((item) => humanizeValidationMessage(item?.msg || item?.message || String(item)))
      .join(" ");
  }
  if (detail && typeof detail === "object") {
    return humanizeValidationMessage(detail.msg || detail.message || "Erro ao criar conta");
  }
  return "Erro ao criar conta";
}

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: "", last_name: "", cpf: "", email: "", secondary_email: "", password: "",
    profession: "", council: "", council_register: "",
    area: "", titulation: "", institution: "",
    country: "", state: "", city: "",
  });
  const [termAccepted, setTermAccepted] = useState(false);
  const [termRead, setTermRead] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handle = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "country" ? { state: "", city: "" } : {}),
      ...(name === "state" ? { city: "" } : {}),
    }));
  };

  const handleCPF = (e) => {
    setForm({ ...form, cpf: maskCPF(e.target.value) });
  };

  const handleTermScroll = (e) => {
    const el = e.currentTarget;
    const reachedEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
    if (reachedEnd) setTermRead(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!termAccepted) {
      setError("Você precisa aceitar o Termo de Uso e Responsabilidade Técnica para continuar.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const payload = { ...form, name: joinName(form.first_name, form.last_name) };
      delete payload.first_name;
      delete payload.last_name;
      payload.email = payload.email.trim();
      payload.secondary_email = payload.secondary_email.trim() || null;
      await authApi.register(payload);
      setRegistrationComplete(true);
      return;
      // Gera PDF de comprovação
      const acceptedAt = new Date();
      const verificationCode = generateVerificationCode();
      try {
        await generateTermPdf(payload, acceptedAt, verificationCode);
        downloadFile("/documents/manual-tecnico.pdf", "Manual_Tecnico_PSV.pdf");
        downloadFile("/documents/contrato-abnt.pdf", "Termo_Uso_Profissional_PSV.pdf");
      } catch (pdfErr) {
        console.warn("Erro ao gerar PDFs do cadastro:", pdfErr);
      }
      navigate("/login");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const stateOptions = getStateOptions(form.country);
  const cityOptions = getCityOptions(form.country, form.state);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 720 }}>
        <div className="auth-header">
          <h2 className="auth-screen-title">Cadastro do Profissional</h2>
        </div>

        <form className="auth-form" onSubmit={submit}>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome</label>
              <input className="form-input" name="first_name" value={form.first_name}
                onChange={handle} required />
            </div>
            <div className="form-group">
              <label className="form-label">Sobrenome</label>
              <input className="form-input" name="last_name" value={form.last_name}
                onChange={handle} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">CPF</label>
            <input className="form-input" name="cpf" value={form.cpf}
              onChange={handleCPF} inputMode="numeric" required />
          </div>

          <div className="location-grid">
            <div className="form-group">
              <label className="form-label">País</label>
              <select className="form-select" name="country"
                value={form.country} onChange={handle} required>
                <option value="">Selecione...</option>
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="form-select" name="state"
                value={form.state} onChange={handle} required disabled={!form.country}>
                <option value="">Selecione...</option>
                {stateOptions.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Cidade</label>
              <select className="form-select" name="city"
                value={form.city} onChange={handle} required disabled={!form.state}>
                <option value="">Selecione...</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Profissão</label>
              <select className="form-select" name="profession"
                value={form.profession} onChange={handle} required>
                <option value="">Selecione...</option>
                {PROFESSIONS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Área de Atuação</label>
              <select className="form-select" name="area"
                value={form.area} onChange={handle} required>
                <option value="">Selecione...</option>
                {AREAS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Conselho</label>
              <select className="form-select" name="council"
                value={form.council} onChange={handle} required>
                <option value="">Selecione...</option>
                {COUNCILS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Número de Registro</label>
              <input className="form-input" name="council_register"
                value={form.council_register} onChange={handle} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Titulação</label>
              <select className="form-select" name="titulation"
                value={form.titulation} onChange={handle} required>
                <option value="">Selecione...</option>
                {TITULATIONS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Instituição</label>
              <input className="form-input" name="institution"
                value={form.institution} onChange={handle} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input className="form-input" type="email" name="email"
                value={form.email} onChange={handle} required />
            </div>
            <div className="form-group">
              <label className="form-label">
                E-mail Secundário <span className="text-muted text-small">— opcional</span>
              </label>
              <input className="form-input" type="email" name="secondary_email"
                value={form.secondary_email} onChange={handle} />
            </div>
          </div>

          <div className="form-group">
              <label className="form-label">Senha</label>
              <input className="form-input" type="password" name="password"
                value={form.password} onChange={handle}
                placeholder="Mín. 8 caracteres" required />
          </div>

          {/* Termo de Uso Profissional e Política de Privacidade */}
          <div style={{
            border: "1px solid var(--c-border)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
          }}>
            <div style={{
              background: "var(--c-bg)",
              padding: "0.75rem 1rem",
              borderBottom: "1px solid var(--c-border)",
              textAlign: "center",
            }}>
              <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--c-text-1)" }}>
                Termo de Uso Profissional e Política de Privacidade
              </span>
            </div>
            <div style={{
              padding: "1rem",
              fontSize: "0.8rem", color: "var(--c-text-2)",
              maxHeight: 240, overflowY: "auto", lineHeight: 1.7,
            }} onScroll={handleTermScroll}>
              <p style={{ marginBottom: "0.75rem", textAlign: "justify" }}>
                Ao criar uma conta no Protocolo Sensorial Visual (PSV), o profissional declara ter lido, compreendido e aceitado o Termo de Uso Profissional do PSV, bem como declara ciência da Política de Privacidade da plataforma.
              </p>
              <p style={{ marginBottom: "0.75rem", textAlign: "justify" }}>
                O PSV é uma ferramenta digital de apoio técnico à investigação e caracterização descritiva do processamento sensorial visual. Seus resultados possuem caráter complementar, devem ser interpretados por profissional habilitado e não substituem avaliação clínica, psicológica, neuropsicológica, médica, oftalmológica, educacional ou funcional completa.
              </p>
              <p style={{ marginBottom: "0.5rem", fontWeight: 600, color: "var(--c-text-1)" }}>
                Ao prosseguir, o profissional declara que:
              </p>
              {[
                "Possui formação, habilitação ou competência técnica compatível com o uso do PSV em sua área de atuação;",
                "Utilizará o PSV de forma ética, responsável e compatível com sua finalidade técnica, científica, clínica, educacional ou institucional.",
                "Reconhece que o PSV não possui finalidade diagnóstica isolada e não deve ser utilizado como fonte única para emissão de diagnóstico, laudo, parecer conclusivo, seleção, exclusão, restrição de direitos ou tomada de decisão isolada;",
                "É responsável pelas informações inseridas no sistema, pela condução adequada da aplicação, pela interpretação técnica dos resultados gerados e pelo uso dos documentos emitidos pela plataforma;",
                "Compromete-se a seguir as Recomendações Mínimas para Aplicação e os parâmetros técnicos, operacionais e ético-legais do PSV, incluindo condições adequadas de ambiente, equipamento, sistema operacional, navegador, tela, conexão com a internet, dispositivo de resposta, posicionamento do participante, instrução prévia e interrupção da tarefa em caso de desconforto, fadiga, mal-estar ou solicitação do participante;",
                "Compromete-se a obter autorização, assentimento, consentimento informado ou consentimento livre e esclarecido do participante ou de seu responsável legal, quando aplicável;",
                "Compromete-se a preservar a privacidade, a confidencialidade e a segurança dos dados inseridos no sistema, observando a legislação brasileira de proteção de dados pessoais;",
                "Declara ciência e concordância com o registro eletrônico de seu aceite, incluindo nome completo, CPF, profissão, área de atuação, conselho profissional, número de registro, e-mail, data e horário do aceite, versão dos documentos aceitos, endereço IP, identificadores técnicos do acesso e código de verificação, quando disponíveis;",
                "Reconhece que o uso inadequado do PSV, a aplicação fora das condições recomendadas, a inserção incorreta de dados ou a interpretação indevida dos resultados são de responsabilidade do profissional aplicador.",
                "Declara ciência de que os dados e relatórios gerados pela plataforma poderão permanecer armazenados em ambiente digital seguro por até 60 dias contados da data de geração do relatório, com a finalidade de permitir acesso pelo profissional, download do relatório, manutenção do histórico de aplicações, rastreabilidade técnica, suporte operacional e funcionamento adequado da plataforma;",
                "Declara ciência e concordância de que dados gerados pelo uso do PSV poderão ser utilizados, de forma anonimizada ou agregada, para fins de aprimoramento técnico da plataforma, análise de usabilidade, desenvolvimento do produto, segurança do sistema, produção de estatísticas internas e estudos futuros, sem identificação direta dos participantes ou profissionais;",
                "Reconhece que a visualização dos resultados e a emissão dos relatórios em PDF devem ocorrer mediante revisão e confirmação profissional, cabendo ao aplicador analisar os dados apresentados, as condições de aplicação, eventuais intercorrências e os limites metodológicos do PSV. Após visualização, download, impressão, envio, arquivamento ou anexação a registros profissionais, a guarda, a confidencialidade, a proteção e a utilização adequada do relatório passam a ser de responsabilidade do profissional aplicador.",
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", marginLeft: "5%" }}>
                  <span style={{ color: "var(--c-blue-500)", fontWeight: 600, flexShrink: 0 }}>{i + 1}.</span>
                  <span style={{ textAlign: "justify" }}>{item}</span>
                </div>
              ))}
              <p style={{ marginTop: "0.75rem", marginBottom: 0, textAlign: "justify" }}>
                Ao finalizar o cadastro, o aceite eletrônico será registrado e os documentos ficarão disponíveis para consulta no ambiente do profissional, na área Documentos e Aceites.
              </p>
            </div>

            <div style={{
              padding: "0.875rem 1rem",
              borderTop: "1px solid var(--c-border)",
              background: "var(--c-bg)",
            }}>
              <label style={{
                display: "flex", alignItems: "flex-start", gap: "0.75rem",
                fontSize: "0.85rem", color: termRead ? "var(--c-text-1)" : "var(--c-text-4)",
                cursor: termRead ? "pointer" : "default",
                opacity: termRead ? 1 : 0.72,
              }}>
                <input
                  type="checkbox"
                  checked={termAccepted}
                  disabled={!termRead}
                  onChange={(e) => setTermAccepted(e.target.checked)}
                  style={{ marginTop: 3, flexShrink: 0, accentColor: "var(--c-blue-500)", width: 15, height: 15 }}
                />
                <span style={{ textAlign: "justify" }}>
                  Declaro que li e aceito o Termo de Uso Profissional e a Política de Privacidade do PSV, responsabilizando-me pelo uso adequado do protocolo e autorizando o registro eletrônico do aceite.
                </span>
              </label>
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button className="btn btn--primary btn--full btn--lg"
            type="submit" disabled={loading || !termAccepted}>
            {loading ? "Criando conta..." : "Cadastrar"}
          </button>
        </form>

        <div className="auth-footer">
          Já tem conta? <Link to="/login">Entrar</Link>
        </div>
      </div>

      {registrationComplete && (
        <div className="registration-modal" role="dialog" aria-modal="true" aria-labelledby="registration-modal-title">
          <div className="registration-modal__card">
            <div className="registration-modal__brand" aria-hidden="true">
              <PsvLogo size={70} />
              <span>PSV</span>
            </div>
            <h2 id="registration-modal-title">Cadastro Concluído</h2>
            <p>
              O Termo de Uso Profissional e a Política de Privacidade foram registrados e ficarão disponíveis para consulta no ambiente do profissional, na área de Documentos.
            </p>
            <div className="registration-modal__info">
              <span>Visualizar</span>
              <span>Baixar</span>
              <span>Consultar</span>
            </div>
            <p className="registration-modal__note">
              Após entrar no PSV, acesse o menu do perfil e selecione Documentos para visualizar ou baixar os arquivos.
            </p>
            <button
              type="button"
              className="flow-next-button"
              onClick={() => navigate("/login")}
            >
              Entrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

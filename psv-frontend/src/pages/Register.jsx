import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/client";

const PROFESSIONS = [
  "Terapeuta Ocupacional", "Psicólogo(a)", "Fonoaudiólogo(a)",
  "Neurologista", "Psiquiatra", "Neuropsicólogo(a)", "Outro",
];
const COUNCILS = ["CREFITO", "CRP", "CRFa", "CFM", "CRM", "Outro"];
const AREAS = [
  "ABA (Análise do Comportamento Aplicada)",
  "Neuropsicologia", "Reabilitação Sensorial",
  "Terapia Ocupacional Pediátrica", "Psicomotricidade",
  "Saúde Mental Infantil", "Outro",
];
const TITULATIONS = [
  "Graduação", "Especialização", "Mestrado", "Doutorado", "Pós-doutorado",
];

const TERM_VERSION = "1.0";

const TERM_TEXT = `O PSV é um protocolo computadorizado de apoio à investigação e caracterização do processamento sensorial visual. Seus resultados devem ser interpretados por profissional habilitado e não substituem avaliação clínica, psicológica, neuropsicológica, médica ou oftalmológica completa.

Ao prosseguir, o profissional declara que:

1. Possui formação e habilitação profissional compatíveis com o uso do PSV em sua área de atuação.

2. Utilizará o PSV de forma ética, responsável e compatível com sua finalidade científica, clínica ou institucional.

3. É responsável pelas informações inseridas no sistema, pela condução adequada da aplicação e pela interpretação técnica dos resultados gerados.

4. Compromete-se a seguir as Recomendações Mínimas para Aplicação, incluindo condições adequadas de ambiente, equipamento, posicionamento do participante e interrupção da tarefa em caso de desconforto.

5. Compromete-se a obter o consentimento livre e esclarecido do participante ou de seu responsável legal, quando aplicável.

6. Autoriza o registro eletrônico de seu aceite, com armazenamento dos dados necessários para comprovação da concordância com este termo, incluindo nome completo, CPF, profissão, conselho profissional, número de registro, e-mail, data e horário do aceite, versão do termo e código de verificação.

7. Compromete-se a preservar a privacidade, a confidencialidade e a segurança dos dados inseridos no sistema, conforme a Lei Geral de Proteção de Dados Pessoais — LGPD, Lei nº 13.709/2018.

8. Reconhece que o uso inadequado do PSV, a aplicação fora das condições recomendadas ou a interpretação indevida dos resultados são de responsabilidade do profissional aplicador.`;

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
    ["Nome completo", formData.name],
    ["CPF", formData.cpf],
    ["E-mail", formData.email],
    ["Profissão", formData.profession],
    ["Conselho profissional", formData.council],
    ["Número de registro", formData.council_register || "—"],
    ["Instituição/serviço", formData.institution || "—"],
    ["Área de atuação", formData.area || "—"],
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
    ["Versão do termo", TERM_VERSION],
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

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", cpf: "", email: "", password: "",
    profession: "", council: "", council_register: "",
    area: "", titulation: "", institution: "",
  });
  const [termAccepted, setTermAccepted] = useState(false);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCPF = (e) => {
    setForm({ ...form, cpf: maskCPF(e.target.value) });
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
      await authApi.register(form);
      // Gera PDF de comprovação
      const acceptedAt = new Date();
      const verificationCode = generateVerificationCode();
      try {
        await generateTermPdf(form, acceptedAt, verificationCode);
      } catch (pdfErr) {
        console.warn("Erro ao gerar PDF do termo:", pdfErr);
      }
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.detail || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 560 }}>
        <div className="auth-header">
          <div className="auth-header__logo">PSV</div>
          <div className="auth-header__sub">Cadastro do profissional</div>
        </div>

        <form className="auth-form" onSubmit={submit}>

          <div className="form-group">
            <label className="form-label">Nome completo</label>
            <input className="form-input" name="name" value={form.name}
              onChange={handle} required />
          </div>

          <div className="form-group">
            <label className="form-label">CPF</label>
            <input className="form-input" name="cpf" value={form.cpf}
              onChange={handleCPF} placeholder="000.000.000-00"
              inputMode="numeric" required />
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
              <label className="form-label">Conselho</label>
              <select className="form-select" name="council"
                value={form.council} onChange={handle}>
                <option value="">Selecione...</option>
                {COUNCILS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Registro profissional</label>
            <input className="form-input" name="council_register"
              value={form.council_register} onChange={handle} />
          </div>

          <div className="form-group">
            <label className="form-label">Área de atuação</label>
            <select className="form-select" name="area"
              value={form.area} onChange={handle}>
              <option value="">Selecione...</option>
              {AREAS.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Titulação <span className="text-muted text-small">— opcional</span>
              </label>
              <select className="form-select" name="titulation"
                value={form.titulation} onChange={handle}>
                <option value="">Selecione...</option>
                {TITULATIONS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">
                Instituição <span className="text-muted text-small">— opcional</span>
              </label>
              <input className="form-input" name="institution"
                value={form.institution} onChange={handle} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input className="form-input" type="email" name="email"
                value={form.email} onChange={handle} required />
            </div>
            <div className="form-group">
              <label className="form-label">Senha</label>
              <input className="form-input" type="password" name="password"
                value={form.password} onChange={handle}
                placeholder="Mín. 8 caracteres" required />
            </div>
          </div>

          {/* Termo de Uso e Responsabilidade Técnica */}
          <div style={{
            border: "1px solid var(--c-border)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
          }}>
            <div style={{
              background: "var(--c-bg)",
              padding: "0.75rem 1rem",
              borderBottom: "1px solid var(--c-border)",
            }}>
              <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--c-text-1)" }}>
                Termo de Uso e Responsabilidade Técnica
              </span>
              <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "var(--c-text-3)" }}>
                Versão {TERM_VERSION}
              </span>
            </div>
            <div style={{
              padding: "1rem",
              fontSize: "0.8rem", color: "var(--c-text-2)",
              maxHeight: 240, overflowY: "auto", lineHeight: 1.7,
            }}>
              <p style={{ marginBottom: "0.75rem" }}>
                Ao criar uma conta no Protocolo Sensorial Visual (PSV), o profissional declara estar ciente
                das condições de uso, dos limites técnicos do protocolo e de sua responsabilidade na
                aplicação, interpretação e proteção dos dados inseridos no sistema.
              </p>
              <p style={{ marginBottom: "0.75rem" }}>
                O PSV é um protocolo computadorizado de apoio à investigação e caracterização do
                processamento sensorial visual. Seus resultados devem ser interpretados por profissional
                habilitado e não substituem avaliação clínica, psicológica, neuropsicológica, médica ou
                oftalmológica completa.
              </p>
              <p style={{ marginBottom: "0.5rem", fontWeight: 600, color: "var(--c-text-1)" }}>
                Ao prosseguir, o profissional declara que:
              </p>
              {[
                "Possui formação e habilitação profissional compatíveis com o uso do PSV em sua área de atuação.",
                "Utilizará o PSV de forma ética, responsável e compatível com sua finalidade científica, clínica ou institucional.",
                "É responsável pelas informações inseridas no sistema, pela condução adequada da aplicação e pela interpretação técnica dos resultados gerados.",
                "Compromete-se a seguir as Recomendações Mínimas para Aplicação, incluindo condições adequadas de ambiente, equipamento, posicionamento do participante e interrupção da tarefa em caso de desconforto.",
                "Compromete-se a obter o consentimento livre e esclarecido do participante ou de seu responsável legal, quando aplicável.",
                "Autoriza o registro eletrônico de seu aceite, com armazenamento dos dados necessários para comprovação da concordância com este termo, incluindo nome completo, CPF, profissão, conselho profissional, número de registro, e-mail, data e horário do aceite, versão do termo e código de verificação.",
                "Compromete-se a preservar a privacidade, a confidencialidade e a segurança dos dados inseridos no sistema, conforme a Lei Geral de Proteção de Dados Pessoais — LGPD, Lei nº 13.709/2018.",
                "Reconhece que o uso inadequado do PSV, a aplicação fora das condições recomendadas ou a interpretação indevida dos resultados são de responsabilidade do profissional aplicador.",
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ color: "var(--c-blue-500)", fontWeight: 600, flexShrink: 0 }}>{i + 1}.</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div style={{
              padding: "0.875rem 1rem",
              borderTop: "1px solid var(--c-border)",
              background: "var(--c-bg)",
            }}>
              <label style={{
                display: "flex", alignItems: "flex-start", gap: "0.75rem",
                fontSize: "0.85rem", color: "var(--c-text-1)", cursor: "pointer",
              }}>
                <input
                  type="checkbox"
                  checked={termAccepted}
                  onChange={(e) => setTermAccepted(e.target.checked)}
                  style={{ marginTop: 3, flexShrink: 0, accentColor: "var(--c-blue-500)", width: 15, height: 15 }}
                />
                <span>
                  Declaro que li e aceito o Termo de Uso e Responsabilidade Técnica do PSV,
                  responsabilizando-me pelo uso adequado do protocolo e autorizando o registro eletrônico do aceite.
                </span>
              </label>
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button className="btn btn--primary btn--full btn--lg"
            type="submit" disabled={loading || !termAccepted}>
            {loading ? "Criando conta..." : "Aceitar e concluir cadastro"}
          </button>
        </form>

        <div className="auth-footer">
          Já tem conta? <Link to="/login">Entrar</Link>
        </div>
      </div>
    </div>
  );
}

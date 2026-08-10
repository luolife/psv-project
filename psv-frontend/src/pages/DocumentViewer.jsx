import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";

export default function DocumentViewer({ title, subtitle, src, apiSrc, filename, backTo = "/documentos" }) {
  const [zoom, setZoom] = useState(100);
  const [documentUrl, setDocumentUrl] = useState(src || "");
  const [loading, setLoading] = useState(Boolean(apiSrc));
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const zoomOut = () => setZoom((value) => Math.max(75, value - 10));
  const zoomIn = () => setZoom((value) => Math.min(150, value + 10));

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    if (!apiSrc) {
      setDocumentUrl(src || "");
      setLoading(false);
      setError("");
      return undefined;
    }

    setLoading(true);
    setError("");
    api.get(apiSrc, { responseType: "blob" })
      .then((response) => {
        if (!active) return;
        const pdfBlob = new Blob([response.data], { type: "application/pdf" });
        objectUrl = URL.createObjectURL(pdfBlob);
        setDocumentUrl(objectUrl);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar o documento.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [apiSrc, src]);

  return (
    <div className="page">
      <Navbar />
      <main className="document-page">
        <section className="document-toolbar">
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>

          <div className="document-actions">
            <button
              className="profile-back-button"
              type="button"
              onClick={() => navigate(backTo)}
            >
              Voltar
            </button>
            <button className="document-icon-btn" type="button" onClick={zoomOut} title="Diminuir zoom">
              -
            </button>
            <span className="document-zoom">{zoom}%</span>
            <button className="document-icon-btn" type="button" onClick={zoomIn} title="Aumentar zoom">
              +
            </button>
            <a className="panel-action-button" href={documentUrl} target="_blank" rel="noreferrer">
              Abrir
            </a>
            <a className="panel-action-button panel-action-button--primary" href={documentUrl} download={filename}>
              Baixar
            </a>
          </div>
        </section>

        <section className="document-viewer">
          <div className="document-viewer__canvas" style={{ width: `${zoom}%` }}>
            {loading ? (
              <div className="document-viewer__empty">
                <h2>Carregando documento</h2>
              </div>
            ) : error ? (
              <div className="document-viewer__empty">
                <h2>{error}</h2>
              </div>
            ) : (
              <iframe
                src={documentUrl}
                title={title}
                className="document-viewer__pdf"
              />
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

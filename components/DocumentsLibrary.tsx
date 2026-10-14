"use client";

import { ArrowUpRight, Download, FileText } from "lucide-react";
import { useRef, useState } from "react";
import { documents } from "@/lib/documents";

function formatFileSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.ceil(bytes / 1024)} KB`;
}

export function DocumentsLibrary() {
  const [selectedId, setSelectedId] = useState<string>(documents[0].id);
  const previewRef = useRef<HTMLElement>(null);
  const selected = documents.find((document) => document.id === selectedId) || documents[0];

  return (
    <div className="documents-library">
      <div className="documents-list" aria-labelledby="documents-list-title">
        <div className="documents-list__heading">
          <h2 id="documents-list-title">Document library</h2>
          <p>Select a document to preview.</p>
        </div>
        <ul>
          {documents.map((document) => (
            <li key={document.id}>
              <button
                type="button"
                className={`document-option${selected.id === document.id ? " is-selected" : ""}`}
                aria-pressed={selected.id === document.id}
                aria-controls="document-preview"
                onClick={() => {
                  setSelectedId(document.id);
                  if (window.matchMedia("(max-width: 960px)").matches) {
                    previewRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
                  }
                }}
              >
                <FileText aria-hidden="true" />
                <span>
                  <span className="document-option__title">{document.title}</span>
                  <span className="document-option__meta">{document.category} &middot; PDF &middot; {formatFileSize(document.sizeBytes)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <section ref={previewRef} id="document-preview" className="document-preview" aria-labelledby="document-preview-title">
        <div className="document-preview__header">
          <div>
            <p className="document-preview__category">{selected.category}</p>
            <h2 id="document-preview-title">{selected.title}</h2>
            <p>{selected.description}</p>
          </div>
          <div className="document-preview__actions">
            <a className="button button--green" href={selected.href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${selected.title} PDF in a new tab`}>
              Open PDF <ArrowUpRight aria-hidden="true" />
            </a>
            <a className="button document-download" href={selected.href} download aria-label={`Download ${selected.title} PDF`}>
              Download <Download aria-hidden="true" />
            </a>
          </div>
        </div>
        <p className="document-preview__status" role="status">
          Previewing {selected.title} &middot; PDF &middot; {formatFileSize(selected.sizeBytes)}
        </p>
        <object
          key={selected.id}
          className="document-preview__embed"
          data={`${selected.href}#view=FitH`}
          type="application/pdf"
          aria-label={`${selected.title} PDF preview`}
        >
          <div className="document-preview__fallback">
            <FileText aria-hidden="true" />
            <h3>Read this document</h3>
            <p>Your browser may open PDFs in a separate viewer.</p>
            <a className="button button--green" href={selected.href} target="_blank" rel="noopener noreferrer">Open {selected.title} <ArrowUpRight aria-hidden="true" /></a>
          </div>
        </object>
        <p className="document-preview__help">Preview not appearing? <a href={selected.href} target="_blank" rel="noopener noreferrer">Open the PDF in a new tab</a> or use Download to read it on your device. Larger files may take a moment to load.</p>
      </section>
    </div>
  );
}

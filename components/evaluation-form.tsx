"use client";

import { EmploymentType } from "@prisma/client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { saveDraftAction, submitEvaluationAction, uploadDocumentsAction } from "@/app/actions";
import { formatScore } from "@/lib/utils";

type QuestionOption = {
  id: string;
  label: string;
  description: string;
  score: number;
};

type Question = {
  id: string;
  title: string;
  description: string;
  sortOrder: number;
  options: QuestionOption[];
};

type DocumentItem = {
  id: string;
  name: string;
  url: string;
  size: number;
};

export function EvaluationForm({
  year,
  evaluationId,
  actorName,
  phase,
  status,
  readOnly,
  employmentType,
  currentScore,
  maxScore,
  remainingDays,
  questions,
  initialAnswers,
  initialDocuments,
}: {
  year: number;
  evaluationId: string;
  actorName: string;
  phase: "self" | "manager";
  status: string;
  readOnly: boolean;
  employmentType: EmploymentType;
  currentScore: number;
  maxScore: number;
  remainingDays: number;
  questions: Question[];
  initialAnswers: Record<string, string>;
  initialDocuments: DocumentItem[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
  const [saveMessage, setSaveMessage] = useState("Alterações sincronizadas.");
  const [uploadMessage, setUploadMessage] = useState("");
  const [submitPending, setSubmitPending] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [uploadPending, startUpload] = useTransition();
  const [dragging, setDragging] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allAnswered = questions.length > 0 && questions.every((q) => Boolean(answers[q.id]));

  const projectedScore = useMemo(() => {
    const selectedMap = new Map<string, number>();
    questions.forEach((q) => q.options.forEach((o) => selectedMap.set(o.id, o.score)));
    return Object.values(answers).reduce((sum, optionId) => sum + (selectedMap.get(optionId) ?? 0), 0);
  }, [answers, questions]);

  useEffect(() => {
    if (readOnly || !Object.keys(answers).length) return;

    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    saveTimeout.current = setTimeout(async () => {
      try {
        const response = await saveDraftAction({ evaluationId, phase, answers });
        setSaveMessage(response.message);
      } catch {
        setSaveMessage("Erro ao salvar rascunho.");
      }
    }, 900);

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [answers, evaluationId, phase, readOnly]);

  async function saveDraft() {
    if (readOnly || !Object.keys(answers).length) return;
    setSavePending(true);
    try {
      const response = await saveDraftAction({ evaluationId, phase, answers });
      setSaveMessage(response.message);
    } catch {
      setSaveMessage("Erro ao salvar rascunho.");
    } finally {
      setSavePending(false);
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;

    startUpload(async () => {
      try {
        const formData = new FormData();
        formData.append("evaluationId", evaluationId);
        Array.from(files).forEach((file) => formData.append("files", file));
        const response = await uploadDocumentsAction(formData);

        if (!response.ok) {
          setUploadMessage(response.message);
          return;
        }

        setDocuments((current) => [...response.documents, ...current]);
        setUploadMessage(`${response.documents.length} curso(s) enviado(s).`);
      } catch {
        setUploadMessage("Erro ao enviar. Tente novamente.");
      }
    });
  }

  async function submit() {
    setSubmitPending(true);
    try {
      const response = await submitEvaluationAction({ evaluationId, phase, answers });

      if (!response.ok) {
        setSaveMessage(response.message);
        return;
      }

      window.location.href = response.redirectTo;
    } finally {
      setSubmitPending(false);
    }
  }

  const deadlineColor = remainingDays <= 2 ? "text-error" : remainingDays <= 5 ? "text-warning" : "text-white/90";

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="headline-gradient relative overflow-hidden rounded-xl px-8 py-10 text-white">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/70">
              {phase === "self" ? "Autoavaliação" : "Parecer da chefia"}
            </p>
            <h1 className="mt-3 font-headline text-4xl font-extrabold tracking-tight">
              {phase === "self" ? "Formulário do Servidor" : "Formulário da Chefia"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/80">
              {actorName} · {employmentType === EmploymentType.EFETIVO ? "Servidor efetivo" : "Servidor probatório"} · status {status.replaceAll("_", " ").toLowerCase()}
            </p>
            <p className={`mt-2 text-sm font-bold ${deadlineColor}`}>
              {readOnly ? "Prazo encerrado" : remainingDays === 0 ? "Último dia para envio" : `${remainingDays} dia${remainingDays !== 1 ? "s" : ""} restante${remainingDays !== 1 ? "s" : ""} para envio`}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/70">Pontuação</p>
            <p className="mt-2 font-headline text-5xl font-black">
              {formatScore(projectedScore || currentScore)}{" "}
              <span className="text-2xl text-white/70">/ {formatScore(maxScore)}</span>
            </p>
          </div>
        </div>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
      </section>

      {/* Questions */}
      <div className="space-y-8">
        {questions.map((question) => (
          <section className="grid gap-4 lg:grid-cols-[320px_1fr]" key={question.id}>
            <div className="rounded-xl bg-surface-container-low p-7">
              <div className="mb-4 flex items-center gap-3">
                <span className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary">
                  {String(question.sortOrder).padStart(2, "0")}
                </span>
                <h2 className="font-headline text-2xl font-bold text-primary">{question.title}</h2>
              </div>
              <p className="text-sm leading-relaxed text-on-surface-variant">{question.description}</p>
            </div>

            <div className="grid gap-3">
              {question.options.map((option) => {
                const selected = answers[question.id] === option.id;
                return (
                  <label
                    className={`rounded-xl border-b-2 p-5 transition ${
                      selected
                        ? "border-primary bg-surface-container-lowest shadow-ambient"
                        : "border-transparent bg-surface-container-lowest hover:border-primary hover:bg-surface-bright"
                    } ${readOnly ? "cursor-default" : "cursor-pointer"}`}
                    key={option.id}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        checked={selected}
                        className="mt-1 h-4 w-4"
                        disabled={readOnly}
                        name={question.id}
                        onChange={() => {
                          setSaveMessage("Salvando rascunho...");
                          setAnswers((current) => ({ ...current, [question.id]: option.id }));
                        }}
                        type="radio"
                      />
                      <div className="flex-1">
                        <p className={`text-sm ${selected ? "font-bold text-primary" : "text-on-surface"}`}>
                          {option.label}. {option.description}
                        </p>
                      </div>
                      <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-container">
                        {formatScore(option.score)} pts
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* File upload — visible for self phase regardless of readOnly */}
      {phase === "self" && (
        <section className="institutional-card p-8">
          <h3 className="font-headline text-2xl font-bold text-primary">Cursos</h3>

          <label
            className={`mt-6 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-8 py-10 text-center transition ${
              dragging
                ? "border-primary bg-primary/5"
                : "border-outline-variant hover:border-primary hover:bg-surface-container-low"
            }`}
            onDragLeave={() => setDragging(false)}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
          >
            <svg className="h-8 w-8 text-on-surface-variant" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm font-semibold text-on-surface">
              {uploadPending ? "Enviando..." : "Arraste aqui ou clique para selecionar os arquivos"}
            </p>
            <p className="text-xs text-on-surface-variant">PDF · máximo 10 arquivos</p>
            <input
              accept="application/pdf"
              className="sr-only"
              disabled={uploadPending}
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              type="file"
            />
          </label>

          {uploadMessage && (
            <p className="mt-3 text-sm text-primary">{uploadMessage}</p>
          )}

          {documents.length > 0 && (
            <div className="mt-6 space-y-3">
              {documents.map((document) => (
                <a
                  className="flex items-center justify-between rounded-lg bg-surface-container-low px-4 py-3 text-sm text-primary transition hover:bg-surface-container"
                  href={document.url}
                  key={document.id}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span>{document.name}</span>
                  <span className="text-xs text-on-surface-variant">{(document.size / 1024 / 1024).toFixed(2)} MB</span>
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Bottom bar */}
      <div className="sticky bottom-6 z-10 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-surface-container-low px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-on-surface-variant">
            {saveMessage}
          </span>
          {!readOnly && (
            <button
              className="rounded-full border border-primary px-4 py-2 text-xs font-bold text-primary transition hover:bg-primary/10 disabled:opacity-50"
              disabled={savePending || !Object.keys(answers).length}
              onClick={saveDraft}
              type="button"
            >
              {savePending ? "Salvando..." : "Salvar rascunho"}
            </button>
          )}
        </div>
        <button
          className="rounded-lg bg-institutional-gradient px-6 py-3 text-sm font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
          disabled={readOnly || !allAnswered || submitPending}
          onClick={submit}
          type="button"
        >
          {readOnly ? "Formulário bloqueado" : submitPending ? "Enviando..." : "Concluir e enviar"}
        </button>
      </div>
    </div>
  );
}

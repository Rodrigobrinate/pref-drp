"use client";

import { EmploymentType } from "@prisma/client";
import { useRouter } from "next/navigation";
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
  questions: Question[];
  initialAnswers: Record<string, string>;
  initialDocuments: DocumentItem[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
  const [saveMessage, setSaveMessage] = useState("Alterações sincronizadas.");
  const [uploadMessage, setUploadMessage] = useState("");
  const [submitPending, startSubmit] = useTransition();
  const [uploadPending, startUpload] = useTransition();
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allAnswered = questions.length > 0 && questions.every((question) => Boolean(answers[question.id]));

  const projectedScore = useMemo(() => {
    const selectedMap = new Map<string, number>();
    questions.forEach((question) => {
      question.options.forEach((option) => selectedMap.set(option.id, option.score));
    });

    return Object.values(answers).reduce((sum, optionId) => sum + (selectedMap.get(optionId) ?? 0), 0);
  }, [answers, questions]);

  useEffect(() => {
    if (phase !== "self" || readOnly || !Object.keys(answers).length) {
      return;
    }

    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }

    saveTimeout.current = setTimeout(async () => {
      try {
        const response = await saveDraftAction({
          evaluationId,
          answers,
        });

        setSaveMessage(response.message);

        if (response.ok) {
          router.refresh();
        }
      } catch {
        setSaveMessage("Erro ao salvar rascunho. Tente novamente.");
      }
    }, 900);

    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, [answers, evaluationId, phase, readOnly, router]);

  function handleUpload(files: FileList | null) {
    if (!files?.length) {
      return;
    }

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
        setUploadMessage(`${response.documents.length} documento(s) enviado(s) ao Supabase Storage.`);
      } catch {
        setUploadMessage("Erro ao enviar documento. Tente novamente.");
      }
    });
  }

  function submit() {
    startSubmit(async () => {
      const response = await submitEvaluationAction({
        evaluationId,
        phase,
        answers,
      });

      if (!response.ok) {
        setSaveMessage(response.message);
        return;
      }

      router.push(response.redirectTo);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
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
              {actorName} · {employmentType === EmploymentType.EFETIVO ? "Servidor efetivo" : "Servidor probatório"} · status atual {status.replaceAll("_", " ").toLowerCase()}.
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/70">Pontuação</p>
            <p className="mt-2 font-headline text-5xl font-black">
              {formatScore(projectedScore || currentScore)} <span className="text-2xl text-white/70">/ {formatScore(maxScore)}</span>
            </p>
          </div>
        </div>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
      </section>

      <section className="flex flex-wrap items-center gap-4">
        <div className="rounded-full bg-surface-container px-4 py-2 text-xs font-bold text-on-secondary-container">
          {saveMessage}
        </div>
        {phase === "self" && employmentType === EmploymentType.EFETIVO ? (
          <label className="cursor-pointer rounded-full bg-primary px-4 py-2 text-xs font-bold text-on-primary">
            {uploadPending ? "Enviando PDFs..." : "Enviar comprovantes PDF"}
            <input accept="application/pdf" className="sr-only" multiple onChange={(event) => handleUpload(event.target.files)} type="file" />
          </label>
        ) : null}
        {uploadMessage ? <div className="text-xs text-primary">{uploadMessage}</div> : null}
      </section>

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
                          setAnswers((current) => ({
                            ...current,
                            [question.id]: option.id,
                          }));
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

      {phase === "self" && employmentType === EmploymentType.EFETIVO ? (
        <section className="institutional-card p-8">
          <h3 className="font-headline text-2xl font-bold text-primary">Comprovantes enviados</h3>
          <div className="mt-6 space-y-3">
            {documents.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Nenhum PDF anexado até o momento.</p>
            ) : (
              documents.map((document) => (
                <a
                  className="flex items-center justify-between rounded-lg bg-surface-container-low px-4 py-3 text-sm text-primary transition hover:bg-surface-container"
                  href={document.url}
                  key={document.id}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span>{document.name}</span>
                  <span>{(document.size / 1024 / 1024).toFixed(2)} MB</span>
                </a>
              ))
            )}
          </div>
        </section>
      ) : null}

      <div className="sticky bottom-6 z-10 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-surface-container-low px-6 py-4">
        <div className="text-sm text-on-surface-variant">
          {allAnswered ? "Checklist completo para envio." : "Preencha todos os fatores obrigatórios antes de concluir."}
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

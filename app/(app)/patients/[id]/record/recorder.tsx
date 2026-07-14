"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Existing = {
  id: string;
  transcript_raw: string | null;
  transcript_corrige: string | null;
  audio_path: string | null;
} | null;

type Phase = "idle" | "recording" | "processing" | "review";

export default function Recorder({
  patientId,
  patientName,
  existing,
}: {
  patientId: string;
  patientName: string;
  existing: Existing;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [phase, setPhase] = useState<Phase>(existing ? "review" : "idle");
  const [text, setText] = useState(existing?.transcript_corrige ?? existing?.transcript_raw ?? "");
  const [passageId, setPassageId] = useState<string | null>(existing?.id ?? null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const [liveText, setLiveText] = useState("");

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Reconnaissance vocale intégrée au navigateur (démo, données fictives).
  const recognitionRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const transcriptRef = useRef<string>("");

  // Charge l'audio existant (mode "relire et valider")
  useEffect(() => {
    async function loadAudio() {
      if (existing?.audio_path) {
        const { data } = await supabase.storage
          .from("passages-audio")
          .createSignedUrl(existing.audio_path, 3600);
        if (data?.signedUrl) setAudioUrl(data.signedUrl);
      }
    }
    loadAudio();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startSpeechRecognition() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return; // navigateur sans reconnaissance vocale -> saisie manuelle
    transcriptRef.current = "";
    setLiveText("");
    const recog = new SR();
    recog.lang = "fr-FR";
    recog.continuous = true;
    recog.interimResults = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recog.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) transcriptRef.current += res[0].transcript;
        else interim += res[0].transcript;
      }
      setLiveText((transcriptRef.current + " " + interim).trim());
    };
    recog.onerror = () => {};
    recognitionRef.current = recog;
    try {
      recog.start();
    } catch {
      /* déjà démarrée */
    }
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        void handleRecorded(blob);
      };
      rec.start();
      mediaRef.current = rec;
      startSpeechRecognition();
      setPhase("recording");
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      setError("Micro inaccessible. Autorisez l'accès au microphone.");
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    mediaRef.current?.stop();
    setPhase("processing");
  }

  async function handleRecorded(blob: Blob) {
    setAudioUrl(URL.createObjectURL(blob));
    try {
      const { data: profile } = await supabase.from("profiles").select("cabinet_id").single();
      const { data: userData } = await supabase.auth.getUser();
      if (!profile?.cabinet_id || !userData.user) throw new Error("Session invalide");

      // 1. Créer le passage (brouillon) pour obtenir un id
      const { data: passage, error: insErr } = await supabase
        .from("passages")
        .insert({
          patient_id: patientId,
          cabinet_id: profile.cabinet_id,
          auteur_id: userData.user.id,
        })
        .select("id")
        .single();
      if (insErr || !passage) throw new Error(insErr?.message ?? "Création du passage impossible");
      setPassageId(passage.id);

      // 2. Uploader l'audio dans le bucket (chemin <cabinet>/<passage>.webm)
      const path = `${profile.cabinet_id}/${passage.id}.webm`;
      const { error: upErr } = await supabase.storage
        .from("passages-audio")
        .upload(path, blob, { contentType: "audio/webm", upsert: true });
      if (upErr) throw new Error(upErr.message);

      // 3. Transcription : d'abord le texte reconnu par le navigateur (démo).
      let raw = transcriptRef.current.trim();
      if (!raw) {
        // Repli : moteur serveur (OpenAI Whisper) si une clé est configurée.
        const form = new FormData();
        form.append("audio", blob, "passage.webm");
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        const tr = await res.json();
        raw = tr.text ?? "";
        setNote(
          raw
            ? null
            : "Dictée non captée. Vérifiez le micro / la langue du navigateur, ou saisissez le texte à la main."
        );
      }

      // 4. Enregistrer chemin audio + transcription brute
      await supabase
        .from("passages")
        .update({ audio_path: path, transcript_raw: raw })
        .eq("id", passage.id);

      setText(raw);
      setPhase("review");
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
      setPhase("review");
    }
  }

  // Validation du passage : rien n'est définitif avant ce clic
  async function validate() {
    if (!passageId) {
      setError("Aucun passage à valider.");
      return;
    }
    setSaving(true);
    setError(null);

    const { data: profile } = await supabase.from("profiles").select("cabinet_id").single();

    const { error: updErr } = await supabase
      .from("passages")
      .update({
        transcript_corrige: text,
        statut: "valide",
        valide_at: new Date().toISOString(),
      })
      .eq("id", passageId);

    if (updErr) {
      setSaving(false);
      setError(updErr.message);
      return;
    }

    if (profile?.cabinet_id) {
      await supabase.from("audit_log").insert({
        cabinet_id: profile.cabinet_id,
        acteur_id: (await supabase.auth.getUser()).data.user?.id,
        action: "passage.valide",
        cible_type: "passage",
        cible_id: passageId,
      });
    }

    setSaving(false);
    router.push(`/patients/${patientId}`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Dictée</h1>
        <p className="text-sm text-slate-500">{patientName}</p>
      </div>

      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-10">
          <button
            onClick={startRecording}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-brand text-3xl text-white shadow-lg"
          >
            🎙️
          </button>
          <p className="text-sm text-slate-500">Toucher pour démarrer la dictée</p>
        </div>
      )}

      {phase === "recording" && (
        <div className="flex flex-col items-center gap-4 py-10">
          <button
            onClick={stopRecording}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-red-600 text-2xl text-white shadow-lg animate-pulse"
          >
            ⏹️
          </button>
          <p className="font-mono text-lg text-slate-700">
            {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
            {String(elapsed % 60).padStart(2, "0")}
          </p>
          <p className="text-sm text-slate-500">Enregistrement… touchez pour arrêter</p>
          {liveText && (
            <p className="mt-2 w-full rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              {liveText}
            </p>
          )}
        </div>
      )}

      {phase === "processing" && (
        <div className="py-16 text-center text-slate-500">Transcription en cours…</div>
      )}

      {phase === "review" && (
        <div className="space-y-3">
          {note && <p className="rounded bg-slate-100 p-2 text-xs text-slate-500">{note}</p>}
          {audioUrl && (
            <audio controls src={audioUrl} className="w-full">
              Lecture audio non supportée.
            </audio>
          )}
          <label className="block text-sm font-medium text-slate-600">
            Relecture et correction
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="Texte de la transmission… (corrigez avant de valider)"
            className="w-full rounded-lg border border-slate-300 p-3 text-sm"
          />
          <p className="text-xs text-amber-700">
            ⚠️ Vérifiez soigneusement les posologies et les chiffres avant de valider.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={validate}
              disabled={saving || !text.trim()}
              className="flex-1 rounded-lg bg-brand py-2.5 font-medium text-white disabled:opacity-50"
            >
              {saving ? "…" : "Valider le passage"}
            </button>
            <button
              onClick={() => router.push(`/patients/${patientId}`)}
              className="rounded-lg border px-4 py-2.5 text-sm"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

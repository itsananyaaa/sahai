import React, { useState } from "react";
import { Mic, MicOff, Check, X, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  onTranscriptConfirmed: (text: string) => void;
  className?: string;
}

export const VoiceInputButton: React.FC<Props> = ({ onTranscriptConfirmed, className = "" }) => {
  const { t, i18n } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [supported, setSupported] = useState(true);

  // Map app language to BCP 47 locale for speech recognition
  const langMap: Record<string, string> = {
    en: "en-IN",
    hi: "hi-IN",
    ml: "ml-IN",
    ta: "ta-IN",
    te: "te-IN"
  };

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      setShowModal(true);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = langMap[i18n.language.slice(0, 2)] || "en-IN";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setShowModal(true);
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setSupported(false);
      setShowModal(true);
    }
  };

  const handleConfirm = () => {
    if (transcript.trim()) {
      onTranscriptConfirmed(transcript.trim());
    }
    setShowModal(false);
    setTranscript("");
  };

  return (
    <>
      <button
        type="button"
        onClick={startListening}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
          isListening
            ? "bg-brand text-white border-brand animate-pulse"
            : "bg-surface border-border text-textSecondary hover:text-textPrimary hover:bg-surfaceHover"
        } ${className}`}
        title="Assistive Voice Entry"
      >
        <Mic className={`w-3.5 h-3.5 ${isListening ? "text-white" : "text-brand"}`} />
        <span>{isListening ? t("visit.voice_listening") : t("visit.voice_input_btn")}</span>
      </button>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl p-5 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h4 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                <Mic className="w-4 h-4 text-brand" />
                {t("visit.voice_input_btn")}
              </h4>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-textSecondary hover:text-textPrimary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4">
              <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/50 mb-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300 leading-relaxed">
                  {t("visit.voice_notice")}
                </p>
              </div>

              {!supported ? (
                <p className="text-sm text-textSecondary py-4 text-center">
                  Web Speech API is not supported in this browser. Please use keyboard entry.
                </p>
              ) : isListening ? (
                <div className="py-8 flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand/20 border border-brand flex items-center justify-center animate-ping">
                    <Mic className="w-6 h-6 text-brand" />
                  </div>
                  <span className="text-xs text-textSecondary animate-pulse">
                    {t("visit.voice_listening")}
                  </span>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider block mb-1">
                    Editable Transcript Preview
                  </label>
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    rows={3}
                    placeholder="Transcript will appear here. You can edit it manually before inserting."
                    className="w-full bg-background border border-border rounded-xl p-3 text-sm text-textPrimary focus:outline-none focus:border-brand resize-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-textSecondary hover:bg-surfaceHover transition-colors"
              >
                {t("common.cancel")}
              </button>
              {supported && (
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!transcript.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brand hover:bg-brand-hover text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Insert Into Form
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

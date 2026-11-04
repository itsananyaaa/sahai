import React from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, SupportedLanguageCode } from "../i18n";
import { Globe } from "lucide-react";

interface Props {
  className?: string;
  compact?: boolean;
}

export const LanguageSwitcher: React.FC<Props> = ({ className = "", compact = false }) => {
  const { i18n } = useTranslation();

  const handleSelect = (code: SupportedLanguageCode) => {
    i18n.changeLanguage(code);
  };

  return (
    <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
      <Globe className="w-4 h-4 text-textSecondary" />
      <select
        value={i18n.language.slice(0, 2)}
        onChange={(e) => handleSelect(e.target.value as SupportedLanguageCode)}
        className="bg-surface border border-border text-textPrimary text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand cursor-pointer hover:bg-surfaceHover transition-colors"
        aria-label="Select Interface Language"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName} ({lang.name})
          </option>
        ))}
      </select>
    </div>
  );
};

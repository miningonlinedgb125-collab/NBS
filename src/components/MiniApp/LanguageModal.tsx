import React, { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../../i18n/translations';
import { Globe, Check, X, Sparkles } from 'lucide-react';

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFirstTime?: boolean;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({
  isOpen,
  onClose,
  isFirstTime = false,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(language);

  if (!isOpen) return null;

  const handleConfirm = () => {
    setLanguage(selectedLang);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0d1424] border border-cyan-500/40 rounded-3xl shadow-2xl shadow-cyan-950/70 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-[#101932]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {t('selectLanguageTitle')}
              </h2>
              <p className="text-xs text-slate-400">
                {isFirstTime ? t('welcomeChooseLang') : t('choosePrefLang')}
              </p>
            </div>
          </div>
          {!isFirstTime && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Language Options List */}
        <div className="p-4 sm:p-5 space-y-2.5">
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            {t('selectLanguageDesc')}
          </p>

          <div className="space-y-2">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = selectedLang === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setSelectedLang(lang.code)}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-950/80 to-blue-950/60 border-cyan-400/80 text-white shadow-lg shadow-cyan-950/40'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{lang.flag}</span>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        {lang.nativeName}
                        {isSelected && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                            {t('selected')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">{lang.name}</div>
                    </div>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-cyan-500 border-cyan-400 text-black'
                        : 'border-slate-700 bg-slate-800/40 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Confirm Button */}
          <div className="pt-3">
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 active:scale-[0.99] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/30 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              {t('confirmLanguageBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

'use client';
/* eslint-disable @next/next/no-html-link-for-pages -- Vinext production navigation needs full-page anchors. */

import { Folder, LogOut, Moon, Phone, Sun } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, SheetContent, DialogTitle } from '../../shared/ui/dialog';
import { Button } from '../../shared/ui/button';
import { LOCALES, type Copy, type Locale } from '../../shared/i18n/copy';
import { useCopy } from '../../shared/i18n/use-locale';
import { clearDraft } from '../../domain/draft';
import { applyTheme, type Theme } from '../../shared/theme';
import { useState, useSyncExternalStore } from 'react';

export type JourneyStep = 'account' | 'evidence' | 'details' | 'preview' | 'otp';

const LANGUAGE_MARK: Record<Locale, string> = { en: 'EN', kn: 'ಕನ್ನಡ', ta: 'தமிழ்' };

const JOURNEY_CURRENT: Record<JourneyStep, keyof Copy> = {
  account: 'accountKicker',
  evidence: 'evidenceKicker',
  details: 'detailsKicker',
  preview: 'previewKicker',
  otp: 'otpKicker',
};

const JOURNEY_NEXT: Record<JourneyStep, keyof Copy | null> = {
  account: 'detailsKicker',
  evidence: 'accountKicker',
  details: 'previewKicker',
  preview: 'otpKicker',
  otp: null,
};

export function leaveNow() {
  clearDraft();
  window.location.replace('/left');
}

function readDocumentTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function PrototypeBanner() {
  const { t } = useCopy();
  return <div className="prototype-banner">{t.prototypeBanner}</div>;
}

function subscribeTheme(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

function LanguageSwitch({ locale, setLocale, t }: { locale: Locale; setLocale: (locale: Locale) => void; t: Copy }) {
  return (
    <div className="language-switch" role="group" aria-label={t.languageLegend}>
      {LOCALES.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={locale === item.id}
          onClick={() => setLocale(item.id)}
        >
          {LANGUAGE_MARK[item.id]}
        </button>
      ))}
    </div>
  );
}

function ThemeToggle({ t }: { t: Copy }) {
  const theme = useSyncExternalStore(subscribeTheme, readDocumentTheme, () => 'dark');
  const nextLabel = theme === 'dark' ? t.themeLight : t.themeDark;
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={nextLabel}
      onClick={() => applyTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? <Sun className="icon-inline" aria-hidden="true" /> : <Moon className="icon-inline" aria-hidden="true" />}
    </button>
  );
}

export function HelplineFooter() {
  const { t } = useCopy();
  return (
    <footer className="helpline-footer">
      <div className="shell-inner helpline-inner">
        <span className="muted">{t.needHelp}</span>
        <div className="helpline-actions">
          <a href="tel:181" aria-label={`${t.womenHelpline}: 181`}>
            <Phone className="icon-inline" aria-hidden="true" />
            <span>{t.womenHelpline}</span>
            <strong>181</strong>
          </a>
          <a href="tel:112" aria-label={`${t.emergency}: 112`}>
            <Phone className="icon-inline" aria-hidden="true" />
            <span>{t.emergency}</span>
            <strong>112</strong>
          </a>
        </div>
      </div>
    </footer>
  );
}

export function SakshiChrome({
  onBrandClick,
  showStartAgain,
  onStartAgain,
  journeyStep,
}: {
  onBrandClick?: () => void;
  showStartAgain?: boolean;
  onStartAgain?: () => void;
  journeyStep?: JourneyStep;
}) {
  const { t, locale, setLocale } = useCopy();
  const [menuOpen, setMenuOpen] = useState(false);
  const [startOverOpen, setStartOverOpen] = useState(false);

  const brand = (
    <>
      <span className="brand-mark" aria-hidden="true"><span>S</span></span>
      <span className="brand-lockup">
        <span className="brand-name">Saakshi</span>
      </span>
    </>
  );

  const currentLabel = journeyStep ? t[JOURNEY_CURRENT[journeyStep]] : '';
  const nextKey = journeyStep ? JOURNEY_NEXT[journeyStep] : null;
  const journeyLine = journeyStep
    ? (nextKey ? t.journeyNext.replace('{current}', currentLabel).replace('{next}', t[nextKey]) : currentLabel)
    : '';

  return (
    <div className="chrome-stack">
      <PrototypeBanner />
      <header className="chrome-bar">
        <div className="shell-inner chrome-bar-inner">
          <div className="chrome-identity">
            <Button variant="ghost" size="inline" className="menu-trigger" aria-label={t.menu} onClick={() => setMenuOpen(true)}>
              <span className="menu-icon" aria-hidden="true"><span /><span /><span /></span>
            </Button>
            {onBrandClick ? (
              <button className="brand" type="button" onClick={onBrandClick} aria-label="Saakshi">{brand}</button>
            ) : (
              <a className="brand" href="/" aria-label="Saakshi">{brand}</a>
            )}
            <a className="chrome-file-link" href="/filed?verify=1">
              <Folder className="icon-inline" aria-hidden="true" />
              {t.fileTitle}
            </a>
          </div>
          <div className="chrome-desktop-utils">
            <LanguageSwitch locale={locale} setLocale={setLocale} t={t} />
            <ThemeToggle t={t} />
          </div>
          <div className="chrome-actions">
            {showStartAgain ? (
              <Button
                variant="link"
                size="inline"
                className="start-over-action"
                aria-label={t.startOver}
                onClick={() => setStartOverOpen(true)}
              >
                <span className="start-over-icon" aria-hidden="true">↺</span>
                <span className="start-over-label">{t.startOver}</span>
              </Button>
            ) : null}
            <Button variant="exit" size="inline" className="header-leave-action" onClick={leaveNow}>
              <LogOut className="leave-icon" aria-hidden="true" />
              {t.leave}
            </Button>
          </div>
        </div>
      </header>
      {journeyLine ? (
        <div className="journey-kicker">
          <div className="shell-inner">
            <p>{journeyLine}</p>
          </div>
        </div>
      ) : null}

      <Dialog open={startOverOpen} onOpenChange={setStartOverOpen}>
        <DialogContent aria-describedby="start-over-copy">
          <div className="start-over-dialog stack">
            <div className="stack" style={{ gap: '0.4rem' }}>
              <DialogTitle>{t.startOverTitle}</DialogTitle>
              <DialogDescription id="start-over-copy" className="muted">{t.startOverCopy}</DialogDescription>
            </div>
            <div className="start-over-dialog-actions">
              <Button variant="secondary" size="inline" onClick={() => setStartOverOpen(false)}>{t.keepDraft}</Button>
              <Button
                size="inline"
                onClick={() => {
                  setStartOverOpen(false);
                  onStartAgain?.();
                }}
              >
                {t.startOver}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent aria-describedby={undefined}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <DialogTitle>{t.menu}</DialogTitle>
            <Button variant="ghost" size="inline" onClick={() => setMenuOpen(false)}>{t.closeMenu}</Button>
          </div>
          <Button variant="secondary" asChild className="sheet-dashboard-link">
            <a href="/filed?verify=1">{t.goToDashboard}</a>
          </Button>
          <div className="sheet-controls">
            <fieldset>
              <legend className="kicker">{t.languageLegend}</legend>
              <LanguageSwitch locale={locale} setLocale={setLocale} t={t} />
            </fieldset>
            <fieldset>
              <legend className="kicker">{t.themeLabel}</legend>
              <ThemeToggle t={t} />
            </fieldset>
          </div>
        </SheetContent>
      </Dialog>
    </div>
  );
}

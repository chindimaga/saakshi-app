'use client';

import { Dialog, DialogContent, DialogDescription, SheetContent, DialogTitle } from '../../shared/ui/dialog';
import { Button } from '../../shared/ui/button';
import { LOCALES, type Locale } from '../../shared/i18n/copy';
import { useCopy } from '../../shared/i18n/use-locale';
import { clearDraft } from '../../domain/draft';
import { applyTheme, type Theme } from '../../shared/theme';
import { useEffect, useState } from 'react';

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

export function HelplineFooter() {
  const { t } = useCopy();
  return (
    <footer className="helpline-footer">
      <span className="muted">{t.needHelp}</span>
      <div className="helpline-actions">
        <a href="tel:181" aria-label={`${t.womenHelpline}: 181`}>
          <span>{t.womenHelpline}</span>
          <strong>181</strong>
        </a>
        <a href="tel:112" aria-label={`${t.emergency}: 112`}>
          <span>{t.emergency}</span>
          <strong>112</strong>
        </a>
      </div>
    </footer>
  );
}

export function SakshiChrome({
  onBrandClick,
  showStartAgain,
  onStartAgain,
}: {
  onBrandClick?: () => void;
  showStartAgain?: boolean;
  onStartAgain?: () => void;
}) {
  const { t, locale, setLocale } = useCopy();
  const [menuOpen, setMenuOpen] = useState(false);
  const [startOverOpen, setStartOverOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => { setTheme(readDocumentTheme()); }, []);

  const brand = (
    <>
      <span className="brand-mark" aria-hidden="true"><span>S</span></span>
      <span className="brand-lockup">
        <span className="brand-name">Saakshi</span>
      </span>
    </>
  );

  return (
    <>
      <PrototypeBanner />
      <header className="chrome-bar">
        <div className="chrome-identity">
          <Button variant="ghost" size="inline" className="menu-trigger" aria-label={t.menu} onClick={() => setMenuOpen(true)}>
            <span className="menu-icon" aria-hidden="true"><span /><span /><span /></span>
          </Button>
          {onBrandClick ? (
            <button className="brand" type="button" onClick={onBrandClick} aria-label="Saakshi">{brand}</button>
          ) : (
            <a className="brand" href="/" aria-label="Saakshi">{brand}</a>
          )}
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
          <Button variant="exit" size="inline" className="header-leave-action" onClick={leaveNow}>{t.leave}</Button>
        </div>
      </header>

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
          <Button variant="secondary" asChild>
            <a href="/filed?verify=1">{t.goToDashboard}</a>
          </Button>
          <fieldset>
            <legend className="kicker">{t.themeLabel}</legend>
            <div className="stack">
              <Button variant={theme === 'dark' ? 'default' : 'secondary'} onClick={() => { applyTheme('dark'); setTheme('dark'); }}>{t.themeDark}</Button>
              <Button variant={theme === 'light' ? 'default' : 'secondary'} onClick={() => { applyTheme('light'); setTheme('light'); }}>{t.themeLight}</Button>
            </div>
          </fieldset>
          <fieldset>
            <legend className="kicker">{t.languageLegend}</legend>
            <div className="stack">
              {LOCALES.map((item) => (
                <Button key={item.id} variant={locale === item.id ? 'default' : 'secondary'} onClick={() => setLocale(item.id as Locale)}>
                  {item.native} · {item.latin}
                </Button>
              ))}
            </div>
          </fieldset>
        </SheetContent>
      </Dialog>
    </>
  );
}

'use client';

import { HelplineFooter, SakshiChrome } from '../../features/chrome/sakshi-chrome';
import { Button } from '../../shared/ui/button';
import { useCopy } from '../../shared/i18n/use-locale';

export default function HelpPage() {
  const { t } = useCopy();
  return (
    <div className="site-shell">
      <SakshiChrome />
      <main className="page-main stack">
        <p className="kicker">Help</p>
        <h1>{t.helpTitle}</h1>
        <p>This is an independent hackathon prototype. It helps you prepare and keep a file; it does not file a complaint for you.</p>
        <article className="card"><strong>Leave quickly</strong><p>{t.leaveHint} Leaving does not erase browser history.</p></article>
        <article className="card"><strong>Your words and files</strong><p>Type your account, edit it, and decide when to continue. Files you add after saving stay in this private prototype vault; they are not sent to the official portal.</p></article>
        <article className="card"><strong>Suggestions are yours to change</strong><p>Saakshi can suggest a complaint type from what you wrote. You can change it or leave details blank.</p></article>
        <article className="card"><strong>Need help now?</strong><p>The helpline actions below are real. This prototype does not make a call or contact anyone for you.</p></article>
        <Button variant="secondary" asChild><a href="/">{t.back}</a></Button>
      </main>
      <HelplineFooter />
    </div>
  );
}

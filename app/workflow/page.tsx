'use client';
/* eslint-disable @next/next/no-html-link-for-pages -- Vinext production navigation needs full-page anchors. */

import { HelplineFooter, SakshiChrome } from '../../features/chrome/sakshi-chrome';
import { Button } from '../../shared/ui/button';
import { useCopy } from '../../shared/i18n/use-locale';

export default function WorkflowPage() {
  const { t } = useCopy();
  return (
    <div className="site-shell">
      <SakshiChrome />
      <main className="page-main stack">
        <p className="kicker">Before you begin</p>
        <h1>{t.workflowTitle}</h1>
        <p>Start where you can. You stay in control of the words, details, and file.</p>
        <section className="stack workflow-steps">
          <article className="card"><strong>Your words</strong><p>Speak or type what happened. Edit anything before you continue.</p></article>
          <article className="card"><strong>What you have</strong><p>Add evidence if you have it. Unknown details can stay unknown, and you can add more later.</p></article>
          <article className="card"><strong>Check the details</strong><p>Saakshi suggests a complaint type and pre-fills details. You can change every suggestion.</p></article>
          <article className="card"><strong>Your file</strong><p>Review and save a file you can keep. Saakshi does not submit it to the official portal.</p></article>
        </section>
        <Button asChild><a href="/">{t.doorTell}</a></Button>
      </main>
      <HelplineFooter />
    </div>
  );
}

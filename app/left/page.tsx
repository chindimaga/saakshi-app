'use client';

import { useEffect } from 'react';
import { clearDraft } from '../../domain/draft';
import { useCopy } from '../../shared/i18n/use-locale';

export default function LeftPage() {
  const { t } = useCopy();
  useEffect(() => { clearDraft(); }, []);
  return (
    <main className="page-main">
      <h1>{t.notesTitle}</h1>
      <p>{t.notesCopy}</p>
    </main>
  );
}

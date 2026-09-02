'use client';

import { Button } from '../../shared/ui/button';
import { useCopy } from '../../shared/i18n/use-locale';
import { leaveNow } from '../chrome/sakshi-chrome';

export function CrisisOverlay({ onStartAgain }: { onStartAgain: () => void }) {
  const { t } = useCopy();
  return (
    <main className="page-main stack">
      <p className="kicker">{t.crisisKicker}</p>
      <h1>{t.crisisTitle}</h1>
      <p>{t.crisisCopy}</p>
      <Button asChild><a href="tel:181">{t.call181}</a></Button>
      <Button variant="secondary" asChild><a href="tel:112">{t.call112}</a></Button>
      <Button variant="secondary" asChild><a href="tel:1930">Call 1930</a></Button>
      <p className="muted">{t.crisisFine}</p>
      <Button variant="ghost" onClick={onStartAgain}>{t.startAgain}</Button>
      <Button variant="exit" onClick={leaveNow}>{t.leave}</Button>
    </main>
  );
}

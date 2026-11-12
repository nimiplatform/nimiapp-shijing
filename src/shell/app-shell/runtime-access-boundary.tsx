import { useNimiAppSession, NimiAppAccessGate, NimiAccountControl, type NimiAppSessionSnapshot } from '@nimiplatform/kit/auth/app';
import { AmbientBackground, Button, Surface } from '@nimiplatform/kit/ui';
import { useTranslation } from 'react-i18next';
import { ProductArea } from '../routes/product-area.js';
import type { ShijingPlatform } from '../mount-shijing.js';
import { getProductCopy } from '../../product/i18n/copy.ts';

// @nimi-authority: rule.shijing.product.r016
export function RuntimeAccessBoundary({ platform }: { platform: ShijingPlatform }) {
  const { session } = useNimiAppSession();
  const { t, i18n } = useTranslation();
  const language = i18n.language.startsWith('zh') ? 'zh' : 'en';
  function nativeFailure(snapshot: NimiAppSessionSnapshot) {
    return <AmbientBackground variant="mesh" className="shijing-protected-gate">
      <Surface tone="panel" elevation="raised" padding="lg" className="shijing-protected-gate__panel" data-testid="shijing-runtime-access-failure">
        <h1>{t('Shell.accessTitle')}</h1>
        <p role="status">{snapshot.identity.status === 'checking' ? t('LocalDevelopment.checking') : t('Shell.accessDetail')}</p>
        {snapshot.issue && <details className="shijing-protected-gate__technical"><summary>{t('Shell.technicalDetails')}</summary>
          <p>{snapshot.issue.message}</p><code>{snapshot.issue.reasonCode}</code><code>{snapshot.issue.actionHint}</code>
        </details>}
        <Button onClick={() => void session.recheck()}>{t('Shell.retry')}</Button>
        <NimiAccountControl language={language} />
      </Surface>
    </AmbientBackground>;
  }
  return <NimiAppAccessGate language={language} title={getProductCopy(language).brandName} externalAccountControl={platform.kind !== 'desktop'} fallback={platform.kind === 'desktop' ? nativeFailure : undefined}>
    {scope => <ProductArea scope={scope} openOwnerConfiguration={platform.kind === 'desktop' ? platform.openConfiguration : undefined} />}
  </NimiAppAccessGate>;
}

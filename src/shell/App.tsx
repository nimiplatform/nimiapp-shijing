import { RuntimeAccessBoundary } from './app-shell/runtime-access-boundary.js';
import { useEffect } from 'react';
import { NimiAppChrome } from '@nimiplatform/kit/ui/app-chrome';
import { NimiAccountControl, useNimiAppSession } from '@nimiplatform/kit/auth/app';
import { useTranslation } from 'react-i18next';
import appPackage from '../../package.json';
import { ShijingNavigationProvider, useShijingDestination, useShijingNavigation } from '../product/navigation/app-navigation.tsx';
import type { ShijingPlatform } from './mount-shijing.js';

export function App({ platform }: { platform: ShijingPlatform }) {
  return <ShijingNavigationProvider><AppFrame platform={platform} /></ShijingNavigationProvider>;
}
function AppFrame({ platform }: { platform: ShijingPlatform }) {
  const owner = useShijingNavigation(), destination = useShijingDestination();
  const { i18n } = useTranslation(); const { snapshot } = useNimiAppSession();
  const ready = snapshot.runtime.status === 'connected';
  const language = i18n.language.startsWith('zh') ? 'zh' : 'en';
  useEffect(() => { if (!ready) owner.reset(); }, [ready, owner.reset]);
  return <div className="shijing-window-frame">
    {platform.kind === 'desktop' ? <NimiAppChrome metadata={{ name: '时镜 ShiJing', version: appPackage.version, license: appPackage.license }} locale={language}
      navigation={owner.navigation} navigationEnabled={ready}
      sidebar={ready && destination.id === 'shijing' && owner.railAvailable ? { visible: owner.sidebarVisible, onVisibleChange: owner.setSidebarVisible } : undefined} />
      : <header className="shijing-web-account"><NimiAccountControl language={language} hideSignedOut /></header>}
    <div className="shijing-window-content"><RuntimeAccessBoundary platform={platform} /></div>
  </div>;
}

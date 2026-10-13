import { RuntimeAccessBoundary } from './app-shell/runtime-access-boundary.js';
import { useEffect } from 'react';
import { NimiAppChrome } from '@nimiplatform/kit/ui/app-chrome';
import { useTranslation } from 'react-i18next';
import appPackage from '../../package.json';
import { ShijingNavigationProvider, useShijingDestination, useShijingNavigation } from '../product/navigation/app-navigation.tsx';
import { useAppStore } from './app-shell/app-store.js';

export function App() {
  return <ShijingNavigationProvider><AppFrame /></ShijingNavigationProvider>;
}

function AppFrame() {
  const owner = useShijingNavigation(), destination = useShijingDestination();
  const { i18n } = useTranslation();
  const ready = useAppStore(state => state.bootstrapReady && !state.sessionInvalidated);
  useEffect(() => { if (!ready) owner.reset(); }, [ready, owner.reset]);
  return <div className="shijing-window-frame">
    <NimiAppChrome metadata={{ name: '时镜 ShiJing', version: appPackage.version, license: appPackage.license }} locale={i18n.language.startsWith('zh') ? 'zh' : 'en'}
      navigation={owner.navigation} navigationEnabled={ready}
      sidebar={ready && destination.id === 'shijing' && owner.railAvailable ? { visible: owner.sidebarVisible, onVisibleChange: owner.setSidebarVisible } : undefined} />
    <div className="shijing-window-content"><RuntimeAccessBoundary /></div>
  </div>;
}

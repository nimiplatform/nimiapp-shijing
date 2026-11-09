import { createWebNimiAppSession, type NimiRemoteAppConfig } from '@nimiplatform/kit/auth/app/web';
import { mountShijing } from './shell/mount-shijing.js';
import './web.css';
declare const __NIMI_APP_WEB_CONFIG__: NimiRemoteAppConfig;
const dispose = mountShijing(createWebNimiAppSession(__NIMI_APP_WEB_CONFIG__), { kind: 'web' });
if (import.meta.hot) import.meta.hot.dispose(dispose);

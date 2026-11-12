import { createMobileNimiAppSession } from '@nimiplatform/kit/auth/app/mobile';
import type { NimiRemoteAppConfig } from '@nimiplatform/kit/core/app-session';
import { mountShijing } from './shell/mount-shijing.js';
import './web.css';

declare const __NIMI_APP_MOBILE_CONFIG__: Omit<NimiRemoteAppConfig, 'fetch'>;

// @nimi-authority: rule.shijing.product.r011
const dispose = mountShijing(createMobileNimiAppSession(__NIMI_APP_MOBILE_CONFIG__), { kind: 'mobile' });
if (import.meta.hot) import.meta.hot.dispose(dispose);

import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from './app-shell/auth-provider.js';
import { ShellLayout } from './app-shell/shell-layout.js';

const ProductArea = lazy(() =>
  import('./routes/product-area.js').then((module) => ({ default: module.ProductArea })),
);

export function App() {
  const { t } = useTranslation();
  return (
    <AuthProvider>
      <ShellLayout>
        <Suspense
          fallback={
            <div className="shijing-route-loading" role="status">
              {t('Shell.loadingShijing')}
            </div>
          }
        >
          <ProductArea />
        </Suspense>
      </ShellLayout>
    </AuthProvider>
  );
}

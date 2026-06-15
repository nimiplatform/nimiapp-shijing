import { lazy, Suspense } from 'react';
import { AuthProvider } from './app-shell/auth-provider.js';
import { ShellLayout } from './app-shell/shell-layout.js';

const ProductArea = lazy(() =>
  import('./routes/product-area.js').then((module) => ({ default: module.ProductArea })),
);

export function App() {
  return (
    <AuthProvider>
      <ShellLayout>
        <Suspense
          fallback={
            <div className="shijing-route-loading" role="status">
              正在加载时镜…
            </div>
          }
        >
          <ProductArea />
        </Suspense>
      </ShellLayout>
    </AuthProvider>
  );
}

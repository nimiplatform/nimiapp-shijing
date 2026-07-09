import { useTranslation } from 'react-i18next';

const shijingLogoUrl = new URL('../../../../src-tauri/icons/128x128@2x.png', import.meta.url).href;

type ShijingLaunchPageProps = {
  readonly onEnter: () => void;
};

export function ShijingLaunchPage({ onEnter }: ShijingLaunchPageProps) {
  const { t } = useTranslation();

  return (
    <main
      data-testid="shijing-launch-page"
      className="min-h-screen bg-[#0f1115] text-white flex items-center justify-center"
    >
      <button
        type="button"
        data-testid="shijing-launch-trigger"
        aria-label={t('Auth.enterShijing')}
        onClick={onEnter}
        className="flex flex-col items-center gap-5"
      >
        <img
          src={shijingLogoUrl}
          alt="ShiJing"
          draggable={false}
          className="h-28 w-28 rounded-2xl object-cover"
        />
        <span className="text-xs uppercase text-white/64">ShiJing</span>
      </button>
    </main>
  );
}

export function ShijingLoginPage() {
  return <ShijingLaunchPage onEnter={() => {}} />;
}

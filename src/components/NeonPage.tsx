import type { ReactNode } from 'react';

interface NeonPageProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  disableTopGlow?: boolean;
  disableBottomGlow?: boolean;
}

export function NeonPage({
  children,
  className,
  contentClassName = 'max-w-7xl mx-auto px-6 py-8',
  disableTopGlow,
  disableBottomGlow,
}: NeonPageProps) {
  const rootClassName = ['neon-page', className].filter(Boolean).join(' ');
  const contentClassNames = ['neon-page__content', contentClassName]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName}>
      <div className="neon-page__grid" />
      {!disableTopGlow && <div className="neon-page__glow neon-page__glow--top" />}
      {!disableBottomGlow && <div className="neon-page__glow neon-page__glow--bottom" />}
      <div className={contentClassNames}>{children}</div>
    </div>
  );
}

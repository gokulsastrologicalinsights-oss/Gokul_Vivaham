import Image from 'next/image';

type BrandLogoProps = {
  size?: 'default' | 'compact' | 'large';
  iconOnly?: boolean;
};

/** Shared bilingual lockup. The emblem is decorative beside the readable name. */
export default function BrandLogo({ size = 'default', iconOnly = false }: BrandLogoProps) {
  return (
    <span className={`brand-lockup brand-lockup--${size}${iconOnly ? ' brand-lockup--icon-only' : ''}`}>
      <Image
        src="/brand/gokul-vivaham-emblem.svg"
        alt=""
        aria-hidden="true"
        loading="eager"
        width={548}
        height={457}
        className="brand-lockup__emblem"
      />
      <span className={iconOnly ? 'sr-only' : 'brand-lockup__names'}>
        <span className="brand-lockup__english" lang="en">Gokul Vivaham</span>
        <span className="brand-lockup__tamil" lang="ta">கோகுல் விவாஹம்</span>
        {!iconOnly && (
          <span className="brand-lockup__ornament" aria-hidden="true">
            <svg viewBox="0 0 30 18" width="16" height="10" fill="currentColor">
              <path d="M15 16C8 9 12 3 15 0c4 5 7 10 0 16ZM12 18C4 18 1 13 0 8c7 0 11 3 12 10Zm6 0c1-7 5-10 12-10-1 5-4 10-12 10Z" />
            </svg>
          </span>
        )}
      </span>
    </span>
  );
}

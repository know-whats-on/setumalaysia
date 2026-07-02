import svgPaths from "./svg-5rwfhpjl5y";

export default function Rectangle() {
  return (
    <div className="relative size-full">
      <div className="absolute inset-[-7.55%_-5.93%_-8.55%_-5.93%]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1208 923">
          <g filter="url(#filter0_d_41_4475)" id="Rectangle 31">
            <path d={svgPaths.p248a7e80} fill="var(--fill-0, white)" />
          </g>
          <defs>
            <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="923" id="filter0_d_41_4475" width="1208" x="0" y="0">
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
              <feMorphology in="SourceAlpha" operator="dilate" radius="20" result="effect1_dropShadow_41_4475" />
              <feOffset dy="4" />
              <feGaussianBlur stdDeviation="22" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0" />
              <feBlend in2="BackgroundImageFix" mode="normal" result="effect1_dropShadow_41_4475" />
              <feBlend in="SourceGraphic" in2="effect1_dropShadow_41_4475" mode="normal" result="shape" />
            </filter>
          </defs>
        </svg>
      </div>
    </div>
  );
}
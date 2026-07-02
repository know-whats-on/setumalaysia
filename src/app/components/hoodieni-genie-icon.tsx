type HoodieniGenieIconProps = {
  className?: string;
  strokeWidth?: number;
};

export function HoodieniGenieIcon({
  className = 'h-5 w-5',
  strokeWidth = 1.9,
}: HoodieniGenieIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M26 37C26 28.716 32.716 22 41 22C49.284 22 56 28.716 56 37C56 45.284 49.284 52 41 52H33.5C30.1 52 27 54.4 26 57.5C23.8 52.8 20 49.5 15.5 47.8C21.2 45.5 26 41.8 26 37Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M34.5 31.5C36.4 29.9 39.4 29.9 41.3 31.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M44.7 31.5C46.6 29.9 49.6 29.9 51.5 31.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M38 40.5C40.2 42.5 43.7 42.5 46 40.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M18.5 46.5C17.9 40.7 19.6 35.7 23.6 31.4C26.6 28.1 30.5 25.9 34.8 24.6"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 52C20.8 50.5 24.7 52.4 27.2 56.8"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M51 12L52.55 16.45L57 18L52.55 19.55L51 24L49.45 19.55L45 18L49.45 16.45L51 12Z"
        fill="currentColor"
      />
    </svg>
  );
}

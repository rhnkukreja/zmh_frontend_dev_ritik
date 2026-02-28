import * as lucideIcons from "lucide-react";
import { twMerge } from "tailwind-merge";

export const { icons } = lucideIcons;

type CustomIconName = "ShieldUser";
export type AppIconName = keyof typeof icons | CustomIconName;

const customIcons: Record<CustomIconName, React.ComponentType<React.ComponentPropsWithoutRef<"svg">>> = {
  ShieldUser: ({ className, ...props }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3z" />
      <circle cx="12" cy="9" r="2.25" />
      <path d="M8.75 15c.7-1.35 2-2.25 3.25-2.25S14.55 13.65 15.25 15" />
    </svg>
  ),
};

interface LucideProps extends React.ComponentPropsWithoutRef<"svg"> {
  icon: AppIconName;
  title?: string;
}

function Lucide(props: LucideProps) {
  const { icon, className, ...computedProps } = props;
  const Component =
    (icons[props.icon as keyof typeof icons] as React.ComponentType<React.ComponentPropsWithoutRef<"svg">> | undefined) ||
    customIcons[props.icon as CustomIconName];

  if (!Component) {
    return null;
  }

  return (
    <Component
      {...computedProps}
      className={twMerge(["stroke-[1] w-5 h-5", props.className])}
    />
  );
}

export default Lucide;

import clsx from "clsx";
import { Link } from "react-router-dom";
import { createContext, useContext } from "react";

interface BreadcrumbProps
  extends React.PropsWithChildren,
    React.ComponentPropsWithoutRef<"nav"> {
  light?: boolean;
  children: React.ReactElement | React.ReactElement[];
}

const breadcrumbContext = createContext<{
  light?: boolean;
}>({
  light: undefined,
});

function Breadcrumb({ className, light, children }: BreadcrumbProps) {
  return (
    <breadcrumbContext.Provider
      value={{
        light: light,
      }}
    >
      <nav className={clsx(["flex", className])} aria-label="breadcrumb">
        <ol
          className={clsx([
            "flex items-center text-theme-1 dark:text-slate-300",
            { "text-white/90": light },
          ])}
        >
          {Array.isArray(children)
            ? children.map((item, key) => {
                return {
                  ...item,
                  props: {
                    ...item.props,
                    key: key,
                  },
                };
              })
            : children}
        </ol>
      </nav>
    </breadcrumbContext.Provider>
  );
}

interface LinkProps
  extends React.PropsWithChildren,
    React.ComponentPropsWithoutRef<"li"> {
  to?: string;
  active?: boolean;
  key?: number;
}

Breadcrumb.Link = ({
  className,
  to = "",
  active = false,
  children,
  key = 0,
  ...attr
}: LinkProps) => {
  const breadcrumb = useContext(breadcrumbContext);
  return (
    <li
      className={clsx([
        className,
        !breadcrumb.light &&
          active &&
          "text-slate-600 cursor-text dark:text-slate-400",
        breadcrumb.light && active && "text-white/70",
      ])}
      {...attr}
    >
      <Link to={to}>{children}</Link>
    </li>
  );
};

export default Breadcrumb;

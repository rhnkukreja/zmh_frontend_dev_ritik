import "@/assets/css/vendors/tippy.css";
import { createRef, useEffect } from "react";
import tippy, {
  PopperElement,
  Props,
  roundArrow,
  animateFill as animateFillPlugin,
} from "tippy.js";
import clsx from "clsx";

type TippyProps<C extends React.ElementType> = PolymorphicComponentPropWithRef<
  C,
  {
    getRef?: (el: PopperElement | null) => void;
    content?: string;
    as?: C;
    options?: Partial<Props>;
  }
>;

const buildProps = <C extends React.ElementType>(props: TippyProps<C>) => ({
  plugins: [animateFillPlugin],
  content: props.content,
  arrow: roundArrow,
  popperOptions: {
    modifiers: [
      {
        name: "preventOverflow",
        options: {
          rootBoundary: "viewport",
        },
      },
    ],
  },
  animateFill: false,
  animation: "shift-away",
  ...props.options,
});

const Tippy = <C extends React.ElementType = "span">(props: TippyProps<C>) => {
  const tippyRef = createRef<PopperElement>();
  const Component = props.as || "span";

  useEffect(() => {
    if (props.getRef) {
      props.getRef && props.getRef(tippyRef.current);
    }

    if (tippyRef.current === null) return;

    const instance = tippy(tippyRef.current, buildProps(props));

    // Previously this effect only re-ran when `content` changed, so a
    // changed `options` prop (e.g. switching to the light theme) without a
    // content change would leave a stale tooltip instance in place. Now the
    // effect also depends on `options`, and always tears down its own
    // instance on cleanup so there's never more than one attached.
    return () => {
      instance.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.content, JSON.stringify(props.options)]);

  const { content, as, options, getRef, className, ...computedProps } = props;
  return (
    <Component
      ref={tippyRef}
      className={clsx(["cursor-pointer", className])}
      {...computedProps}
    >
      {props.children}
    </Component>
  );
};

export default Tippy;

import "@/assets/css/vendors/litepicker.css";
import { createRef, useEffect, useRef } from "react";
import { setValue, init, reInit } from "./litepicker";
import LitepickerJs from "litepicker";
import { FormInput } from "@/components/Base/Form";
import { ILPConfiguration } from "litepicker/dist/types/interfaces";

export interface LitepickerElement extends HTMLInputElement {
  litePickerInstance: LitepickerJs;
}

type LitepickerConfig = Partial<ILPConfiguration>;

export interface LitepickerProps
  extends React.PropsWithChildren,
    Omit<React.ComponentPropsWithoutRef<"input">, "onChange"> {
  options: {
    format?: string | undefined;
  } & LitepickerConfig;
  onChange: (e: {
    target: {
      value: string;
    };
  }) => void;
  value?: string | undefined;
  getRef?: (el: LitepickerElement) => void;
  onShow?: (picker: LitepickerJs) => void;
}

function Litepicker({
  options = {},
  value = "",
  onChange = () => {},
  getRef = () => {},
  onShow,
  ...computedProps
}: LitepickerProps) {
  // Keep the latest onShow callback in a ref so the "show" listener
  // (bound once at init time) always calls the most recent handler
  // instead of a stale closure from whenever init/reInit last ran.
  const onShowRef = useRef(onShow);
  useEffect(() => {
    onShowRef.current = onShow;
  });

  const props = {
    options: options,
    value: value,
    onChange: onChange,
    getRef: getRef,
    onShow: (picker: LitepickerJs) => {
      onShowRef.current?.(picker);
    },
  };
  const initialRender = useRef(true);
  const litepickerRef = createRef<LitepickerElement>();
  const tempValue = useRef(props.value);

  useEffect(() => {
    if (litepickerRef.current) {
      props.getRef(litepickerRef.current);
    }

    if (initialRender.current) {
      setValue(props);
      if (litepickerRef.current !== null) {
        init(litepickerRef.current, props);
      }
      initialRender.current = false;
    } else {
      if (tempValue.current !== props.value && litepickerRef.current !== null) {
        reInit(litepickerRef.current, props);
      }
    }

    tempValue.current = props.value;
  }, [props.value]);

  return (
    <FormInput
      ref={litepickerRef}
      type="text"
      value={props.value}
      onChange={(e) => {
        if (props.onChange) {
          props.onChange(e);
        }
      }}
      {...computedProps}
    />
  );
}

export default Litepicker;

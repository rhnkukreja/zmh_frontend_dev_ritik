import "@/assets/css/vendors/litepicker.css";
import { useEffect, useRef } from "react";
import { init } from "./litepicker";
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
  const litepickerRef = useRef<LitepickerElement | null>(null);
  const onShowRef = useRef(onShow);
  const onChangeRef = useRef(onChange);
  const lastSyncedValueRef = useRef<string>("");

  useEffect(() => {
    onShowRef.current = onShow;
  }, [onShow]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const optionsKey = JSON.stringify(options);

  const syncPickerValue = (nextValue: string) => {
    const element = litepickerRef.current;
    const picker = element?.litePickerInstance as any;

    if (!element || !picker) return;

    if (!nextValue) {
      if (typeof picker.clearSelection === "function") {
        picker.clearSelection();
      } else {
        element.value = "";
      }
      return;
    }

    const [startValue, endValue] = nextValue.split(" - ");

    if (options.singleMode) {
      if (typeof picker.setStartDate === "function") {
        picker.setStartDate(startValue, true);
      } else {
        element.value = nextValue;
      }
      return;
    }

    if (typeof picker.setStartDate === "function") {
      picker.setStartDate(startValue, true);
    }
    if (endValue && typeof picker.setEndDate === "function") {
      picker.setEndDate(endValue, true);
    } else if (typeof picker.setEndDate === "function") {
      picker.setEndDate(startValue, true);
    } else {
      element.value = nextValue;
    }
  };

  useEffect(() => {
    const element = litepickerRef.current;
    if (!element) return;

    init(element, {
      options,
      value,
      onChange: (e) => {
        lastSyncedValueRef.current = e.target.value;
        onChangeRef.current?.(e);
      },
      getRef,
      onShow: (picker: LitepickerJs) => {
        onShowRef.current?.(picker);
      },
    });

    getRef(element);
    syncPickerValue(value);
    lastSyncedValueRef.current = value;

    return () => {
      element.litePickerInstance?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsKey]);

  useEffect(() => {
    const element = litepickerRef.current;
    if (!element?.litePickerInstance || value === lastSyncedValueRef.current) return;

    syncPickerValue(value);
    lastSyncedValueRef.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <FormInput
      ref={litepickerRef}
      type="text"
      value={value}
      onChange={(e) => {
        onChangeRef.current?.(e);
      }}
      {...computedProps}
    />
  );
}

export default Litepicker;

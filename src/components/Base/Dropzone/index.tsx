import "@/assets/css/vendors/dropzone.css";
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { init } from "./dropzone";
import DropzoneJs, { DropzoneOptions } from "dropzone";

export interface DropzoneElement extends HTMLDivElement {
  dropzone: DropzoneJs;
}

export interface DropzoneProps
  extends React.PropsWithChildren,
    React.ComponentPropsWithoutRef<"div"> {
  options: DropzoneOptions;
  className?: string;
}

const Dropzone = forwardRef<DropzoneElement, DropzoneProps>(
  ({ options = {}, children, className = "", ...computedProps }, ref) => {
    const localRef = useRef<DropzoneElement | null>(null);

    useImperativeHandle(ref, () => {
      return localRef.current as DropzoneElement;
    });

    useEffect(() => {
      if (localRef.current) {
        init(localRef.current, { options });
      }
    }, [options, children ]);

    return (
      <div
        {...computedProps}
        ref={localRef}
        className={`[&.dropzone]:border-2 [&.dropzone]:border-dashed dropzone [&.dropzone]:border-slate-300/70 [&.dropzone]:bg-slate-50 [&.dropzone]:cursor-pointer [&.dropzone]:dark:bg-darkmode-600 [&.dropzone]:dark:border-white/5 ${className}`} // Merge the incoming className prop
      >
        <div className="dz-message top-[100px]">{children}</div>
      </div>
    );
  }
);

export default Dropzone;

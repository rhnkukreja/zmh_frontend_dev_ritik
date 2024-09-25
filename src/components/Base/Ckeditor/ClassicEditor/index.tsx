import "@/assets/css/vendors/ckeditor.css";
import { createRef, useEffect, useRef } from "react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import { init, updateData, CkeditorProps, CkeditorElement } from "../ckeditor";

function Ckeditor<C extends React.ElementType = "div">({
  disabled = false, // Use disabled to toggle read-only mode
  config = {},
  value = "",
  onChange = () => {},
  onFocus = () => {},
  onBlur = () => {},
  onReady = () => {},
  getRef = () => {},
  className,
  as,
  hideToolbar = false,

  ...computedProps
}: CkeditorProps<C> & { hideToolbar?: boolean }) {
  const props = {
    disabled: disabled,
    config: config,
    value: value,
    onChange: onChange,
    onFocus: onFocus,
    onBlur: onBlur,
    onReady: onReady,
    getRef: getRef,
  };

  const editorRef = createRef<CkeditorElement>();
  const cacheData = useRef("");
  const initialRender = useRef(true);

  useEffect(() => {
    let timer : NodeJS.Timeout;
    if (hideToolbar === true) {
       timer = setTimeout(() => {
        const toolbars = document.querySelectorAll(
          ".ck.ck-toolbar"
        ) as NodeListOf<HTMLElement>;
        const editorOutline = document.querySelectorAll(
          ".ck-content.ck-editor__editable_inline"
        ) as NodeListOf<HTMLElement>;

        editorOutline.forEach((editorOutline) => {
          editorOutline.style.border = "none";
        });

        toolbars.forEach((toolbar) => {
          toolbar.style.display = "none";
        });
      }, 0);
    }

    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (editorRef.current) {
      if (initialRender.current) {
        if (props.getRef) {
          props.getRef(editorRef.current);
        }

        // Hide toolbar and handle read-only mode
        init(editorRef.current, ClassicEditor, {
          props,
          cacheData,
          ...(config
            ? {
                config: {
                  ...config,

                  toolbar: hideToolbar ? [] : config.toolbar,
                  readOnly: disabled,
                },
              }
            : {}),
        });
        initialRender.current = false;
      } else {
        updateData(editorRef.current, { props, cacheData });
      }
    }
  }, [props.value, disabled, hideToolbar]); // Ensure the effect runs when hideToolbar or disabled changes

  const Component = as || "div";

  return (
    <Component
      {...computedProps}
      ref={editorRef}
      value={props.value}
      onChange={props.onChange}
      className={className}
    />
  );
}

export default Ckeditor;

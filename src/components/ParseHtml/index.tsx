import React from "react";
import parse, { domToReact } from "html-react-parser";

const options: any = {
  replace: ({
    name,
    attribs,
    children,
  }: {
    name: string;
    attribs?: any;
    children: any;
  }) => {
    if (!attribs) return null;

    switch (name) {
      case "h1":
        return (
          <h1 className="text-2xl font-bold text-gray-900">
            {domToReact(children, options)}
          </h1>
        );
      case "h2":
        return (
          <h2 className="text-xl font-semibold m-0 p-0 text-gray-800">
            {domToReact(children, options)}
          </h2>
        );
      case "h3":
        return (
          <h3 className="text-[1.0rem] font-semibold text-gray-800 ">
            {domToReact(children, options)}
          </h3>
        );
      case "h4":
        return (
          <h4 className="text-xl font-medium text-gray-700 ">
            {domToReact(children, options)}
          </h4>
        );
      case "h5":
        return (
          <h5 className="text-lg font-medium text-gray-700 ">
            {domToReact(children, options)}
          </h5>
        );
      case "h6":
        return (
          <h6 className="text-base font-medium text-gray-600">
            {domToReact(children, options)}
          </h6>
        );
      case "p":
        return (
          <p className="text-base text-gray-600 leading-[25px] my-2">
            {domToReact(children, options)}
          </p>
        );
      default:
        return null;
    }
  },
};

interface ParsedHtmlProps {
  htmlString: string;
}
const ParsedHtml: React.FC<ParsedHtmlProps> = ({ htmlString }) => {
  return <div>{parse(htmlString, options)}</div>;
};

export default ParsedHtml;

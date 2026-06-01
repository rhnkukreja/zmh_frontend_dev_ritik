import React from "react";
import { twMerge } from "tailwind-merge";

function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={twMerge("rounded-2xl border border-slate-200 bg-white", className)} {...props} />;
}

function CardHeader({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={twMerge("px-5 pt-5", className)} {...props} />;
}

function CardContent({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={twMerge("px-5 pb-5", className)} {...props} />;
}

function CardTitle({ className = "", ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={twMerge("text-base font-semibold text-slate-950", className)} {...props} />;
}

export { Card, CardHeader, CardContent, CardTitle };

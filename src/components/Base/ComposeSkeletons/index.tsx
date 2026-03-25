import React from "react";
import {
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonForm,
  SkeletonAvatar,
  SkeletonImage,
} from "../Skeletons";

type SkeletonType =
  | "text"
  | "card"
  | "table"
  | "form"
  | "avatar"
  | "image"
  | "custom";

interface SkeletonItem {
  type: SkeletonType;
  props?: Record<string, any>;
  customComponent?: React.ReactNode;
  className?: string;
}

interface ComposeSkeletonsProps {
  items: SkeletonItem[];
  gap?: string;
  containerClassName?: string;
}

/**
 * Compose multiple skeleton components together for complex layouts
 * Useful for pages with mixed content types (text + cards + tables, etc.)
 *
 * @param items - Array of skeleton items to compose
 * @param gap - Gap between items (Tailwind spacing: "gap-4", "gap-6", etc.)
 * @param containerClassName - Additional classes for the container
 *
 * @example
 * const pageSkeletons = [
 *   { type: 'text', props: { lines: 2 } },
 *   { type: 'card', props: { hasImage: true, lines: 3 } },
 *   { type: 'table', props: { rows: 5, columns: 4 } },
 * ];
 *
 * <ComposeSkeletons items={pageSkeletons} gap="gap-6" />
 */
const ComposeSkeletons: React.FC<ComposeSkeletonsProps> = ({
  items,
  gap = "gap-4",
  containerClassName = "",
}) => {
  const renderSkeletonItem = (item: SkeletonItem, index: number) => {
    const { type, props = {}, customComponent, className = "" } = item;

    switch (type) {
      case "text":
        return (
          <div key={index} className={className}>
            <SkeletonText {...props} />
          </div>
        );
      case "card":
        return (
          <div key={index} className={className}>
            <SkeletonCard {...props} />
          </div>
        );
      case "table":
        return (
          <div key={index} className={className}>
            <SkeletonTable {...props} />
          </div>
        );
      case "form":
        return (
          <div key={index} className={className}>
            <SkeletonForm {...props} />
          </div>
        );
      case "avatar":
        return (
          <div key={index} className={className}>
            <SkeletonAvatar {...props} />
          </div>
        );
      case "image":
        return (
          <div key={index} className={className}>
            <SkeletonImage {...props} />
          </div>
        );
      case "custom":
        return (
          <div key={index} className={className}>
            {customComponent}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`flex flex-col ${gap} ${containerClassName}`}>
      {items.map((item, index) => renderSkeletonItem(item, index))}
    </div>
  );
};

export default ComposeSkeletons;

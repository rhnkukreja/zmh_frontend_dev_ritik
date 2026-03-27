import React from "react";
import aiIcon from "@/assets/images/zmh-images/ai-Icon.png";
import clsx from "clsx";

export interface AIAssistantButtonProps {
  /**
   * URL to navigate to when button is clicked
   * @default "/ai-assistant"
   */
  href?: string;

  /**
   * Link target attribute
   * @default "_blank"
   */
  target?: "_blank" | "_self" | "_parent" | "_top";

  /**
   * Custom icon source URL
   * @default ai-Icon.png from zmh-images
   */
  iconSrc?: string;

  /**
   * Whether to display the label text
   * @default true
   */
  showLabel?: boolean;

  /**
   * Whether to display the icon
   * @default true
   */
  showIcon?: boolean;

  /**
   * Custom label text
   * @default "AI Assistant"
   */
  label?: string;

  /**
   * Button size variant
   * @default "md"
   */
  size?: "sm" | "md" | "lg";

  /**
   * Additional CSS classes to apply
   */
  className?: string;

  /**
   * Variant style for different contexts
   * @default "primary"
   */
  variant?: "primary" | "secondary" | "minimal";

  /**
   * Callback function when button is clicked (before navigation)
   */
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;

  /**
   * Whether to show animation on mount
    * @default false
   */
  animated?: boolean;

  /**
   * Custom rel attribute for security
   * @default "noreferrer"
   */
  rel?: string;

  /**
   * Additional title/tooltip text
   */
  title?: string;

  /**
   * aria-label for accessibility
   */
  ariaLabel?: string;
}

/**
 * Dynamic AI Assistant Button Component
 *
 * A flexible, reusable component for integrating AI Assistant functionality
 * throughout the dashboard. Supports multiple variants, sizes, and configurations.
 *
 * @example
 * // Basic usage with defaults
 * <AIAssistantButton />
 *
 * @example
 * // Custom configuration
 * <AIAssistantButton
 *   href="/ai-chatbot"
 *   size="lg"
 *   variant="secondary"
 *   showLabel={false}
 *   className="my-custom-class"
 * />
 *
 * @example
 * // Minimal variant for compact layouts
 * <AIAssistantButton variant="minimal" />
 */
const AIAssistantButton = React.forwardRef<HTMLAnchorElement, AIAssistantButtonProps>(
  (
    {
      href = "/ai-assistant",
      target = "_blank",
      iconSrc = aiIcon,
      showLabel = true,
      showIcon = true,
      label = "AI Assistant",
      size = "md",
      className,
      variant = "primary",
      onClick,
      animated = false,
      rel = "noreferrer",
      title,
      ariaLabel,
    },
    ref
  ) => {
    // Size variants for responsive behavior
    const sizeClasses = {
      sm: "px-2 py-1 text-xs",
      md: "px-3 py-1.5 text-sm md:flex",
      lg: "px-4 py-2 text-base",
    };

    // Variant classes
    const variantClasses = {
      primary: "ai-assistant-cta",
      secondary: "ai-assistant-cta-secondary",
      minimal: "ai-assistant-cta-minimal",
    };

    // Responsive classes for label visibility
    const labelClasses = showLabel
      ? "ml-2 font-medium hidden xl:flex"
      : "hidden";

    // Icon size classes
    const iconSizeClasses = {
      sm: "w-3 h-3",
      md: "w-4 h-4",
      lg: "w-5 h-5",
    };

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Call custom onClick handler if provided
      onClick?.(e);
    };

    return (
      <a
        ref={ref}
        href={href}
        target={target}
        rel={rel}
        // title={title || label} // Work as tooltip
        aria-label={ariaLabel || label}
        onClick={handleClick}
        className={clsx(
          variantClasses[variant],
          sizeClasses[size],
          "relative",
          "inline-flex",
          "items-center",
          "justify-center",
          "gap-0.2rem",
          "rounded-full",
          "border",
          "overflow-hidden",
          "transition-all",
          "duration-200",
          "cursor-pointer",
          animated && "ai-assistant-cta--animated",
          animated && "will-change-transform",
          className
        )}
      >
        {/* Icon */}
        {showIcon && (
          <img
            src={iconSrc}
            alt={`${label} icon`}
            className={clsx(
              iconSizeClasses[size],
              "ai-assistant-cta__icon",
              "flex-shrink-0"
            )}
          />
        )}

        {/* Label */}
        {showLabel && (
          <span className={clsx(labelClasses, "ai-assistant-cta__label")}>
            {label}
          </span>
        )}
      </a>
    );
  }
);

AIAssistantButton.displayName = "AIAssistantButton";

export default AIAssistantButton;

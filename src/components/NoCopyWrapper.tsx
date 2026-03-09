import { useCallback } from "react";

/**
 * Опакова съдържание от правила/наръчници и блокира копиране, изрязване и контекстно меню (десен бутон).
 * Текстът не може да се селектира.
 */
export default function NoCopyWrapper({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const prevent = useCallback((e: React.MouseEvent | React.ClipboardEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div
      className={className}
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        WebkitTouchCallout: "none",
      }}
      onContextMenu={prevent}
      onCopy={prevent}
      onCut={prevent}
      onDragStart={prevent}
    >
      {children}
    </div>
  );
}

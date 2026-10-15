import React from "react";

interface FooterProps {
  className?: string;
  variant?: "default" | "dark" | "compact" | "transparent";
}

export function Footer({ className = "", variant = "default" }: FooterProps) {
  const currentYear = new Date().getFullYear();

  if (variant === "compact") {
    return (
      <footer className={`text-center py-3 text-[11px] text-zinc-400 dark:text-zinc-500 ${className}`}>
        <span>© {currentYear} All Copyright and Rights Reserved by </span>
        <a
          href="https://www.cicdtech.in/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-600 dark:text-blue-400 hover:underline transition-colors"
        >
          CICD Tech
        </a>
      </footer>
    );
  }

  if (variant === "transparent") {
    return (
      <footer className={`w-full py-4 px-4 text-center text-[12px] text-zinc-500 dark:text-zinc-400 ${className}`}>
        <p>
          © {currentYear} All Copyright and Rights Reserved by{" "}
          <a
            href="https://www.cicdtech.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-blue-600 dark:text-blue-400 hover:underline transition-colors"
          >
            CICD Tech
          </a>
        </p>
      </footer>
    );
  }

  return (
    <footer
      className={`w-full py-4 px-4 text-center text-[12px] text-zinc-500 dark:text-zinc-400 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-950/40 backdrop-blur-xs transition-colors ${className}`}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5">
        <span>© {currentYear} All Copyright and Rights Reserved by</span>
        <a
          href="https://www.cicdtech.in/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors inline-flex items-center gap-1"
        >
          CICD Tech
        </a>
      </div>
    </footer>
  );
}

export default Footer;

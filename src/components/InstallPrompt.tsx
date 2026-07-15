import { useState, useEffect } from "react";
import { Download } from "lucide-react";

/**
 * 2026 PWA Install Prompt
 * Captures the beforeinstallprompt event and shows an install button
 * in the title bar when the app is not already installed.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setShowInstall(false);
      setDeferredPrompt(null);
    }
  };

  if (!showInstall) return null;

  return (
    <button
      onClick={handleInstall}
      aria-label="Install VOTE 2026 app"
      title="Install Voting App"
      className="
        flex items-center gap-1.5 rounded-lg border border-maroon-500/30
        bg-maroon-500/10 px-2.5 py-1.5 text-[11px] font-bold
        uppercase tracking-wider text-maroon-600
        hover:bg-maroon-500/20 hover:text-maroon-700
        transition-all duration-200 cursor-pointer
        dark:text-maroon-400 dark:hover:text-maroon-300
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-500
      "
    >
      <Download className="h-3.5 w-3.5" strokeWidth={2.5} />
      Install
    </button>
  );
}

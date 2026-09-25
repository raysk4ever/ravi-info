import { useEffect, useState } from "react";
import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

export default function Toaster(props: ToasterProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const sync = () =>
      setTheme(
        document.documentElement.dataset.theme === "dark" ? "dark" : "light"
      );
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <SonnerToaster
      theme={theme}
      position="bottom-center"
      toastOptions={{ duration: 4000 }}
      {...props}
    />
  );
}
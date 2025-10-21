import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./Button";

export const ThemeToggle = () => {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const root = window.document.documentElement;
    const initialTheme = root.classList.contains("dark") ? "dark" : "light";
    setTheme(initialTheme);
  }, []);

  const toggleTheme = () => {
    const root = window.document.documentElement;
    const newTheme = theme === "light" ? "dark" : "light";

    root.classList.remove("light", "dark");
    root.classList.add(newTheme);
    setTheme(newTheme);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="rounded-full"
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </Button>
  );
};

import { Moon, Sun } from "lucide-react";
import { Button } from "./Button";
import { useVideoTheme } from "../../context/ThemeVideoContext";

export const ThemeToggle = () => {
  const { toggleMode, isDarkMode } = useVideoTheme();

  return (
    <div className="relative">
      {/* Black overlay background */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-full -z-10 scale-110" />
      
      <Button
        variant="outline"
        size="icon"
        onClick={toggleMode}
        className="rounded-full bg-black/20 border-white/20 hover:bg-black/30 text-white backdrop-blur-sm"
        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDarkMode ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
};

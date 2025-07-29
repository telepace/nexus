"use client";

import * as React from "react";
import { Globe } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
];

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentLocale, setCurrentLocale] = React.useState("en");

  // Get current locale from pathname or localStorage
  React.useEffect(() => {
    const stored = localStorage.getItem("preferred-language");
    if (stored && languages.some(lang => lang.code === stored)) {
      setCurrentLocale(stored);
    } else {
      // Try to detect from pathname
      const pathLocale = pathname.split("/")[1];
      if (languages.some(lang => lang.code === pathLocale)) {
        setCurrentLocale(pathLocale);
      }
    }
  }, [pathname]);

  const handleLanguageChange = (locale: string) => {
    // Store preference
    localStorage.setItem("preferred-language", locale);
    setCurrentLocale(locale);
    
    // Navigate to the same page with new locale
    const segments = pathname.split("/").filter(Boolean);
    
    // Remove current locale if it exists
    if (languages.some(lang => lang.code === segments[0])) {
      segments.shift();
    }
    
    // Add new locale - handle empty path case
    const pathWithoutLocale = segments.length > 0 ? `/${segments.join("/")}` : "";
    const newPath = `/${locale}${pathWithoutLocale}`;
    router.push(newPath);
  };

  const currentLanguage = languages.find(lang => lang.code === currentLocale) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn("gap-2 h-8 px-2", className)}
        >
          <Globe className="h-4 w-4" />
          <span className="text-sm">{currentLanguage.nativeName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={cn(
              "flex items-center gap-2 cursor-pointer",
              currentLocale === language.code && "bg-accent"
            )}
          >
            <span className="text-sm font-medium">{language.nativeName}</span>
            <span className="text-xs text-muted-foreground">{language.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
"use client";

import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AppearanceForm() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Theme toggle animation variants
  const themeVariants = {
    light: { rotate: 0, scale: 1 },
    dark: { rotate: 180, scale: 0.9 },
  };

  // After mounting, update the state to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Appearance</h2>

      <div className="grid gap-8">
        <div>
          <h3 className="text-lg font-medium mb-4">Theme</h3>
          <p className="text-muted-foreground mb-4">
            Select the theme for your interface. You can toggle between light,
            dark, or use your system settings.
          </p>

          <div className="flex flex-col gap-6 md:flex-row">
            <Card
              className={`cursor-pointer transition-all duration-200 ${
                theme === "light"
                  ? "ring-2 ring-primary ring-offset-2"
                  : "hover:border-primary/50"
              }`}
              onClick={() => setTheme("light")}
            >
              <CardContent className="p-4 flex flex-col items-center">
                <div className="h-24 w-full rounded bg-[#F8FAFC] border mb-4 flex items-center justify-center">
                  <motion.div
                    variants={themeVariants}
                    animate="light"
                    style={{ color: "#f59e0b" }}
                  >
                    <Sun className="h-8 w-8" />
                  </motion.div>
                </div>
                <span className="font-medium">Light</span>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all duration-200 ${
                theme === "dark"
                  ? "ring-2 ring-primary ring-offset-2"
                  : "hover:border-primary/50"
              }`}
              onClick={() => setTheme("dark")}
            >
              <CardContent className="p-4 flex flex-col items-center">
                <div className="h-24 w-full rounded bg-gray-900 border mb-4 flex items-center justify-center">
                  <motion.div
                    variants={themeVariants}
                    animate="dark"
                    style={{ color: "#60a5fa" }}
                  >
                    <Moon className="h-8 w-8" />
                  </motion.div>
                </div>
                <span className="font-medium">Dark</span>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all duration-200 ${
                theme === "system"
                  ? "ring-2 ring-primary ring-offset-2"
                  : "hover:border-primary/50"
              }`}
              onClick={() => setTheme("system")}
            >
              <CardContent className="p-4 flex flex-col items-center">
                <div className="h-24 w-full rounded bg-gradient-to-r from-[#F8FAFC] to-gray-900 border mb-4 flex items-center justify-center">
                  <Monitor className="h-8 w-8" />
                </div>
                <span className="font-medium">System</span>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <RadioGroup
              value={theme || "system"}
              onValueChange={(value) => setTheme(value)}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="theme-light" />
                <Label htmlFor="theme-light">Light</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="theme-dark" />
                <Label htmlFor="theme-dark">Dark</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="system" id="theme-system" />
                <Label htmlFor="theme-system">System</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <Separator className="my-4" />

        <div>
          <h3 className="text-lg font-medium mb-4">Density</h3>
          <p className="text-muted-foreground mb-4">
            Adjust the density of the interface to show more or less content at
            once.
          </p>

          <RadioGroup defaultValue="normal" className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="compact" id="density-compact" />
              <Label htmlFor="density-compact">Compact</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="normal" id="density-normal" />
              <Label htmlFor="density-normal">Normal</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="comfortable" id="density-comfortable" />
              <Label htmlFor="density-comfortable">Comfortable</Label>
            </div>
          </RadioGroup>
        </div>
      </div>
    </div>
  );
}

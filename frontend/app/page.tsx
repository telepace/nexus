"use client";

import { Suspense } from "react";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { OnboardingHero } from "@/components/onboarding/OnboardingHero";
import { InteractiveDemo } from "@/components/onboarding/InteractiveDemo";
import { FeaturesJourney } from "@/components/onboarding/FeaturesJourney";
import { SocialProof } from "@/components/onboarding/SocialProof";
import { FinalCTA } from "@/components/onboarding/FinalCTA";

// Component that handles auth redirect with Suspense
/**
 * Component that handles authentication redirects and returns null.
 */
function AuthRedirectHandler() {
  useAuthRedirect(); // Handles redirection if user is already authenticated
  return null;
}

// Main Onboarding content
/**
 * Renders the main content page with introductory text and links to setup, prompts, and dashboard.
 */
function OnboardingContent() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - 情感共鸣 + 价值主张 */}
      <OnboardingHero />

      {/* Interactive Demo - 真实产品体验 */}
      <InteractiveDemo />

      {/* Features Journey - 功能流程可视化 */}
      <FeaturesJourney />

      {/* Social Proof - 用户价值证明 */}
      <SocialProof />

      {/* Final CTA - 分层行动召唤 */}
      <FinalCTA />
    </div>
  );
}

/**
 * 全新的 Onboarding 页面 - 优雅的生产级用户体验
 */
export default function Home() {
  return (
    <>
      {/* Wrap useSearchParams usage in Suspense */}
      <Suspense fallback={null}>
        <AuthRedirectHandler />
      </Suspense>
      <OnboardingContent />
    </>
  );
}

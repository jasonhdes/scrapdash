"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import type { GoogleCredentialResponse } from "@/types/google";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void;
  text?: "signin_with" | "signup_with" | "continue_with";
}

export function GoogleSignInButton({ onCredential, text = "signin_with" }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const [isReady, setIsReady] = useState(false);

  // A API do Google só aceita largura fixa em px (200-400), então medimos o
  // container pra acompanhar a largura real da caixa de input ao lado.
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.round(Math.min(400, Math.max(200, entry.contentRect.width))));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!CLIENT_ID) return;

    function initialize() {
      if (!window.google) return;

      window.google.accounts.id.initialize({
        client_id: CLIENT_ID as string,
        callback: (response: GoogleCredentialResponse) => onCredential(response.credential),
      });
      setIsReady(true);
    }

    if (window.google) {
      initialize();
      return;
    }

    const interval = setInterval(() => {
      if (window.google) {
        clearInterval(interval);
        initialize();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [onCredential]);

  useEffect(() => {
    if (!isReady || !buttonRef.current || !window.google) return;

    buttonRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      text,
      width,
    });
  }, [isReady, text, width]);

  if (!CLIENT_ID) {
    return null;
  }

  return (
    <div ref={containerRef} className="flex w-full justify-center">
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      <div ref={buttonRef} />
    </div>
  );
}

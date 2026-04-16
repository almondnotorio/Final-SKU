import { SignUp } from "@clerk/nextjs";
import { Signpost } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1A1410] p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#3a2a1a33_0%,_transparent_70%)]" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-md bg-[#C24B2F]">
            <Signpost className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-playfair text-3xl font-semibold text-[#F5EEE3]">
            SKU Manager
          </h1>
          <p className="mt-1.5 text-xs tracking-[0.2em] uppercase text-[#9A8A78]">
            Create your account
          </p>
        </div>

        <SignUp
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "rounded-md shadow-2xl border border-white/10 bg-white/5 backdrop-blur-md",
              headerTitle: "text-[#F5EEE3]",
              headerSubtitle: "text-[#9A8A78]",
              socialButtonsBlockButton:
                "border-white/20 bg-white/5 text-[#F5EEE3] hover:bg-white/10",
              formFieldLabel: "text-[#C8BAA8]",
              formFieldInput:
                "bg-white/5 border-white/20 text-[#F5EEE3] placeholder:text-[#6B5E52] focus:border-[#C24B2F]",
              footerActionLink: "text-[#C24B2F] hover:text-[#D96040]",
              formButtonPrimary: "bg-[#C24B2F] hover:bg-[#A83C24]",
            },
          }}
        />
      </div>
    </div>
  );
}

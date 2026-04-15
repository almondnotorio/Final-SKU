import { SignIn } from "@clerk/nextjs";
import { MailboxIcon } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
            <MailboxIcon className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">SKU Manager</h1>
          <p className="mt-1 text-sm text-slate-400">Mailbox Catalog Management</p>
        </div>

        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "rounded-xl shadow-2xl border border-white/10 bg-white/5 backdrop-blur-md",
              headerTitle: "text-white",
              headerSubtitle: "text-slate-400",
              socialButtonsBlockButton:
                "border-white/20 bg-white/5 text-white hover:bg-white/10",
              formFieldLabel: "text-slate-300",
              formFieldInput:
                "bg-white/5 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-500",
              footerActionLink: "text-blue-400 hover:text-blue-300",
              formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
            },
          }}
        />
      </div>
    </div>
  );
}

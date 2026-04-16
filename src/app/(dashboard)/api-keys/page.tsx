"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Copy, Trash2, KeyRound, Check, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Metadata } from "next";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface NewKeyResult extends ApiKey {
  key: string;
}

function formatDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState<NewKeyResult | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/keys");
      const data = await res.json();
      if (data.success) setKeys(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  async function handleCreate() {
    if (!name.trim()) { setNameError("Name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.error); return; }
      setNewKey(data.data);
      setCreateOpen(false);
      setName("");
      setKeys((prev) => [data.data, ...prev]);
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke(id: string) {
    setRevoking(id);
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) { toast.error(data.error); return; }
      setKeys((prev) => prev.map((k) => k.id === id ? { ...k, isActive: false } : k));
      toast.success("API key revoked");
    } finally {
      setRevoking(null);
    }
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Header
        title="API Keys"
        description="Manage access tokens for external integrations"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Key
          </Button>
        }
      />

      <div className="p-4 md:p-6 space-y-4">
        {/* Info banner */}
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Use API keys to authenticate requests from external apps with{" "}
          <code className="rounded bg-amber-100 px-1 font-mono text-xs">
            Authorization: Bearer &lt;key&gt;
          </code>. Keys are shown only once — store them securely.
        </div>

        {/* Key list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg border bg-muted" />
            ))}
          </div>
        ) : keys.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-14 text-muted-foreground">
              <KeyRound className="h-10 w-10 opacity-20" />
              <p className="font-medium">No API keys yet</p>
              <p className="text-sm">Create a key to connect an external app</p>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> New Key
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="divide-y divide-border/60">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between px-4 py-3 md:px-6"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-secondary">
                      <KeyRound className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{key.name}</p>
                        {!key.isActive && (
                          <span className="shrink-0 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                            Revoked
                          </span>
                        )}
                      </div>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {key.keyPrefix}••••••••
                        <span className="ml-3 font-sans not-italic">
                          Created {formatDate(key.createdAt)}
                          {" · "}Last used {formatDate(key.lastUsedAt)}
                        </span>
                      </p>
                    </div>
                  </div>

                  {key.isActive && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRevoke(key.id)}
                      disabled={revoking === key.id}
                      aria-label="Revoke key"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) { setName(""); setNameError(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-playfair">Create API Key</DialogTitle>
          </DialogHeader>
          <FormField label="Key name" error={nameError}>
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(""); }}
              placeholder="e.g. Website Integration"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Generating…" : "Generate Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New key reveal dialog */}
      <Dialog open={!!newKey} onOpenChange={(o) => { if (!o) { setNewKey(null); setRevealed(false); setCopied(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-playfair">Save Your API Key</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Copy this key now — it will <strong>not</strong> be shown again.
          </p>
          {newKey && (
            <div className="flex items-center gap-2 rounded-md border bg-muted p-3">
              <code className="flex-1 break-all font-mono text-xs">
                {revealed ? newKey.key : `${newKey.keyPrefix}${"•".repeat(40)}`}
              </code>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setRevealed((r) => !r)}
                  aria-label={revealed ? "Hide key" : "Reveal key"}
                >
                  {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyKey(newKey.key)}
                  aria-label="Copy key"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => { setNewKey(null); setRevealed(false); setCopied(false); toast.success("API key saved"); }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

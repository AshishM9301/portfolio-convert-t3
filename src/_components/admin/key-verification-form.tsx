"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Key, ArrowLeft, RefreshCw, Mail, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface KeyVerificationFormProps {
  email: string;
  onResend: () => void;
  onVerify: (key: string) => void;
  isVerifying: boolean;
  error?: string;
}

export function KeyVerificationForm({
  email,
  onResend,
  onVerify,
  isVerifying,
  error,
}: KeyVerificationFormProps) {
  const [key, setKey] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.length === 8) {
      onVerify(key);
    } else {
      toast.error("Please enter the full 8-character key");
    }
  };

  const handleResend = () => {
    setCountdown(60); // 60 second cooldown
    onResend();
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Mail className="h-4 w-4" />
        <AlertDescription>
          We have sent a verification key to <strong>{email}</strong>
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Verification Key</label>
          <Input
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            placeholder="XXXXXXXX"
            maxLength={8}
            className="text-center text-xl tracking-widest font-mono"
            disabled={isVerifying}
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter the 8-character key from your email
          </p>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={key.length !== 8 || isVerifying}
        >
          {isVerifying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <Key className="mr-2 h-4 w-4" />
              Verify Key
            </>
          )}
        </Button>
      </form>

      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResend}
          disabled={countdown > 0}
        >
          {countdown > 0 ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Resend in {countdown}s
            </>
          ) : (
            <>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Request new key
            </>
          )}
        </Button>
      </div>
    </div>
  );
}


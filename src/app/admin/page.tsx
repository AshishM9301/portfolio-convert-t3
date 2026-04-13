"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { KeyVerificationForm } from "@/_components/admin/key-verification-form";

const requestKeySchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type RequestKeyFormData = z.infer<typeof requestKeySchema>;

export default function AdminAuthPage() {
  const [view, setView] = useState<"request" | "verify">("request");
  const [requestedEmail, setRequestedEmail] = useState<string | null>(null);
  const router = useRouter();

  const requestKeyMutation = api.admin.requestKey.useMutation({
    onSuccess: (data) => {
      console.log("Successfully requested keys", data);
      toast.success(data.message);
      setRequestedEmail(form.getValues("email"));
      setView("verify");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const verifyKeyMutation = api.admin.verifyKey.useMutation({
    onSuccess: (data) => {
      toast.success("Authentication successful!");
      if (data.token) {
        sessionStorage.setItem("admin_token", data.token);
      }
      router.push("/admin/dashboard");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm<RequestKeyFormData>({
    resolver: zodResolver(requestKeySchema),
    defaultValues: { email: "" },
  });

  const onRequestKey = form.handleSubmit((data) => {
    console.log("Requesting key for email:", data.email);
    requestKeyMutation.mutate({ email: data.email });
  });

  const onVerifyKey = (key: string) => {
    if (!requestedEmail) return;
    verifyKeyMutation.mutate({ email: requestedEmail, key });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Admin Access</CardTitle>
          <CardDescription>
            Enter your authorized email to receive a one-time verification key
          </CardDescription>
        </CardHeader>
        <CardContent>
          {view === "request" ? (
            <Form {...form}>
              <form onSubmit={onRequestKey} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="your-authorized-email@example.com"
                            className="pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={requestKeyMutation.isPending}
                >
                  {requestKeyMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Verification Key"
                  )}
                </Button>
              </form>
            </Form>
          ) : requestedEmail ? (
            <KeyVerificationForm
              email={requestedEmail}
              onResend={() => setView("request")}
              onVerify={onVerifyKey}
              isVerifying={verifyKeyMutation.isPending}
              error={verifyKeyMutation.error?.message}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

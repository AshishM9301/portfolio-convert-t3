import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
        404
      </p>
      <h1 className="text-foreground text-3xl font-semibold sm:text-4xl">
        Page not found
      </h1>
      <p className="text-muted-foreground max-w-md text-balance">
        The page you are looking for does not exist or was moved.
      </p>
      <Link href="/">
        <Button>Back to home</Button>
      </Link>
    </main>
  );
}

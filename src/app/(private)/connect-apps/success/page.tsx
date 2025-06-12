"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ConnectAppsSuccessPage() {
  const router = useRouter();
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.push("/");
    }, 3000);
    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="max-w-lg mx-auto mt-10 text-center">
      <h1 className="text-2xl font-bold mb-4">Zoom Connected!</h1>
      <p className="mb-6 text-green-600">Your Zoom account was successfully connected.</p>
      <p>You will be redirected to the homepage shortly...</p>
    </div>
  );
} 
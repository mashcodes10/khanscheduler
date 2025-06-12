import { ConnectZoomButton } from "@/components/ConnectZoomButton";

export default function ConnectAppsPage() {
  return (
    <div className="max-w-lg mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">Connect Apps</h1>
      <p className="mb-6 text-muted-foreground">Connect your Zoom account to enable video meetings with your bookings.</p>
      <ConnectZoomButton />
    </div>
  );
} 
// components/ConnectZoomButton.tsx
export function ConnectZoomButton() {
    const clientId = process.env.NEXT_PUBLIC_ZOOM_OAUTH_CLIENT_ID!;
    const redirectUri = encodeURIComponent(process.env.NEXT_PUBLIC_ZOOM_OAUTH_REDIRECT_URL!);
    const zoomAuthUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`;
  
    return (
      <a href={zoomAuthUrl}>
        <button>Connect Zoom</button>
      </a>
    );
  }
"use client";

import { useEffect, useState } from "react";

const VERSION = "v26.0";
// Business Discovery needs instagram_basic + instagram_manage_insights + pages_read_engagement,
// plus ads_read when the Page role comes through a business portfolio.
const SCOPES = ["instagram_basic", "instagram_manage_insights", "pages_show_list", "pages_read_engagement", "business_management", "ads_read"];

interface PageRow {
  id: string;
  name: string;
  instagram_business_account?: { id: string };
}

type State =
  | { step: "start" }
  | { step: "loading"; msg: string }
  | { step: "pick"; token: string; pages: PageRow[] }
  | { step: "done"; username: string; followers: number; expiresAt: string | null; shortLived: boolean }
  | { step: "error"; msg: string };

export function SetupFlow({ defaultAppId, testUsername }: { defaultAppId: string; testUsername: string }) {
  const [appId, setAppId] = useState(defaultAppId);
  // Rendered client-only (see page.tsx), so window is available during init.
  const [pendingToken] = useState(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    return hash.get("long_lived_token") || hash.get("access_token");
  });
  const [state, setState] = useState<State>(() => {
    const search = new URLSearchParams(window.location.search);
    if (search.get("error")) return { step: "error", msg: search.get("error_description") ?? "Login was cancelled." };
    return pendingToken ? { step: "loading", msg: "Finding your Page and Instagram account…" } : { step: "start" };
  });
  const redirect = `${window.location.origin}/setup`;

  const save = async (token: string, igUserId: string) => {
    setState({ step: "loading", msg: "Testing contestant lookup and saving…" });
    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, igUserId, testUsername, appId }),
    });
    const body = await res.json();
    if (!body.ok) setState({ step: "error", msg: body.error });
    else setState({ step: "done", username: body.test.username, followers: body.test.followers_count, expiresAt: body.expiresAt, shortLived: body.shortLived });
  };

  // Handle the redirect back from Facebook (token arrives in the URL fragment).
  useEffect(() => {
    const token = pendingToken;
    if (!token) return;
    // Remove the token from the address bar and history.
    history.replaceState(null, "", window.location.pathname);
    fetch(`https://graph.facebook.com/${VERSION}/me/accounts?fields=id,name,instagram_business_account&access_token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((j: { data?: PageRow[]; error?: { message: string } }) => {
        if (j.error) return setState({ step: "error", msg: j.error.message });
        const pages = j.data ?? [];
        const linked = pages.filter((p) => p.instagram_business_account);
        if (linked.length === 1) return save(token, linked[0].instagram_business_account!.id);
        setState({ step: "pick", token, pages });
      })
      .catch((e) => setState({ step: "error", msg: String(e) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loginUrl =
    `https://www.facebook.com/${VERSION}/dialog/oauth?` +
    new URLSearchParams({
      client_id: appId,
      // Plain permission dialog; the Instagram onboarding variant (extras=IG_API_ONBOARDING)
      // re-asks for the Instagram password even when the account is already linked.
      display: "page",
      auth_type: "rerequest",
      redirect_uri: redirect,
      response_type: "token",
      scope: SCOPES.join(","),
    }).toString();

  return (
    <div className="card space-y-5 p-5 sm:p-6">
      {state.step === "start" && (
        <>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-2">
            <li>
              In your Meta app, add the product <strong>Facebook Login for Business</strong> (left sidebar → Add Product).
            </li>
            <li>
              Under <strong>Facebook Login for Business → Settings → Valid OAuth Redirect URIs</strong>, add:
              <code className="mt-1 block select-all rounded-lg bg-surface-2 px-2 py-1.5 text-ink">{redirect}</code>
              then Save changes.
            </li>
            <li>Click the button below and approve access for your Page and @dreamers__hope.</li>
          </ol>
          <label className="block text-sm">
            <span className="text-muted">Meta App ID</span>
            <input value={appId} onChange={(e) => setAppId(e.target.value.trim())} className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 outline-none focus:border-accent" />
          </label>
          <a href={loginUrl} className="flex items-center justify-center gap-2 rounded-xl bg-[#1877f2] px-4 py-3 font-semibold text-white hover:opacity-95">
            Continue with Facebook
          </a>
        </>
      )}

      {state.step === "loading" && <p className="text-sm text-ink-2">{state.msg}</p>}

      {state.step === "pick" && (
        <div className="space-y-3">
          {state.pages.length === 0 ? (
            <p className="text-sm text-ink-2">
              No Facebook Pages came back. Log in again and make sure you tick your Page on the &quot;Choose the Pages&quot; screen.
            </p>
          ) : (
            <>
              <p className="text-sm text-ink-2">Choose the Page connected to @dreamers__hope:</p>
              {state.pages.map((p) => (
                <button
                  key={p.id}
                  disabled={!p.instagram_business_account}
                  onClick={() => save(state.token, p.instagram_business_account!.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-line px-4 py-3 text-left text-sm hover:bg-surface-2 disabled:opacity-50"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted">{p.instagram_business_account ? `IG ${p.instagram_business_account.id}` : "no Instagram linked"}</span>
                </button>
              ))}
            </>
          )}
          <button onClick={() => setState({ step: "start" })} className="text-sm text-muted hover:text-ink">← Start again</button>
        </div>
      )}

      {state.step === "done" && (
        <div className="space-y-2">
          <p className="font-semibold text-up">✓ Connected and saved to .env.local</p>
          <p className="text-sm text-ink-2">
            Test lookup worked: <strong>@{state.username}</strong> has {state.followers.toLocaleString("en-IN")} followers.
          </p>
          <p className="text-sm text-ink-2">
            Token expires:{" "}
            <strong>{state.expiresAt ? new Date(state.expiresAt).toLocaleString("en-IN") : "never"}</strong>
            {state.shortLived && (
              <> (short-lived: add FB_APP_SECRET to .env.local and connect again to get a 60-day token)</>
            )}
          </p>
          <p className="text-sm text-ink-2">
            Now run <code className="rounded bg-surface-2 px-1">npm run collect</code> (or ask Claude to) to replace the demo data.
          </p>
        </div>
      )}

      {state.step === "error" && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-down">Something went wrong</p>
          <p className="rounded-xl bg-surface-2 p-3 text-sm text-ink-2">{state.msg}</p>
          <button onClick={() => setState({ step: "start" })} className="text-sm text-muted hover:text-ink">← Try again</button>
        </div>
      )}
    </div>
  );
}

<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Render partner benefits only inside the existing responsible-account panel as an expandable topic; public navigation must not expose benefit content, so visibility follows the account panel's access checks.
- Render the public partner showcase in a dialog opened from the side rail with dedicated logo-only assets, not in the home page scroll or a separate route, to keep offers and contacts exclusive to the account panel.
- Store editable partners in separate public identity/configuration and account-only benefit tables with admin-only writes; use an atomic RPC and shared query invalidation so APP edits update both surfaces without exposing private benefits.
- Verify recess consent using server-issued, expiring WebAuthn challenges and server validation; archive appended original contracts and immutable per-contract receipts atomically to prevent false consent and repeated notices.
- Read recess notice eligibility with the signed-in browser client and RLS, sharing the read helper with server callers, so external hosting configuration cannot prevent the notice; keep biometric consent and archival server-validated.
- Keep the recess dialog controlled by account-scoped eligibility state, blocking dismissal during pending reads, read failures and unconfirmed consent so the responsible-account UI cannot bypass the confirmation gate.

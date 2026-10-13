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
- Gate evaluation popups using the account-scoped recess dialog state so mandatory recess consent takes priority without marking unread evaluations as read.
- Drive sidebar forced collapse from the recess access gate and map the single terms acceptance to the existing server consent fields; preserve server-validated biometric archival.
- Bind recess WebAuthn challenges to an explicit browser origin validated against exact app hosts rather than proxy-rewritten request headers, and validate the same stored origin during verification.
- Recess biometric consent fetches its challenge from an authenticated RPC before the OK tap and verifies/archives with a request-scoped user client (no service key), because Android Chrome drops the gesture after network waits and the external host lacks private server env vars.
- Contract renewals live in renovacoes_contrato (ADM creates pending rows); the responsible confirms via WebAuthn and the renovacao_registrar RPC atomically archives the addendum and updates the contract, so consent cannot be faked or skipped.
- Keep ADM renewal management in the existing renewal component with a bounded, scrollable dialog, so configuration stays on the administrative page without overflowing the viewport.

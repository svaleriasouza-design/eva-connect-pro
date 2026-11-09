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

- Meta Embedded Signup uses v4 Cloud API in the existing number model; preserve manual credentials and Graph versions so onboarding is additive.
- Embedded Meta tokens use dedicated AES-GCM encryption bound to workspace and phone ID; resolve them only server-side to preserve tenant isolation.
- Embedded onboarding attempts are single-use, durable, and admin/workspace-bound; verify app permissions and phone assets before provisioning.

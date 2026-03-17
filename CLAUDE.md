# Claude Code Instructions

## Git Workflow

- **Always rebase onto `origin/main` before pushing**, so the branch is never behind when merging.
- Fetch main first (`git fetch origin main`), then `git rebase origin/main`, then push.
- Use `--force-with-lease` when pushing after a rebase.

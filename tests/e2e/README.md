# End-to-end check

Signs in as a throwaway user in the real Supabase project, captures and ticks tasks, screenshots desktop and phone, then deletes the user (its data cascades away). Uses the installed Edge, so no browser download.

    cd app && npm run build && npx vite preview --port 4173
    cd tests/e2e && npm i && node run.mjs <screenshot-folder>

Needs the Lantern token at ~/.lantern/supabase-token.txt (read at runtime, never stored).

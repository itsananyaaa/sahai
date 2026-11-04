# Offline operation

After a successful online login and authorised case download, the app can load its precached shell, switch among five bundled languages, read local cases, save visits and drafts, run MVI/emergency rules, create referrals, and schedule follow-ups. Mutations enter the Dexie outbox and remain visible until acknowledged or placed in the conflict queue.

Visits are append-only. Referral transitions are server-authoritative and cannot move backwards. Demographic conflicts require review; failed operations are not silently discarded. Analytics, server recomputation, PHC acknowledgement, and synchronisation require connectivity.

Verified in this checkout: frontend production build and Workbox generation. Desktop Chrome, Android Chrome emulation, iOS Safari storage eviction, background sync, and real-device flows were not tested.

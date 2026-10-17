# Agent notes

Home Assistant custom integration `multisensor_heating` plus bundled Lit dashboard cards.

## Layout
- `custom_components/multisensor_heating/controller.py`: pure control algorithm (no HA imports). Change logic here first and cover it in `tests/test_controller.py`.
- `coordinator.py`: `RoomController` (HA state → controller → TRV service calls, persistence via `Store`).
- `stats.py`: suggested offsets. `websocket_api.py`: `multisensor_heating/rooms` and `/room_history` for the cards.
- `frontend-src/` (TypeScript + Lit, no decorators; reactive props use `static properties` + `declare`) → built into `custom_components/multisensor_heating/frontend/multisensor-heating.js` (committed).

## Verify
```bash
.venv/bin/ruff check . && .venv/bin/pytest          # Python 3.14 venv, HA 2026.10 test harness
npm run typecheck && npm run build                   # rebuild bundle after any frontend-src change
```
- In integration tests, set up the `climate`/`lock` domains before `async_mock_service`. Otherwise the real services replace the mocks.
- `strings.json` must be copied to `translations/en.json` after edits.

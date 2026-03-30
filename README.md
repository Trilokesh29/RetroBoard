# RetroBoard

RetroBoard is a retrospective board for teams to capture feedback, vote on priorities, and review sprint trends.

## Single Way To View The App

Use the repo root as the only entry point.

1. Start MongoDB locally on `mongodb://127.0.0.1:27017`.
2. From the repo root, install app dependencies once:

```powershell
npm run setup
```

3. From the repo root, start the full app:

```powershell
npm start
```

4. Open [http://localhost:8081](http://localhost:8081).

`npm start` now launches both:
- the API server from [`Server`](C:\sb\playground\RetroBoard\Server)
- the React client from [`Client`](C:\sb\playground\RetroBoard\Client)

## Demo Mode Without A Server

If you want to view the app without starting MongoDB or the API server, use the built-in browser demo mode.

1. From the repo root, start demo mode:

```powershell
npm run demo
```

2. Open [http://localhost:8081](http://localhost:8081).

`npm run demo` now auto-installs the client dependencies the first time if they are missing.

If you want to preinstall only the demo client without starting it, use:

```powershell
npm run setup:demo
```

Demo mode runs entirely in the browser with seeded sample data persisted in local storage.
Use:

- username: `demo_lead`
- password: `demo1234`

## Demo Mode With Real Jira Pulls

If you want to test Jira integration without starting MongoDB or the full RetroBoard API, use the local Jira bridge flow:

```powershell
npm run demo:jira
```

Then open [http://localhost:8081](http://localhost:8081).

This mode still keeps RetroBoard data in the browser, but Jira-backed teams created during that session will:

- validate the pasted Jira board URL
- use your Jira email / username and API token through a tiny local bridge
- pull the real board sprint list
- sync real sprint velocity and story-point data

Notes:

- Existing seeded demo Jira teams still use mock Jira data. Create a new Jira-backed team to test the live Jira path.
- The local bridge runs on `http://localhost:3001`.
- Jira credentials are kept in the local bridge process memory, not in RetroBoard demo local storage.
- If you stop `npm run demo:jira`, recreate the Jira-backed demo team the next time you launch it so the bridge connection can be re-established.

## Notes

- The API runs on `http://localhost:3000`.
- The UI runs on `http://localhost:8081`.
- If you only want a production frontend build, run:

```powershell
npm run build
```

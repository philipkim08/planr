# planr

planr makes shareable itineraries for a day or multi-day trip. The public link is view-only; the private edit link is the creator's key.

## Run it in VS Code

1. Open this folder in VS Code.
2. Open **Terminal → New Terminal**.
3. Run `npm install --cache /tmp/dayplan-npm` once. (The cache flag avoids a permissions issue on this machine; on most computers, `npm install` is sufficient.)
4. Run `npm run dev`.
5. Open the URL shown by Vite, normally `http://localhost:5173`.

Keep that terminal open while using the app. Press `Control+C` to stop it.

## Optional AI payment summaries

Payment calculations work with no AI or API key. To enable the **Write AI summary** button, set an OpenAI API key in the same terminal before starting planr:

```bash
export OPENAI_API_KEY="your_key_here"
npm run dev
```

The key stays on the server and is never sent to people opening a share link. For deployment, add `OPENAI_API_KEY` as an environment variable in your hosting provider's settings.

## How links work

After creating a trip, planr opens its edit page. That page has a **Copy view link** button and a **Copy edit link** button. Send only the view link to guests. Anyone with the edit link can make changes, so save it somewhere private.

## Deploy on Render

This project deploys as one Node web service: Express serves both the API and the built React app.

1. Create a GitHub repository and push this folder to it.
2. At [Render](https://render.com), choose **New → Web Service**, then connect the GitHub repository.
3. Use these settings:
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Runtime: Node
4. Deploy, then open the generated `onrender.com` address.

For a real launch, switch the `data/trips.json` storage to a hosted database or attach persistent disk storage. This v1 intentionally stores data in a small local JSON file, which is ideal for running it locally but can be wiped when a basic cloud service is redeployed.

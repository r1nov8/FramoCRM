<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1LU0H7WJrzGpVFUX0ljk_jv_NbKPYL9cE

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Render (Cloud)

1. Push your code to GitHub.
2. Connect your repo to Render.com.
3. Create a Web Service for `/backend` (Node.js, build: `npm install`, start: `node index.js`).
4. Add a free PostgreSQL database in Render and set the `DATABASE_URL` env variable in backend settings.
5. Create a Static Site for the frontend (build: `npm install && npm run build`, publish: `dist`).
6. Set `VITE_API_URL` in frontend environment variables to your backend Render URL.
7. Visit your Render URLs to use the app from anywhere!

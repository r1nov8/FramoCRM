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
3. Start the price list backend:
   `npm run server`
4. Run the app:
   `npm run dev`

Both servers bind to `0.0.0.0`. On a local machine, open the frontend at `http://localhost:5173`. If you're running in a container or remote VM, replace `localhost` with the host's IP (for example `http://<host-ip>:5173` for the frontend and `http://<host-ip>:3001` for the backend).

Place your `pricelist.xlsx` file in the `server/` directory. The backend reads this workbook on startup and exposes the data at `/api/pricelist`.

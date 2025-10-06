
import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";
dotenv.config();
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
console.log(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
export const oauth2Client = new OAuth2Client({
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  redirectUri: REDIRECT_URI,
});
export const refreshAccessToken = async (refreshToken) => {
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const res = await oauth2Client.getAccessToken(); // ensures access token exists/refreshed
  return res.token; 
};




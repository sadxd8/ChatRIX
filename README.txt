ChatRIX starter (HTML/CSS/JavaScript + Firebase Auth + Firestore + ImgBB)
=========================================================================

FILES
- login.html        Separate login screen
- signup.html       Separate signup screen with unique username
- chat.html         Messenger-style UI, username search, private chat, image send
- styles.css        Responsive dark/purple premium UI
- auth.js           Firebase signup/login
- chat.js           Search, private conversations, real-time messages, ImgBB upload
- firebase-config.js  Put your Firebase Web App config here
- firestore.rules   Starter security rules

SETUP
1. Firebase Console -> Authentication -> Sign-in method -> enable Email/Password.
2. Firebase Console -> Firestore Database -> Create database.
3. Firestore -> Rules: paste firestore.rules and Publish.
4. Replace placeholder values in firebase-config.js with the config from your Firebase Web App.
5. Create a free ImgBB API key at https://api.imgbb.com/.
6. For a quick local test, open a terminal in this folder and run:
      python -m http.server 8000
   Then visit http://localhost:8000/login.html
   (Do not simply double-click the HTML files; ES modules need a web server.)
7. In the browser console, set the ImgBB key for this test:
      localStorage.setItem("chatrix_imgbb_key", "YOUR_IMGBB_API_KEY")
   Then reload the page. This key is exposed to browsers and is only suitable for a prototype.
8. To publish for free, upload these files to a GitHub repository and enable GitHub Pages.

IMPORTANT NOTES
- Username search is a prefix search: typing "sa" can find usernames beginning with "sa".
- Firestore rules allow signed-in users to read user profile documents for search. Keep profile docs public-only.
- This is an MVP, not a production-ready messenger. Add rate limits, abuse reporting/blocking, stronger validation, and a backend/Cloud Function to protect third-party API keys before a public launch.
- ImgBB URLs are not private. Do not upload sensitive images.
- Firebase free quota has limits; usage beyond the free quota may fail or require a billing plan depending on the service.

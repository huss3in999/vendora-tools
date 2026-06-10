# Gourmet Tomorrow - Food Pre-Order & Behavior Analytics System

A professional, high-end, mobile-first food pre-order platform that allows clients to reserve their meals for the next day. It includes a comprehensive user clickstream behavior tracking system and an analytics dashboard for the owner to monitor trends, expected sales, time slots, and menu interest.

---

## 📂 File Structure

```
nada/
├── index.html          # Customer Ordering Portal
├── admin.html          # Owner Analytics Dashboard & Menu Manager
├── styles.css          # Design System Stylesheet (Consolidated CSS)
├── app.js              # Client Interaction Logic & Telemetry Tracker
├── admin.js            # Admin Dashboard Engine (KPIs, Charts, Logs, Menu CRUD)
├── firebase-config.js  # DB Configuration (Local LocalStorage <=> Firebase Firestore)
└── README.md           # Deployment & Configuration Instructions (This file)
```

---

## ⚡ Quick Start (Local Demo Mode)

By default, the website runs in **Local Demo Mode** using `localStorage`. This allows you to test all client-facing and admin dashboard functionalities immediately without any setup.

1. Double-click [index.html](file:///e:/Users/Hussain Alyaqoob/Downloads/nada/index.html) in your file explorer to open the customer ordering site.
2. Try searching for dishes, switching categories, opening item details, and adding items to the cart.
3. Complete the checkout form (enter your name, phone number, and select delivery time).
4. On the confirmation screen, click **Send Order to WhatsApp** to review the formatted message template.
5. Open [admin.html](file:///e:/Users/Hussain Alyaqoob/Downloads/nada/admin.html) in another tab.
6. Observe that:
   - Expected sales, orders count, and conversion rates are calculated.
   - SVG engagement charts list Viewed vs. Ordered frequencies.
   - Preferred tomorrow time slot distributions are mapped.
   - The **Live Behavior Feed** logs clickstream tracking entries (e.g. page load, filter, search, cart modifications).
   - The **Menu Customizer** allows you to add new dishes, toggle availability (sold out states), edit pricing, or hide items.

> [!TIP]
> Click the **Reset Data** button in the Admin Header to wipe all localStorage data and reset the menu back to its factory defaults for clean testing.

---

## 🔥 Real-time Firebase Firestore Sync

To enable cloud storage so that orders, menu edits, and behavior logs sync dynamically across different devices:

### Step 1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project** and follow the prompts to create a new project.
3. Click the **Web (`</>`)** icon to register a Web App. Choose a name and click **Register app**.
4. Copy the `firebaseConfig` object keys shown on the screen.

### Step 2: Initialize Firestore Database
1. In the left-hand navigation sidebar of the Firebase console, click **Firestore Database**.
2. Click **Create database**.
3. Select your location and click **Next**.
4. Start in **Test mode** (which allows read/write access for easy testing) and click **Create**.
5. Once created, click on the **Rules** tab at the top and ensure reads/writes are allowed (for simple testing, you can keep the test rules, or restrict write permissions in production).

### Step 3: Link Firestore to the Codebase
1. Open [firebase-config.js](file:///e:/Users/Hussain%20Alyaqoob/Downloads/nada/firebase-config.js) in a text editor.
2. Locate the `firebaseConfig` object at the top:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY_HERE",
     authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT_ID.appspot.com",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```
3. Replace the placeholder strings with your actual Firebase API keys.
4. Save the file.
5. Reload [index.html](file:///e:/Users/Hussain Alyaqoob/Downloads/nada/index.html) and [admin.html](file:///e:/Users/Hussain Alyaqoob/Downloads/nada/admin.html).
6. The status badge in the Admin page will change to **Firebase Live Mode** and will automatically bootstrap the default food items to Firestore. Any updates will sync in real time!

---

## 📊 Google Sheets Alternative Integration

If you prefer logging submissions directly into a Google Sheet:

### Step 1: Prepare the Google Sheet
1. Open [Google Sheets](https://sheets.google.com/) and create a blank sheet.
2. Name the sheet (e.g. `Pre-Orders Sheet`).
3. Set the first row headers exactly like this:
   `Order ID` | `Timestamp` | `Customer Name` | `Phone Number` | `Fulfillment` | `Preferred Time` | `Dishes` | `Total Price` | `Notes`

### Step 2: Create the Google Apps Script Receptor
1. In your Google Sheet menu, go to **Extensions** > **Apps Script**.
2. Erase any default code in the editor and paste the following script:
   ```javascript
   function doPost(e) {
     try {
       var params = JSON.parse(e.postData.contents);
       var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
       
       // Arrange dishes details into a single text block
       var dishesText = params.items.map(function(item) {
         return item.quantity + "x " + item.title + " ($" + (item.price * item.quantity).toFixed(2) + ")";
       }).join(", ");
       
       // Append row
       sheet.appendRow([
         params.id || "ORD-" + Math.floor(100000 + Math.random() * 900000),
         new Date().toISOString(),
         params.customerName,
         params.customerPhone,
         params.type,
         params.preferredTime,
         dishesText,
         params.total,
         params.notes || ""
       ]);
       
       return ContentService.createTextOutput(JSON.stringify({ "status": "success" }))
                            .setMimeType(ContentService.MimeType.JSON);
     } catch(err) {
       return ContentService.createTextOutput(JSON.stringify({ "status": "error", "error": err.toString() }))
                            .setMimeType(ContentService.MimeType.JSON);
     }
   }
   ```
3. Click the disk save icon.
4. Click the **Deploy** button at the top-right and select **New deployment**.
5. Click the gear icon next to "Select type" and choose **Web app**.
6. Configure the deployment settings:
   - **Description:** Pre-order Webhook
   - **Execute as:** Me (your email)
   - **Who has access:** Anyone (this is important, it allows the public client form to post order data)
7. Click **Deploy**. Copy the **Web App URL** generated.

### Step 3: Trigger the Webhook from Code
1. Open [app.js](file:///e:/Users/Hussain%20Alyaqoob/Downloads/nada/app.js) and locate `handleCheckoutSubmit()`.
2. Add a fetch request to post the order data right after `window.dbEngine.saveOrder()`:
   ```javascript
   // Send data to Google Sheets Web App
   fetch("YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE", {
     method: "POST",
     mode: "no-cors", // keeps transaction simple
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify(savedOrder)
   }).catch(err => console.error("Google Sheets logging failed:", err));
   ```
3. Replace the placeholder URL with your copied Google Web App URL.

---

## 🍔 Modifying Food Items, Prices, and Images

- **Via Admin Interface (Recommended):** Open [admin.html](file:///e:/Users/Hussain Alyaqoob/Downloads/nada/admin.html) and scroll down to the **Menu Customizer** panel. You can easily click edit, modify titles, descriptions, pricing, image URLs, popular tags, and save. This propagates instantly to the customer menu.
- **Via Source Code:** If you want to change the *default initial template menu* loaded for clean setups, open [firebase-config.js](file:///e:/Users/Hussain%20Alyaqoob/Downloads/nada/firebase-config.js) and edit the `DEFAULT_MENU` array. You can adjust:
  - `title`: Name of the item.
  - `description`: Ingredients or flavor profiles.
  - `price`: Floating point decimal number.
  - `image`: Direct high-resolution picture URL (recommended aspect ratio: 4:3).
  - `category`: Category string (must match one of: `Main meals`, `Burgers`, `Chicken meals`, `Rice meals`, `Snacks`, `Drinks`, `Desserts`).
  - `popular`: `true` to render a golden accent badge.
  - `available`: `false` to mark as "Sold Out".

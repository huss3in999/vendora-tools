/**
 * Database Engine Wrapper for Tomorrow's Food Pre-Order Web Application
 * 
 * Demonstrates a hybrid approach:
 * - Local Demo Mode: Uses LocalStorage for instant testing, full admin functionalities, and reporting.
 * - Live Firebase Mode: Syncs with Firestore. Set configuration credentials below to activate it.
 */

// --- FIREBASE CONFIGURATION ---
// Replace the values below with your Firebase Web App credentials to enable Firebase Firestore sync.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Check if configuration has been filled out
const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey && 
         firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" && 
         firebaseConfig.projectId && 
         firebaseConfig.projectId !== "YOUR_PROJECT_ID";
};

// Default Sample Menu Data
const DEFAULT_MENU = [
  {
    id: "burger-truffle",
    title: "Spicy Truffle Burger",
    description: "Flame-grilled Angus beef, Swiss cheese, caramelized onions, and house-made spicy truffle aioli on a toasted brioche bun.",
    price: 12.99,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
    category: "Burgers",
    availableToday: true,
    availableTomorrow: false,
    requestCount: 0,
    visible: true,
    popular: true
  },
  {
    id: "burger-classic",
    title: "Classic Cheeseburger",
    description: "Double grass-fed beef patty, melted sharp cheddar, crisp butter lettuce, tomato, sliced pickles, and signature house burger sauce.",
    price: 9.99,
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80",
    category: "Burgers",
    availableToday: false,
    availableTomorrow: false,
    requestCount: 0,
    visible: true,
    popular: false
  },
  {
    id: "chicken-wings",
    title: "Crispy Buffalo Chicken Wing Box",
    description: "Eight piece crispy golden wingettes and drumettes tossed in tangy Louisiana hot sauce, served with celery sticks and cool blue cheese dip.",
    price: 14.50,
    image: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=600&q=80",
    category: "Chicken meals",
    availableToday: true,
    availableTomorrow: false,
    requestCount: 0,
    visible: true,
    popular: true
  },
  {
    id: "chicken-sandwich",
    title: "Nashville Hot Chicken Sandwich",
    description: "Crispy buttermilk fried chicken breast dipped in Nashville hot oil, sweet coleslaw, and kosher dill pickles on a buttered bun.",
    price: 11.99,
    image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80",
    category: "Chicken meals",
    availableToday: false,
    availableTomorrow: false,
    requestCount: 0,
    visible: true,
    popular: false
  },
  {
    id: "rice-mandi",
    title: "Slow-Cooked Beef Mandi",
    description: "Traditional Yemeni-style tender spiced beef served over highly aromatic smoked basmati rice, accompanied by spicy red pepper salsa.",
    price: 18.99,
    image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=600&q=80",
    category: "Rice meals",
    availableToday: true,
    availableTomorrow: false,
    requestCount: 0,
    visible: true,
    popular: true
  },
  {
    id: "rice-saffron",
    title: "Saffron Herb Rice Platter",
    description: "Fragrant long-grain basmati rice infused with luxury saffron, toasted cardamom, and layered with fresh herbs, almonds, and gold raisins.",
    price: 15.50,
    image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=600&q=80",
    category: "Rice meals",
    availableToday: false,
    availableTomorrow: false,
    requestCount: 0,
    visible: true,
    popular: false
  },
  {
    id: "snack-truffle-fries",
    title: "Truffle Parmesan Fries",
    description: "Golden thin-cut shoestring potatoes tossed in premium white truffle oil, freshly grated parmesan cheese, and chopped Italian parsley.",
    price: 6.50,
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80",
    category: "Snacks",
    availableToday: true,
    availableTomorrow: false,
    requestCount: 0,
    visible: true,
    popular: false
  },
  {
    id: "snack-sticks",
    title: "Mozzarella Herb Sticks",
    description: "Crispy fried golden mozzarella cheese logs seasoned with Italian herbs, served hot with a side of house marinara dipping sauce.",
    price: 5.99,
    image: "https://images.unsplash.com/photo-1531749668029-2db88e4b76c7?auto=format&fit=crop&w=600&q=80",
    category: "Snacks",
    availableToday: true,
    availableTomorrow: false,
    requestCount: 0,
    visible: true,
    popular: false
  },
  {
    id: "drink-mojito",
    title: "Passion Fruit Mojito",
    description: "Muddled fresh mint leaves, lime wheels, passion fruit pulp, and organic brown sugar, topped with sparkling water and crushed ice.",
    price: 4.99,
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
    category: "Drinks",
    availableToday: true,
    availableTomorrow: false,
    requestCount: 0,
    visible: true,
    popular: false
  },
  {
    id: "drink-latte",
    title: "Iced Salted Caramel Latte",
    description: "Double shot of premium espresso poured over ice and chilled whole milk, blended with sweet salted caramel drizzle.",
    price: 5.50,
    image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80",
    category: "Drinks",
    availableToday: true,
    availableTomorrow: false,
    requestCount: 0,
    visible: true,
    popular: false
  },
  {
    id: "dessert-lava",
    title: "Decadent Chocolate Lava Cake",
    description: "Rich dark Belgian chocolate cake baking a molten warm chocolate center, served with a dusting of powdered sugar.",
    price: 7.99,
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80",
    category: "Desserts",
    availableToday: true,
    availableTomorrow: false,
    requestCount: 0,
    visible: true,
    popular: true
  },
  {
    id: "dessert-cheesecake",
    title: "NY Style Strawberry Cheesecake",
    description: "Creamy, dense New York style cheesecake on a crunchy graham cracker crust, topped with sweet glazed wild strawberries.",
    price: 8.50,
    image: "https://images.unsplash.com/photo-1524351199679-46cddf530c04?auto=format&fit=crop&w=600&q=80",
    category: "Desserts",
    availableToday: false,
    availableTomorrow: false,
    requestCount: 0,
    visible: true,
    popular: false
  }
];

class StorageEngine {
  constructor() {
    this.useFirebase = isFirebaseConfigured();
    this.firebaseInitialized = false;
    this.db = null;

    if (this.useFirebase) {
      this.initFirebase();
    } else {
      console.log("DatabaseEngine: Running in Local Demo Mode using LocalStorage.");
      this.initLocalStorage();
    }
  }

  // Initialize Firebase dynamic loading from CDNs if configuration is filled out
  async initFirebase() {
    try {
      // Import Firebase libraries dynamically to prevent errors if running offline
      await this.loadScript("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
      await this.loadScript("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js");

      // Initialize Firebase App compat
      window.firebase.initializeApp(firebaseConfig);
      this.db = window.firebase.firestore();
      this.firebaseInitialized = true;
      console.log("DatabaseEngine: Firebase Firestore initialized successfully.");

      // Bootstrap food items in Firestore if empty
      const querySnapshot = await this.db.collection("foodItems").limit(1).get();
      if (querySnapshot.empty) {
        console.log("DatabaseEngine: Firestore foodItems collection is empty. Bootstrapping menu...");
        for (const item of DEFAULT_MENU) {
          await this.db.collection("foodItems").doc(item.id).set(item);
        }
      }
    } catch (error) {
      console.error("DatabaseEngine: Failed to load Firebase SDKs. Falling back to LocalStorage.", error);
      this.useFirebase = false;
      this.initLocalStorage();
    }
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Initialize LocalStorage defaults
  initLocalStorage() {
    if (!localStorage.getItem("foodItems")) {
      localStorage.setItem("foodItems", JSON.stringify(DEFAULT_MENU));
    }
    if (!localStorage.getItem("orders")) {
      localStorage.setItem("orders", JSON.stringify([]));
    }
    if (!localStorage.getItem("customerBehavior")) {
      localStorage.setItem("customerBehavior", JSON.stringify([]));
    }
    if (!localStorage.getItem("tomorrowRequests")) {
      localStorage.setItem("tomorrowRequests", JSON.stringify([]));
    }
    if (!localStorage.getItem("cookingDecisions")) {
      localStorage.setItem("cookingDecisions", JSON.stringify({}));
    }
    if (!localStorage.getItem("customerSuggestions")) {
      localStorage.setItem("customerSuggestions", JSON.stringify([]));
    }
    if (!localStorage.getItem("settings")) {
      const defaultSettings = {
        businessName: "Gourmet Tomorrow",
        businessTagline: "",
        whatsappOrderNumber: "97312345678",
        chefWhatsappNumber: "97312345678",
        currencySymbol: "BD",
        currencyCode: "BHD",
        currencyFormat: "prefix",
        enableRequests: true,
        enablePreorders: true,
        enableSuggestDish: true,
        deliveryEnabled: true,
        pickupEnabled: true,
        orderNameRequired: true,
        orderPhoneRequired: true,
        orderTimeRequired: true,
        orderNotesRequired: false,
        requestNameRequired: false,
        requestPhoneRequired: false,
        requestTimeRequired: true,
        requestNotesRequired: false,
        suggestionNameRequired: false,
        suggestionPhoneRequired: false,
        suggestionNotesRequired: false,
        phoneRequiredForRequest: false,
        showRequestCounts: true,
        votingDeadline: "11:00 PM",
        deliveryOptions: "both",
        defaultLanguage: "en",
        businessLogo: "",
        brandLogoSize: 72,
        brandLogoPlacement: "header",
        heroImage: "",
        restaurantStatus: "open",
        allowRequestsWhileClosed: true,
        restaurantTimezone: "Asia/Bahrain"
      };
      localStorage.setItem("settings", JSON.stringify(defaultSettings));
    }
    if (!localStorage.getItem("categories")) {
      const defaultCategories = [
        { id: "cat-burgers", name: "Burgers", hidden: false },
        { id: "cat-chicken", name: "Chicken meals", hidden: false },
        { id: "cat-rice", name: "Rice meals", hidden: false },
        { id: "cat-snacks", name: "Snacks", hidden: false },
        { id: "cat-drinks", name: "Drinks", hidden: false },
        { id: "cat-desserts", name: "Desserts", hidden: false }
      ];
      localStorage.setItem("categories", JSON.stringify(defaultCategories));
    }
  }

  // Generate unique session ID for behavior tracking
  getSessionId() {
    let sessionId = sessionStorage.getItem("userSessionId");
    if (!sessionId) {
      sessionId = "sess_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem("userSessionId", sessionId);
    }
    return sessionId;
  }

  // --- SYSTEM SETTINGS OPERATIONS ---
  async getSettings() {
    const defaultSettings = {
      businessName: "Gourmet Tomorrow",
      businessTagline: "",
      whatsappOrderNumber: "97312345678",
      chefWhatsappNumber: "97312345678",
      currencySymbol: "BD",
      currencyCode: "BHD",
      currencyFormat: "prefix",
      enableRequests: true,
      enablePreorders: true,
      enableSuggestDish: true,
      deliveryEnabled: true,
      pickupEnabled: true,
      orderNameRequired: true,
      orderPhoneRequired: true,
      orderTimeRequired: true,
      orderNotesRequired: false,
      requestNameRequired: false,
      requestPhoneRequired: false,
      requestTimeRequired: true,
      requestNotesRequired: false,
      suggestionNameRequired: false,
      suggestionPhoneRequired: false,
      suggestionNotesRequired: false,
      phoneRequiredForRequest: false,
      showRequestCounts: true,
      votingDeadline: "11:00 PM",
      deliveryOptions: "both",
      defaultLanguage: "en",
      businessLogo: "",
      brandLogoSize: 72,
      brandLogoPlacement: "header",
      heroImage: "",
      restaurantStatus: "open",
      allowRequestsWhileClosed: true,
      restaurantTimezone: "Asia/Bahrain"
    };

    if (this.useFirebase && this.firebaseInitialized) {
      try {
        const doc = await this.db.collection("settings").doc("main").get();
        if (doc.exists) {
          return { ...defaultSettings, ...doc.data() };
        } else {
          await this.db.collection("settings").doc("main").set(defaultSettings);
          return defaultSettings;
        }
      } catch (err) {
        console.error("Firebase settings fetch error, using local fallback:", err);
        return this.getSettingsLocally(defaultSettings);
      }
    } else {
      return this.getSettingsLocally(defaultSettings);
    }
  }

  getSettingsLocally(defaultSettings) {
    const local = localStorage.getItem("settings");
    if (local) {
      try {
        return { ...defaultSettings, ...JSON.parse(local) };
      } catch (e) {
        return defaultSettings;
      }
    } else {
      localStorage.setItem("settings", JSON.stringify(defaultSettings));
      return defaultSettings;
    }
  }

  async saveSettings(settings) {
    if (this.useFirebase && this.firebaseInitialized) {
      try {
        await this.db.collection("settings").doc("main").set(settings);
      } catch (err) {
        console.error("Firebase save settings error, using local fallback:", err);
        localStorage.setItem("settings", JSON.stringify(settings));
      }
    } else {
      localStorage.setItem("settings", JSON.stringify(settings));
    }
    return settings;
  }

  // --- CATEGORY OPERATIONS ---
  async getCategories() {
    const defaultCategories = [
      { id: "cat-burgers", name: "Burgers", hidden: false },
      { id: "cat-chicken", name: "Chicken meals", hidden: false },
      { id: "cat-rice", name: "Rice meals", hidden: false },
      { id: "cat-snacks", name: "Snacks", hidden: false },
      { id: "cat-drinks", name: "Drinks", hidden: false },
      { id: "cat-desserts", name: "Desserts", hidden: false }
    ];

    if (this.useFirebase && this.firebaseInitialized) {
      try {
        const querySnapshot = await this.db.collection("categories").get();
        if (querySnapshot.empty) {
          for (const cat of defaultCategories) {
            await this.db.collection("categories").doc(cat.id).set(cat);
          }
          return defaultCategories;
        }
        const categories = [];
        querySnapshot.forEach((doc) => {
          categories.push({ id: doc.id, ...doc.data() });
        });
        return categories;
      } catch (err) {
        console.error("Firebase categories fetch error, using local fallback:", err);
        return this.getCategoriesLocally(defaultCategories);
      }
    } else {
      return this.getCategoriesLocally(defaultCategories);
    }
  }

  getCategoriesLocally(defaultCategories) {
    const local = localStorage.getItem("categories");
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        return defaultCategories;
      }
    } else {
      localStorage.setItem("categories", JSON.stringify(defaultCategories));
      return defaultCategories;
    }
  }

  async saveCategory(category) {
    if (!category.id) {
      category.id = "cat_" + Date.now();
    }
    if (this.useFirebase && this.firebaseInitialized) {
      try {
        await this.db.collection("categories").doc(category.id).set(category);
      } catch (err) {
        console.error("Firebase save category error, using local fallback:", err);
        this.saveCategoryLocally(category);
      }
    } else {
      this.saveCategoryLocally(category);
    }
    return category;
  }

  saveCategoryLocally(category) {
    const categories = JSON.parse(localStorage.getItem("categories") || "[]");
    const index = categories.findIndex(c => c.id === category.id);
    if (index !== -1) {
      categories[index] = category;
    } else {
      categories.push(category);
    }
    localStorage.setItem("categories", JSON.stringify(categories));
  }

  async deleteCategory(categoryId) {
    if (this.useFirebase && this.firebaseInitialized) {
      try {
        await this.db.collection("categories").doc(categoryId).delete();
      } catch (err) {
        console.error("Firebase delete category error, using local fallback:", err);
        this.deleteCategoryLocally(categoryId);
      }
    } else {
      this.deleteCategoryLocally(categoryId);
    }
    return true;
  }

  deleteCategoryLocally(categoryId) {
    let categories = JSON.parse(localStorage.getItem("categories") || "[]");
    categories = categories.filter(c => c.id !== categoryId);
    localStorage.setItem("categories", JSON.stringify(categories));
  }

  // --- MENU CRUD OPERATIONS ---
  async getFoodItems() {
    let items = [];
    if (this.useFirebase && this.firebaseInitialized) {
      try {
        const querySnapshot = await this.db.collection("foodItems").get();
        querySnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
      } catch (err) {
        console.error("Firebase fetch error, using local fallback:", err);
        items = JSON.parse(localStorage.getItem("foodItems") || "[]");
      }
    } else {
      items = JSON.parse(localStorage.getItem("foodItems") || "[]");
    }

    // Run properties migration check
    let updated = false;
    items = items.map(item => {
      let changed = false;
      if (item.availableToday === undefined) {
        item.availableToday = item.available !== undefined ? item.available : true;
        changed = true;
      }
      if (item.confirmedTomorrow === undefined) {
        item.confirmedTomorrow = item.availableTomorrow !== undefined ? item.availableTomorrow : false;
        changed = true;
      }
      if (item.availableTomorrow === undefined) {
        item.availableTomorrow = item.confirmedTomorrow || false;
        changed = true;
      }
      if (item.requestCount === undefined) {
        item.requestCount = 0;
        changed = true;
      }
      if (item.soldOut === undefined) {
        item.soldOut = false;
        changed = true;
      }
      if (item.availableFrom === undefined) {
        item.availableFrom = null;
        changed = true;
      }
      if (item.availableTo === undefined) {
        item.availableTo = null;
        changed = true;
      }
      if (changed) updated = true;
      return item;
    });

    if (updated && (!this.useFirebase || !this.firebaseInitialized)) {
      localStorage.setItem("foodItems", JSON.stringify(items));
    }
    
    return items;
  }

  async saveFoodItem(item) {
    if (!item.id) {
      item.id = "food_" + Date.now();
    }
    if (this.useFirebase && this.firebaseInitialized) {
      await this.db.collection("foodItems").doc(item.id).set(item);
    } else {
      const items = JSON.parse(localStorage.getItem("foodItems") || "[]");
      const index = items.findIndex(i => i.id === item.id);
      if (index !== -1) {
        items[index] = item;
      } else {
        items.push(item);
      }
      localStorage.setItem("foodItems", JSON.stringify(items));
    }
    return item;
  }

  async deleteFoodItem(itemId) {
    if (this.useFirebase && this.firebaseInitialized) {
      await this.db.collection("foodItems").doc(itemId).delete();
    } else {
      let items = JSON.parse(localStorage.getItem("foodItems") || "[]");
      items = items.filter(i => i.id !== itemId);
      localStorage.setItem("foodItems", JSON.stringify(items));
    }
    return true;
  }

  // --- ORDER MANAGEMENT ---
  async saveOrder(order) {
    const year = new Date().getFullYear();
    const rand = Math.floor(100000 + Math.random() * 900000);
    order.id = `ORD-${year}-${rand}`;
    order.createdAt = new Date().toISOString();
    order.status = "Pending Confirmation";

    if (this.useFirebase && this.firebaseInitialized) {
      await this.db.collection("orders").doc(order.id).set(order);
    } else {
      const orders = JSON.parse(localStorage.getItem("orders") || "[]");
      orders.unshift(order); // Add to beginning of array
      localStorage.setItem("orders", JSON.stringify(orders));
    }
    return order;
  }

  async getOrders() {
    if (this.useFirebase && this.firebaseInitialized) {
      try {
        const querySnapshot = await this.db.collection("orders").orderBy("createdAt", "desc").get();
        const orders = [];
        querySnapshot.forEach((doc) => {
          orders.push({ id: doc.id, ...doc.data() });
        });
        return orders;
      } catch (err) {
        console.error("Firebase orders fetch error, using local fallback:", err);
        return JSON.parse(localStorage.getItem("orders") || "[]");
      }
    } else {
      return JSON.parse(localStorage.getItem("orders") || "[]");
    }
  }

  async updateOrderStatus(orderId, status) {
    if (this.useFirebase && this.firebaseInitialized) {
      await this.db.collection("orders").doc(orderId).update({ status: status });
    } else {
      const orders = JSON.parse(localStorage.getItem("orders") || "[]");
      const index = orders.findIndex(o => o.id === orderId);
      if (index !== -1) {
        orders[index].status = status;
        localStorage.setItem("orders", JSON.stringify(orders));
      }
    }
    return true;
  }

  async deleteOrder(orderId) {
    if (this.useFirebase && this.firebaseInitialized) {
      await this.db.collection("orders").doc(orderId).delete();
    } else {
      let orders = JSON.parse(localStorage.getItem("orders") || "[]");
      orders = orders.filter(o => o.id !== orderId);
      localStorage.setItem("orders", JSON.stringify(orders));
    }
    return true;
  }

  // --- BEHAVIOR TRACKING ---
  async saveBehaviorLog(action, details = {}) {
    const log = {
      id: "log_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      sessionId: this.getSessionId(),
      timestamp: new Date().toISOString(),
      action: action, // e.g., 'page_view', 'category_filter_click', 'item_view', 'cart_add', 'cart_remove', 'search', 'submit_order'
      details: details
    };

    if (this.useFirebase && this.firebaseInitialized) {
      // Run async in background
      this.db.collection("customerBehavior").doc(log.id).set(log).catch(err => {
        console.error("Error logging behavior to Firebase:", err);
      });
    } else {
      // LocalStorage sync
      const logs = JSON.parse(localStorage.getItem("customerBehavior") || "[]");
      logs.unshift(log); // Add newest logs at front
      // Keep last 1000 logs locally to prevent storage overflow
      if (logs.length > 1000) {
        logs.pop();
      }
      localStorage.setItem("customerBehavior", JSON.stringify(logs));
    }
    return log;
  }

  async getBehaviorLogs() {
    if (this.useFirebase && this.firebaseInitialized) {
      try {
        const querySnapshot = await this.db.collection("customerBehavior").orderBy("timestamp", "desc").limit(500).get();
        const logs = [];
        querySnapshot.forEach((doc) => {
          logs.push({ id: doc.id, ...doc.data() });
        });
        return logs;
      } catch (err) {
        console.error("Firebase logs fetch error, using local fallback:", err);
        return JSON.parse(localStorage.getItem("customerBehavior") || "[]");
      }
    } else {
      return JSON.parse(localStorage.getItem("customerBehavior") || "[]");
    }
  }

  // --- TOMORROW FOOD REQUESTS ---
  async getTomorrowRequests() {
    if (this.useFirebase && this.firebaseInitialized) {
      try {
        const querySnapshot = await this.db.collection("tomorrowRequests").get();
        const requests = [];
        querySnapshot.forEach((doc) => {
          requests.push({ id: doc.id, ...doc.data() });
        });
        return requests;
      } catch (err) {
        console.error("Firebase requests fetch error, using local fallback:", err);
        return JSON.parse(localStorage.getItem("tomorrowRequests") || "[]");
      }
    } else {
      return JSON.parse(localStorage.getItem("tomorrowRequests") || "[]");
    }
  }

  async saveTomorrowRequest(request) {
    request.id = "REQ-" + Math.floor(100000 + Math.random() * 900000);
    request.createdAt = new Date().toISOString();

    if (this.useFirebase && this.firebaseInitialized) {
      try {
        await this.db.collection("tomorrowRequests").doc(request.id).set(request);
        
        const itemRef = this.db.collection("foodItems").doc(request.itemId);
        await this.db.runTransaction(async (transaction) => {
          const itemDoc = await transaction.get(itemRef);
          if (itemDoc.exists) {
            const currentCount = itemDoc.data().requestCount || 0;
            transaction.update(itemRef, { requestCount: currentCount + (request.quantity || 1) });
          }
        });
      } catch (err) {
        console.error("Firebase save request error, using local fallback:", err);
        this.saveRequestLocally(request);
      }
    } else {
      this.saveRequestLocally(request);
    }
    return request;
  }

  saveRequestLocally(request) {
    request.status = request.status || "pending";
    request.statusLabel = request.statusLabel || this.getTomorrowRequestStatusLabel(request.status);
    request.statusNote = request.statusNote || request.statusLabel;
    const requests = JSON.parse(localStorage.getItem("tomorrowRequests") || "[]");
    requests.unshift(request);
    localStorage.setItem("tomorrowRequests", JSON.stringify(requests));

    const items = JSON.parse(localStorage.getItem("foodItems") || "[]");
    const itemIndex = items.findIndex(i => i.id === request.itemId);
    if (itemIndex !== -1) {
      items[itemIndex].requestCount = (items[itemIndex].requestCount || 0) + (request.quantity || 1);
      localStorage.setItem("foodItems", JSON.stringify(items));
    }
  }

  getTomorrowRequestStatusLabel(status) {
    const labels = {
      pending: "Pending",
      approved: "Approved for tomorrow",
      not_available: "Not available this time",
      closed: "Closed for this cycle"
    };
    return labels[status] || labels.pending;
  }

  async getMyRequestStatuses(requestIds = []) {
    const sessionId = this.getSessionId();
    const ids = new Set((requestIds || []).filter(Boolean));
    const requests = JSON.parse(localStorage.getItem("tomorrowRequests") || "[]");
    return requests
      .filter(req => {
        const sameSession = !req.sessionId || req.sessionId === sessionId;
        const requestedId = ids.size === 0 || ids.has(req.id);
        return sameSession && requestedId;
      })
      .map(req => {
        const status = req.status || "pending";
        return {
          ...req,
          status,
          statusLabel: req.statusLabel || this.getTomorrowRequestStatusLabel(status),
          statusNote: req.statusNote || this.getTomorrowRequestStatusLabel(status)
        };
      });
  }

  async updateTomorrowRequestStatus(payload = {}) {
    const requestId = payload.requestId || payload.id || "";
    const itemId = payload.itemId || payload.foodItemId || "";
    const allowed = ["pending", "approved", "not_available", "closed"];
    const status = allowed.includes(payload.status) ? payload.status : "pending";
    const statusLabel = this.getTomorrowRequestStatusLabel(status);
    const statusNote = payload.statusNote || statusLabel;
    const decidedAt = new Date().toISOString();
    let requests = JSON.parse(localStorage.getItem("tomorrowRequests") || "[]");
    requests = requests.map(req => {
      const byRequest = requestId && req.id === requestId;
      const byItem = !requestId && itemId && (req.itemId === itemId || req.foodItemId === itemId);
      if (!byRequest && !byItem) return req;
      return { ...req, status, statusLabel, statusNote, decidedAt };
    });
    localStorage.setItem("tomorrowRequests", JSON.stringify(requests));
    return { status, statusLabel, statusNote };
  }

  // --- COOKING DECISIONS & SELECTIONS ---
  async getCookingDecisions() {
    if (this.useFirebase && this.firebaseInitialized) {
      try {
        const querySnapshot = await this.db.collection("cookingDecisions").get();
        const decisions = {};
        querySnapshot.forEach((doc) => {
          decisions[doc.id] = doc.data().status;
        });
        return decisions;
      } catch (err) {
        console.error("Firebase decisions fetch error, using local fallback:", err);
        return JSON.parse(localStorage.getItem("cookingDecisions") || "{}");
      }
    } else {
      return JSON.parse(localStorage.getItem("cookingDecisions") || "{}");
    }
  }

  async saveCookingDecision(itemId, status) {
    if (this.useFirebase && this.firebaseInitialized) {
      try {
        await this.db.collection("cookingDecisions").doc(itemId).set({ status: status });
      } catch (err) {
        console.error("Firebase save decision error, using local fallback:", err);
        const decisions = JSON.parse(localStorage.getItem("cookingDecisions") || "{}");
        decisions[itemId] = status;
        localStorage.setItem("cookingDecisions", JSON.stringify(decisions));
      }
    } else {
      const decisions = JSON.parse(localStorage.getItem("cookingDecisions") || "{}");
      decisions[itemId] = status;
      localStorage.setItem("cookingDecisions", JSON.stringify(decisions));
    }
    return true;
  }

  async setAvailableTomorrow(itemId, isSelected) {
    if (this.useFirebase && this.firebaseInitialized) {
      try {
        await this.db.collection("foodItems").doc(itemId).update({ 
          confirmedTomorrow: isSelected,
          availableTomorrow: isSelected
        });
      } catch (err) {
        console.error("Firebase update selection error, using local fallback:", err);
        this.setAvailableTomorrowLocally(itemId, isSelected);
      }
    } else {
      this.setAvailableTomorrowLocally(itemId, isSelected);
    }
    return true;
  }

  setAvailableTomorrowLocally(itemId, isSelected) {
    const items = JSON.parse(localStorage.getItem("foodItems") || "[]");
    const itemIndex = items.findIndex(i => i.id === itemId);
    if (itemIndex !== -1) {
      items[itemIndex].confirmedTomorrow = isSelected;
      items[itemIndex].availableTomorrow = isSelected;
      localStorage.setItem("foodItems", JSON.stringify(items));
    }
  }

  // --- CUSTOMER DISH SUGGESTIONS ---
  async getCustomerSuggestions() {
    if (this.useFirebase && this.firebaseInitialized) {
      try {
        const querySnapshot = await this.db.collection("customerSuggestions").get();
        const suggestions = [];
        querySnapshot.forEach((doc) => {
          suggestions.push({ id: doc.id, ...doc.data() });
        });
        return suggestions;
      } catch (err) {
        console.error("Firebase suggestions fetch error, using local fallback:", err);
        return JSON.parse(localStorage.getItem("customerSuggestions") || "[]");
      }
    } else {
      return JSON.parse(localStorage.getItem("customerSuggestions") || "[]");
    }
  }

  async saveCustomerSuggestion(suggestion) {
    if (!suggestion.id) {
      suggestion.id = "SUG-" + Math.floor(100000 + Math.random() * 900000);
    }
    suggestion.createdAt = new Date().toISOString();

    if (this.useFirebase && this.firebaseInitialized) {
      try {
        await this.db.collection("customerSuggestions").doc(suggestion.id).set(suggestion);
      } catch (err) {
        console.error("Firebase save suggestion error, using local fallback:", err);
        this.saveSuggestionLocally(suggestion);
      }
    } else {
      this.saveSuggestionLocally(suggestion);
    }
    return suggestion;
  }

  saveSuggestionLocally(suggestion) {
    const suggestions = JSON.parse(localStorage.getItem("customerSuggestions") || "[]");
    suggestions.unshift(suggestion);
    localStorage.setItem("customerSuggestions", JSON.stringify(suggestions));
  }

  async deleteCustomerSuggestion(id) {
    if (this.useFirebase && this.firebaseInitialized) {
      try {
        await this.db.collection("customerSuggestions").doc(id).delete();
      } catch (err) {
        console.error("Firebase delete suggestion error:", err);
        this.deleteSuggestionLocally(id);
      }
    } else {
      this.deleteSuggestionLocally(id);
    }
    return true;
  }

  deleteSuggestionLocally(id) {
    let suggestions = JSON.parse(localStorage.getItem("customerSuggestions") || "[]");
    suggestions = suggestions.filter(s => s.id !== id);
    localStorage.setItem("customerSuggestions", JSON.stringify(suggestions));
  }

  async clearCustomerSuggestionsByDish(dishName) {
    const normalizedDish = dishName.trim().toLowerCase();
    if (this.useFirebase && this.firebaseInitialized) {
      try {
        const querySnapshot = await this.db.collection("customerSuggestions").get();
        const batch = this.db.batch();
        querySnapshot.forEach((doc) => {
          if (doc.data().dishName && doc.data().dishName.trim().toLowerCase() === normalizedDish) {
            batch.delete(doc.ref);
          }
        });
        await batch.commit();
      } catch (err) {
        console.error("Firebase clear suggestions error:", err);
        this.clearSuggestionsLocally(normalizedDish);
      }
    } else {
      this.clearSuggestionsLocally(normalizedDish);
    }
    return true;
  }

  clearSuggestionsLocally(normalizedDish) {
    let suggestions = JSON.parse(localStorage.getItem("customerSuggestions") || "[]");
    suggestions = suggestions.filter(s => !s.dishName || s.dishName.trim().toLowerCase() !== normalizedDish);
    localStorage.setItem("customerSuggestions", JSON.stringify(suggestions));
  }

  // --- REQUEST CLEARING FOR SPECIFIC DISH ---
  async clearTomorrowRequestsForItem(itemId) {
    if (this.useFirebase && this.firebaseInitialized) {
      try {
        const querySnapshot = await this.db.collection("tomorrowRequests").where("itemId", "==", itemId).get();
        const batch = this.db.batch();
        querySnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        const itemRef = this.db.collection("foodItems").doc(itemId);
        batch.update(itemRef, { requestCount: 0 });
        await batch.commit();
      } catch (err) {
        console.error("Firebase clear requests for item error:", err);
        this.clearRequestsLocally(itemId);
      }
    } else {
      this.clearRequestsLocally(itemId);
    }
    return true;
  }

  async deleteTomorrowRequest(requestId) {
    if (!requestId) return false;

    if (this.useFirebase && this.firebaseInitialized) {
      try {
        const doc = await this.db.collection("tomorrowRequests").doc(requestId).get();
        if (!doc.exists) return false;
        const data = doc.data() || {};
        await doc.ref.delete();
        const foodId = data.foodItemId || data.itemId;
        if (foodId) {
          const remaining = await this.db.collection("tomorrowRequests")
            .where("foodItemId", "==", foodId).get();
          const totalQty = remaining.docs.reduce((sum, item) => sum + (item.data().quantity || 1), 0);
          await this.db.collection("foodItems").doc(foodId).update({ requestCount: totalQty });
        }
      } catch (err) {
        console.error("Firebase delete request error:", err);
        this.deleteRequestLocally(requestId);
      }
    } else {
      this.deleteRequestLocally(requestId);
    }
    return true;
  }

  deleteRequestLocally(requestId) {
    let requests = JSON.parse(localStorage.getItem("tomorrowRequests") || "[]");
    const target = requests.find(r => r.id === requestId);
    requests = requests.filter(r => r.id !== requestId);
    localStorage.setItem("tomorrowRequests", JSON.stringify(requests));

    const foodId = target && (target.foodItemId || target.itemId);
    if (foodId) {
      const items = JSON.parse(localStorage.getItem("foodItems") || "[]");
      const itemIndex = items.findIndex(i => i.id === foodId);
      if (itemIndex !== -1) {
        const totalQty = requests
          .filter(r => (r.foodItemId || r.itemId) === foodId)
          .reduce((sum, r) => sum + (r.quantity || 1), 0);
        items[itemIndex].requestCount = totalQty;
        localStorage.setItem("foodItems", JSON.stringify(items));
      }
    }
  }

  clearRequestsLocally(itemId) {
    let requests = JSON.parse(localStorage.getItem("tomorrowRequests") || "[]");
    requests = requests.filter(r => r.itemId !== itemId && r.foodItemId !== itemId);
    localStorage.setItem("tomorrowRequests", JSON.stringify(requests));

    const items = JSON.parse(localStorage.getItem("foodItems") || "[]");
    const itemIndex = items.findIndex(i => i.id === itemId);
    if (itemIndex !== -1) {
      items[itemIndex].requestCount = 0;
      localStorage.setItem("foodItems", JSON.stringify(items));
    }
  }

  async resetDailyRequests() {
    if (this.useFirebase && this.firebaseInitialized) {
      try {
        const requestsSnapshot = await this.db.collection("tomorrowRequests").get();
        const batch = this.db.batch();
        requestsSnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });

        // Wipes all decisions as well
        const decisionsSnapshot = await this.db.collection("cookingDecisions").get();
        decisionsSnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        
        const itemsSnapshot = await this.db.collection("foodItems").get();
        itemsSnapshot.forEach((doc) => {
          batch.update(doc.ref, { requestCount: 0, confirmedTomorrow: false, availableTomorrow: false });
        });
        
        await batch.commit();
      } catch (err) {
        console.error("Firebase reset error, using local fallback:", err);
        this.resetDailyRequestsLocally();
      }
    } else {
      this.resetDailyRequestsLocally();
    }
    return true;
  }

  resetDailyRequestsLocally() {
    localStorage.setItem("tomorrowRequests", JSON.stringify([]));
    localStorage.setItem("cookingDecisions", JSON.stringify({}));
    
    const items = JSON.parse(localStorage.getItem("foodItems") || "[]");
    const updated = items.map(item => {
      item.requestCount = 0;
      item.confirmedTomorrow = false;
      item.availableTomorrow = false;
      return item;
    });
    localStorage.setItem("foodItems", JSON.stringify(updated));
  }

  // Clear demo data
  async resetDemoData() {
    if (this.useFirebase && this.firebaseInitialized) {
      return false;
    } else {
      localStorage.setItem("foodItems", JSON.stringify(DEFAULT_MENU));
      localStorage.setItem("orders", JSON.stringify([]));
      localStorage.setItem("customerBehavior", JSON.stringify([]));
      localStorage.setItem("tomorrowRequests", JSON.stringify([]));
      localStorage.setItem("customerSuggestions", JSON.stringify([]));
      localStorage.setItem("cookingDecisions", JSON.stringify({}));
      console.log("DatabaseEngine: LocalStorage reset to factory defaults.");
      return true;
    }
  }
}

function installCloudflareApiBridge(engine) {
  engine.resolveMediaUrl = (url) => {
    const value = String(url || "").trim();
    if (!value) return "";
    if (/^(https?:|data:)/i.test(value)) return value;
    if (value.startsWith("/")) {
      const origin = window.location.protocol === "file:"
        ? "https://getvendora.net"
        : window.location.origin;
      return `${origin}${value}`;
    }
    return value;
  };

  const canUseApi = window.location.protocol === "http:" || window.location.protocol === "https:" || window.location.protocol === "file:";
  engine.useCloudflareApi = canUseApi;
  engine.cloudflareApiReady = false;
  engine.apiBase = window.location.protocol === "file:" ? "https://getvendora.net/api/nada" : "/api/nada";
  engine._apiUnavailable = false;
  engine._publicStateCache = null;
  engine._adminStateCache = null;
  engine._localMethods = {};

  const methodNames = [
    "getSettings", "saveSettings", "getCategories", "saveCategory", "deleteCategory",
    "getFoodItems", "saveFoodItem", "deleteFoodItem", "saveOrder", "getOrders",
    "updateOrderStatus", "deleteOrder", "saveBehaviorLog", "getBehaviorLogs",
    "getTomorrowRequests", "saveTomorrowRequest", "getMyRequestStatuses", "updateTomorrowRequestStatus", "getCookingDecisions",
    "saveCookingDecision", "setAvailableTomorrow", "getCustomerSuggestions",
    "saveCustomerSuggestion", "deleteCustomerSuggestion", "clearCustomerSuggestionsByDish",
    "clearTomorrowRequestsForItem", "deleteTomorrowRequest", "resetDailyRequests"
  ];

  methodNames.forEach((name) => {
    engine._localMethods[name] = engine[name].bind(engine);
  });

  const isAdminPage = () => /\/admin(?:\.html)?\/?$/i.test(window.location.pathname);
  const canUseLocalFallback = () => {
    const host = window.location.hostname;
    return window.location.protocol === "file:" || host === "localhost" || host === "127.0.0.1";
  };
  const invalidate = () => {
    engine._publicStateCache = null;
    engine._adminStateCache = null;
  };

  const markUnavailable = (error) => {
    engine._apiUnavailable = true;
    engine.cloudflareApiReady = false;
    engine.lastApiError = error && error.message ? error.message : "Cloudflare API unavailable";
  };

  engine.apiFetch = async (path, options = {}, admin = false) => {
    if (!engine.useCloudflareApi) {
      const error = new Error("Cloudflare API unavailable");
      error.apiUnavailable = true;
      throw error;
    }

    const headers = new Headers(options.headers || {});
    if (!(options.body instanceof FormData) && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    let response;
    try {
      response = await fetch(`${engine.apiBase}${path}`, { ...options, headers, cache: "no-store" });
    } catch (error) {
      error.apiUnavailable = true;
      throw error;
    }

    if (response.status === 404 || response.status === 405) {
      const error = new Error("Cloudflare API unavailable");
      error.apiUnavailable = true;
      throw error;
    }

    if (response.status === 401) {
      const error = new Error("Admin API is not available.");
      error.apiUnavailable = true;
      throw error;
    }
    if (!response.ok) {
      const error = new Error(`Cloudflare API error ${response.status}`);
      error.apiUnavailable = response.status >= 500;
      throw error;
    }

    engine._apiUnavailable = false;
    engine.lastApiError = null;
    engine.cloudflareApiReady = true;
    return response.json();
  };

  const mirrorState = (state) => {
    if (!state || !state.ok) return state;
    if (state.settings) localStorage.setItem("settings", JSON.stringify(state.settings));
    if (state.categories) localStorage.setItem("categories", JSON.stringify(state.categories));
    if (state.foodItems) localStorage.setItem("foodItems", JSON.stringify(state.foodItems));
    if (state.orders) localStorage.setItem("orders", JSON.stringify(state.orders));
    if (state.tomorrowRequests) localStorage.setItem("tomorrowRequests", JSON.stringify(state.tomorrowRequests));
    if (state.customerSuggestions) localStorage.setItem("customerSuggestions", JSON.stringify(state.customerSuggestions));
    if (state.cookingDecisions) localStorage.setItem("cookingDecisions", JSON.stringify(state.cookingDecisions));
    if (state.behaviorLogs) localStorage.setItem("customerBehavior", JSON.stringify(state.behaviorLogs));
    return state;
  };

  const STATE_CACHE_MS = {
    admin: 12000,
    public: 10000
  };

  engine.getCloudflareState = async (admin = false) => {
    const cacheKey = admin ? "_adminStateCache" : "_publicStateCache";
    const cached = engine[cacheKey];
    const ttl = admin ? STATE_CACHE_MS.admin : STATE_CACHE_MS.public;
    if (cached && Date.now() - cached.time < ttl) return cached.state;
    try {
      const state = mirrorState(await engine.apiFetch(admin ? "/admin" : "/menu", {}, admin));
      engine[cacheKey] = { time: Date.now(), state };
      return state;
    } catch (error) {
      markUnavailable(error);
      throw error;
    }
  };

  const stateValue = async (key, localMethod, fallback) => {
    try {
      const state = await engine.getCloudflareState(isAdminPage());
      engine._usingLiveFallback = false;
      return state[key] !== undefined ? state[key] : fallback;
    } catch (error) {
      if (!canUseLocalFallback()) {
        engine._usingLiveFallback = false;
        throw error;
      }
      engine._usingLiveFallback = true;
      return localMethod();
    }
  };

  engine.getSettings = () => stateValue("settings", engine._localMethods.getSettings, {});
  engine.getCategories = () => stateValue("categories", engine._localMethods.getCategories, []);
  engine.getFoodItems = () => stateValue("foodItems", engine._localMethods.getFoodItems, []);
  engine.getOrders = () => stateValue("orders", engine._localMethods.getOrders, []);
  engine.getBehaviorLogs = () => stateValue("behaviorLogs", engine._localMethods.getBehaviorLogs, []);
  engine.getTomorrowRequests = () => stateValue("tomorrowRequests", engine._localMethods.getTomorrowRequests, []);
  engine.getCookingDecisions = () => stateValue("cookingDecisions", engine._localMethods.getCookingDecisions, {});
  engine.getCustomerSuggestions = () => stateValue("customerSuggestions", engine._localMethods.getCustomerSuggestions, []);
  engine.getMyRequestStatuses = async (requestIds = []) => {
    try {
      const params = new URLSearchParams({ sessionId: engine.getSessionId() });
      const ids = (requestIds || []).filter(Boolean);
      if (ids.length > 0) params.set("ids", ids.join(","));
      return (await engine.apiFetch(`/request-status?${params.toString()}`)).requests || [];
    } catch (error) {
      return engine._localMethods.getMyRequestStatuses(requestIds);
    }
  };

  const adminPost = async (resource, payload = {}) => {
    const response = await engine.apiFetch(`/admin?resource=${encodeURIComponent(resource)}`, {
      method: "POST",
      body: JSON.stringify(payload)
    }, true);
    invalidate();
    return response;
  };

  const adminDelete = async (resource, idValue = "") => {
    const response = await engine.apiFetch(`/admin?resource=${encodeURIComponent(resource)}&id=${encodeURIComponent(idValue)}`, {
      method: "DELETE"
    }, true);
    invalidate();
    return response;
  };

  const wrapWrite = (name, apiCall) => async (...args) => {
    try {
      return await apiCall(...args);
    } catch (error) {
      markUnavailable(error);
      if (!canUseLocalFallback()) {
        throw error;
      }
      return engine._localMethods[name](...args);
    }
  };

  engine.saveSettings = wrapWrite("saveSettings", async (settings) => (await adminPost("settings", settings)).settings || settings);
  engine.saveCategory = wrapWrite("saveCategory", async (category) => (await adminPost("category", category)).category || category);
  engine.deleteCategory = wrapWrite("deleteCategory", async (categoryId) => (await adminDelete("category", categoryId)).ok);
  engine.saveFoodItem = wrapWrite("saveFoodItem", async (item) => (await adminPost("food-item", item)).item || item);
  engine.deleteFoodItem = wrapWrite("deleteFoodItem", async (itemId) => (await adminDelete("food-item", itemId)).ok);
  engine.updateOrderStatus = wrapWrite("updateOrderStatus", async (orderId, status) => (await adminPost("order-status", { orderId, status })).ok);
  engine.deleteOrder = wrapWrite("deleteOrder", async (orderId) => (await adminDelete("order", orderId)).ok);
  engine.saveCookingDecision = wrapWrite("saveCookingDecision", async (itemId, status) => (await adminPost("cooking-decision", { itemId, status })).ok);
  engine.setAvailableTomorrow = wrapWrite("setAvailableTomorrow", async (itemId, isSelected) => (await adminPost("available-tomorrow", { itemId, isSelected })).ok);
  engine.updateTomorrowRequestStatus = wrapWrite("updateTomorrowRequestStatus", async (payload) => (await adminPost("request-status", payload)).requestStatus || payload);
  engine.deleteCustomerSuggestion = wrapWrite("deleteCustomerSuggestion", async (suggestionId) => (await adminDelete("suggestion", suggestionId)).ok);
  engine.clearCustomerSuggestionsByDish = wrapWrite("clearCustomerSuggestionsByDish", async (dishName) => (await adminDelete("suggestion-dish", dishName)).ok);
  engine.clearTomorrowRequestsForItem = wrapWrite("clearTomorrowRequestsForItem", async (itemId) => (await adminDelete("requests-for-item", itemId)).ok);
  engine.deleteTomorrowRequest = wrapWrite("deleteTomorrowRequest", async (requestId) => (await adminDelete("request", requestId)).ok);
  engine.resetDailyRequests = wrapWrite("resetDailyRequests", async () => (await adminPost("reset-daily", {})).ok);

  engine.saveOrder = wrapWrite("saveOrder", async (order) => (await engine.apiFetch("/order", {
    method: "POST",
    body: JSON.stringify(order)
  })).order || order);

  engine.saveTomorrowRequest = wrapWrite("saveTomorrowRequest", async (request) => (await engine.apiFetch("/request", {
    method: "POST",
    body: JSON.stringify({ ...request, sessionId: engine.getSessionId() })
  })).request || request);

  engine.saveCustomerSuggestion = wrapWrite("saveCustomerSuggestion", async (suggestion) => (await engine.apiFetch("/suggestion", {
    method: "POST",
    body: JSON.stringify(suggestion)
  })).suggestion || suggestion);

  engine.saveBehaviorLog = async (action, details = {}) => {
    const log = {
      id: "log_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      sessionId: engine.getSessionId(),
      timestamp: new Date().toISOString(),
      action,
      details
    };
    try {
      await engine.apiFetch("/log", { method: "POST", body: JSON.stringify(log) });
      return log;
    } catch (error) {
      return engine._localMethods.saveBehaviorLog(action, details);
    }
  };

  engine.uploadImageDataUrl = async (dataUrl, type = "menu") => {
    const useLiveUpload = engine.useCloudflareApi && !engine._apiUnavailable;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const mime = blob.type || "image/jpeg";
      if (!/^image\/(jpeg|png|webp|gif)$/i.test(mime)) {
        throw new Error("Unsupported image format");
      }
      const ext = mime.includes("webp") ? "webp" : mime.includes("png") ? "png" : mime.includes("gif") ? "gif" : "jpg";
      const form = new FormData();
      form.append("file", blob, `${type}-${Date.now()}.${ext}`);
      form.append("type", type);
      const response = await engine.apiFetch("/upload", { method: "POST", body: form }, true);
      if (!response.url) throw new Error("Upload did not return a URL");
      return response.url;
    } catch (error) {
      if (useLiveUpload) throw error;
      return dataUrl;
    }
  };
}

// Bind to window for global access
window.dbEngine = new StorageEngine();
installCloudflareApiBridge(window.dbEngine);

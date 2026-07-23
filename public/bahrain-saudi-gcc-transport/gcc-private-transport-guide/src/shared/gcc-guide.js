(function () {
  const PHONE = window.VENDORA_BUSINESS_CONFIG?.booking_whatsapp || "";

  const locationsData = {
    ar: {
      countries: ["البحرين", "السعودية", "قطر", "الكويت", "الإمارات", "عمان", "العراق"],
      locations: {
        "البحرين": [
          { name: "المنامة", group: "cities" },
          { name: "الجفير", group: "cities" },
          { name: "السيف", group: "cities" },
          { name: "المنطقة الدبلوماسية", group: "cities" },
          { name: "المحرق", group: "cities" },
          { name: "مطار البحرين الدولي (BAH)", group: "airports", isAirport: true },
          { name: "سار", group: "cities" },
          { name: "البديع", group: "cities" },
          { name: "الرفاع", group: "cities" },
          { name: "مدينة عيسى", group: "cities" },
          { name: "مدينة حمد", group: "cities" },
          { name: "عالي", group: "cities" },
          { name: "سترة", group: "cities" },
          { name: "أمواج", group: "cities" },
          { name: "ديار المحرق", group: "cities" },
          { name: "خليج البحرين", group: "cities" },
          { name: "العدلية", group: "cities" },
          { name: "الحورة", group: "cities" },
          { name: "الحد", group: "cities" },
          { name: "موقع آخر / غير مدرج", group: "other", value: "other" }
        ],
        "السعودية": [
          { name: "الخبر", group: "cities" },
          { name: "الدمام", group: "cities" },
          { name: "الرياض", group: "cities" },
          { name: "الظهران", group: "cities" },
          { name: "الجبيل", group: "cities" },
          { name: "القطيف", group: "cities" },
          { name: "الهفوف", group: "cities" },
          { name: "الأحساء", group: "cities" },
          { name: "رأس تنورة", group: "cities" },
          { name: "بقيق", group: "cities" },
          { name: "جسر الملك فهد", group: "cities" },
          { name: "مطار الملك فهد الدولي بالدمام (DMM)", group: "airports", isAirport: true },
          { name: "مطار الملك خالد الدولي بالرياض (RUH)", group: "airports", isAirport: true },
          { name: "أرامكو / منطقة الظهران", group: "cities" },
          { name: "كورنيش الخبر", group: "cities" },
          { name: "شاطئ نصف القمر", group: "cities" },
          { name: "موقع آخر / غير مدرج", group: "other", value: "other" }
        ],
        "قطر": [
          { name: "الدوحة", group: "cities" },
          { name: "مطار حمد الدولي بالدوحة (DOH)", group: "airports", isAirport: true },
          { name: "لوسيل", group: "cities" },
          { name: "اللؤلؤة", group: "cities" },
          { name: "الخليج الغربي", group: "cities" },
          { name: "الوكرة", group: "cities" },
          { name: "الخور", group: "cities" },
          { name: "مسيعيد", group: "cities" },
          { name: "المنطقة الصناعية", group: "cities" },
          { name: "موقع آخر / غير مدرج", group: "other", value: "other" }
        ],
        "الكويت": [
          { name: "مدينة الكويت", group: "cities" },
          { name: "مطار الكويت الدولي (KWI)", group: "airports", isAirport: true },
          { name: "السالمية", group: "cities" },
          { name: "حولي", group: "cities" },
          { name: "الفروانية", group: "cities" },
          { name: "الفحيحيل", group: "cities" },
          { name: "الأحمدي", group: "cities" },
          { name: "المهبولة", group: "cities" },
          { name: "المنقف", group: "cities" },
          { name: "الجهراء", group: "cities" },
          { name: "مبارك الكبير", group: "cities" },
          { name: "موقع آخر / غير مدرج", group: "other", value: "other" }
        ],
        "الإمارات": [
          { name: "دبي", group: "cities" },
          { name: "مطار دبي الدولي (DXB)", group: "airports", isAirport: true },
          { name: "أبوظبي", group: "cities" },
          { name: "مطار أبوظبي الدولي (AUH)", group: "airports", isAirport: true },
          { name: "الشارقة", group: "cities" },
          { name: "مطار الشارقة الدولي (SHJ)", group: "airports", isAirport: true },
          { name: "عجمان", group: "cities" },
          { name: "رأس الخيمة", group: "cities" },
          { name: "الفجيرة", group: "cities" },
          { name: "العين", group: "cities" },
          { name: "جبل علي", group: "cities" },
          { name: "خليج الأعمال", group: "cities" },
          { name: "وسط مدينة دبي", group: "cities" },
          { name: "مرسى دبي", group: "cities" },
          { name: "موقع آخر / غير مدرج", group: "other", value: "other" }
        ],
        "عمان": [
          { name: "مسقط", group: "cities" },
          { name: "مطار مسقط الدولي (MCT)", group: "airports", isAirport: true },
          { name: "صحار", group: "cities" },
          { name: "صلالة", group: "cities" },
          { name: "نزوى", group: "cities" },
          { name: "صور", group: "cities" },
          { name: "بركاء", group: "cities" },
          { name: "السيب", group: "cities" },
          { name: "مطرح", group: "cities" },
          { name: "موقع آخر / غير مدرج", group: "other", value: "other" }
        ],
        "العراق": [
          { name: "النجف", group: "cities" },
          { name: "مطار النجف الدولي (NJF)", group: "airports", isAirport: true },
          { name: "كربلاء", group: "cities" },
          { name: "بغداد", group: "cities" },
          { name: "مطار بغداد الدولي (BGW)", group: "airports", isAirport: true },
          { name: "البصرة", group: "cities" },
          { name: "مطار البصرة الدولي (BSR)", group: "airports", isAirport: true },
          { name: "الكاظمية", group: "cities" },
          { name: "سامراء", group: "cities" },
          { name: "مسار الزيارة", group: "cities" },
          { name: "موقع آخر / غير مدرج", group: "other", value: "other" }
        ]
      }
    },
    en: {
      countries: ["Bahrain", "Saudi Arabia", "Qatar", "Kuwait", "UAE", "Oman", "Iraq"],
      locations: {
        "Bahrain": [
          { name: "Manama", group: "cities" },
          { name: "Juffair", group: "cities" },
          { name: "Seef", group: "cities" },
          { name: "Diplomatic Area", group: "cities" },
          { name: "Muharraq", group: "cities" },
          { name: "Bahrain International Airport (BAH)", group: "airports", isAirport: true },
          { name: "Saar", group: "cities" },
          { name: "Budaiya", group: "cities" },
          { name: "Riffa", group: "cities" },
          { name: "Isa Town", group: "cities" },
          { name: "Hamad Town", group: "cities" },
          { name: "Aali", group: "cities" },
          { name: "Sitra", group: "cities" },
          { name: "Amwaj", group: "cities" },
          { name: "Diyar Al Muharraq", group: "cities" },
          { name: "Bahrain Bay", group: "cities" },
          { name: "Adliya", group: "cities" },
          { name: "Hoora", group: "cities" },
          { name: "Hidd", group: "cities" },
          { name: "Other / Not listed", group: "other", value: "other" }
        ],
        "Saudi Arabia": [
          { name: "Khobar", group: "cities" },
          { name: "Dammam", group: "cities" },
          { name: "Riyadh", group: "cities" },
          { name: "Dhahran", group: "cities" },
          { name: "Jubail", group: "cities" },
          { name: "Qatif", group: "cities" },
          { name: "Hofuf", group: "cities" },
          { name: "Al Ahsa", group: "cities" },
          { name: "Ras Tanura", group: "cities" },
          { name: "Abqaiq", group: "cities" },
          { name: "King Fahd Causeway", group: "cities" },
          { name: "King Fahd International Airport (DMM)", group: "airports", isAirport: true },
          { name: "King Khalid International Airport (RUH)", group: "airports", isAirport: true },
          { name: "Aramco / Dhahran area", group: "cities" },
          { name: "Al Khobar Corniche", group: "cities" },
          { name: "Half Moon Bay", group: "cities" },
          { name: "Other / Not listed", group: "other", value: "other" }
        ],
        "Qatar": [
          { name: "Doha", group: "cities" },
          { name: "Hamad International Airport (DOH)", group: "airports", isAirport: true },
          { name: "Lusail", group: "cities" },
          { name: "The Pearl", group: "cities" },
          { name: "West Bay", group: "cities" },
          { name: "Al Wakrah", group: "cities" },
          { name: "Al Khor", group: "cities" },
          { name: "Mesaieed", group: "cities" },
          { name: "Industrial Area", group: "cities" },
          { name: "Other / Not listed", group: "other", value: "other" }
        ],
        "Kuwait": [
          { name: "Kuwait City", group: "cities" },
          { name: "Kuwait International Airport (KWI)", group: "airports", isAirport: true },
          { name: "Salmiya", group: "cities" },
          { name: "Hawally", group: "cities" },
          { name: "Farwaniya", group: "cities" },
          { name: "Fahaheel", group: "cities" },
          { name: "Ahmadi", group: "cities" },
          { name: "Mahboula", group: "cities" },
          { name: "Mangaf", group: "cities" },
          { name: "Jahra", group: "cities" },
          { name: "Mubarak Al-Kabeer", group: "cities" },
          { name: "Other / Not listed", group: "other", value: "other" }
        ],
        "UAE": [
          { name: "Dubai", group: "cities" },
          { name: "Dubai International Airport (DXB)", group: "airports", isAirport: true },
          { name: "Abu Dhabi", group: "cities" },
          { name: "Abu Dhabi International Airport (AUH)", group: "airports", isAirport: true },
          { name: "Sharjah", group: "cities" },
          { name: "Sharjah International Airport (SHJ)", group: "airports", isAirport: true },
          { name: "Ajman", group: "cities" },
          { name: "Ras Al Khaimah", group: "cities" },
          { name: "Fujairah", group: "cities" },
          { name: "Al Ain", group: "cities" },
          { name: "Jebel Ali", group: "cities" },
          { name: "Business Bay", group: "cities" },
          { name: "Downtown Dubai", group: "cities" },
          { name: "Dubai Marina", group: "cities" },
          { name: "Other / Not listed", group: "other", value: "other" }
        ],
        "Oman": [
          { name: "Muscat", group: "cities" },
          { name: "Muscat International Airport (MCT)", group: "airports", isAirport: true },
          { name: "Sohar", group: "cities" },
          { name: "Salalah", group: "cities" },
          { name: "Nizwa", group: "cities" },
          { name: "Sur", group: "cities" },
          { name: "Barka", group: "cities" },
          { name: "Seeb", group: "cities" },
          { name: "Muttrah", group: "cities" },
          { name: "Other / Not listed", group: "other", value: "other" }
        ],
        "Iraq": [
          { name: "Najaf", group: "cities" },
          { name: "Najaf International Airport (NJF)", group: "airports", isAirport: true },
          { name: "Karbala", group: "cities" },
          { name: "Baghdad", group: "cities" },
          { name: "Baghdad International Airport (BGW)", group: "airports", isAirport: true },
          { name: "Basra", group: "cities" },
          { name: "Basra International Airport (BSR)", group: "airports", isAirport: true },
          { name: "Kadhimiya", group: "cities" },
          { name: "Samarra", group: "cities" },
          { name: "Ziyarat route", group: "cities" },
          { name: "Other / Not listed", group: "other", value: "other" }
        ]
      }
    }
  };

  const i18n = {
    ar: {
      quoteNeeded: "يحتاج هذا المسار إلى تسعير حسب تفاصيل الرحلة.",
      noPrices: "لا يتم عرض سعر ثابت حالياً. أرسل التفاصيل للحصول على عرض مناسب.",
      documents: "تأكد من صلاحية الجواز أو الهوية وأي متطلبات سفر قبل الرحلة. مسؤولية المستندات على المسافر.",
      airport: "لرحلات المطار، أرسل رقم الرحلة ووقت الوصول أو المغادرة وعدد الشنط.",
      causeway: "لرحلات البحرين والسعودية، اترك وقتاً إضافياً لجسر الملك فهد وإجراءات الحدود.",
      longDistance: "للرحلات الطويلة داخل الخليج، أرسل عدد الركاب والشنط وهل تحتاج توقفات أو عودة في نفس اليوم.",
      sameDay: "لرحلات العودة في نفس اليوم، أرسل وقت الانتظار المتوقع ووقت الموعد ووقت الرجعة وهل تحتاج بقاء السيارة متاحة.",
      parcel: "للطرد أو المستندات، أرسل نوع الغرض والحجم والوقت المطلوب. لا يمكن قبول كل الأغراض.",
      family: "للعائلات، أرسل عدد الأطفال والشنط وهل تحتاج سيارة أكبر.",
      business: "لرحلات العمل أو VIP، أرسل وقت الاجتماع ومكان الالتقاء وأي متطلبات خصوصية.",
      summary: "ملخص طلبك",
      openWhatsApp: "إرسال الطلب عبر واتساب",
      copied: "تم تجهيز رابط واتساب حسب التفاصيل المدخلة.",
      messageIntro: "مرحباً، أريد طلب سعر لخدمة توصيل خاصة من GetVendora.",
      tripType: "نوع الرحلة",
      pickup: "الانطلاق",
      destination: "الوجهة",
      dateTime: "التاريخ والوقت",
      passengers: "عدد الركاب",
      luggage: "عدد الشنط",
      purpose: "الغرض",
      notes: "ملاحظات",
      requestQuote: "أرجو إرسال السعر والتوفر حسب هذه التفاصيل."
    },
    en: {
      quoteNeeded: "This route needs a quote based on the trip details.",
      noPrices: "No fixed price is shown yet. Send the details to receive a suitable quote.",
      documents: "Please check passport, ID, visa, and travel requirements before the trip. Passenger documents are the passenger's responsibility.",
      airport: "For airport trips, send the flight number, arrival or departure time, and luggage details.",
      causeway: "For Bahrain and Saudi routes, allow extra time for King Fahd Causeway and border procedures.",
      longDistance: "For long-distance GCC trips, send passenger count, luggage, stops, and whether you need a same-day return.",
      sameDay: "For same-day return trips, send the expected waiting time, meeting time, return time, and whether the vehicle should remain available.",
      parcel: "For parcel or document delivery, send item type, size, and required timing. Not every item can be accepted.",
      family: "For family travel, send children count, luggage count, and whether a larger vehicle is needed.",
      business: "For business or VIP travel, send meeting time, pickup point, and any privacy or timing requirements.",
      summary: "Request summary",
      openWhatsApp: "Send request on WhatsApp",
      copied: "WhatsApp link prepared from the entered details.",
      messageIntro: "Hello, I would like to request a quote for GetVendora private transport.",
      tripType: "Trip type",
      pickup: "Pickup",
      destination: "Destination",
      dateTime: "Date and time",
      passengers: "Passengers",
      luggage: "Luggage",
      purpose: "Purpose",
      notes: "Notes",
      requestQuote: "Please send price and availability based on these details."
    }
  };

  function value(form, name) {
    const field = form.querySelector(`[name="${name}"]`);
    return field ? field.value.trim() : "";
  }

  function isSaudi(countryOrCity) {
    return /saudi|السعود|khobar|dammam|riyadh|dhahran|jubail|qatif|hofuf|الخبر|الدمام|الرياض|الظهران|الجبيل|القطيف|الأحساء/i.test(countryOrCity);
  }

  function isBahrain(countryOrCity) {
    return /bahrain|البحرين|manama|muharraq|seef|juffair|saar|المنامة|المحرق|السيف|الجفير|سار/i.test(countryOrCity);
  }

  function isAirport(text) {
    return /airport|matar|bah|dmm|ruh|doh|kwi|dxb|auh|mct|njf|bgw|مطار/i.test(text);
  }

  function isIraq(text) {
    return /iraq|najaf|karbala|baghdad|basra|ziyarat|arbaeen|العراق|النجف|كربلاء|بغداد|البصرة|زيارة|الأربعين/i.test(text);
  }

  function hasAirportNeed(text) {
    return /airport|flight|bah|dmm|ruh|doh|kwi|dxb|auh|mct|مطار|رحلة|رقم الرحلة/i.test(text);
  }

  function hasFamilyNeed(text) {
    return /family|kids|children|child|luggage|bags|bag|عائلة|عائلات|أطفال|اطفال|شنط|حقائب|شنطة|حقيبة/i.test(text);
  }

  function hasBusinessNeed(text) {
    return /business|vip|corporate|executive|meeting|رجال أعمال|رجال اعمال|عمل|اجتماع|تنفيذي/i.test(text);
  }

  function hasParcelNeed(text) {
    return /parcel|document|documents|delivery|طرد|طرود|مستند|مستندات|توصيل/i.test(text);
  }

  function hasSameDayNeed(text) {
    return /same day|same-day|return|round trip|waiting|رجعة|عودة|نفس اليوم|انتظار/i.test(text);
  }

  function buildNotes(lang, data) {
    const t = i18n[lang];
    const all = `${data.pickupCountry} ${data.pickupCity} ${data.destinationCountry} ${data.destinationCity} ${data.tripType} ${data.purpose} ${data.notes}`;
    const notes = [t.quoteNeeded, t.noPrices, t.documents];

    if (isAirport(all) || hasAirportNeed(all)) notes.push(t.airport);
    if ((isBahrain(all) && isSaudi(all)) || /causeway|جسر/i.test(all)) notes.push(t.causeway);
    if (isIraq(all) || /qatar|kuwait|uae|oman|doha|dubai|abu dhabi|muscat|riyadh|الرياض|قطر|الكويت|الإمارات|عمان|دبي|أبوظبي|مسقط/i.test(all)) notes.push(t.longDistance);
    if (hasSameDayNeed(all) && t.sameDay) notes.push(t.sameDay);
    if (hasParcelNeed(all)) notes.push(t.parcel);
    if (hasFamilyNeed(all)) notes.push(t.family);
    if (hasBusinessNeed(all)) notes.push(t.business);

    return Array.from(new Set(notes));
  }

  function identifyVendoraSource(lang, details) {
    const website = lang === "ar"
      ? "https://getvendora.net/bahrain-saudi-gcc-transport/"
      : "https://getvendora.net/bahrain-saudi-gcc-transport/en/";
    const source = lang === "ar"
      ? "السلام عليكم، تواصلت معكم من خلال موقع فندورا للنقل:"
      : "Hello, I contacted you through the Vendora Transport website:";
    const enquiry = lang === "ar" ? "أرغب في الاستفسار عن:" : "I would like to enquire about:";
    const text = String(details || "").trim();
    if (text.startsWith(source) && text.includes(website)) return text;
    return `${source}\n${website}\n\n${enquiry}\n${text || (lang === "ar" ? "خدمة النقل الخاص" : "Private transport service")}`;
  }

  function buildMessage(lang, data) {
    const t = i18n[lang];
    const lines = [
      `${t.tripType}: ${data.tripType || "-"}`,
      `${t.pickup}: ${data.pickupCountry || "-"} / ${data.pickupCity || "-"}`,
      `${t.destination}: ${data.destinationCountry || "-"} / ${data.destinationCity || "-"}`,
    ];
    
    if (data.flightNumber) {
      const flightLabel = lang === "ar" ? "رقم الرحلة" : "Flight number";
      lines.push(`${flightLabel}: ${data.flightNumber}`);
    }
    
    lines.push(
      `${t.dateTime}: ${data.date || "-"} ${data.time || ""}`.trim(),
      `${t.passengers}: ${data.passengers || "-"}`,
      `${t.luggage}: ${data.luggage || "-"}`,
      `${t.purpose}: ${data.purpose || "-"}`,
      `${t.notes}: ${data.notes || "-"}`
    );
    
    lines.push(t.requestQuote);
    return identifyVendoraSource(lang, lines.join("\n"));
  }

  function updateConditionalFields(form) {
    const pickupLocSelect = form.querySelector('[name="pickupLocation"]');
    const destLocSelect = form.querySelector('[name="destinationLocation"]');
    
    // 1. Custom fields
    const pickupCustomField = form.querySelector('#pickupCustomField');
    if (pickupCustomField) {
      pickupCustomField.style.display = (pickupLocSelect && pickupLocSelect.value === "other") ? "block" : "none";
    }
    
    const destCustomField = form.querySelector('#destinationCustomField');
    if (destCustomField) {
      destCustomField.style.display = (destLocSelect && destLocSelect.value === "other") ? "block" : "none";
    }
    
    // 2. Flight number field
    const pickupOption = (pickupLocSelect && pickupLocSelect.selectedIndex >= 0) ? pickupLocSelect.options[pickupLocSelect.selectedIndex] : null;
    const destOption = (destLocSelect && destLocSelect.selectedIndex >= 0) ? destLocSelect.options[destLocSelect.selectedIndex] : null;
    
    const isPickupAirport = pickupOption && pickupOption.dataset.airport === "true";
    const isDestAirport = destOption && destOption.dataset.airport === "true";
    
    const flightNumberField = form.querySelector('#flightNumberField');
    if (flightNumberField) {
      flightNumberField.style.display = (isPickupAirport || isDestAirport) ? "block" : "none";
    }
  }

  function updateLocations(form, type) {
    const lang = form.dataset.lang || "en";
    const db = locationsData[lang];
    const countrySelect = form.querySelector(`[name="${type}Country"]`);
    const locSelect = form.querySelector(`[name="${type}Location"]`);
    
    if (!countrySelect || !locSelect) return;
    
    const country = countrySelect.value;
    const list = db.locations[country] || [];
    
    const cities = list.filter(item => item.group === "cities");
    const airports = list.filter(item => item.group === "airports");
    const other = list.filter(item => item.group === "other");
    
    const optgroups = [];
    
    if (cities.length > 0) {
      const label = lang === "ar" ? "المدن والمناطق" : "Cities & Areas";
      optgroups.push(`<optgroup label="${label}">` + cities.map(item => `<option value="${item.name}">${item.name}</option>`).join("") + `</optgroup>`);
    }
    if (airports.length > 0) {
      const label = lang === "ar" ? "المطارات" : "Airports";
      optgroups.push(`<optgroup label="${label}">` + airports.map(item => `<option value="${item.name}" data-airport="true">${item.name}</option>`).join("") + `</optgroup>`);
    }
    if (other.length > 0) {
      const label = lang === "ar" ? "أخرى" : "Other";
      optgroups.push(`<optgroup label="${label}">` + other.map(item => `<option value="${item.value}">${item.name}</option>`).join("") + `</optgroup>`);
    }
    
    locSelect.innerHTML = optgroups.join("");
    updateConditionalFields(form);
  }

  const lang = document.documentElement.lang.slice(0, 2) || "en";

  // --- TRACKING CODE START ---
  function getPlannerData(formEl) {
    let pickupVal = value(formEl, "pickupLocation");
    if (pickupVal === "other") {
      pickupVal = value(formEl, "pickupCustom") || "";
    }
    let destVal = value(formEl, "destinationLocation");
    if (destVal === "other") {
      destVal = value(formEl, "destinationCustom") || "";
    }
    
    const pickupLocSelect = formEl.querySelector('[name="pickupLocation"]');
    const destLocSelect = formEl.querySelector('[name="destinationLocation"]');
    const pickupOption = (pickupLocSelect && pickupLocSelect.selectedIndex >= 0) ? pickupLocSelect.options[pickupLocSelect.selectedIndex] : null;
    const destOption = (destLocSelect && destLocSelect.selectedIndex >= 0) ? destLocSelect.options[destLocSelect.selectedIndex] : null;
    const isPickupAirport = pickupOption && pickupOption.dataset.airport === "true";
    const isDestAirport = destOption && destOption.dataset.airport === "true";
    
    const customUsed = (value(formEl, "pickupLocation") === "other" || value(formEl, "destinationLocation") === "other");

    return {
      language: lang,
      page: 'gcc_private_transport_guide',
      pickup_country: value(formEl, "pickupCountry") || "",
      pickup_location: pickupVal || "",
      destination_country: value(formEl, "destinationCountry") || "",
      destination_location: destVal || "",
      trip_type: value(formEl, "tripType") || "",
      purpose: value(formEl, "purpose") || "",
      is_airport_route: (isPickupAirport || isDestAirport) ? 1 : 0,
      custom_location_used: customUsed ? 1 : 0,
      date: value(formEl, "date") || "",
      time: value(formEl, "time") || "",
      passengers: value(formEl, "passengers") || "",
      luggage: value(formEl, "luggage") || "",
      notes: value(formEl, "notes") || "",
      flight_number: value(formEl, "flightNumber") || "",
      timestamp: new Date().toISOString()
    };
  }

  function getTrackingPayload(eventName, extra = {}) {
    const formEl = document.querySelector("[data-route-planner]");
    const plannerDetails = formEl ? getPlannerData(formEl) : {
      language: lang,
      page: 'gcc_private_transport_guide',
      timestamp: new Date().toISOString()
    };
    return Object.assign({}, plannerDetails, extra);
  }

  function fireTelemetry(eventName, extra = {}) {
    const payload = getTrackingPayload(eventName, extra);
    if (typeof window.vendoraTrackLocal === 'function') {
      window.vendoraTrackLocal(eventName, payload);
    }
  }

  function sendLeadEvent(serviceType, extra = {}) {
    const utmSource = new URLSearchParams(window.location.search).get('utm_source') || '';
    const utmMedium = new URLSearchParams(window.location.search).get('utm_medium') || '';
    const utmCampaign = new URLSearchParams(window.location.search).get('utm_campaign') || '';
    
    const pagePath = window.location.pathname.replace(/\/index\.html$/, '/');
    const pageUrl = window.location.href.split('#')[0];
    
    let deviceType = 'desktop';
    const ua = navigator.userAgent || '';
    if (/tablet|ipad|playbook|silk/i.test(ua)) deviceType = 'tablet';
    else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) deviceType = 'mobile';

    const visitorId = localStorage.getItem('__vendora_visitor_id') || 'unknown';
    const sessionId = sessionStorage.getItem('__vendora_session_id') || 'unknown';

    const payload = Object.assign({
      timestamp: new Date().toISOString(),
      routeSlug: 'gcc-private-transport-guide',
      routeLabel: document.title || 'GCC Private Transport Guide',
      pageUrl: pageUrl,
      pagePath: pagePath,
      pageTitle: document.title || '',
      serviceType: serviceType,
      language: lang,
      deviceType: deviceType,
      sessionId: sessionId,
      visitorId: visitorId,
      utmSource: utmSource,
      utmMedium: utmMedium,
      utmCampaign: utmCampaign,
      referrer: document.referrer || '',
      browserLanguage: navigator.language || '',
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      timeOnPageMs: 0
    }, extra);

    const body = JSON.stringify(payload);
    
    if (navigator.sendBeacon && serviceType !== 'pageview') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/transport/event', blob);
    } else {
      fetch('/api/transport/event', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: body,
        keepalive: true
      }).catch(err => {});
    }
  }

  // Track initial page_view on load
  window.addEventListener('load', function() {
    fireTelemetry('gcc_guide_page_view');
    sendLeadEvent('pageview');
  });

  // Track planner interactions
  let plannerStarted = false;
  function markPlannerStarted() {
    if (!plannerStarted) {
      plannerStarted = true;
      fireTelemetry('gcc_guide_planner_start');
    }
  }

  function handleQuoteGeneration() {
    if (window.__VENDORA_QUOTE_TRACKED__) return;
    window.__VENDORA_QUOTE_TRACKED__ = true;
    setTimeout(() => { window.__VENDORA_QUOTE_TRACKED__ = false; }, 1000);
    
    fireTelemetry('gcc_guide_quote_generated');
    fireTelemetry('gcc_guide_whatsapp_click', { click_location: 'planner' });
    
    const formEl = document.querySelector("[data-route-planner]");
    if (formEl) {
      const plannerData = getPlannerData(formEl);
      sendLeadEvent('passenger_transport', Object.assign({
        fromCountry: plannerData.pickup_country,
        fromCity: plannerData.pickup_location,
        toCountry: plannerData.destination_country,
        toCity: plannerData.destination_location,
        clickText: lang === "ar" ? "إرسال الطلب عبر واتساب" : "Send request on WhatsApp",
        targetUrl: document.querySelector(formEl.dataset.whatsapp)?.href || ""
      }, plannerData));
    }
  }

  // Track static/floating WhatsApp clicks via delegation
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (!link) return;
    
    const href = link.getAttribute('href') || '';
    const isWa = href.indexOf('wa.me') !== -1 || link.classList.contains('floating-wa') || link.dataset.waStatic;
    if (!isWa) return;
    
    // Determine click location
    let clickLoc = 'unknown';
    if (link.classList.contains('floating-wa')) {
      clickLoc = 'floating button';
    } else if (link.id === 'planner-whatsapp' || link.closest('#planner') || link.hasAttribute('data-planner-submit')) {
      clickLoc = 'planner';
    } else if (link.closest('.hero')) {
      clickLoc = 'hero';
    } else if (link.closest('footer') || link.closest('.footer')) {
      clickLoc = 'final CTA';
    } else if (link.closest('.route-card') || link.closest('.route-grid')) {
      clickLoc = 'route card';
    } else if (link.closest('#faq') || link.closest('.faq-group')) {
      clickLoc = 'FAQ';
    }
    
    // Fire click event (only for non-planner clicks; planner is handled by handleQuoteGeneration)
    if (clickLoc !== 'planner') {
      fireTelemetry('gcc_guide_whatsapp_click', { click_location: clickLoc });
    }
    
    if (clickLoc === 'planner') {
      handleQuoteGeneration();
    } else {
      const formEl = document.querySelector("[data-route-planner]");
      const plannerData = formEl ? getPlannerData(formEl) : {};
      sendLeadEvent('whatsapp_click', Object.assign({
        fromCountry: plannerData.pickup_country || "",
        fromCity: plannerData.pickup_location || "",
        toCountry: plannerData.destination_country || "",
        toCity: plannerData.destination_location || "",
        clickText: link.textContent.trim(),
        targetUrl: link.href || ""
      }, plannerData));
    }
  });
  // --- TRACKING CODE END ---

  function initForm(form) {
    const db = locationsData[lang];
    const pickupCountrySelect = form.querySelector('[name="pickupCountry"]');
    const destCountrySelect = form.querySelector('[name="destinationCountry"]');
    
    if (pickupCountrySelect) {
      pickupCountrySelect.innerHTML = db.countries.map(c => `<option value="${c}">${c}</option>`).join("");
    }
    if (destCountrySelect) {
      destCountrySelect.innerHTML = db.countries.map(c => `<option value="${c}">${c}</option>`).join("");
      if (lang === "ar") {
        destCountrySelect.value = "السعودية";
      } else {
        destCountrySelect.value = "Saudi Arabia";
      }
    }
    
    updateLocations(form, "pickup");
    updateLocations(form, "destination");
    
    if (pickupCountrySelect) {
      pickupCountrySelect.addEventListener("change", () => {
        updateLocations(form, "pickup");
        updatePlanner(form);
        fireTelemetry('gcc_guide_pickup_country_select', { pickup_country: pickupCountrySelect.value });
      });
    }
    if (destCountrySelect) {
      destCountrySelect.addEventListener("change", () => {
        updateLocations(form, "destination");
        updatePlanner(form);
        fireTelemetry('gcc_guide_destination_country_select', { destination_country: destCountrySelect.value });
      });
    }
    
    const pickupLocSelect = form.querySelector('[name="pickupLocation"]');
    if (pickupLocSelect) {
      pickupLocSelect.addEventListener("change", () => {
        updateConditionalFields(form);
        updatePlanner(form);
        
        const val = pickupLocSelect.value;
        fireTelemetry('gcc_guide_pickup_location_select', { pickup_location: val === "other" ? value(form, "pickupCustom") : val });
        
        const opt = pickupLocSelect.options[pickupLocSelect.selectedIndex];
        const isAirport = opt && opt.dataset.airport === "true";
        if (isAirport) {
          fireTelemetry('gcc_guide_airport_route_detected', { airport: val, role: 'pickup' });
        }
        if (val === "other") {
          fireTelemetry('gcc_guide_custom_location_used', { role: 'pickup', custom_value: value(form, "pickupCustom") });
        }
      });
    }
    const destLocSelect = form.querySelector('[name="destinationLocation"]');
    if (destLocSelect) {
      destLocSelect.addEventListener("change", () => {
        updateConditionalFields(form);
        updatePlanner(form);
        
        const val = destLocSelect.value;
        fireTelemetry('gcc_guide_destination_location_select', { destination_location: val === "other" ? value(form, "destinationCustom") : val });
        
        const opt = destLocSelect.options[destLocSelect.selectedIndex];
        const isAirport = opt && opt.dataset.airport === "true";
        if (isAirport) {
          fireTelemetry('gcc_guide_airport_route_detected', { airport: val, role: 'destination' });
        }
        if (val === "other") {
          fireTelemetry('gcc_guide_custom_location_used', { role: 'destination', custom_value: value(form, "destinationCustom") });
        }
      });
    }

    const pickupCustomInput = form.querySelector('[name="pickupCustom"]');
    if (pickupCustomInput) {
      pickupCustomInput.addEventListener("change", () => {
        fireTelemetry('gcc_guide_custom_location_used', { role: 'pickup', custom_value: pickupCustomInput.value.trim() });
      });
    }
    const destCustomInput = form.querySelector('[name="destinationCustom"]');
    if (destCustomInput) {
      destCustomInput.addEventListener("change", () => {
        fireTelemetry('gcc_guide_custom_location_used', { role: 'destination', custom_value: destCustomInput.value.trim() });
      });
    }
  }

  function updatePlanner(form) {
    const t = i18n[lang] || i18n.en;
    
    let pickupVal = value(form, "pickupLocation");
    if (pickupVal === "other") {
      pickupVal = value(form, "pickupCustom") || (lang === "ar" ? "موقع مخصص" : "Custom Location");
    }
    let destVal = value(form, "destinationLocation");
    if (destVal === "other") {
      destVal = value(form, "destinationCustom") || (lang === "ar" ? "موقع مخصص" : "Custom Location");
    }

    const data = {
      tripType: value(form, "tripType"),
      pickupCountry: value(form, "pickupCountry"),
      pickupCity: pickupVal,
      destinationCountry: value(form, "destinationCountry"),
      destinationCity: destVal,
      date: value(form, "date"),
      time: value(form, "time"),
      passengers: value(form, "passengers"),
      luggage: value(form, "luggage"),
      purpose: value(form, "purpose"),
      notes: value(form, "notes"),
      flightNumber: value(form, "flightNumber")
    };

    const notes = buildNotes(lang, data);
    const message = buildMessage(lang, data);
    const result = document.querySelector(form.dataset.result);
    const link = document.querySelector(form.dataset.whatsapp);
    const status = form.querySelector("[data-planner-status]");

    if (result) {
      result.innerHTML = `
        <p class="result-title">${t.summary}</p>
        <p class="quote-line">${data.pickupCity || "-"} -> ${data.destinationCity || "-"}</p>
        <ul class="result-list">${notes.map((note) => `<li>${note}</li>`).join("")}</ul>
      `;
    }
    if (link) {
      link.href = `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`;
      link.textContent = t.openWhatsApp;
    }
    if (status) status.textContent = t.copied;
  }

  document.querySelectorAll("[data-route-planner]").forEach((form) => {
    initForm(form);
    
    form.addEventListener("input", () => {
      markPlannerStarted();
      updatePlanner(form);
    });
    form.addEventListener("change", () => {
      markPlannerStarted();
      updateConditionalFields(form);
      updatePlanner(form);
    });
    
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      updatePlanner(form);
      handleQuoteGeneration();
      const link = document.querySelector(form.dataset.whatsapp);
      if (link && link.href) window.open(link.href, "_blank", "noopener");
    });
    
    updatePlanner(form);
  });

  document.querySelectorAll("[data-wa-static]").forEach((link) => {
    const text = link.getAttribute("data-wa-static") || "";
    const lang = document.documentElement.lang === "ar" ? "ar" : "en";
    link.href = `https://wa.me/${PHONE}?text=${encodeURIComponent(identifyVendoraSource(lang, text))}`;
  });
})();

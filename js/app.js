const API_URL = "https://script.google.com/macros/s/AKfycbxVIOoDhhVAm56ed8r7QeP5YB6EhLdHdURbQwon6f_EXNYMhy_HIC3U2l1U1_g5DbuBgQ/exec?mode=api";

let isAdmin = false;
let currentUser = null;
let bookedDates = [];
let events = []; 
let galleryImages = []; 
let siteConfig = {}; 
let users = []; 
let pricingData = {}; 
let usefulLinksData = [];
let checklistData = [];
let reviewsData = [];
let leadsData = [];
let currentLightboxIndex = 0;
let lightboxImageUrls = [];
let editingReviewIndex = -1;
let currentVideoOrderEditing = [];

const packagesData = {
    'VIP': { t: 'חבילת הכל כלול VIP', p: '₪5,500', d: 'ליווי תפילה ופיוטים\nחזנות\nהגברה מקצועית\nקלידן\nזוג מתופפים\nכניסה מיוחדת עם חופה ושופרות\nליווי שירים בסעודה (אביב + קלידן)\nלימוד הפרשה (במידת הצורך)' },
    'FESTIVE': { t: 'חבילה חגיגית', p: '₪4,800', d: 'ליווי תפילה ופיוטים\nחזנות\nהגברה מקצועית\nקלידן\nזוג מתופפים\nכניסה מיוחדת עם חופה ושופרות\nלימוד הפרשה (במידת הצורך)' },
    'BASIC': { t: 'חבילה בסיסית', p: '₪3,800', d: 'ליווי תפילה ופיוטים\nחזנות מקצועית\nהגברה מקצועית\nקלידן\nלימוד הפרשה (במידת הצורך)' },
    'SOLO': { t: 'חבילת לימוד לבר מצווה', p: '₪1,500', d: 'לימוד יסודי של קריאת התורה בטעמי המקרא\nליווי אישי צמוד' },
    'CUSTOM': { t: 'התאמה אישית', p: '', d: '' }
};

document.addEventListener('DOMContentLoaded', function() {
    
    // --- Utils & UI ---
    window.showLoader = () => { document.getElementById('globalLoader').style.display = 'flex'; }
    window.hideLoader = () => { document.getElementById('globalLoader').style.display = 'none'; }

    window.customAlert = (message) => {
        if (message.includes('טוען מחדש')) return; 
        document.getElementById('alertMsg').innerText = message;
        document.getElementById('alertModal').style.display = 'flex';
    }

    window.customConfirm = (message) => {
        return new Promise((resolve) => {
            document.getElementById('confirmMsg').innerText = message;
            document.getElementById('confirmModal').style.display = 'flex';
            document.getElementById('btnYes').onclick = () => { document.getElementById('confirmModal').style.display = 'none'; resolve(true); };
            document.getElementById('btnNo').onclick = () => { document.getElementById('confirmModal').style.display = 'none'; resolve(false); };
        });
    }

    window.openModal = (id) => { 
        document.body.classList.add('no-scroll');
        document.getElementById(id).style.display = 'flex'; 
    }
    window.closeModal = (id) => { 
        document.body.classList.remove('no-scroll');
        document.getElementById(id).style.display = 'none'; 
    }

    window.openLoginModal = () => { window.openModal('loginModal'); }
    
    window.toggleSideMenu = () => { 
        const m = document.getElementById('sideMenu'); 
        m.classList.toggle('open'); 
        document.getElementById('menuOverlay').classList.toggle('show'); 
    }
    
    window.closeSideMenu = () => {
        const m = document.getElementById('sideMenu'); 
        m.classList.remove('open'); 
        document.getElementById('menuOverlay').classList.remove('show'); 
    }

    window.safeFetchPOST = function(payloadData, onSuccess) {
        showLoader();
        fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(payloadData),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        }).then(() => { hideLoader(); if(onSuccess) onSuccess(); })
          .catch(err => { hideLoader(); console.log(err); if(onSuccess) onSuccess(); });
    }

    // --- Authentication ---
    window.login = () => {
        const u = document.getElementById('uName').value;
        const p = document.getElementById('uPass').value;
        let user = users.find(usr => usr.username === u && String(usr.password) === p); 
        if (user) { currentUser = user; onLoginSuccess(); } else { customAlert('פרטים שגויים'); }
    }

    window.logout = () => { location.reload(); }

    document.getElementById('uName').addEventListener('keypress', function(e) { if(e.key === 'Enter') login(); });
    document.getElementById('uPass').addEventListener('keypress', function(e) { if(e.key === 'Enter') login(); });

    function onLoginSuccess() {
        window.closeModal('loginModal');
        document.body.classList.add('is-logged-in'); 
        
        if(currentUser.role === 'superadmin') document.body.classList.add('superadmin-mode');
        if(currentUser.role === 'superadmin' || currentUser.role === 'manager') {
            isAdmin = true;
            document.body.classList.add('admin-mode');
        } else {
            document.body.classList.add('staff-mode');
        }
        
        document.getElementById('loginIcon').style.display = 'none'; 
        
        const header = document.getElementById('sideMenuHeader');
        if(header) header.innerHTML = `<div class="text-amber-400 text-2xl font-black mb-4 pb-4 border-b border-slate-700 text-center">שלום ${currentUser.name}! <i class="fas fa-smile-beam"></i></div>`;

        const links = document.getElementById('managerLinks');
        let menuHtml = '';
        
        if (isAdmin) {
            menuHtml += `<div class="menu-item" onclick="openEventEditor()"><i class="fas fa-plus-circle text-green-400 text-2xl"></i> הוסף אירוע</div>`;
            menuHtml += `<div class="menu-item" onclick="openLeadsManager()"><i class="fas fa-tasks text-amber-400 text-2xl"></i> ניהול פניות (CRM)</div>`;
            document.getElementById('filterStatus').classList.remove('hidden'); 
        }
        
        menuHtml += `<div class="menu-item" onclick="scrollToEvents()"><i class="fas fa-th-large text-blue-400 text-2xl"></i> לוח אירועים</div>`;
        menuHtml += `<a href="https://livestage.netlify.app/" target="_blank" class="menu-item" style="text-decoration: none;"><i class="fas fa-music text-pink-400 text-2xl"></i> פלייליסט אירועים</a>`;

        if (currentUser.role === 'manager') {
            menuHtml += `<a href="${siteConfig['social-fb'] || '#'}" target="_blank" class="menu-item" style="text-decoration: none;"><i class="fab fa-facebook text-blue-500 text-2xl"></i> פייסבוק עסקי</a>`;
            menuHtml += `<a href="${siteConfig['social-ig'] || '#'}" target="_blank" class="menu-item" style="text-decoration: none;"><i class="fab fa-instagram text-pink-500 text-2xl"></i> אינסטגרם עסקי</a>`;
        }

        if (currentUser.role !== 'manager') {
            menuHtml += `<div class="menu-item" onclick="openChecklist()"><i class="fas fa-clipboard-check text-orange-400 text-2xl"></i> צ'קליסט ציוד למחר</div>`;
        }
        
        menuHtml += `<div class="menu-item" onclick="openMyPayments()"><i class="fas fa-wallet text-green-400 text-2xl"></i> היסטוריית התשלומים שלי</div>`;
        
        if (currentUser.role === 'superadmin') {
            document.getElementById('paymentsSection').classList.remove('hidden');
            menuHtml += `<div class="menu-item" onclick="scrollToPayments()"><i class="fas fa-shekel-sign text-amber-400 text-2xl"></i> ניהול תשלומים למערכת</div>`;
            menuHtml += `<div class="menu-item" onclick="openStudentsManager()"><i class="fas fa-user-graduate text-indigo-400 text-2xl"></i> ניהול תלמידים</div>`;
            menuHtml += `<div class="menu-item" onclick="openUsefulLinks()"><i class="fas fa-link text-cyan-400 text-2xl"></i> לינקים שימושיים</div>`;
            menuHtml += `<div class="menu-item" onclick="openReviewsManager()"><i class="fas fa-star text-yellow-400 text-2xl"></i> ניהול המלצות</div>`;
        }
        
        if (isAdmin) {
            menuHtml += `
                <div class="menu-item" onclick="openWhatsAppTool()"><i class="fab fa-whatsapp text-green-500 text-2xl"></i> תקשורת מול לקוחות</div>
                <div class="menu-item" onclick="openProposalTool()"><i class="fas fa-file-invoice text-amber-400 text-2xl"></i> הצעת מחיר A3</div>
                <div class="menu-item" onclick="openPriceListEditor()"><i class="fas fa-tags text-purple-400 text-2xl"></i> מחירון המערכת</div>
            `;
        }
        
        links.innerHTML = menuHtml;
        document.getElementById('filterTime').value = 'future';
        filterEvents();
        if(currentUser.role === 'superadmin' && typeof renderPaymentsBoard === 'function') renderPaymentsBoard();
        setTimeout(() => window.scrollToEvents(), 500);
    }

    // --- Navigation ---
    window.scrollToEvents = () => { document.getElementById('eventsBoardSection').scrollIntoView({ behavior: 'smooth' }); window.closeSideMenu(); }
    window.scrollToPayments = () => { document.getElementById('paymentsSection').scrollIntoView({ behavior: 'smooth' }); window.closeSideMenu(); }
    window.openStudentsManager = () => { window.closeSideMenu(); window.location.href = 'students.html'; }

    // --- Data Load ---
    async function loadData() {
        try {
            showLoader(); 
            const response = await fetch(API_URL);
            const data = await response.json();
            
            if (data.events) {
                const todayDate = new Date();
                todayDate.setHours(0,0,0,0);
                
                data.events.forEach(evt => {
                    const evtDateObj = new Date(evt.date);
                    evtDateObj.setHours(0,0,0,0);
                    
                    if (evtDateObj < todayDate && evt.status === 'סגור') {
                        evt.status = 'הסתיים';
                    }
                });
                events = data.events;
            }
            
            if (data.config) {
                siteConfig = data.config;
                if(siteConfig.heroVideo) document.getElementById('promoIframe').src = siteConfig.heroVideo;
                if(siteConfig.heroImage) document.getElementById('bg-image-layer').style.backgroundImage = `url('${siteConfig.heroImage}')`;
                
                if(siteConfig['social-fb']) document.getElementById('link-fb').href = siteConfig['social-fb'];
                if(siteConfig['social-yt']) document.getElementById('link-yt').href = siteConfig['social-yt'];
                if(siteConfig['social-ig']) document.getElementById('link-ig').href = siteConfig['social-ig'];
                if(siteConfig['social-sp']) document.getElementById('link-sp').href = siteConfig['social-sp'];
                
                if(siteConfig.pricingDB) { try { pricingData = JSON.parse(siteConfig.pricingDB); } catch(e) {} }
                if(siteConfig.usefulLinksDB) { try { usefulLinksData = JSON.parse(siteConfig.usefulLinksDB); } catch(e) {} }
                if(siteConfig.checklistDB) { try { checklistData = JSON.parse(siteConfig.checklistDB); } catch(e) {} }
                if(siteConfig.reviewsDB) { try { reviewsData = JSON.parse(siteConfig.reviewsDB); } catch(e) {} }
                
                ['VIP', 'FESTIVE', 'BASIC', 'SOLO'].forEach(id => {
                    if(!pricingData[`price${id}`] && siteConfig[`price${id}`]) {
                        pricingData[`price${id}`] = siteConfig[`price${id}`];
                    }
                });

                updatePackagesFromConfig();
                renderPublicReviews();
            }
            
            if (data.leads) { leadsData = data.leads; }
            if (data.gallery) galleryImages = data.gallery;
            if (data.users) users = data.users;
            
            bookedDates = events.map(e => e.date);
            hideLoader(); 

        } catch (error) {
            hideLoader();
            console.log("Error Loading", error);
        }
        
        if(typeof renderCalendar === 'function') renderCalendar();
        if(typeof filterEvents === 'function') filterEvents();
        if(typeof renderGallery === 'function') renderGallery();
        if(currentUser && currentUser.role === 'superadmin' && typeof renderPaymentsBoard === 'function') renderPaymentsBoard();
    }

    function updatePackagesFromConfig() {
        if(siteConfig.priceVIP) packagesData['VIP'].p = '₪' + siteConfig.priceVIP;
        if(siteConfig.priceFESTIVE) packagesData['FESTIVE'].p = '₪' + siteConfig.priceFESTIVE;
        if(siteConfig.priceBASIC) packagesData['BASIC'].p = '₪' + siteConfig.priceBASIC;
        if(siteConfig.priceSOLO) packagesData['SOLO'].p = '₪' + siteConfig.priceSOLO;
    }

    window.editLink = (key) => {
        if (!isAdmin || currentUser.role !== 'superadmin') return true;
        event.preventDefault(); 
        const currentVal = siteConfig[key] || '';
        const newVal = prompt("הכנס קישור חדש (למשל ספוטיפיי/פייסבוק):", currentVal);
        
        if (newVal !== null && newVal !== currentVal) {
            siteConfig[key] = newVal;
            document.getElementById(`link-${key.split('-')[1]}`).href = newVal;
            safeFetchPOST({ action: 'updateConfig', key: key, value: newVal }, () => {
                customAlert("הלינק עודכן בהצלחה!");
            });
        }
    }

    // --- Events & Forms ---
    window.toggleCustomPackageField = () => {
        const form = document.getElementById('eventForm');
        const container = document.getElementById('customPackageDescContainer');
        if (form.elements['packageType'].value === 'מותאמת אישית') {
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }
    }

    window.openQuickEventModal = (dateStr) => {
        document.getElementById('qeDateDisplay').innerText = dateStr;
        document.getElementById('qeDate').value = dateStr;
        window.openModal('quickEventModal');
    }

    window.saveQuickEvent = () => {
        const date = document.getElementById('qeDate').value;
        const name = document.getElementById('qeName').value;
        if(!name) return; 

        const newEvent = {
            action: 'createEvent', id: 'evt-' + Date.now(), date: date, eventName: name,
            location: document.getElementById('qeLocation').value,
            startTime: document.getElementById('qeStart').value,
            packageType: document.getElementById('qeType').value,
            status: 'סגור', notes: document.getElementById('qeNotes').value,
            phone: '', price: '0',
            payments: { client: { downPayment: false, fullPayment: false }, staff: {} }
        };
        
        events.push(newEvent); bookedDates.push(date); 
        safeFetchPOST(newEvent, () => {
            window.closeModal('quickEventModal'); 
            renderCalendar(); 
            filterEvents(); 
            loadData(); 
        });
    }

    window.openEventEditor = (id) => {
        const form = document.getElementById('eventForm');
        form.reset();
        form.elements['id'].value = ""; 
        window.toggleCustomPackageField();

        if (id && typeof id !== 'object') {
            const evt = events.find(e => e.id == id);
            if(evt) {
                form.elements['id'].value = evt.id; 
                if (form.elements['eventName']) form.elements['eventName'].value = evt.eventName || ''; 
                for (let key in evt) { 
                    if(form.elements[key]) {
                        if(key === 'packageType') {
                            let pType = String(evt[key] || '');
                            if (pType.startsWith('מותאמת אישית')) {
                                form.elements['packageType'].value = 'מותאמת אישית';
                                if(form.elements['customPackageDesc']) {
                                    form.elements['customPackageDesc'].value = pType.includes('|') ? pType.substring(pType.indexOf('|') + 1) : '';
                                }
                            } else {
                                form.elements['packageType'].value = pType;
                                if(form.elements['customPackageDesc']) form.elements['customPackageDesc'].value = '';
                            }
                            window.toggleCustomPackageField();
                        }
                        else if(form.elements[key].type === 'checkbox') {
                            form.elements[key].checked = (evt[key] === true || String(evt[key]).toUpperCase() === 'TRUE');
                        }
                        else if(key !== 'eventName' && key !== 'id') {
                            form.elements[key].value = evt[key];
                        }
                    }
                }
                if(!evt.packageType) window.toggleCustomPackageField();
            }
        }
        
        const delBtn = document.getElementById('deleteEventBtn');
        if (currentUser && currentUser.role === 'superadmin') delBtn.style.display = 'block';
        else delBtn.style.display = 'none';

        window.closeSideMenu();
        window.openModal('eventEditor');
    }

    window.saveEvent = () => {
        const form = document.getElementById('eventForm');
        const id = form.elements['id'].value;
        
        let finalPackageType = form.elements['packageType'].value;
        if (finalPackageType === 'מותאמת אישית') {
            finalPackageType = 'מותאמת אישית|' + form.elements['customPackageDesc'].value;
        }

        const eventData = {
            eventName: form.elements['eventName'].value, 
            date: form.elements['date'].value,
            hebrewDate: form.elements['hebrewDate'].value,
            clientName: form.elements['clientName'].value,
            childName: form.elements['childName'].value,
            phone: form.elements['phone'].value,
            location: form.elements['location'].value,
            wazeLink: form.elements['wazeLink'].value,
            packageType: finalPackageType,
            guestTime: form.elements['guestTime'].value,
            startTime: form.elements['startTime'].value,
            price: form.elements['price'].value,
            status: form.elements['status'].value,
            mediaLink: form.elements['mediaLink'].value,
            notes: form.elements['notes'].value,
            hasKeyboard: form.elements['hasKeyboard'].checked,
            hasDrummers: form.elements['hasDrummers'].checked,
            isStudent: form.elements['isStudent'].checked 
        };

        if (id && id !== "") {
            eventData.action = 'saveEvent';
            eventData.id = id;
        } else {
            eventData.action = 'createEvent';
            eventData.id = 'evt-' + Date.now(); 
            eventData.payments = { client: {}, staff: {} }; 
        }
        
        safeFetchPOST(eventData, () => {
            loadData(); 
            window.closeModal('eventEditor');
        });
    }

    window.deleteEvent = async () => {
        const form = document.getElementById('eventForm');
        const id = form.elements['id'].value;
        if(!id || id === "") return;
        
        if(!await customConfirm("האם אתה בטוח שברצונך למחוק את האירוע?")) return;
        
        safeFetchPOST({ action: 'deleteEvent', id: id }, () => {
            window.closeModal('eventEditor');
            loadData(); 
        });
    }

    // --- Calendar ---
    let currentDate = new Date();
    window.renderCalendar = function() {
        const g = document.getElementById('calendarGrid'); 
        if(!g) return;
        g.innerHTML = '';
        document.getElementById('monthYearDisplay').innerText = (currentDate.getMonth()+1) + '/' + currentDate.getFullYear();
        
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 0).getDate();
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

        for(let i=0; i<firstDay; i++) g.appendChild(document.createElement('div'));
        
        for(let i=1; i<=daysInMonth; i++) {
            const d = document.createElement('div'); 
            d.innerText = i; 
            d.className = 'calendar-day';
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(i).padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;
            const isBooked = bookedDates.includes(dateString);

            if (isBooked) d.classList.add('day-booked');
            else d.classList.add('day-available');

            d.onclick = () => {
                if (isAdmin) {
                    if (!isBooked) { window.openQuickEventModal(dateString); } 
                } else {
                    if (!isBooked) { window.open(`https://wa.me/972559907076?text=${encodeURIComponent('היי,מעוניינים לסגור אירוע בר מצווה בתאריך ' + dateString + '  האם התאריך פנוי? תודה!')}`, '_blank'); }                        
                }
            };
            g.appendChild(d);
        }
    }
    
    document.getElementById('prevMonth').onclick = () => { currentDate.setMonth(currentDate.getMonth()-1); renderCalendar(); };
    document.getElementById('nextMonth').onclick = () => { currentDate.setMonth(currentDate.getMonth()+1); renderCalendar(); };

    // --- Events Board Rendering ---
    window.filterEvents = () => {
        const timeFilter = document.getElementById('filterTime').value;
        const typeFilter = document.getElementById('filterType').value;
        const statusFilter = document.getElementById('filterStatus').value;
        const todayTime = new Date().setHours(0,0,0,0);

        const filtered = events.filter(evt => {
            if (evt.status === 'תהליך' && (!currentUser || !isAdmin)) return false;
            if (statusFilter !== 'all' && evt.status !== statusFilter) return false;
            if (statusFilter === 'תהליך' && evt.status !== 'תהליך') return false;
            const evtDate = new Date(evt.date).getTime();
            if (timeFilter === 'future' && evtDate < todayTime) return false;
            if (timeFilter === 'past' && evtDate >= todayTime) return false;
            if (typeFilter === 'keyboard' && !(evt.hasKeyboard === true || String(evt.hasKeyboard).toUpperCase() === 'TRUE')) return false;
            if (typeFilter === 'drummers' && !(evt.hasDrummers === true || String(evt.hasDrummers).toUpperCase() === 'TRUE')) return false;
            return true;
        });
        renderEventsBoard(filtered);
    }
    
    window.generateCalendarLink = (evt) => {
         if (!evt.date) return '#';
         const cleanDate = evt.date.replace(/-/g, '');
         return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(evt.eventName || evt.location || 'אירוע')}&dates=${cleanDate}T120000/${cleanDate}T140000/`;
    }

    function renderEventsBoard(dataToRender) {
        const board = document.getElementById('eventsBoard');
        if(!board) return;
        board.innerHTML = '';
        const list = dataToRender || events;
        const sortedList = [...list].sort((a,b) => new Date(a.date) - new Date(b.date));
        const todayTime = new Date().setHours(0,0,0,0);
        let nextEventId = null;
        for(let e of sortedList) { if(new Date(e.date).getTime() >= todayTime) { nextEventId = e.id; break; } }

        sortedList.forEach(evt => {
             const dateObj = new Date(evt.date);
            const day = dateObj.getDate();
            const month = dateObj.toLocaleString('he-IL', { month: 'short' });
            let statusClass = evt.status === 'סגור' ? 'status-sagoor' : (evt.status === 'הסתיים' ? 'status-done' : 'status-process');
            let displayStatus = evt.status === 'תהליך' ? 'בתהליך סגירה' : evt.status;

            let badgesHtml = `<div class="floating-badges">`;
            if(evt.packageType && evt.packageType.includes('הכל כלול')) badgesHtml += `<span class="special-badge badge-all-inclusive"><i class="fas fa-gem ml-1"></i> הכל כלול</span>`;
            
            let isStudentVal = evt.isStudent === true || String(evt.isStudent).toUpperCase() === 'TRUE';
            if(isStudentVal) badgesHtml += `<span class="special-badge badge-student"><i class="fas fa-graduation-cap ml-1"></i> תלמיד</span>`;
            
            badgesHtml += `<span class="status-pill ${statusClass}">${displayStatus}</span></div>`;

            let nextEventClass = (evt.id === nextEventId) ? 'next-event' : '';
            let nextEventLabel = (evt.id === nextEventId) ? '<div class="next-event-label">האירוע הבא</div>' : '';

            let compBadges = '';
            if(evt.hasKeyboard === true || String(evt.hasKeyboard).toUpperCase() === 'TRUE') compBadges += `<span class="comp-badge comp-badge-key"><i class="fas fa-music"></i> קלידן</span>`;
            if(evt.hasDrummers === true || String(evt.hasDrummers).toUpperCase() === 'TRUE') compBadges += `<span class="comp-badge comp-badge-drum"><i class="fas fa-drum"></i> מתופפים</span>`;

            let cardHtml = `
                <div class="event-card ${nextEventClass}">
                    ${nextEventLabel}
                    <div class="card-header">
                        <div class="date-badge"><div class="day">${day}</div><div class="month">${month}</div></div>
                        ${badgesHtml}
                    </div>
                    <div class="card-body">
                        <div class="location-title">${evt.eventName || evt.location}</div>
                        <div class="info-bubble"><i class="fas fa-map-marker-alt"></i> ${evt.location}</div>
                        <div class="info-bubble"><i class="far fa-clock"></i> ${evt.startTime || '--:--'} <span style="color:#94a3b8; font-size:0.9em; margin-right:5px;">(הגעה: ${evt.guestTime || '--:--'})</span></div>
                        <div class="comp-badges">${compBadges}</div>
            `;
            
            if (isAdmin) {
                let isFormApproved = evt.notes && evt.notes.includes("אישור לקוח");
                let formBtnHtml = isFormApproved 
                    ? `<button onclick="window.open('booking.html?id=${evt.id}', '_blank')" class="action-btn" style="background: linear-gradient(135deg, #10b981, #059669); color: white; grid-column: span 2;">
                        <i class="fas fa-eye"></i> צפה בטופס לקוח
                       </button>`
                    : `<button onclick="sendBookingForm('${evt.id}', '${evt.phone}')" class="action-btn" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; grid-column: span 2;">
                        <i class="fas fa-file-signature"></i> שלח טופס לאישור
                       </button>`;

                cardHtml += `
                        <div class="info-bubble"><i class="fas fa-user"></i> ${evt.clientName}</div>
                        <div class="info-bubble"><i class="fas fa-child"></i> חתן: ${evt.childName}</div>
                        <div class="info-bubble"><i class="fas fa-phone"></i> <a href="tel:${evt.phone}">${evt.phone}</a></div>
                        <div class="info-bubble" style="border-color: rgba(251, 191, 36, 0.4);"><i class="fas fa-tag"></i> ${evt.packageType} | ${evt.price} ₪</div>
                        ${evt.notes ? `<div class="mt-4 p-4 rounded-xl text-lg italic notes-area" style="white-space: pre-wrap;">"${evt.notes}"</div>` : ''}
                    </div>
                    <div class="card-actions">
                        <button onclick="openEventEditor('${evt.id}')" class="action-btn btn-edit"><i class="fas fa-edit"></i> ערוך</button>
                        <button onclick="sendWaToClient('${evt.phone}')" class="action-btn btn-wa-green"><i class="fab fa-whatsapp"></i> תקשורת</button>
                        ${formBtnHtml}
                    </div>
                `;
            } 
            else {
                cardHtml += `
                    </div>
                    <div class="card-actions">
                        <a href="${evt.wazeLink || '#'}" target="_blank" class="action-btn btn-waze"><i class="fab fa-waze"></i> נווט</a>
                        <a href="${window.generateCalendarLink(evt)}" target="_blank" class="action-btn btn-cal"><i class="far fa-calendar-plus"></i> יומן</a>
                        ${evt.mediaLink ? `<a href="${evt.mediaLink}" target="_blank" class="action-btn btn-media"><i class="fas fa-camera"></i> גלריה</a>` : ''}
                    </div>
                `;
            }
            cardHtml += `</div>`;
            board.innerHTML += cardHtml;
        });
    }

    // --- CRM Logic ---
    window.toggleLeadStatusOther = () => {
        const status = document.getElementById('newLeadStatus').value;
        const otherInput = document.getElementById('newLeadStatusOther');
        if(status === 'אחר') {
            otherInput.classList.remove('hidden');
        } else {
            otherInput.classList.add('hidden');
        }
    }

    window.autoSetReminder = () => {
        const dateVal = document.getElementById('newLeadDate').value;
        if(!dateVal) return;
        let date = new Date(dateVal);
        date.setDate(date.getDate() + 7); 
        document.getElementById('newLeadReminder').value = date.toISOString().split('T')[0];
    }

    window.openLeadsManager = () => {
        window.closeSideMenu();
        document.getElementById('editLeadId').value = '';
        document.getElementById('leadFormTitle').innerHTML = '<i class="fas fa-plus-circle ml-2"></i>הוספת פנייה / תזכורת חדשה';
        document.getElementById('newLeadName').value = '';
        document.getElementById('newLeadPhone').value = '';
        document.getElementById('newLeadDate').value = '';
        document.getElementById('newLeadStatus').value = 'נשלח פירוט חבילות';
        document.getElementById('newLeadStatusOther').value = '';
        document.getElementById('newLeadStatusOther').classList.add('hidden');
        document.getElementById('newLeadReminder').value = '';
        document.getElementById('newLeadNotes').value = '';
        renderLeads();
        window.openModal('leadsManagerModal');
    }

    window.saveLead = () => {
        const editId = document.getElementById('editLeadId').value;
        const name = document.getElementById('newLeadName').value;
        if(!name) return customAlert('חובה להזין לפחות שם לקוח');
        
        let status = document.getElementById('newLeadStatus').value;
        if(status === 'אחר') status = document.getElementById('newLeadStatusOther').value || 'אחר';

        const leadData = {
            action: editId ? 'updateLead' : 'createLead',
            id: editId || ('lead-' + Date.now()),
            name: name,
            phone: document.getElementById('newLeadPhone').value,
            inquiryDate: document.getElementById('newLeadDate').value,
            status: status,
            reminderDate: document.getElementById('newLeadReminder').value,
            notes: document.getElementById('newLeadNotes').value,
            isArchived: false
        };
        
        safeFetchPOST(leadData, () => {
            customAlert('הפנייה נשמרה בהצלחה!');
            loadData().then(() => {
                if(document.getElementById('leadsManagerModal').style.display === 'flex') openLeadsManager(); 
            });
        });
    }
    
    window.editLead = (id) => {
        const lead = leadsData.find(l => l.id === id);
        if(!lead) return;
        
        document.getElementById('leadFormTitle').innerHTML = '<i class="fas fa-edit ml-2"></i>עריכת פנייה קיימת';
        document.getElementById('editLeadId').value = lead.id;
        document.getElementById('newLeadName').value = lead.name;
        document.getElementById('newLeadPhone').value = lead.phone;
        document.getElementById('newLeadDate').value = lead.inquiryDate;
        document.getElementById('newLeadNotes').value = lead.notes || '';
        document.getElementById('newLeadReminder').value = lead.reminderDate || '';
        
        const statusSelect = document.getElementById('newLeadStatus');
        const otherInput = document.getElementById('newLeadStatusOther');
        
        let foundStatus = false;
        for (let i = 0; i < statusSelect.options.length; i++) {
            if (statusSelect.options[i].value === lead.status) { foundStatus = true; break; }
        }
        if(foundStatus) {
            statusSelect.value = lead.status;
            otherInput.classList.add('hidden');
            otherInput.value = '';
        } else {
            statusSelect.value = 'אחר';
            otherInput.classList.remove('hidden');
            otherInput.value = lead.status;
        }
        document.querySelector('#leadsManagerModal .modal-content').scrollTo({ top: 0, behavior: 'smooth' });
    }

    window.markLeadHandled = (id) => {
        const lead = leadsData.find(l => l.id === id);
        if(!lead) return;
        let nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        lead.reminderDate = nextWeek.toISOString().split('T')[0];
        lead.action = 'updateLead';
        safeFetchPOST(lead, () => {
            loadData().then(() => { renderLeads(); customAlert('סומן כטופל. תזכורת הבאה בעוד שבוע.'); });
        });
    }

    function renderLeads() {
        const list = document.getElementById('leadsList');
        const alertBox = document.getElementById('alertsContainer');
        list.innerHTML = '';
        alertBox.innerHTML = '';
        
        const activeLeads = leadsData.filter(l => !l.isArchived);
        const today = new Date();
        today.setHours(0,0,0,0);
        let alerts = [];

        activeLeads.forEach((lead) => {
            let reminderStr = lead.reminderDate ? lead.reminderDate : 'לא הוגדר';
            let isAlert = false;
            
            if (lead.reminderDate) {
                const reminderDate = new Date(lead.reminderDate);
                reminderDate.setHours(0,0,0,0);
                const diffDays = Math.floor((today - reminderDate) / (1000 * 60 * 60 * 24));
                if (diffDays >= 0) {
                    alerts.push({ id: lead.id, msg: `יש לשלוח תזכורת ל<b>${lead.name}</b> (איחור של ${diffDays} ימים מתאריך התזכורת)` });
                    isAlert = true;
                }
            }

            list.innerHTML += `
                <div class="lead-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isAlert ? 'border-red-500 bg-slate-800' : ''}">
                    <div class="text-right w-full md:w-1/2">
                        <div class="text-white font-bold text-2xl mb-2 flex items-center justify-start gap-2">
                            <button onclick="editLead('${lead.id}')" class="text-slate-400 hover:text-amber-400 ml-2" title="ערוך פנייה"><i class="fas fa-pencil-alt text-lg"></i></button>
                            ${lead.name}
                        </div>
                        <div class="text-slate-300 mb-2 text-lg"><i class="fas fa-phone text-amber-400 ml-1"></i> <a href="tel:${lead.phone}">${lead.phone || 'לא הוזן'}</a></div>
                        <div class="text-slate-400 text-base mb-2">
                            סטטוס: <span class="text-amber-400 font-bold">${lead.status}</span> | תזכורת הבאה: ${reminderStr}
                        </div>
                        ${lead.notes ? `<div class="mt-2 bg-slate-900/50 p-3 rounded border border-slate-700 text-slate-300 text-base">"${lead.notes}"</div>` : ''}
                    </div>
                    <div class="flex flex-wrap gap-3 justify-end w-full md:w-1/2 mt-4 md:mt-0">
                        <button onclick="window.open('https://wa.me/972${(lead.phone||'').replace(/-/g,'').substring(1)}?text=היי ${lead.name}, ', '_blank')" class="bg-green-600 hover:bg-green-500 text-white px-4 py-3 rounded-lg text-base shadow-md font-bold" title="שלח וואטסאפ"><i class="fab fa-whatsapp text-xl"></i></button>
                        <button onclick="closeLeadAsSuccess('${lead.id}')" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-lg text-base font-bold shadow-md"><i class="fas fa-check ml-1"></i> סגור אירוע</button>
                        <button onclick="archiveLead('${lead.id}')" class="bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg text-base shadow-md"><i class="fas fa-archive ml-1"></i> ארכיון</button>
                    </div>
                </div>
            `;
        });

        if (alerts.length > 0) {
            alertBox.innerHTML = alerts.map(a => `
                <div class="alert-banner justify-between flex-col md:flex-row">
                    <div><i class="fas fa-exclamation-triangle text-2xl ml-2"></i> <span>${a.msg}</span></div>
                    <button onclick="markLeadHandled('${a.id}')" class="bg-white text-red-700 px-4 py-2 rounded font-bold shadow hover:bg-slate-100 mt-2 md:mt-0"><i class="fas fa-check ml-1"></i> טופל / תזכורת נשלחה</button>
                </div>
            `).join('');
        } else if (activeLeads.length === 0) {
            list.innerHTML = `<div class="text-slate-400 text-center py-4 text-xl">אין פניות פתוחות כרגע.</div>`;
        }
    }

    window.closeLeadAsSuccess = async (id) => {
        const lead = leadsData.find(l => l.id === id);
        if(!lead) return;
        lead.isArchived = true;
        lead.action = 'updateLead';
        safeFetchPOST(lead, () => {
            window.closeModal('leadsManagerModal');
            const form = document.getElementById('eventForm');
            form.reset();
            form.elements['id'].value = ""; 
            if(form.elements['clientName']) form.elements['clientName'].value = lead.name;
            if(form.elements['phone']) form.elements['phone'].value = lead.phone;
            if(form.elements['notes']) form.elements['notes'].value = lead.notes;
            window.toggleCustomPackageField();
            loadData().then(() => window.openModal('eventEditor'));
        });
    }

    window.archiveLead = async (id) => {
        if(!await customConfirm("להעביר פנייה זו לארכיון?")) return;
        const lead = leadsData.find(l => l.id === id);
        if(!lead) return;
        lead.isArchived = true;
        lead.action = 'updateLead';
        safeFetchPOST(lead, () => { loadData().then(() => renderLeads()); });
    }
    
    window.restoreLead = async (id) => {
        if(!await customConfirm("לשחזר פנייה זו חזרה ללוח הפעיל?")) return;
        const lead = leadsData.find(l => l.id === id);
        if(!lead) return;
        lead.isArchived = false;
        lead.action = 'updateLead';
        safeFetchPOST(lead, () => {
            loadData().then(() => { window.openArchiveModal(); customAlert('הפנייה שוחזרה בהצלחה ללוח הפעיל.'); });
        });
    }

    window.openArchiveModal = () => {
        window.closeModal('leadsManagerModal');
        const list = document.getElementById('archiveList');
        list.innerHTML = '';
        const archivedLeads = leadsData.filter(l => l.isArchived);
        
        archivedLeads.forEach((lead) => {
            list.innerHTML += `
                <div class="bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div class="text-right w-full md:w-2/3">
                        <div class="text-white font-bold text-xl">${lead.name}</div>
                        <div class="text-slate-400 text-lg">${lead.phone || ''} | תאריך פנייה: ${lead.inquiryDate || 'לא צוין'}</div>
                        <div class="text-amber-400 text-sm mt-1">סטטוס אחרון: ${lead.status}</div>
                    </div>
                    <div class="flex gap-2 w-full md:w-auto justify-end">
                        <button onclick="restoreLead('${lead.id}')" class="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-bold shadow"><i class="fas fa-undo ml-1"></i> שחזר לפעיל</button>
                        <button onclick="deleteLeadPermanently('${lead.id}')" class="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded shadow" title="מחק לצמיתות"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
        
        if(archivedLeads.length === 0) list.innerHTML = `<div class="text-center text-slate-400 text-xl py-6">הארכיון ריק.</div>`;
        window.openModal('archiveModal');
    }

    window.deleteLeadPermanently = async (id) => {
        if(!await customConfirm("למחוק את הפנייה מהמערכת לצמיתות? (לא ניתן לשחזור)")) return;
        safeFetchPOST({ action: 'deleteLead', id: id }, () => { loadData().then(() => window.openArchiveModal()); });
    }

    // --- Pricing, Links & Admin ---
    function saveConfigToDB(key, value, callback) {
        safeFetchPOST({ action: 'updateConfig', key: key, value: value }, callback);
    }

    window.openPriceListEditor = () => { 
        const body = document.getElementById('priceListBody');
        body.innerHTML = '';
        
        const pkgs = [
            { id: 'VIP', title: 'חבילת הכל כלול VIP' },
            { id: 'FESTIVE', title: 'חבילה חגיגית' },
            { id: 'BASIC', title: 'חבילת בסיס' },
            { id: 'SOLO', title: 'חבילת לימוד לבר מצווה' }
        ];

        let html = '<div class="grid gap-6">';
        const isSuper = (currentUser && currentUser.role === 'superadmin');

        pkgs.forEach(pkg => {
            html += `<div class="bg-slate-800 p-6 rounded-xl border border-slate-600 shadow-lg">
                <h3 class="text-xl font-bold text-amber-400 border-b border-slate-700 pb-2 mb-4">${pkg.title}</h3>`;
            
            html += buildPriceRow(`price${pkg.id}`, 'מחיר סופי', pricingData[`price${pkg.id}`] || siteConfig[`price${pkg.id}`] || '', isSuper, true);
            html += buildPriceRow(`discount${pkg.id}`, 'מקסימום הנחה (בתיאום מראש)', pricingData[`discount${pkg.id}`] || '', isSuper, false);
            
            if (isSuper) {
                html += `<div class="mt-4 pt-4 border-t border-slate-700">`;
                html += buildPriceRow(`payKey${pkg.id}`, 'תשלום לקלידן', pricingData[`payKey${pkg.id}`] || '', true, false);
                html += buildPriceRow(`payDrum${pkg.id}`, 'תשלום למתופפים', pricingData[`payDrum${pkg.id}`] || '', true, false);
                html += buildPriceRow(`paySound${pkg.id}`, 'תשלום לסאונד', pricingData[`paySound${pkg.id}`] || '', true, false);
                html += buildPriceRow(`payMgr${pkg.id}`, 'תשלום למנהלת', pricingData[`payMgr${pkg.id}`] || '', true, false);
                html += buildPriceRow(`payAviv${pkg.id}`, 'נשאר לאביב', pricingData[`payAviv${pkg.id}`] || '', true, false);
                html += `</div>`;
            }
            html += `</div>`;
        });
        
        html += '</div>';

        if (isSuper) {
            html += `<div class="mt-8 text-center border-t border-slate-700 pt-6">
                <button onclick="savePricesFull()" class="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-12 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.4)] transition text-lg">שמור מחירון</button>
            </div>`;
        }

        body.innerHTML = html;
        window.closeSideMenu();
        window.openModal('priceListEditorModal');
    }

    function buildPriceRow(id, label, val, isEditable, isMain) {
        const textStyle = isMain ? 'text-amber-400 font-bold' : 'text-slate-300';
        if (isEditable) {
            return `<div class="flex justify-between items-center mb-3">
                <label class="${textStyle} w-1/2">${label}</label>
                <input type="number" id="${id}" value="${val}" class="w-1/3 bg-slate-900 border border-slate-600 p-2 rounded text-white text-center font-bold outline-none focus:border-amber-400">
            </div>`;
        } else {
            return `<div class="flex justify-between items-center mb-3 border-b border-slate-700/50 pb-2">
                <span class="${textStyle} text-sm">${label}</span>
                <span class="text-white font-bold bg-slate-900 px-4 py-1 rounded border border-slate-700">${val ? val + ' ₪' : '--'}</span>
            </div>`;
        }
    }

    window.savePricesFull = () => {
        const pkgs = ['VIP', 'FESTIVE', 'BASIC', 'SOLO'];
        const fields = ['price', 'discount', 'payKey', 'payDrum', 'paySound', 'payMgr', 'payAviv'];
        
        pkgs.forEach(id => {
            fields.forEach(f => {
                const key = `${f}${id}`;
                const el = document.getElementById(key);
                if (el) pricingData[key] = el.value;
            });
        });

        ['VIP', 'FESTIVE', 'BASIC', 'SOLO'].forEach(id => { siteConfig[`price${id}`] = pricingData[`price${id}`]; });
        updatePackagesFromConfig(); 

        safeFetchPOST({ action: 'updateConfig', key: 'pricingDB', value: JSON.stringify(pricingData) }, () => {
            window.closeModal('priceListEditorModal');
            customAlert('המחירון עודכן ושמור בהצלחה!');
        });
    }

    // --- Gallery & Lightbox ---
    window.openVideoOrderModal = () => {
        window.closeSideMenu();
        const videos = galleryImages.filter(item => item.type === 'video');
        
        let videoOrder = [];
        try { 
            let parsed = JSON.parse(siteConfig.videoOrderDB); 
            if (Array.isArray(parsed)) videoOrder = parsed;
        } catch(e){}
        
        videos.forEach(v => { if (!videoOrder.includes(v.url)) videoOrder.push(v.url); });
        videos.sort((a, b) => videoOrder.indexOf(a.url) - videoOrder.indexOf(b.url));

        currentVideoOrderEditing = [...videos];
        renderVideoOrderList();
        window.openModal('videoOrderModal');
    }

    window.renderVideoOrderList = () => {
        const list = document.getElementById('videoOrderList');
        list.innerHTML = '';
        
        currentVideoOrderEditing.forEach((vid, index) => {
            let title = vid.title || 'סרטון ללא כותרת';
            list.innerHTML += `
                <div class="bg-slate-800 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                    <div class="text-white font-bold truncate pr-2 flex-1 text-right" dir="rtl">${index + 1}. ${title}</div>
                    <div class="flex gap-1 pl-2" dir="ltr">
                        <button class="bg-slate-700 hover:bg-amber-400 hover:text-black text-white w-8 h-8 rounded flex items-center justify-center transition disabled:opacity-30 disabled:hover:bg-slate-700 disabled:hover:text-white cursor-pointer" onclick="moveVideoListItem(${index}, -1)" ${index === 0 ? 'disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                        <button class="bg-slate-700 hover:bg-amber-400 hover:text-black text-white w-8 h-8 rounded flex items-center justify-center transition disabled:opacity-30 disabled:hover:bg-slate-700 disabled:hover:text-white cursor-pointer" onclick="moveVideoListItem(${index}, 1)" ${index === currentVideoOrderEditing.length - 1 ? 'disabled' : ''}><i class="fas fa-arrow-down"></i></button>
                    </div>
                </div>
            `;
        });
    }

    window.moveVideoListItem = (index, direction) => {
        if (index + direction < 0 || index + direction >= currentVideoOrderEditing.length) return;
        const temp = currentVideoOrderEditing[index];
        currentVideoOrderEditing[index] = currentVideoOrderEditing[index + direction];
        currentVideoOrderEditing[index + direction] = temp;
        renderVideoOrderList();
    }

    window.saveVideoOrder = () => {
        const newOrder = currentVideoOrderEditing.map(v => v.url);
        siteConfig.videoOrderDB = JSON.stringify(newOrder); 
        safeFetchPOST({ action: 'updateConfig', key: 'videoOrderDB', value: JSON.stringify(newOrder) }, () => {
            window.closeModal('videoOrderModal');
            renderGallery();
            customAlert('סדר הסרטונים נשמר בהצלחה!');
        });
    }

    window.renderGallery = function() {
        const c = document.getElementById('imageMarquee'); 
        const v = document.getElementById('videoContainer');
        if(!c || !v) return;
        
        c.innerHTML = '';
        v.innerHTML = '';

        const images = galleryImages.filter(item => typeof item === 'string' || item.type === 'image');
        const videos = galleryImages.filter(item => item.type === 'video');

        let videoOrder = [];
        let imageOrder = [];
        try { 
            let parsedV = JSON.parse(siteConfig.videoOrderDB); 
            if (Array.isArray(parsedV)) videoOrder = parsedV;
            let parsedI = JSON.parse(siteConfig.imageOrderDB); 
            if (Array.isArray(parsedI)) imageOrder = parsedI;
        } catch(e){}
        
        videos.sort((a, b) => {
            let idxA = videoOrder.indexOf(a.url);
            let idxB = videoOrder.indexOf(b.url);
            if (idxA === -1) idxA = 9999;
            if (idxB === -1) idxB = 9999;
            return idxA - idxB;
        });

        images.sort((a, b) => {
            let urlA = typeof a === 'string' ? a : a.url;
            let urlB = typeof b === 'string' ? b : b.url;
            let idxA = imageOrder.indexOf(urlA);
            let idxB = imageOrder.indexOf(urlB);
            if (idxA === -1) idxA = 9999;
            if (idxB === -1) idxB = 9999;
            return idxA - idxB;
        });

        lightboxImageUrls = images.map(i => (typeof i === 'string' ? i : i.url));
        const isSuper = (currentUser && currentUser.role === 'superadmin');

        const createSet = (clone) => {
            const w = document.createElement('div'); w.className = clone ? 'clone-set flex' : 'flex';
            lightboxImageUrls.forEach((src, idx) => {
                let btns = '';
                if (isSuper && !clone) {
                     btns = `
                        <div class="absolute top-2 right-2 flex gap-2 z-[9999]">
                            <button class="bg-red-600 border-2 border-white text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500 shadow-xl" onclick="deleteImage('${src}')"><i class="fas fa-trash text-sm"></i></button>
                        </div>
                        <div class="absolute top-2 left-2 flex gap-2 z-[9999]">
                            ${idx > 0 ? `<button class="bg-slate-900 border-2 border-amber-400 text-amber-400 w-8 h-8 flex items-center justify-center rounded-full hover:bg-amber-400 hover:text-black shadow-xl transition-all" onclick="moveImageItem('${src}', -1)" title="הזז ימינה"><i class="fas fa-arrow-right text-sm"></i></button>` : ''}
                            ${idx < lightboxImageUrls.length - 1 ? `<button class="bg-slate-900 border-2 border-amber-400 text-amber-400 w-8 h-8 flex items-center justify-center rounded-full hover:bg-amber-400 hover:text-black shadow-xl transition-all" onclick="moveImageItem('${src}', 1)" title="הזז שמאלה"><i class="fas fa-arrow-left text-sm"></i></button>` : ''}
                        </div>`;
                }
                w.innerHTML += `<div class="gallery-item relative">${btns}<img src="${src}" class="gallery-img" onclick="openLightbox('${src}')"></div>`;
            });
            return w;
        };
        
        if(lightboxImageUrls.length > 0) {
            c.appendChild(createSet(false)); 
            c.appendChild(createSet(true));
        }

        videos.forEach((vid, index) => {
            let embedUrl = vid.url;
            let isDirectFile = false;
            let poster = ''; 

            if (vid.url.match(/\.(mp4|webm|ogg)$/i) || vid.url.includes('drive.google.com/file')) {
                isDirectFile = true;
                if(vid.url.includes('drive.google.com/file')) {
                    const fileId = vid.url.match(/d\/([a-zA-Z0-9_-]+)/)?.[1];
                    if(fileId) embedUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
                }
            } 
            else if (vid.url.includes('vimeo')) {
                const vimeoId = vid.url.match(/vimeo\.com\/(?:.*#|.*\/videos\/)?([0-9]+)/);
                if (vimeoId && vimeoId[1]) {
                     embedUrl = `https://player.vimeo.com/video/${vimeoId[1]}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479`; 
                }
            } 
            else if (vid.url.includes('youtu')) {
                let id = vid.url.includes('v=') ? vid.url.split('v=')[1].split('&')[0] : vid.url.split('youtu.be/')[1].split('?')[0];
                embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
                poster = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
            }

            const div = document.createElement('div');
            div.className = "rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 relative group shadow-2xl flex flex-col";
            
            let delBtn = '';
            if (isSuper) {
                delBtn = `
                    <div class="absolute top-3 right-3 flex gap-2 z-[9999]">
                        <button class="bg-blue-600 border-2 border-white text-white w-10 h-10 flex items-center justify-center rounded-full hover:bg-blue-500 shadow-xl" onclick="editGalleryItem('${vid.url}')" title="ערוך כותרת"><i class="fas fa-pencil-alt"></i></button>
                        <button class="bg-red-600 border-2 border-white text-white w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-500 shadow-xl" onclick="deleteImage('${vid.url}')" title="מחק סרטון"><i class="fas fa-trash"></i></button>
                    </div>`;
            }
            
            let videoHtml = '';
            if (isDirectFile) {
                videoHtml = `<div class="bg-black aspect-video relative w-full"><video src="${embedUrl}" class="w-full h-full" controls playsinline controlsList="nodownload"></video></div>`;
            } 
            else if (poster) { 
                videoHtml = `
                    <div class="bg-black aspect-video relative cursor-pointer group w-full" onclick="this.innerHTML='<iframe class=\\'w-full h-full\\' src=\\'${embedUrl}\\' frameborder=\\'0\\' allowfullscreen allow=\\'autoplay\\'></iframe>'">
                        <img src="${poster}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition duration-500">
                        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div class="bg-red-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg group-hover:scale-110 transition"><i class="fas fa-play text-2xl ml-1"></i></div>
                        </div>
                    </div>
                `;
            }
            else { 
                videoHtml = `<div class="bg-black aspect-video relative w-full"><iframe class="w-full h-full" src="${embedUrl}" frameborder="0" allowfullscreen allow="autoplay; fullscreen; picture-in-picture"></iframe></div>`;
            }

            let titleHtml = '';
            if(vid.title) {
                titleHtml = `<div class="p-4 text-center font-bold text-amber-400 text-lg tracking-wide border-t border-slate-800 bg-slate-900/50">${vid.title}</div>`;
            }

            div.innerHTML = videoHtml + titleHtml + delBtn;
            v.appendChild(div);
        });
    }

    window.openLightbox = (src) => { 
        currentLightboxIndex = lightboxImageUrls.indexOf(src);
        document.getElementById('lightboxImage').src = src; 
        window.openModal('lightboxModal'); 
    }
    
    window.nextImage = (e) => {
        if(e) e.stopPropagation(); 
        currentLightboxIndex = (currentLightboxIndex + 1) % lightboxImageUrls.length;
        document.getElementById('lightboxImage').src = lightboxImageUrls[currentLightboxIndex];
    }
    
    window.prevImage = (e) => {
        if(e) e.stopPropagation(); 
        currentLightboxIndex = (currentLightboxIndex - 1 + lightboxImageUrls.length) % lightboxImageUrls.length;
        document.getElementById('lightboxImage').src = lightboxImageUrls[currentLightboxIndex];
    }

    // --- Checklists, Links & Reviews ---
    window.openChecklist = () => {
        window.closeSideMenu();
        renderChecklist();
        window.openModal('checklistModal');
    }

    function renderChecklist() {
        const list = document.getElementById('checklistList');
        list.innerHTML = '';
        const isSuper = (currentUser && currentUser.role === 'superadmin');
        
        checklistData.forEach((item, index) => {
            const checkedClass = item.checked ? 'line-through text-slate-500' : 'text-white';
            let html = `
                <div class="bg-slate-800 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                    <label class="flex items-center gap-3 cursor-pointer flex-1">
                        <input type="checkbox" class="w-5 h-5 accent-orange-500" ${item.checked ? 'checked' : ''} onchange="toggleChecklistItem(${index})">
                        <span class="text-lg font-bold ${checkedClass}">${item.text}</span>
                    </label>
            `;
            if(isSuper) {
                html += `<button onclick="deleteChecklistItem(${index})" class="text-red-500 hover:text-red-400 p-2"><i class="fas fa-trash"></i></button>`;
            }
            html += `</div>`;
            list.innerHTML += html;
        });
        if(checklistData.length === 0) list.innerHTML = '<div class="text-slate-400 text-center">אין ציוד ברשימה כרגע.</div>';
    }

    window.addChecklistItem = () => {
        const text = document.getElementById('newChecklistItem').value;
        if(!text) return;
        checklistData.push({ text: text, checked: false });
        document.getElementById('newChecklistItem').value = '';
        saveConfigToDB('checklistDB', JSON.stringify(checklistData), renderChecklist);
    }
    window.toggleChecklistItem = (index) => {
        checklistData[index].checked = !checklistData[index].checked;
        saveConfigToDB('checklistDB', JSON.stringify(checklistData), () => {});
        renderChecklist();
    }
    window.deleteChecklistItem = (index) => {
        checklistData.splice(index, 1);
        saveConfigToDB('checklistDB', JSON.stringify(checklistData), renderChecklist);
    }

    window.openUsefulLinks = () => {
        window.closeSideMenu();
        renderUsefulLinks();
        window.openModal('usefulLinksModal');
    }
    function renderUsefulLinks() {
        const list = document.getElementById('usefulLinksList');
        list.innerHTML = '';
        usefulLinksData.forEach((link, index) => {
            list.innerHTML += `
                <div class="bg-slate-800 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                    <a href="${link.url}" target="_blank" class="text-cyan-400 font-bold text-lg hover:underline flex items-center gap-2 flex-1"><i class="fas fa-external-link-alt text-sm"></i> ${link.name}</a>
                    <button onclick="deleteUsefulLink(${index})" class="text-red-500 hover:text-red-400 p-2"><i class="fas fa-trash"></i></button>
                </div>
            `;
        });
        if(usefulLinksData.length === 0) list.innerHTML = '<div class="text-slate-400 text-center">אין לינקים שמורים.</div>';
    }
    window.addUsefulLink = () => {
        const name = document.getElementById('newUsefulName').value;
        let url = document.getElementById('newUsefulUrl').value;
        if(!name || !url) return;
        if(!url.startsWith('http')) url = 'https://' + url;
        usefulLinksData.push({ name, url });
        document.getElementById('newUsefulName').value = '';
        document.getElementById('newUsefulUrl').value = '';
        saveConfigToDB('usefulLinksDB', JSON.stringify(usefulLinksData), renderUsefulLinks);
    }
    window.deleteUsefulLink = (index) => {
        usefulLinksData.splice(index, 1);
        saveConfigToDB('usefulLinksDB', JSON.stringify(usefulLinksData), renderUsefulLinks);
    }

    window.openReviewsManager = () => {
        window.closeSideMenu();
        document.getElementById('googleReviewLinkInput').value = siteConfig.googleReviewLink || '';
        window.cancelReviewEdit();
        renderReviewsManager();
        window.openModal('reviewsManagerModal');
    }
    
    function renderReviewsManager() {
        const list = document.getElementById('reviewsListAdmin');
        list.innerHTML = '';
        reviewsData.forEach((rev, index) => {
            let starsHtml = '⭐'.repeat(rev.stars);
            list.innerHTML += `
                <div class="bg-slate-800 p-4 rounded-xl border border-slate-700 relative">
                    <div class="text-amber-400 mb-1">${starsHtml}</div>
                    <div class="text-white font-bold mb-2">${rev.name}</div>
                    <div class="text-slate-400 text-sm mb-3">"${rev.text}"</div>
                    <div class="absolute top-4 left-4 flex gap-2">
                        <button onclick="editReview(${index})" class="text-blue-400 hover:text-blue-300"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteReview(${index})" class="text-red-500 hover:text-red-400"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
    }
    
    window.editReview = (index) => {
        const rev = reviewsData[index];
        document.getElementById('newRevName').value = rev.name;
        document.getElementById('newRevText').value = rev.text;
        document.getElementById('newRevStars').value = rev.stars;
        editingReviewIndex = index;
        
        const btn = document.getElementById('saveReviewBtn');
        btn.innerHTML = 'שמור שינויים <i class="fas fa-save ml-1"></i>';
        btn.className = 'flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded transition';
        document.getElementById('cancelReviewBtn').classList.remove('hidden');
        
        document.querySelector('#reviewsManagerModal .modal-content').scrollTo({ top: 0, behavior: 'smooth' });
    }

    window.cancelReviewEdit = () => {
        document.getElementById('newRevName').value = '';
        document.getElementById('newRevText').value = '';
        document.getElementById('newRevStars').value = '5';
        editingReviewIndex = -1;
        
        const btn = document.getElementById('saveReviewBtn');
        btn.innerHTML = 'הוסף המלצה לאתר <i class="fas fa-plus ml-1"></i>';
        btn.className = 'flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded transition';
        document.getElementById('cancelReviewBtn').classList.add('hidden');
    }

    window.addReview = () => {
        const name = document.getElementById('newRevName').value;
        const text = document.getElementById('newRevText').value;
        const stars = document.getElementById('newRevStars').value;
        if(!name || !text) return customAlert("חובה למלא שם ותוכן המלצה");
        
        if (editingReviewIndex > -1) {
            reviewsData[editingReviewIndex] = { name, text, stars: parseInt(stars) };
        } else {
            reviewsData.unshift({ name, text, stars: parseInt(stars) });
        }
        
        saveConfigToDB('reviewsDB', JSON.stringify(reviewsData), () => { 
            window.cancelReviewEdit();
            renderReviewsManager(); 
            renderPublicReviews(); 
        });
    }
    
    window.deleteReview = (index) => {
        if(!confirm("למחוק את ההמלצה?")) return;
        reviewsData.splice(index, 1);
        saveConfigToDB('reviewsDB', JSON.stringify(reviewsData), () => { renderReviewsManager(); renderPublicReviews(); });
    }
    
    window.saveGoogleReviewLink = () => {
        const url = document.getElementById('googleReviewLinkInput').value;
        siteConfig.googleReviewLink = url;
        saveConfigToDB('googleReviewLink', url, () => customAlert('לינק לבקשת ביקורת נשמר בהצלחה! הלינק ישמש לבקשת המלצות בוואטסאפ.'));
    }
    
    function renderPublicReviews() {
        const track = document.getElementById('reviewsMarquee');
        if(!track) return;
        track.innerHTML = '';
        if(reviewsData.length === 0) {
            document.getElementById('reviewsSection').style.display = 'none';
            return;
        }
        document.getElementById('reviewsSection').style.display = 'block';
        
        const createSet = () => {
            let html = '';
            reviewsData.forEach(rev => {
                let starsHtml = '⭐'.repeat(rev.stars);
                html += `
                    <div class="review-card">
                        <div class="review-stars">${starsHtml}</div>
                        <div class="review-text">"${rev.text}"</div>
                        <div class="review-author">- ${rev.name}</div>
                    </div>
                `;
            });
            return html;
        }
        track.innerHTML = createSet() + createSet() + createSet();
    }

    // --- Communication & Proposals ---
    window.sendWaToClient = (phone) => {
         const p = phone || document.getElementById('waPhone').value;
         if(!p) return alert('נא להזין מספר טלפון');
         const msg = "היי :) שמחתי לשוחח, מצורף הצעת המחיר ופרטים נוספים...";
         window.open(`https://wa.me/972${p.replace(/-/g,'').substring(1)}?text=${encodeURIComponent(msg)}`, '_blank');
    }

    window.sendReviewRequest = () => {
        const p = document.getElementById('waPhone').value;
        if(!p) return alert('נא להזין מספר טלפון קודם בחלונית.');
        
        const link = siteConfig.googleReviewLink || 'https://g.page/r/your-link';
        const msg = `היי! שמחנו לקחת חלק בבר המצווה שלכם 💫\n\nנשמח מאוד אם תוכלו להקדיש דקה לכתוב לנו המלצה חמה בגוגל דרך הקישור הבא:\n${link}\n\nתודה רבה מראש,\nצוות אביב ויצמן`;
        window.open(`https://wa.me/972${p.replace(/-/g,'').substring(1)}?text=${encodeURIComponent(msg)}`, '_blank');
    }

    window.sendGenericBookingForm = () => {
        const p = document.getElementById('waPhone').value;
        if(!p) return customAlert('נא להזין מספר טלפון קודם בחלונית.');
        const link = 'https://forms.gle/yYLCZtynqt664iF86';
        const msg = `היי! שמחים ומתרגשים לקראת בר המצווה 😊\n\nכדי שנוכל לסגור את כל הקצוות בצורה מסודרת, הכנו עבורך טופס הזמנה לאירוע. אנא היכנס/י ללינק, מלא/י את הפרטים ואשר/י:\n\n${link}\n\nנתראה בשמחות,\nצוות אביב ויצמן`;
        window.open(`https://wa.me/972${p.replace(/-/g,'').substring(1)}?text=${encodeURIComponent(msg)}`, '_blank');
    }

    window.sendBookingForm = (eventId, phone) => {
        if (!phone) { customAlert("לא הוזן מספר טלפון לאירוע זה."); return; }
        let baseUrl = window.location.origin + window.location.pathname.replace(/index\.html$/, '');
        if (!baseUrl.endsWith('/')) baseUrl += '/';
        const formLink = `${baseUrl}booking.html?id=${eventId}`;
        
        const msg = `היי! שמחים ומתרגשים לקראת בר המצווה 💫\n\nכדי שנוכל לסגור את כל הקצוות בצורה מסודרת, הכנו עבורך טופס אישור פרטים קצר. אנא היכנס/י ללינק, ודא/י שהפרטים נכונים, השלם/י את החסר ואשר/י בתחתית העמוד:\n\n${formLink}\n\nנתראה בשמחות,\nצוות אביב ויצמן`;
        window.open(`https://wa.me/972${phone.replace(/-/g,'').substring(1)}?text=${encodeURIComponent(msg)}`, '_blank');
    }
    
    window.openWhatsAppTool = () => { window.closeSideMenu(); window.openModal('whatsappModal'); }
    
    window.openProposalTool = () => { 
        window.closeSideMenu(); 
        document.getElementById('propEventType').value = 'barmitzvah';
        window.toggleProposalFields();
        window.openModal('proposalSetupModal'); 
    }

    window.toggleProposalFields = () => {
        const type = document.getElementById('propEventType').value;
        const childCont = document.getElementById('propChildContainer');
        const sabbathCont = document.getElementById('propSabbathContainer');
        const packCont = document.getElementById('propPackageContainer');
        
        if (type === 'other') {
            childCont.style.display = 'none';
            sabbathCont.style.display = 'none';
            packCont.style.display = 'none';
        } else {
            childCont.style.display = 'block';
            sabbathCont.style.display = 'block';
            packCont.style.display = 'block';
        }
    }

    window.updateProposalFields = () => {
        const type = document.getElementById('propType').value;
        const detailsArea = document.getElementById('propCustomDetails');
        const priceInput = document.getElementById('propCustomPrice');
        const pkg = packagesData[type];
        if (pkg) { detailsArea.value = pkg.d; priceInput.value = pkg.p.replace('₪', '').trim(); }
    }

    window.generateProposal = () => {
        const eventType = document.getElementById('propEventType').value;
        const name = document.getElementById('propName').value;
        const child = document.getElementById('propChild').value;
        const date = document.getElementById('propDate').value;
        const hebDateGen = document.getElementById('propHebrewDateGen').value;
        const hebDateSabbath = document.getElementById('propHebDate').value;
        const loc = document.getElementById('propLocation').value;
        const details = document.getElementById('propCustomDetails').value;
        let price = document.getElementById('propCustomPrice').value.trim();
        
        if(price && !price.includes('₪')) price = price + ' ₪';

        const isBarMitzvah = eventType === 'barmitzvah';
        const docTitle = isBarMitzvah ? 'הצעת מחיר לבר מצווה' : 'הצעת מחיר לאירוע';
        
        const childRow = isBarMitzvah ? `<div class="row"><strong>שם חתן בר המצווה:</strong> <span>${child}</span></div>` : '';
        const sabbathRow = isBarMitzvah && hebDateSabbath ? `<div class="row"><strong>תאריך שבת חתן:</strong> <span>${hebDateSabbath}</span></div>` : '';
        const hebDateRow = hebDateGen ? `<div class="row"><strong>תאריך עברי:</strong> <span>${hebDateGen}</span></div>` : '';

        const printWindow = window.open('', '_blank');
        
        printWindow.document.write(`
            <html lang="he" dir="rtl">
            <head>
                <title>${docTitle} - אביב ויצמן</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;700;900&display=swap');
                    body { font-family: 'Heebo', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; direction: rtl; color: black; }
                    .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 4px solid #0056b3; padding-bottom: 15px; margin-bottom: 30px; }
                    .logo { height: 100px; width: auto; display: block; } 
                    .business-details { text-align: left; line-height: 1.6; color: #333; font-size: 14px; }
                    .bsd { position: absolute; top: 20px; right: 20px; font-weight: bold; font-size: 14px; }
                    h1 { text-align: center; font-size: 36px; font-weight: 900; text-decoration: underline; color: #051c42; margin-bottom: 30px; }
                    .grid-container { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
                    .section { background: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 12px; }
                    .section h3 { border-bottom: 2px solid #fbbf24; padding-bottom: 8px; margin-bottom: 15px; color: #051c42; font-size: 20px; font-weight: bold; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px dashed #e5e7eb; padding-bottom: 5px; font-size: 16px; }
                    .pkg-box { background: #eff6ff; border: 1px solid #bfdbfe; padding: 25px; border-radius: 12px; margin-bottom: 30px; }
                    .pkg-title { font-size: 22px; font-weight: bold; color: #1e40af; border-bottom: 1px solid #93c5fd; padding-bottom: 10px; margin-bottom: 15px; }
                    .pkg-desc { font-size: 18px; line-height: 1.6; white-space: pre-line; }
                    .total-box { background-color: #051c42; color: white; padding: 25px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-top: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .total-label { font-size: 24px; font-weight: bold; color: #ffffff; }
                    .total-price { font-size: 40px; font-weight: 900; color: #ffffff; text-shadow: 0 0 10px rgba(0,0,0,0.5); }
                    .footer { margin-top: 60px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px; color: #666; font-size: 14px; }
                    .quote { font-family: 'Heebo', sans-serif; font-size: 24px; font-weight: 900; color: #051c42; margin-bottom: 10px; display: block; }
                    @media print { body { -webkit-print-color-adjust: exact; } }
                </style>
            </head>
            <body>
                <div class="bsd">בס"ד</div>
                <div class="header">
                    <img src="https://i.postimg.cc/CMcRF8Nm/Logo.gif" class="logo" alt="Logo">
                    <div class="business-details">
                        <div><strong>אביב ויצמן - פייטן לבר מצווה</strong></div>
                        <div>עוסק פטור: 315660746</div>
                        <div>avivshows@gmail.com</div>
                        <div>055-9907076</div>
                    </div>
                </div>
                <h1>הצעת מחיר</h1>
                <div class="grid-container">
                    <div class="section">
                        <h3>פרטי הלקוח</h3>
                        <div class="row"><strong>שם הלקוח:</strong> <span>${name}</span></div>
                        ${childRow}
                    </div>
                    <div class="section">
                        <h3>פרטי האירוע</h3>
                        <div class="row"><strong>תאריך לועזי:</strong> <span>${date}</span></div>
                        ${hebDateRow}
                        ${sabbathRow}
                        <div class="row"><strong>מיקום:</strong> <span>${loc}</span></div>
                    </div>
                </div>
                <div class="pkg-box">
                    <div class="pkg-title">שירותים נבחרים:</div>
                    <div class="pkg-desc">${details.replace(/\n/g, '<br>')}</div>
                </div>
                <div class="total-box">
                    <span class="total-label">סה"כ לתשלום:</span>
                    <span class="total-price">${price}</span>
                </div>
                <div class="footer">
                    <span class="quote">"בשם השם נעשה ונצליח!"</span>
                    <p>ההצעה בתוקף ל-30 יום מתאריך ההפקה</p>
                    <p>אפשרויות תשלום: ביט / פייבוקס / העברה בנקאית / צ'ק</p>
                </div>
                <script>
                    window.onload = function() { window.print(); }
                <\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    // --- Init ---
    loadData();
});

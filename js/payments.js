// js/payments.js

// --- Payments Logic ---

// Computes payment status for an event.
// isFullySettled is only ever true for finished events where the client paid in full
// AND every staff member who attended and has an amount due has been marked as paid.
// That flag is what determines archiving - it is a stricter check than the "payment-ok"
// styling used for events that are simply on-track (e.g. deposit paid) before they happen.
function getPaymentStatus(evt) {
    let payments = evt.payments || {};
    let client = payments.client || { downPayment: false, fullPayment: false };
    let staff = payments.staff || {};

    const isFinished = evt.status === 'הסתיים';
    let isOnTrack = false;
    let isFullySettled = false;

    if (!isFinished) {
        isOnTrack = client.downPayment;
    } else {
        const clientOK = client.fullPayment;
        const staffOK = Object.values(staff).every(s => {
            if (s.attended === false) return true;
            if (s.amount && s.amount > 0) return s.paid;
            return true;
        });
        isFullySettled = clientOK && staffOK;
        isOnTrack = isFullySettled;
    }

    return { isFinished, isOnTrack, isFullySettled, client, staff };
}

function buildPaymentCardHtml(evt) {
    const { isFinished, isOnTrack, client } = getPaymentStatus(evt);
    const borderClass = isOnTrack ? 'payment-ok' : 'payment-bad';
    const depositIcon = client.downPayment ? '<i class="fas fa-check text-green-500"></i>' : '<i class="fas fa-times text-red-500"></i>';

    return `
        <div class="payment-card ${borderClass}">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold text-white">${evt.eventName || 'אירוע'}</h3>
                <span class="text-sm text-gray-400">${evt.date}</span>
            </div>
            <div class="mb-4 text-right text-gray-300">
                 <div>מקדמה: ${depositIcon}</div>
                 ${isFinished ? `<div>גמר חשבון: ${client.fullPayment ? '<i class="fas fa-check text-green-500"></i>' : '<i class="fas fa-times text-red-500"></i>'}</div>` : ''}
            </div>
            <button onclick="openPaymentModal('${evt.id}')" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded">ניהול תשלומים</button>
        </div>
    `;
}

window.renderPaymentsBoard = function() {
    const board = document.getElementById('paymentsBoard');
    if(!board) return;
    board.innerHTML = '';

    // Only current (not-yet-fully-settled) events are shown here, in chronological order.
    // Fully settled events move to the archive (see openPaymentsArchiveModal below).
    const activeEvents = events.filter(evt => !getPaymentStatus(evt).isFullySettled);
    const sortedActive = [...activeEvents].sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedActive.forEach(evt => {
        board.innerHTML += buildPaymentCardHtml(evt);
    });

    if (sortedActive.length === 0) {
        board.innerHTML = `<div class="col-span-full text-center text-slate-400 text-xl py-10">אין כרגע אירועים פתוחים לתשלום. כל האירועים שולמו במלואם וניתן לצפות בהם בארכיון התשלומים.</div>`;
    }
}

window.openPaymentsArchiveModal = function() {
    const list = document.getElementById('paymentsArchiveList');
    if(!list) return;
    list.innerHTML = '';

    const settledEvents = events.filter(evt => getPaymentStatus(evt).isFullySettled);
    const sortedSettled = [...settledEvents].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedSettled.forEach(evt => {
        list.innerHTML += `
            <div class="bg-slate-800 p-4 rounded-xl border border-green-700/50 flex flex-col md:flex-row justify-between md:items-center gap-3 shadow-md">
                <div>
                    <div class="text-white font-bold text-lg">${evt.eventName || 'אירוע'}</div>
                    <div class="text-slate-400 text-sm"><i class="far fa-calendar-alt ml-1"></i> ${evt.date}</div>
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-green-400 font-bold text-sm bg-green-900/30 px-3 py-1 rounded-full"><i class="fas fa-check-circle ml-1"></i> כל התשלומים הושלמו</span>
                    <button onclick="closeModal('paymentsArchiveModal'); openPaymentModal('${evt.id}')" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow"><i class="fas fa-eye ml-1"></i> צפה בפרטים</button>
                </div>
            </div>
        `;
    });

    if (sortedSettled.length === 0) {
        list.innerHTML = `<div class="text-center text-slate-400 text-xl py-6">ארכיון התשלומים ריק כרגע.</div>`;
    }

    window.openModal('paymentsArchiveModal');
}

window.togglePayMethodNotes = (selectId, notesId) => {
    const val = document.getElementById(selectId).value;
    const notesEl = document.getElementById(notesId);
    if(val === 'אחר') notesEl.classList.remove('hidden');
    else notesEl.classList.add('hidden');
}

window.toggleStaffAttendance = (roleKey) => {
    const isChecked = document.getElementById(`pay_${roleKey}_attended`).checked;
    const fieldsDiv = document.getElementById(`pay_${roleKey}_fields`);
    const checkPaid = document.getElementById(`pay_${roleKey}_check`);
    
    if(isChecked) {
        fieldsDiv.classList.remove('opacity-50', 'pointer-events-none');
        checkPaid.disabled = false;
    } else {
        fieldsDiv.classList.add('opacity-50', 'pointer-events-none');
        checkPaid.disabled = true;
        checkPaid.checked = false;
    }
}

window.openPaymentModal = (eventId) => {
    const evt = events.find(e => e.id == eventId);
    if(!evt) return;
    
    if (!evt.payments) evt.payments = { client: {}, staff: {} };
    const client = evt.payments.client || {};
    const staff = evt.payments.staff || {};
    const depData = client.deposit || {};

    document.getElementById('payEventName').innerText = evt.eventName || 'אירוע';
    document.getElementById('payEventId').value = evt.id;
    
    const isDepositChecked = client.downPayment || false;
    document.getElementById('payClientDeposit').checked = isDepositChecked;
    document.getElementById('depositDetailsContainer').style.display = isDepositChecked ? 'flex' : 'none';
    
    document.getElementById('payDepositDate').value = depData.date || '';
    document.getElementById('payDepositMethod').value = depData.method || '';
    document.getElementById('payDepositNotes').value = depData.notes || '';
    togglePayMethodNotes('payDepositMethod', 'payDepositNotes');
    
    document.getElementById('payReceiptLink1').value = client.receiptLink || '';
    if(client.receiptLink) {
        document.getElementById('openReceiptBtn1').href = client.receiptLink;
        document.getElementById('openReceiptBtn1').style.display = 'flex';
    } else { document.getElementById('openReceiptBtn1').style.display = 'none'; }

    document.getElementById('payReceiptLink2').value = client.receiptLink2 || '';
    if(client.receiptLink2) {
        document.getElementById('openReceiptBtn2').href = client.receiptLink2;
        document.getElementById('openReceiptBtn2').style.display = 'flex';
    } else { document.getElementById('openReceiptBtn2').style.display = 'none'; }
    
    const fullPayContainer = document.getElementById('payClientFullContainer');
    const staffContainer = document.getElementById('staffPaymentsContainer');
    const staffList = document.getElementById('staffPaymentsList');
    
    if(evt.status === 'הסתיים') {
        fullPayContainer.classList.remove('hidden');
        staffContainer.classList.remove('hidden');
        document.getElementById('payClientFull').checked = client.fullPayment || false;
        
        staffList.innerHTML = '';
        const roles = [ 
            { key: 'keyboard', label: 'קלידן' }, 
            { key: 'drummer', label: 'מתופפים' }, 
            { key: 'sound', label: 'סאונד' }, 
            { key: 'manager', label: 'מנהלת אירועים' },
            { key: 'aviv', label: 'אביב' } 
        ];
        
        roles.forEach(role => {
            const data = staff[role.key] || { paid: false, amount: '', date: '', method: '', notes: '', attended: true };
            const attended = data.attended !== false; 
            let showNotes = data.method === 'אחר' ? '' : 'hidden';
            let disabledState = attended ? '' : 'disabled';
            let opacityState = attended ? '' : 'opacity-50 pointer-events-none';
            
            staffList.innerHTML += `
                <div class="bg-slate-700/40 p-4 rounded-xl border border-slate-600 relative">
                    <div class="flex justify-between items-center mb-3">
                        <div class="flex items-center gap-4">
                            <span class="font-black text-lg text-amber-400">${role.label}</span>
                            <label class="flex items-center gap-1 text-sm text-gray-300 cursor-pointer">
                                <input type="checkbox" id="pay_${role.key}_attended" onchange="toggleStaffAttendance('${role.key}')" ${attended ? 'checked' : ''} class="w-4 h-4 accent-blue-500"> השתתף באירוע
                            </label>
                        </div>
                        <label class="flex items-center gap-2 text-white cursor-pointer font-bold bg-slate-900 px-3 py-1 rounded-lg border border-slate-700">
                            <input type="checkbox" class="w-5 h-5 accent-green-500" id="pay_${role.key}_check" ${data.paid ? 'checked' : ''} ${disabledState}> שולם
                        </label>
                    </div>
                    <div class="grid grid-cols-2 gap-3 ${opacityState}" id="pay_${role.key}_fields">
                        <input type="number" placeholder="סכום (₪)" class="bg-slate-900 text-white p-2 rounded-lg border border-slate-600 outline-none focus:border-blue-400" id="pay_${role.key}_amount" value="${data.amount || ''}">
                        <input type="date" class="bg-slate-900 text-white p-2 rounded-lg border border-slate-600 outline-none focus:border-blue-400" id="pay_${role.key}_date" value="${data.date || ''}" title="תאריך">
                        <select class="bg-slate-900 text-white p-2 rounded-lg border border-slate-600 outline-none focus:border-blue-400 col-span-2 md:col-span-1" id="pay_${role.key}_method" onchange="togglePayMethodNotes('pay_${role.key}_method', 'pay_${role.key}_notes')">
                            <option value="" ${!data.method ? 'selected' : ''}>אופן תשלום...</option>
                            <option value="מזומן" ${data.method==='מזומן' ? 'selected' : ''}>מזומן</option>
                            <option value="העברה בנקאית" ${data.method==='העברה בנקאית' ? 'selected' : ''}>העברה בנקאית</option>
                            <option value="Bit" ${data.method==='Bit' ? 'selected' : ''}>Bit</option>
                            <option value="Paybox" ${data.method==='Paybox' ? 'selected' : ''}>Paybox</option>
                            <option value="אחר" ${data.method==='אחר' ? 'selected' : ''}>אחר</option>
                        </select>
                        <input type="text" placeholder="פירוט הערה..." class="bg-slate-900 text-white p-2 rounded-lg border border-slate-600 outline-none focus:border-blue-400 col-span-2 md:col-span-1 ${showNotes}" id="pay_${role.key}_notes" value="${data.notes || ''}">
                    </div>
                </div>
            `;
        });
    } else {
        fullPayContainer.classList.add('hidden');
        staffContainer.classList.add('hidden');
    }
    window.openModal('paymentModal');
}

window.savePaymentData = () => {
    const eventId = document.getElementById('payEventId').value;
    const evt = events.find(e => e.id == eventId);
    if(!evt) return;

    if(!evt.payments) evt.payments = { client: {}, staff: {} };
    if(!evt.payments.client) evt.payments.client = {};
    if(!evt.payments.staff) evt.payments.staff = {};

    evt.payments.client.downPayment = document.getElementById('payClientDeposit').checked;
    evt.payments.client.deposit = {
        date: document.getElementById('payDepositDate').value,
        method: document.getElementById('payDepositMethod').value,
        notes: document.getElementById('payDepositNotes').value
    };
    evt.payments.client.receiptLink = document.getElementById('payReceiptLink1').value;
    evt.payments.client.receiptLink2 = document.getElementById('payReceiptLink2').value;
    
    if(evt.status === 'הסתיים') {
        evt.payments.client.fullPayment = document.getElementById('payClientFull').checked;
        const roles = ['drummer', 'keyboard', 'sound', 'manager', 'aviv'];
        roles.forEach(role => {
            evt.payments.staff[role] = {
                attended: document.getElementById(`pay_${role}_attended`).checked,
                paid: document.getElementById(`pay_${role}_check`).checked,
                amount: document.getElementById(`pay_${role}_amount`).value,
                date: document.getElementById(`pay_${role}_date`).value,
                method: document.getElementById(`pay_${role}_method`).value,
                notes: document.getElementById(`pay_${role}_notes`).value
            };
        });
    }

    safeFetchPOST({ action: 'savePayment', id: eventId, client: evt.payments.client, staff: evt.payments.staff }, () => {
        window.closeModal('paymentModal'); 
        renderPaymentsBoard();
    });
}

window.openMyPayments = () => {
    window.closeSideMenu();
    const body = document.getElementById('myPaymentsBody');
    body.innerHTML = '';

    let jobKey = null;
    if(currentUser.role === 'superadmin') {
        jobKey = 'aviv';
    } else if(currentUser.job) {
        if(currentUser.job.includes('קלידן')) jobKey = 'keyboard';
        else if(currentUser.job.includes('מתופף')) jobKey = 'drummer';
        else if(currentUser.job.includes('סאונד')) jobKey = 'sound';
        else if(currentUser.job.includes('מנהלת')) jobKey = 'manager';
    }
    
    if(!jobKey) {
        body.innerHTML = '<div class="text-center text-red-400 p-6 font-bold text-lg">לא הוגדר תפקיד במערכת. אנא ודא שעמודת "תפקיד" מלאה.</div>';
        window.openModal('myPaymentsModal');
        return;
    }

    let total = 0;
    let html = '<div class="flex flex-col gap-3">';
    const myPayments = [];
    
    events.forEach(evt => {
        if(evt.payments && evt.payments.staff && evt.payments.staff[jobKey]) {
            const p = evt.payments.staff[jobKey];
            if(p.paid && p.amount > 0 && p.attended !== false) {
                myPayments.push({
                    eventName: evt.eventName || evt.location,
                    date: p.date || evt.date,
                    amount: Number(p.amount),
                    method: p.method || 'לא צוין'
                });
            }
        }
    });

    myPayments.sort((a,b) => new Date(b.date) - new Date(a.date));

    if(myPayments.length === 0) {
        html += '<div class="text-center text-slate-400 p-6 text-xl">טרם התקבלו או הוזנו תשלומים עבורך.</div>';
    } else {
        myPayments.forEach(p => {
            total += p.amount;
            html += `
                <div class="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center shadow-md hover:bg-slate-700 transition">
                    <div>
                        <div class="text-white font-bold text-lg mb-1">${p.eventName}</div>
                        <div class="text-slate-400 text-base"><i class="far fa-calendar-alt ml-1"></i> ${p.date} &nbsp;•&nbsp; <i class="fas fa-money-check-alt ml-1"></i> ${p.method}</div>
                    </div>
                    <div class="text-green-400 font-black text-2xl">${p.amount} ₪</div>
                </div>
            `;
        });
    }
    html += '</div>';

    html = `
        <div class="bg-slate-800 p-5 rounded-xl border border-green-500/50 mb-6 text-center shadow-[0_0_15px_rgba(34,197,94,0.2)]">
            <div class="text-slate-300 font-bold mb-2 text-lg">סך הכל שהתקבל</div>
            <div class="text-5xl font-black text-green-400">${total} ₪</div>
        </div>
        ${html}
    `;

    body.innerHTML = html;
    window.openModal('myPaymentsModal');
}

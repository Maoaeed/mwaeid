// ======= الإعدادات الأساسية =======
let appointments = JSON.parse(localStorage.getItem("appointments")) || [];
let language = localStorage.getItem("language") || "ar";
let translations = {};
let lockEnabled = true;
localStorage.setItem("lockEnabled", "true");
let passCode = localStorage.getItem("passCode") || "1234";
let alertTime = localStorage.getItem("alertTime") || 60;

// ======= تحميل اللغة =======
async function loadLanguage(lang){
    const res = await fetch(`lang_${lang}.json`);
    translations = await res.json();
    document.title = translations.title;
    document.querySelectorAll('[data-key]').forEach(el=>{
        el.textContent = translations[el.getAttribute('data-key')];
    });
}

// ======= الساعة + التاريخ =======
function renderClock(){
    const clock = document.getElementById("clock");
    const dateBox = document.getElementById("date");

    setInterval(()=>{
        const now = new Date();

        // الوقت
        clock.textContent = now.toLocaleTimeString('en-US',{hour12:false});

        // التاريخ
        dateBox.textContent = now.toLocaleDateString('ar-EG',{
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        checkAlerts(now);
    },1000);
}

// ======= جدول المواعيد =======
function renderTable(){
    const tbody = document.querySelector("#appointments-table tbody");
    tbody.innerHTML="";
    appointments.sort((a,b)=> new Date(a.date + " " + a.time)-new Date(b.date + " " + b.time));
    appointments.forEach((app,idx)=>{
        const tr = document.createElement("tr");
        if(new Date(app.date + " " + app.time)<new Date()) tr.classList.add("finished");
        tr.innerHTML=`
            <td>${app.date}</td>
            <td>${app.time}</td>
            <td>${app.place}</td>
            <td>${app.notes}</td>
            <td>
                <button onclick="editAppointment(${idx})">تعديل</button>
                <button onclick="deleteAppointment(${idx})">حذف</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ======= حفظ المواعيد =======
function saveAppointments(){
    localStorage.setItem("appointments",JSON.stringify(appointments));
}

// ======= إضافة موعد =======
function addAppointment(){
    const date=prompt("التاريخ (YYYY-MM-DD):");
    const time=prompt("الوقت (HH:MM):");
    const place=prompt("المكان:");
    const notes=prompt("الملاحظات:");
    appointments.push({date,time,place,notes,alerted:false});
    saveAppointments();
    renderTable();
}

// ======= تعديل موعد =======
function editAppointment(idx){
    const app = appointments[idx];
    const date=prompt("التاريخ:",app.date);
    const time=prompt("الوقت:",app.time);
    const place=prompt("المكان:",app.place);
    const notes=prompt("الملاحظات:",app.notes);
    appointments[idx]={date,time,place,notes,alerted:false};
    saveAppointments();
    renderTable();
}

// ======= حذف موعد =======
function deleteAppointment(idx){
    if(confirm("هل تريد حذف هذا الموعد؟")){
        appointments.splice(idx,1);
        saveAppointments();
        renderTable();
    }
}

// ======= التحقق من القفل =======
function checkLock(){
    if(lockEnabled){
        document.getElementById("lock-screen").classList.remove("hidden");
    }
}

// ======= فتح القفل =======
document.getElementById("unlock-btn").addEventListener("click",()=>{
    const input = document.getElementById("lock-pass").value;
    if(input===passCode){
        document.getElementById("lock-screen").classList.add("hidden");
    } else {
        alert("الرقم السري خاطئ!");
    }
});

// ======= فتح وغلق القائمة الجانبية =======
const menuBtn = document.getElementById("menu-btn");
const sideMenu = document.getElementById("settings-menu");

menuBtn.addEventListener("click", () => {
    sideMenu.classList.toggle("open");
});

// ======= تغيير الرقم السري =======
const passInput = document.createElement("input");
passInput.type = "password";
passInput.placeholder = "تغيير الرقم السري";
sideMenu.appendChild(passInput);

const passBtn = document.createElement("button");
passBtn.textContent = "تغيير الرقم السري";
sideMenu.appendChild(passBtn);

passBtn.addEventListener("click",()=>{
    if(passInput.value){
        passCode = passInput.value;
        localStorage.setItem("passCode", passCode);
        alert("تم تغيير الرقم السري!");
        passInput.value="";
    }
});

// ======= تغيير اللغة =======
document.getElementById("language-select").addEventListener("change",(e)=>{
    language=e.target.value;
    localStorage.setItem("language",language);
    loadLanguage(language);
});

// ======= أحداث الإعدادات =======
document.getElementById("add-appointment").addEventListener("click",addAppointment);
document.getElementById("enable-lock").addEventListener("change",(e)=>{
    lockEnabled=e.target.checked;
    localStorage.setItem("lockEnabled",lockEnabled);
});
document.getElementById("font-size").addEventListener("input",(e)=>{
    document.body.style.fontSize=e.target.value+"px";
});
document.getElementById("font-color").addEventListener("input",(e)=>{
    document.body.style.color=e.target.value;
});
document.getElementById("bg-color").addEventListener("input",(e)=>{
    document.body.style.background=e.target.value;
});
document.getElementById("alert-time").addEventListener("input",(e)=>{
    alertTime=e.target.value;
    localStorage.setItem("alertTime",alertTime);
});

// ======= تصدير واستيراد JSON =======
document.getElementById("export-json").addEventListener("click",()=>{
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appointments));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "appointments.json");
    dlAnchorElem.click();
});
document.getElementById("import-json").addEventListener("change",(e)=>{
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = function(event){
        appointments = JSON.parse(event.target.result);
        saveAppointments();
        renderTable();
    };
    reader.readAsText(file);
});

// ======= تنبيهات =======
function checkAlerts(now){
    appointments.forEach(app=>{
        const appDate = new Date(app.date + " " + app.time);
        const diff = (appDate - now)/60000;
        if(diff>0 && diff<=alertTime && !app.alerted){
            app.alerted=true;
            saveAppointments();
            if(Notification.permission==="granted"){
                new Audio('alert.mp3').play();
                new Notification(`تنبيه: ${app.place} عند ${app.time}`);
            } else if(Notification.permission!=="denied"){
                Notification.requestPermission().then(p=>{
                    if(p==="granted"){
                        new Audio('alert.mp3').play();
                        new Notification(`تنبيه: ${app.place} عند ${app.time}`);
                    }
                });
            }
        }
    });
}

if("Notification" in window){
    Notification.requestPermission();
}

// ======= البدء =======
renderClock();
renderTable();
loadLanguage(language);
checkLock();
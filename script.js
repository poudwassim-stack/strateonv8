/* ═══════════════════════════════════════════
   STRATEON — FINAL
   ═══════════════════════════════════════════ */

const API_KEY = "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";
const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";
const ADMIN_ID = "HE83E83E739";
const ADMIN_PW = "hdueiauduezf";
const HORDE_API = "https://aihorde.net/api/v2";
const HORDE_KEY = "0000000000"; // anonymous

const SYSTEM = `Tu es Strateon, une IA avancée avec du caractère. Tu es directe, intelligente et parfois sarcastique — mais toujours utile.

Ton style :
- Tu tutoies naturellement
- Tu es cash et honnête
- Tu peux avoir de l'humour, de l'ironie fine
- Tu donnes ton avis quand on te le demande
- Tu utilises exactement 2 emojis par réponse, bien placés
- Tu structures bien tes réponses avec des sauts de ligne
- Pour les listes, utilise des tirets (-)
- JAMAIS d'astérisques (* ou **)
- De temps en temps (pas à chaque message, environ 1 fois sur 4), inclus une citation pertinente d'un philosophe, écrivain, scientifique ou figure historique pour illustrer ton propos avec classe. Mets la citation entre guillemets et attribue-la à son auteur.

Longueur :
- Question simple = réponse courte (2-4 phrases)
- Question complexe = réponse développée et bien organisée

Tu ne dois pas :
- Critiquer les religions
- Aider pour des activités illégales
- Être condescendante ou pédante`;

let chatHistory = [], localData = [], streaming = false, user = null, isAdmin = false;
let settings = { particles: true, sounds: false, theme: "red" };
let recognition = null;
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

document.addEventListener("DOMContentLoaded", () => { initParticles(); initVoice(); initEvents(); checkSession(); });

function checkSession() {
    try { const d = JSON.parse(localStorage.getItem("nem_session")); if (d?.pseudo) { user = d; isAdmin = d.isAdmin||false; boot(); return; } } catch {}
    show("auth");
}

// ═══ PARTICLES ═══
function initParticles() {
    const c=$("bg-canvas"), ctx=c.getContext("2d"), pts=[];
    let W,H;
    function resize(){W=c.width=innerWidth;H=c.height=innerHeight;} resize(); addEventListener("resize",resize);
    for(let i=0;i<30;i++) pts.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-0.5)*0.25,vy:(Math.random()-0.5)*0.25,r:Math.random()+0.3});
    (function draw(){
        ctx.clearRect(0,0,W,H);
        if(settings.particles){
            for(const p of pts){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle="rgba(159,18,57,0.2)";ctx.fill();}
            for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=dx*dx+dy*dy;if(d<15000){ctx.beginPath();ctx.strokeStyle=`rgba(159,18,57,${0.03*(1-d/15000)})`;ctx.lineWidth=0.4;ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.stroke();}}
        }
        requestAnimationFrame(draw);
    })();
}

// ═══ VOICE ═══
function initVoice() {
    const SR = window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){$("voice-btn")?.classList.add("hidden");return;}
    recognition=new SR(); recognition.lang="fr-FR"; recognition.continuous=false; recognition.interimResults=false;
    recognition.onresult=e=>{$("input").value=e.results[0][0].transcript;$("input").dispatchEvent(new Event("input"));};
    recognition.onend=()=>$("voice-btn").classList.remove("recording");
    recognition.onerror=()=>$("voice-btn").classList.remove("recording");
    $("voice-btn").addEventListener("click",()=>{
        if($("voice-btn").classList.contains("recording"))recognition.stop();
        else{recognition.start();$("voice-btn").classList.add("recording");}
    });
}

// ═══ EVENTS ═══
function initEvents() {
    $$(".tab").forEach(t=>t.addEventListener("click",()=>{$$(".tab").forEach(x=>x.classList.remove("active"));t.classList.add("active");$$(".form").forEach(f=>f.classList.remove("active"));$(`${t.dataset.tab}-form`).classList.add("active");}));
    $("login-form").addEventListener("submit",login);
    $("register-form").addEventListener("submit",register);
    $("privacy-link")?.addEventListener("click",e=>{e.preventDefault();openModal("privacy");});
    $("open-sidebar").addEventListener("click",()=>{$("sidebar").classList.add("open");$("overlay").classList.add("show");});
    $("close-sidebar").addEventListener("click",closeSB);
    $("overlay").addEventListener("click",closeSB);
    $("new-chat").addEventListener("click",newChat);
    $("btn-clear").addEventListener("click",newChat);
    $("btn-logout").addEventListener("click",logout);
    $("btn-settings").addEventListener("click",()=>{openModal("settings");closeSB();});
    $("btn-privacy").addEventListener("click",()=>{openModal("privacy");closeSB();});
    $("btn-export").addEventListener("click",exportChat);
    $("btn-admin")?.addEventListener("click",()=>{show("admin");renderAdmin();closeSB();});
    $("admin-back")?.addEventListener("click",()=>show("chat"));
    $$(".admin-tab").forEach(t=>t.addEventListener("click",()=>{$$(".admin-tab").forEach(x=>x.classList.remove("active"));t.classList.add("active");renderAdmin(t.dataset.p);}));

    const inp=$("input");
    inp.addEventListener("input",()=>{inp.style.height="auto";inp.style.height=Math.min(inp.scrollHeight,140)+"px";$("char-count").textContent=`${inp.value.length}/4000`;$("send-btn").disabled=!inp.value.trim()||streaming;});
    $("send-btn").addEventListener("click",send);
    inp.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();if(!$("send-btn").disabled)send();}});

    $$(".modal-close").forEach(b=>b.addEventListener("click",()=>b.closest(".modal").classList.remove("show")));
    $$(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)m.classList.remove("show");}));
    document.addEventListener("keydown",e=>{if(e.key==="Escape")$$(".modal.show").forEach(m=>m.classList.remove("show"));});

    $("opt-particles").addEventListener("change",e=>{settings.particles=e.target.checked;saveSets();});
    $("opt-sounds").addEventListener("change",e=>{settings.sounds=e.target.checked;saveSets();});
    $$(".color").forEach(c=>c.addEventListener("click",()=>{$$(".color").forEach(x=>x.classList.remove("active"));c.classList.add("active");settings.theme=c.dataset.c;saveSets();}));
}
function closeSB(){$("sidebar").classList.remove("open");$("overlay").classList.remove("show");}

// ═══ AUTH ═══
function getUsers(){try{return JSON.parse(localStorage.getItem("nem_users")||"[]");}catch{return[];}}
function saveUsers(u){localStorage.setItem("nem_users",JSON.stringify(u));}
function hash(s){let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;return"h"+Math.abs(h).toString(36);}

function login(e){
    e.preventDefault();const id=$("login-email").value.trim(),pw=$("login-password").value;clr("login-error");
    if(id===ADMIN_ID&&pw===ADMIN_PW){user={pseudo:"Admin",email:"admin@sys"};isAdmin=true;localStorage.setItem("nem_session",JSON.stringify({...user,isAdmin:true}));boot();return;}
    const users=getUsers(),u=users.find(x=>x.email===id.toLowerCase());
    if(!u)return err("login-error","Compte introuvable");
    if(u.banned)return err("login-error","Compte suspendu");
    if(u.pass!==hash(pw))return err("login-error","Mot de passe incorrect");
    user={pseudo:u.pseudo,email:u.email};isAdmin=false;localStorage.setItem("nem_session",JSON.stringify(user));boot();
}
function register(e){
    e.preventDefault();const p=$("register-pseudo").value.trim(),em=$("register-email").value.trim().toLowerCase(),pw=$("register-password").value;
    clr("register-error");clr("register-success");
    if(!$("accept-terms").checked)return err("register-error","Accepte les conditions");
    if(p.length<2)return err("register-error","Pseudo trop court");
    if(!em.includes("@"))return err("register-error","Email invalide");
    if(pw.length<6)return err("register-error","Mot de passe trop court");
    const users=getUsers();if(users.find(u=>u.email===em))return err("register-error","Email déjà utilisé");
    users.push({pseudo:p,email:em,pass:hash(pw),date:Date.now(),banned:false});saveUsers(users);
    ok("register-success","Compte créé !");$("register-form").reset();setTimeout(()=>$$(".tab")[0].click(),1000);
}
function logout(){localStorage.removeItem("nem_session");user=null;isAdmin=false;chatHistory=[];localData=[];show("auth");closeSB();}
function err(id,m){$(id).textContent=m;$(id).classList.add("show");}
function ok(id,m){$(id).textContent=m;$(id).classList.add("show");}
function clr(id){$(id).textContent="";$(id).classList.remove("show");}

// ═══ BOOT ═══
function boot(){
    show("boot");const steps=["Connexion...","Chargement...","Prêt."];let i=0;
    const int=setInterval(()=>{$("boot-text").textContent=steps[Math.min(i,steps.length-1)];$("boot-fill").style.width=((i+1)/steps.length*100)+"%";if(++i>steps.length){clearInterval(int);enterChat();}},300);
}

function enterChat(){
    show("chat");loadSets();
    $("user-avatar").textContent=user.pseudo[0].toUpperCase();
    $("user-name").textContent=user.pseudo;
    $("user-email").textContent=user.email;
    if(isAdmin)$("btn-admin").style.display="flex";
    const saved=localStorage.getItem(`nem_c_${user.email}`);
    if(saved){try{localData=JSON.parse(saved);chatHistory=localData.filter(m=>!m.img).map(m=>({role:m.role,content:m.content}));renderMsgs();}catch{reset();showWelcome();}}
    else{reset();showWelcome();}
    $("input").focus();
}
function reset(){chatHistory=[{role:"system",content:SYSTEM}];localData=[{role:"system",content:SYSTEM}];}
function newChat(){reset();saveChat();showWelcome();closeSB();}
function show(n){$$(".screen").forEach(s=>s.classList.remove("active"));$(`${n}-screen`).classList.add("active");}
function openModal(n){$(`${n}-modal`).classList.add("show");}

function showWelcome(){
    $("messages").innerHTML=`<div class="welcome">
        <div class="welcome-avatar">${user.pseudo[0].toUpperCase()}</div>
        <h2>Salut <span class="hl">${esc(user.pseudo)}</span></h2>
        <p>Pose-moi tes questions, demande mon avis, ou dis "génère une image de..." pour créer des visuels.</p>
        <div class="suggestions">
            <button class="sugg-btn" data-q="Donne-moi un conseil du jour">💡 Conseil</button>
            <button class="sugg-btn" data-q="Génère une image de Paris la nuit">🎨 Image</button>
            <button class="sugg-btn" data-q="C'est quoi l'IA en termes simples ?">🤖 IA</button>
            <button class="sugg-btn" data-q="Raconte-moi une blague">😄 Blague</button>
        </div>
    </div>`;
    $$(".sugg-btn").forEach(b=>b.addEventListener("click",()=>{$("input").value=b.dataset.q;send();}));
}

function renderMsgs(){
    $("messages").innerHTML="";let has=false;
    for(const m of localData){if(m.role==="system")continue;if(m.img)addImgMsg(m.content,m.img);else addMsg(m.role==="user"?"user":"ai",m.content);if(m.role==="user")has=true;}
    if(!has)showWelcome();scroll();
}

// ═══ DOM ═══
function addMsg(type,text){
    const d=document.createElement("div");d.className=`msg ${type}`;
    d.innerHTML=`<div class="msg-avatar">${type==="ai"?"S":user.pseudo[0].toUpperCase()}</div>
    <div class="msg-content"><div class="msg-bubble">${type==="user"?esc(text):fmt(text)}</div>
    ${type==="ai"?'<div class="msg-actions"><button class="msg-action" onclick="copyMsg(this)">📋 Copier</button></div>':''}</div>`;
    $("messages").appendChild(d);scroll();return d;
}
function addImgMsg(text,url){
    const d=document.createElement("div");d.className="msg ai";
    d.innerHTML=`<div class="msg-avatar">S</div>
    <div class="msg-content"><div class="msg-bubble">${fmt(text)}</div>
    <img class="msg-image" src="${url}" onclick="viewImg('${url}')" onerror="this.style.display='none'"></div>`;
    $("messages").appendChild(d);scroll();return d;
}
function addThink(){
    const d=document.createElement("div");d.className="msg ai";d.id="think";
    d.innerHTML=`<div class="msg-avatar">S</div><div class="msg-content"><div class="msg-bubble"><div class="thinking"><span></span><span></span><span></span></div></div></div>`;
    $("messages").appendChild(d);scroll();return d;
}

// ═══ SEND ═══
async function send(){
    const text=$("input").value.trim();if(!text||streaming)return;
    document.querySelector(".welcome")?.remove();
    if(/génère.*image|genere.*image|crée.*image|cree.*image|fais.*image|dessine|^\/image|image\s+de\s|photo\s+de\s/i.test(text))await genImg(text);
    else await chat(text);
}

function extractPrompt(t){
    return t.replace(/^\/image\s*/i,"").replace(/(génère|genere|crée|cree|fais|dessine|montre)[- ]?(moi)?[- ]?(une?)?[- ]?(image|dessin|photo|illustration)?[- ]?(de?|du?|d'un?|d'une?)?/gi,"").replace(/^(image|photo)\s+(de\s+)?/gi,"").trim()||t;
}

// ═══ IMAGE — AI Horde (gratuit, distribué, base64) ═══
async function genImg(text){
    streaming=true;$("send-btn").disabled=true;
    localData.push({role:"user",content:text});addMsg("user",text);
    $("input").value="";$("input").style.height="auto";$("char-count").textContent="0/4000";

    const prompt=extractPrompt(text);

    const row=document.createElement("div");row.className="msg ai";
    row.innerHTML=`<div class="msg-avatar">S</div>
    <div class="msg-content">
        <div class="msg-bubble">Génération en cours...</div>
        <div class="img-status"><div class="spinner"></div>Envoi de la demande...</div>
    </div>`;
    $("messages").appendChild(row);scroll();

    const bubble=row.querySelector(".msg-bubble");
    const loader=row.querySelector(".img-status");
    const aiText='Voici ton image !\n\n"'+prompt+'"';

    try {
        // Étape 1 : Soumettre la demande
        const submitRes = await fetch(HORDE_API + "/generate/async", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": HORDE_KEY,
                "Client-Agent": "StrateonChat:1.0:anonymous"
            },
            body: JSON.stringify({
                prompt: prompt,
                params: { width: 512, height: 512, steps: 20, n: 1 },
                nsfw: false,
                censor_nsfw: true,
                r2: false
            })
        });

        const submitData = await submitRes.json();
        if (!submitRes.ok || !submitData.id) throw new Error(submitData.message || "Erreur de soumission");

        const jobId = submitData.id;
        loader.innerHTML = '<div class="spinner"></div>Création en cours...';

        // Étape 2 : Attendre que l'image soit prête (polling silencieux)
        let imgData = null;
        for (let i = 0; i < 90; i++) {
            await new Promise(r => setTimeout(r, 3000));

            const checkRes = await fetch(HORDE_API + "/generate/status/" + jobId, {
                headers: { "Client-Agent": "StrateonChat:1.0:anonymous" }
            });
            const checkData = await checkRes.json();

            if (checkData.done && checkData.generations && checkData.generations.length > 0) {
                imgData = checkData.generations[0];
                break;
            }
        }

        if (!imgData) throw new Error("Timeout");

        // Étape 3 : Afficher l'image (peut être base64 ou URL)
        let imgUrl = imgData.img || "";

        // Si c'est du base64 brut (pas une URL), ajouter le préfixe data URI
        if (imgUrl && !imgUrl.startsWith("http") && !imgUrl.startsWith("data:")) {
            imgUrl = "data:image/webp;base64," + imgUrl;
        }

        if (!imgUrl) throw new Error("Pas d'image reçue");

        loader.remove();
        bubble.innerHTML = fmt(aiText);

        const img = document.createElement("img");
        img.className = "msg-image";
        img.src = imgUrl;
        img.onclick = () => viewImg(imgUrl);
        row.querySelector(".msg-content").appendChild(img);

        localData.push({role:"assistant", content:aiText, img:imgUrl, prompt});
        saveChat();
        if(settings.sounds) beep();

    } catch(e) {
        loader?.remove();
        bubble.textContent = "La génération a échoué (" + e.message + ").";
    } finally {
        streaming = false;
        $("send-btn").disabled = !$("input").value.trim();
        scroll();
    }
}

// ═══ CHAT ═══
async function chat(text){
    streaming=true;$("send-btn").disabled=true;
    chatHistory.push({role:"user",content:text});localData.push({role:"user",content:text});addMsg("user",text);
    $("input").value="";$("input").style.height="auto";$("char-count").textContent="0/4000";
    const th=addThink();
    try{
        const res=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${API_KEY}`},body:JSON.stringify({model:MODEL,messages:chatHistory,temperature:0.7,max_tokens:1024,stream:true})});
        if(!res.ok)throw new Error(`Erreur ${res.status}`);
        th.remove();
        const div=addMsg("ai",""),bubble=div.querySelector(".msg-bubble");div.classList.add("streaming");
        let full="",buffer="";const reader=res.body.getReader(),decoder=new TextDecoder();
        while(true){const{done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split("\n");buffer=lines.pop();for(const line of lines){if(!line.startsWith("data: "))continue;const data=line.slice(6);if(data==="[DONE]")continue;try{const d=JSON.parse(data).choices?.[0]?.delta?.content;if(d){full+=d;bubble.innerHTML=fmt(full);scroll();}}catch{}}}
        div.classList.remove("streaming");bubble.innerHTML=fmt(full);
        chatHistory.push({role:"assistant",content:full});localData.push({role:"assistant",content:full});saveChat();if(settings.sounds)beep();
    }catch(e){th.remove();addMsg("ai",`Erreur: ${e.message}`);}
    finally{streaming=false;$("send-btn").disabled=!$("input").value.trim();}
}

// ═══ UTILS ═══
function esc(s){const d=document.createElement("div");d.textContent=s;return d.innerHTML;}
function fmt(s){let t=esc(s);t=t.replace(/```(\w*)\n?([\s\S]*?)```/g,(_,l,c)=>`<pre><code>${c.trim()}</code></pre>`);t=t.replace(/`([^`]+)`/g,"<code>$1</code>");t=t.replace(/\n/g,"<br>");return t;}
function scroll(){requestAnimationFrame(()=>{$("messages").scrollTop=$("messages").scrollHeight;});}
function saveChat(){if(!user)return;try{localStorage.setItem(`nem_c_${user.email}`,JSON.stringify(localData));}catch{if(localData.length>20){localData=[localData[0],...localData.slice(-15)];chatHistory=[chatHistory[0],...chatHistory.slice(-15)];localStorage.setItem(`nem_c_${user.email}`,JSON.stringify(localData));}}}
function loadSets(){const s=localStorage.getItem("nem_sets");if(s)try{settings={...settings,...JSON.parse(s)};}catch{}$("opt-particles").checked=settings.particles;$("opt-sounds").checked=settings.sounds;$$(".color").forEach(c=>c.classList.toggle("active",c.dataset.c===settings.theme));}
function saveSets(){localStorage.setItem("nem_sets",JSON.stringify(settings));}
function beep(){try{const c=new AudioContext(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=700;g.gain.setValueAtTime(0.04,c.currentTime);g.gain.exponentialRampToValueAtTime(0.01,c.currentTime+0.1);o.start();o.stop(c.currentTime+0.1);}catch{}}

window.copyMsg=function(b){const t=b.closest(".msg-content").querySelector(".msg-bubble").innerText;navigator.clipboard.writeText(t);b.textContent="✓ Copié";setTimeout(()=>b.textContent="📋 Copier",2000);};
window.viewImg=function(url){$("modal-img").src=url;$("download-img").href=url;openModal("image");};

function exportChat(){
    let t=`STRATEON — Export\n${"=".repeat(30)}\n\n`;
    for(const m of localData){if(m.role==="system")continue;t+=`[${m.role==="user"?user.pseudo:"Strateon"}]\n${m.content}\n\n`;}
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([t],{type:"text/plain"}));a.download=`strateon-${new Date().toISOString().slice(0,10)}.txt`;a.click();closeSB();
}

// ═══ ADMIN ═══
function renderAdmin(panel="users"){
    const users=getUsers(),logs=getLogs(),imgs=getImgs();
    $("admin-stats").innerHTML=`<div class="stat"><div class="stat-val">${users.length}</div><div class="stat-label">Utilisateurs</div></div><div class="stat"><div class="stat-val">${logs.length}</div><div class="stat-label">Messages</div></div><div class="stat"><div class="stat-val">${imgs.length}</div><div class="stat-label">Images</div></div>`;
    let h="";
    if(panel==="users")h=`<table class="admin-table"><tr><th>Pseudo</th><th>Email</th><th>Statut</th><th>Action</th></tr>${users.map(u=>`<tr><td>${esc(u.pseudo)}</td><td>${esc(u.email)}</td><td><span class="badge ${u.banned?'ban':'ok'}">${u.banned?'Banni':'Actif'}</span></td><td>${u.banned?`<button class="btn-sm success" onclick="unban('${u.email}')">Débannir</button>`:`<button class="btn-sm danger" onclick="ban('${u.email}')">Bannir</button>`}</td></tr>`).join("")}</table>`;
    else if(panel==="messages"){const ms=logs.filter(l=>l.role==="user").slice(-30).reverse();h=ms.length?ms.map(l=>`<div class="log-item"><div class="log-meta">${esc(l.user)}</div><div class="log-text">${esc(l.content.slice(0,200))}</div></div>`).join(""):"<p style='color:var(--text3)'>Aucun message</p>";}
    else{h=imgs.length?`<div class="img-grid">${imgs.slice(-20).map(i=>`<div class="img-card" onclick="viewImg('${i.url}')"><img src="${i.url}" onerror="this.parentElement.remove()"></div>`).join("")}</div>`:"<p style='color:var(--text3)'>Aucune image</p>";}
    $("admin-content").innerHTML=h;
}
function getLogs(){const l=[];for(const u of getUsers()){const d=localStorage.getItem(`nem_c_${u.email}`);if(d)try{JSON.parse(d).forEach(m=>{if(m.role!=="system")l.push({user:u.pseudo,...m});});}catch{}}return l;}
function getImgs(){const i=[];for(const u of getUsers()){const d=localStorage.getItem(`nem_c_${u.email}`);if(d)try{JSON.parse(d).forEach(m=>{if(m.img)i.push({user:u.pseudo,url:m.img});});}catch{}}return i;}
window.ban=function(e){const u=getUsers(),x=u.find(y=>y.email===e);if(x){x.banned=true;saveUsers(u);renderAdmin("users");}};
window.unban=function(e){const u=getUsers(),x=u.find(y=>y.email===e);if(x){x.banned=false;saveUsers(u);renderAdmin("users");}};

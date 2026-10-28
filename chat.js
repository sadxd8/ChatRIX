import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  collection, doc, getDoc, setDoc, addDoc, query, orderBy, limit,
  onSnapshot, where, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const $ = id => document.getElementById(id);
const messenger = $("messenger");
let me = null, profile = null, activeChatId = null, activePeer = null;
let stopMessages = null, stopSearch = null, searchTimer = null;
const userCache = new Map();

function status(message=""){ $("status").textContent = message; }
function escapeName(value=""){ return value; }
function initials(name="User"){ return name.trim().slice(0,1).toUpperCase() || "U"; }
function makeAvatar(name, photoURL){
  const el = document.createElement("div"); el.className = "avatar";
  if (photoURL) { const img=document.createElement("img"); img.src=photoURL; img.alt=""; el.appendChild(img); }
  else el.textContent=initials(name);
  return el;
}
function addUserRow(user, active=false, subtitle=""){
  const button=document.createElement("button"); button.className="user-row"+(active?" active":"");
  button.appendChild(makeAvatar(user.name || user.username, user.photoURL));
  const info=document.createElement("div"); info.className="user-info";
  const name=document.createElement("div"); name.className="user-name"; name.textContent=user.name || user.username || "ChatRIX user";
  const handle=document.createElement("div"); handle.className="user-handle"; handle.textContent=subtitle || "@"+(user.username || "user");
  info.append(name,handle); button.appendChild(info);
  button.addEventListener("click",()=>openPrivateChat(user));
  return button;
}
function renderUser(user){ userCache.set(user.uid,user); }

onAuthStateChanged(auth, async user=>{
  if(!user){ location.replace("login.html"); return; }
  me=user;
  try{
    const snap=await getDoc(doc(db,"users",user.uid));
    if(!snap.exists()){ status("Your profile is missing. Please sign out and create an account again."); return; }
    profile=snap.data();
    $("myAvatar").replaceWith(makeAvatar(profile.name, profile.photoURL));
    // Give the generated avatar a stable id for later updates.
    const avatar = document.querySelector(".side-foot .avatar"); if(avatar) avatar.id="myAvatar";
    $("myName").textContent=profile.name || "ChatRIX user";
    $("myHandle").textContent="@"+(profile.username || "");
    loadRecentChats();
  }catch(error){ status(error.message); }
});

$("logout").addEventListener("click", async()=>{ await signOut(auth); location.replace("login.html"); });
$("search").addEventListener("input",()=>{
  clearTimeout(searchTimer);
  searchTimer=setTimeout(()=>searchUsers($("search").value.trim().toLowerCase()),250);
});
async function searchUsers(term){
  if(stopSearch){stopSearch();stopSearch=null;}
  $("searchResults").innerHTML="";
  if(!term){ $("searchNote").textContent="Search by username"; return; }
  if(term.length<2){ $("searchNote").textContent="Type at least 2 characters"; return; }
  $("searchNote").textContent="Searching…";
  try{
    // Prefix search on normalized username. Firestore range query.
    const q=query(collection(db,"users"),where("username",">=",term),where("username","<=",term+"\uf8ff"),limit(20));
    const snap=await getDocs(q);
    $("searchResults").innerHTML="";
    let count=0;
    snap.forEach(item=>{
      const user=item.data();
      if(user.uid===me.uid)return;
      renderUser(user); count++;
      $("searchResults").appendChild(addUserRow(user,false,"@"+user.username));
    });
    $("searchNote").textContent=count?`${count} result${count===1?"":"s"}`:"No users found. Try a username.";
  }catch(error){ $("searchNote").textContent="Search failed: "+error.message; }
}

async function openPrivateChat(peer){
  if(!me || peer.uid===me.uid)return;
  const members=[me.uid,peer.uid].sort();
  const chatId=members.join("_");
  try{
    const chatRef=doc(db,"chats",chatId);
    const snap=await getDoc(chatRef);
    if(!snap.exists()) await setDoc(chatRef,{members, type:"private", createdAt:serverTimestamp(), updatedAt:serverTimestamp()});
    activePeer=peer;
    await openChat(chatId,peer.name || peer.username, "@"+peer.username, peer.photoURL);
    messenger.classList.add("chat-open");
  }catch(error){status("Could not open chat: "+error.message);}
}
async function openChat(chatId,title,subtitle,photoURL){
  activeChatId=chatId;
  if(stopMessages){stopMessages();stopMessages=null;}
  $("chatTitle").textContent=title;
  $("chatSubtitle").textContent=subtitle || "Group conversation";
  const headAvatar=$("chatAvatar");
  headAvatar.innerHTML="";
  if(photoURL){const img=document.createElement("img");img.src=photoURL;img.alt="";headAvatar.appendChild(img);}
  else headAvatar.textContent=initials(title);
  $("messages").innerHTML="";
  $("welcome").classList.add("hidden");
  $("composerArea").classList.remove("hidden");
  $("messageInput").focus();
  const q=query(collection(db,"chats",chatId,"messages"),orderBy("createdAt","asc"),limit(200));
  stopMessages=onSnapshot(q,snapshot=>{
    $("messages").innerHTML="";
    snapshot.forEach(item=>{
      const m=item.data();
      const row=document.createElement("div"); row.className="message"+(m.senderId===me.uid?" mine":"");
      const meta=document.createElement("div");meta.className="message-meta";
      meta.textContent=(m.senderId===me.uid?"You":(activePeer?.name || "User"))+" · "+(m.createdAt?.toDate?m.createdAt.toDate().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"now");
      const bubble=document.createElement("div");bubble.className="bubble";
      if(m.text){const txt=document.createElement("div");txt.textContent=m.text;bubble.appendChild(txt);}
      if(m.imageUrl){
        const img=document.createElement("img");img.src=m.imageUrl;img.alt="Image shared in ChatRIX";img.loading="lazy";img.referrerPolicy="no-referrer";bubble.appendChild(img);
      }
      row.append(meta,bubble);$("messages").appendChild(row);
    });
    $("messages").scrollTop=$("messages").scrollHeight;
  },error=>status("Messages: "+error.message));
}
$("backBtn").addEventListener("click",()=>messenger.classList.remove("chat-open"));
$("messageForm").addEventListener("submit",async event=>{
  event.preventDefault();
  const text=$("messageInput").value.trim();
  if(!text||!activeChatId)return;
  $("sendBtn").disabled=true;
  try{
    await addDoc(collection(db,"chats",activeChatId,"messages"),{
      senderId:me.uid,text,createdAt:serverTimestamp()
    });
    $("messageInput").value="";status("");
  }catch(error){status("Send failed: "+error.message);}
  finally{$("sendBtn").disabled=false;}
});
$("imageInput").addEventListener("change",async()=>{
  const file=$("imageInput").files[0];
  if(!file)return;
  if(!activeChatId){status("Open a conversation first.");$("imageInput").value="";return;}
  if(!["image/jpeg","image/png","image/webp","image/gif"].includes(file.type)){status("Choose a JPG, PNG, WEBP or GIF image.");$("imageInput").value="";return;}
  if(file.size>5*1024*1024){status("Images must be 5 MB or smaller.");$("imageInput").value="";return;}
  const key=localStorage.getItem("chatrix_imgbb_key") || "";
  if(!key){status("Add your ImgBB key in chat.js or set chatrix_imgbb_key in localStorage for testing.");$("imageInput").value="";return;}
  $("imageBtn").disabled=true;status("Uploading image…");
  try{
    const form=new FormData();form.append("image",file);
    const response=await fetch("https://api.imgbb.com/1/upload?key="+encodeURIComponent(key),{method:"POST",body:form});
    const result=await response.json();
    if(!response.ok||!result.success)throw new Error("ImgBB upload failed. Check the API key and quota.");
    await addDoc(collection(db,"chats",activeChatId,"messages"),{senderId:me.uid,imageUrl:result.data.url,createdAt:serverTimestamp()});
    status("Image sent.");
  }catch(error){status(error.message);}
  finally{$("imageBtn").disabled=false;$("imageInput").value="";}
});

async function loadRecentChats(){
  // Small MVP: shows recent conversations where this UID appears in members.
  try{
    const q=query(collection(db,"chats"),where("members","array-contains",me.uid),limit(30));
    const snap=await getDocs(q);
    const rows=[];
    for(const item of snap.docs){
      const data=item.data();
      const otherId=(data.members||[]).find(id=>id!==me.uid);
      if(!otherId)continue;
      let other=userCache.get(otherId);
      if(!other){const us=await getDoc(doc(db,"users",otherId));if(us.exists()){other=us.data();renderUser(other);}}
      if(other)rows.push({other,updatedAt:data.updatedAt});
    }
    rows.sort((a,b)=>(b.updatedAt?.seconds||0)-(a.updatedAt?.seconds||0));
    $("recentChats").innerHTML="";
    rows.forEach(row=>$("recentChats").appendChild(addUserRow(row.other,false,"@"+row.other.username)));
    if(!rows.length)$("recentChats").innerHTML='<div class="search-note">Search for someone to start chatting.</div>';
  }catch(error){$("recentChats").textContent="Recent chats unavailable: "+error.message;}
}

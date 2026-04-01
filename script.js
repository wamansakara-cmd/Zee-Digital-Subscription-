// 1. CONFIG (PASTE YOUR FIREBASE DATA HERE)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-app.firebaseapp.com",
    projectId: "your-app-id",
    storageBucket: "your-app.appspot.com",
    messagingSenderId: "...",
    appId: "..."
};

// 2. INIT
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
const Pi = window.Pi;
Pi.init({ version: "2.0", sandbox: true });

let user = "Guest";
let items = [];

// 3. AUTH & LOAD
async function start() {
    try {
        const res = await Pi.authenticate(['username'], (p) => console.log(p));
        user = res.user.username;
        document.getElementById('user-display').innerText = `👤 ${user}`;
    } catch (e) { console.log("Standard Browser Mode"); }
    
    db.collection("listings").orderBy("createdAt", "desc").onSnapshot(snap => {
        items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        render(items);
        renderDash();
    });
}

// 4. MARKET LOGIC
function render(data) {
    const grid = document.getElementById('app-grid');
    grid.innerHTML = data.map(i => `
        <div class="card">
            <img src="${i.img}" class="card-img" onerror="this.src='https://via.placeholder.com/300x180?text=Az+Zaman'">
            <div class="card-content">
                <small>${i.type.toUpperCase()}</small>
                <h3 style="margin:5px 0">${i.title}</h3>
                <div class="price">${i.price} Pi</div>
                <button class="btn-buy" onclick="buy('${i.price}', '${i.title}')">Pay with Pi</button>
                <button class="btn-chat" onclick="contact('${i.seller}')">Contact Seller (@${i.seller})</button>
            </div>
        </div>
    `).join('');
}

// 5. SELLING (GALLERY UPLOAD)
function preview(e) {
    const r = new FileReader();
    r.onload = () => {
        const o = document.getElementById('pPreview');
        o.src = r.result; o.style.display = 'block';
    };
    r.readAsDataURL(e.target.files[0]);
}

document.getElementById('postForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const file = document.getElementById('pFile').files[0];
    btn.disabled = true; btn.innerText = "Uploading...";

    try {
        const ref = storage.ref(`items/${Date.now()}_${file.name}`);
        const snap = await ref.put(file);
        const url = await snap.ref.getDownloadURL();

        await db.collection("listings").add({
            title: document.getElementById('pTitle').value,
            price: parseFloat(document.getElementById('pPrice').value),
            type: document.getElementById('pType').value,
            desc: document.getElementById('pDesc').value,
            img: url,
            seller: user,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("Item Listed Successfully!");
        toggleModal('postModal');
        e.target.reset();
        document.getElementById('pPreview').style.display = 'none';
    } catch (err) { alert(err.message); }
    btn.disabled = false; btn.innerText = "Publish to Market";
});

// 6. BUYING & CHAT
async function buy(amt, name) {
    try {
        await Pi.createPayment({ amount: parseFloat(amt), memo: `Buy ${name}`, metadata: {item: name} }, 
        { onReadyForServerApproval: (id) => {}, onReadyForServerCompletion: (id, tx) => alert("Payment Confirmed!"), onCancel: (id) => {}, onError: (e) => {} });
    } catch (e) { alert("Please use the Pi Browser for payments."); }
}

function contact(seller) {
    // This uses the official Pi Network "Direct Message" link format
    window.location.href = `https://pichat.com/chat/${seller}`;
}

// UI Helpers
function toggleModal(id) {
    const m = document.getElementById(id);
    m.style.display = m.style.display === "block" ? "none" : "block";
}

function handleSearch() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    render(items.filter(i => i.title.toLowerCase().includes(q)));
}

function filterItems(t) {
    render(t === 'all' ? items : items.filter(i => i.type === t));
}

start();

// =======================
// 🔐 AUTHENTIFICATION
// =======================

let dictionary = [];

// Charger le dictionnaire
async function loadDictionary() {
    if (dictionary.length > 0) return;

    try {
        let response = await fetch("passwords.txt");
        let text = await response.text();

        dictionary = text.split("\n")
            .map(p => p.trim())
            .filter(p => p !== "");

        console.log("Dictionnaire chargé :", dictionary.length, "mots");
    } catch (error) {
        console.error(error);
        alert("Erreur chargement du dictionnaire !");
    }
}

// Vérifier mot de passe fort
function isStrongPassword(password) {
    const minLength = 8;

    const hasUpper   = /[A-Z]/.test(password);
    const hasLower   = /[a-z]/.test(password);
    const hasNumber  = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    return password.length >= minLength &&
           hasUpper && hasLower && hasNumber && hasSpecial;
}

// LOGIN
async function login() {
    const user  = document.getElementById("username").value.trim();
    const pass  = document.getElementById("password").value.trim();
    const error = document.getElementById("error");

    error.innerText = "";

    if (!user || !pass) {
        error.innerText = "Veuillez remplir tous les champs.";
        return;
    }

    await loadDictionary();

    // ❌ Mot de passe dans le dictionnaire
    if (dictionary.includes(pass)) {
        error.innerText = "Mot de passe trop faible (présent dans le dictionnaire).";
        return;
    }

    // ❌ Mot de passe faible
    if (!isStrongPassword(pass)) {
        error.innerText = "Mot de passe trop faible (min. 8 caractères, majuscule, minuscule, chiffre, caractère spécial).";
        return;
    }

    // ✅ OK
    localStorage.setItem("auth", "true");
    localStorage.setItem("user", user);
    localStorage.setItem("targetPassword", pass);

    window.location.href = "simulateur.html";
}

// LOGOUT
function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

// Protection page simulateur
if (window.location.pathname.toLowerCase().includes("simulateur.html")) {
    if (localStorage.getItem("auth") !== "true") {
        window.location.href = "index.html";
    }
}

// =======================
// ⚔️ SIMULATION ATTAQUE
// =======================

let interval     = null;
let count        = 0;
let index        = 0;
let blocked      = false;
let captchaAnswer = null;
let target       = null;
let attackFailed = false;

// =======================
// 🧾 LOG
// =======================

function logEvent(message) {
    let log = document.getElementById("log");
    if (!log) return;

    let time = new Date().toLocaleTimeString();
    log.value += `[${time}] ${message}\n`;
    log.scrollTop = log.scrollHeight;
}

// =======================
// ▶️ START
// =======================

function startAttack() {

    // ⛔ Bloqué après captcha échoué
    if (attackFailed) {
        logEvent("⛔ Attaque bloquée — faites Reset avant de recommencer.");
        return;
    }

    if (interval) {
        logEvent("⚠️ Attaque déjà en cours.");
        return;
    }

    if (dictionary.length === 0) {
        alert("Dictionnaire non chargé !");
        return;
    }

    // Lire la cible depuis le champ de la page
    const targetField = document.getElementById("targetPassword");
    target = targetField ? targetField.value.trim() : localStorage.getItem("targetPassword");

    if (!target) {
        alert("Veuillez entrer un mot de passe cible.");
        return;
    }

    blocked = false;

    document.getElementById("status").innerText = "En cours";
    logEvent("🚀 Démarrage de l'attaque...");

    interval = setInterval(() => {

        if (blocked) return;

        // Fin du dictionnaire
        if (index >= dictionary.length) {
            document.getElementById("status").innerText = "Échec";
            logEvent("❌ Mot de passe non trouvé dans le dictionnaire.");
            stopAttack();
            return;
        }

        let current = dictionary[index];
        index++;
        count++;

        document.getElementById("currentTry").innerText = current;
        document.getElementById("count").innerText = count;

        logEvent(`Tentative ${count} : ${current}`);

        // ✅ Succès
        if (current === target) {
            document.getElementById("status").innerText = "Succès !";
            logEvent(`✅ Mot de passe trouvé : "${current}" (tentative n°${count})`);
            stopAttack();
            return;
        }

        // Vérifier les contre-mesures
        checkSecurity();

    }, 500);
}

// =======================
// ⏹ STOP
// =======================

function stopAttack() {
    clearInterval(interval);
    interval = null;
    logEvent("⏹ Attaque stoppée.");
}

// =======================
// 🔄 RESET
// =======================

function resetAttack() {

    stopAttack();

    count        = 0;
    index        = 0;
    blocked      = false;
    attackFailed = false;

    document.getElementById("count").innerText      = 0;
    document.getElementById("currentTry").innerText = "-";
    document.getElementById("status").innerText     = "Prêt";
    document.getElementById("log").value            = "";

    logEvent("🔄 Réinitialisation de l'attaque.");
}

// =======================
// 🛡️ CONTRE-MESURES
// =======================

function checkSecurity() {

    // 🔒 Limite de tentatives
    if (document.getElementById("limit").checked && count >= 10) {
        blocked = true;
        document.getElementById("status").innerText = "Bloqué";
        logEvent("🔒 Blocage : trop de tentatives (limite = 10).");
        stopAttack();
        return;
    }

    // ⏱️ Temporisation
    if (document.getElementById("delay").checked && count % 5 === 0) {
        blocked = true;
        document.getElementById("status").innerText = "Pause";
        logEvent("⏱️ Temporisation de 3 secondes...");

        setTimeout(() => {
            blocked = false;
            document.getElementById("status").innerText = "En cours";
            logEvent("▶️ Reprise de l'attaque.");
        }, 3000);
    }

    // 🤖 Captcha
    if (document.getElementById("captcha").checked && count % 7 === 0) {

        clearInterval(interval);
        interval = null;
        blocked = true;

        document.getElementById("status").innerText = "Captcha";
        logEvent("🤖 Vérification captcha requise...");

        // Générer la question aléatoire
        const a = Math.floor(Math.random() * 50) + 1;
        const b = Math.floor(Math.random() * 50) + 1;
        const ops = ["+", "-", "*"];
        const op = ops[Math.floor(Math.random() * ops.length)];

        if (op === "+") captchaAnswer = a + b;
        if (op === "-") captchaAnswer = a - b;
        if (op === "*") captchaAnswer = a * b;

        document.getElementById("captchaQuestion").innerText = `Combien font ${a} ${op} ${b} ?`;
        document.getElementById("captchaInput").value = "";
        document.getElementById("captchaError").innerText = "";
        document.getElementById("captchaBox").style.display = "flex";
    }
}

// =======================
// 🤖 VALIDATION CAPTCHA
// =======================

function validateCaptcha() {
    const userAnswer = parseInt(document.getElementById("captchaInput").value);

    if (userAnswer === captchaAnswer) {

        // ✅ Bonne réponse
        document.getElementById("captchaBox").style.display = "none";
        document.getElementById("captchaError").innerText = "";
        blocked = false;
        logEvent("✅ Captcha validé — reprise de l'attaque.");
        document.getElementById("status").innerText = "En cours";

        // Relancer l'intervalle
        interval = setInterval(() => {
            if (blocked) return;

            if (index >= dictionary.length) {
                document.getElementById("status").innerText = "Échec";
                logEvent("❌ Mot de passe non trouvé dans le dictionnaire.");
                stopAttack();
                return;
            }

            let current = dictionary[index];
            index++;
            count++;

            document.getElementById("currentTry").innerText = current;
            document.getElementById("count").innerText = count;
            logEvent(`Tentative ${count} : ${current}`);

            if (current === target) {
                document.getElementById("status").innerText = "Succès !";
                logEvent(`✅ Mot de passe trouvé : "${current}" (tentative n°${count})`);
                stopAttack();
                return;
            }

            checkSecurity();
        }, 500);

    } else {

        // ❌ Mauvaise réponse
        attackFailed = true;
        document.getElementById("captchaError").innerText = "❌ Mauvaise réponse, attaque stoppée.";
        logEvent("❌ Captcha échoué — attaque stoppée. Faites Reset pour recommencer.");
        document.getElementById("captchaBox").style.display = "none";
        document.getElementById("status").innerText = "Bloqué";
        stopAttack();
    }
}

// =======================
// 📋 COPY LOG
// =======================

function copyLog() {
    let log = document.getElementById("log");
    if (!log) return;

    log.select();
    document.execCommand("copy");

    alert("Log copié dans le presse-papier !");
}

// =======================
// 👤 INIT PAGE
// =======================

window.onload = async function () {

    await loadDictionary();

    let user = localStorage.getItem("user");
    let userSpan = document.getElementById("user");
    if (user && userSpan) {
        userSpan.innerText = "👤 " + user;
    }
};
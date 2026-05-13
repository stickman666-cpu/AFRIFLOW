const countries = {
  ci: { label: "Cote d'Ivoire", currency: "XOF", eurRate: 655, localFee: 0.024 },
  sn: { label: "Senegal", currency: "XOF", eurRate: 655, localFee: 0.024 },
  cm: { label: "Cameroun", currency: "XAF", eurRate: 655, localFee: 0.026 },
  gh: { label: "Ghana", currency: "GHS", eurRate: 16.1, localFee: 0.022 },
  ng: { label: "Nigeria", currency: "NGN", eurRate: 1715, localFee: 0.021 }
};

const sourceToEur = {
  EUR: 1,
  XOF: 1 / 655,
  GHS: 1 / 16.1,
  NGN: 1 / 1715
};

const zeroWallets = {
  EUR: 0,
  XOF: 0,
  GHS: 0,
  NGN: 0
};

const state = {
  registered: localStorage.getItem("afriflow_registered") === "true",
  user: JSON.parse(localStorage.getItem("afriflow_user") || "null"),
  wallets: JSON.parse(localStorage.getItem("afriflow_wallets") || JSON.stringify(zeroWallets))
};

const apiBaseUrl = "http://localhost:4000/api";

const formatMoney = (value, currency) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "EUR" ? 2 : 0
  }).format(value);
};

const calculateTransfer = (amount, sourceCurrency, destinationKey) => {
  const destination = countries[destinationKey] || countries.ci;
  const amountValue = Number(amount) || 0;
  const amountInEur = amountValue * (sourceToEur[sourceCurrency] || 1);
  const feeInSource = Math.max(
    amountValue * destination.localFee,
    sourceCurrency === "EUR" ? 2.5 : amountValue * 0.008
  );
  const feeInEur = feeInSource * (sourceToEur[sourceCurrency] || 1);
  const received = Math.max(amountInEur - feeInEur, 0) * destination.eurRate;

  return {
    destination,
    feeText: formatMoney(feeInSource, sourceCurrency),
    rateText: `1 EUR = ${new Intl.NumberFormat("fr-FR").format(destination.eurRate)} ${destination.currency}`,
    receivedText: formatMoney(received, destination.currency)
  };
};

const showToast = (message) => {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 3200);
};

const requireRegistration = (targetRoute) => {
  if (state.registered) return true;
  showToast("Inscription obligatoire avant d'utiliser la simulation, les wallets ou les transferts.");
  setRoute("register");
  return false;
};

const updateAuthUi = () => {
  document.body.classList.toggle("is-registered", state.registered);
  document.querySelectorAll("[data-user-name]").forEach((node) => {
    node.textContent = state.user?.fullName || "Nouveau client";
  });
  document.querySelectorAll("[data-auth-status]").forEach((node) => {
    node.textContent = state.registered ? "Compte actif - wallets a 0" : "Inscription requise";
  });
  document.querySelectorAll("[data-requires-auth]").forEach((node) => {
    node.classList.toggle("locked", !state.registered);
  });
};

const updateWalletUi = () => {
  const total = state.wallets.EUR + state.wallets.XOF / 655 + state.wallets.GHS / 16.1 + state.wallets.NGN / 1715;
  const totalNode = document.querySelector("#balanceTotal");
  if (totalNode) totalNode.textContent = formatMoney(total, "EUR");

  Object.entries(state.wallets).forEach(([currency, balance]) => {
    const node = document.querySelector(`[data-wallet="${currency}"]`);
    if (node) node.textContent = formatMoney(balance, currency);
  });
};

const updateSimulator = () => {
  if (!state.registered) {
    document.querySelector("#rateText").textContent = "Inscription requise";
    document.querySelector("#feeText").textContent = "--";
    document.querySelector("#receivedText").textContent = "--";
    return;
  }

  const result = calculateTransfer(
    document.querySelector("#sendAmount").value,
    document.querySelector("#sourceCurrency").value,
    document.querySelector("#destinationCountry").value
  );
  document.querySelector("#rateText").textContent = result.rateText;
  document.querySelector("#feeText").textContent = result.feeText;
  document.querySelector("#receivedText").textContent = result.receivedText;
};

const updateTransactionSummary = () => {
  if (!state.registered) return;
  const countryMap = { ci: "ci", sn: "sn", gh: "gh", ng: "ng" };
  const result = calculateTransfer(
    document.querySelector("#txAmount").value,
    document.querySelector("#txCurrency").value,
    countryMap[document.querySelector("#txCountry").value] || "ci"
  );
  document.querySelector("#txRate").textContent = result.rateText;
  document.querySelector("#txFee").textContent = result.feeText;
  document.querySelector("#txReceived").textContent = result.receivedText;
  document.querySelector("#summaryFee").textContent = result.feeText;
  document.querySelector("#summaryReceived").textContent = result.receivedText;
  document.querySelector("#summaryRecipient").textContent = document.querySelector("#recipientName").value || "Beneficiaire";
};

const setRoute = (route) => {
  const protectedRoutes = ["dashboard", "transaction", "admin"];
  if (protectedRoutes.includes(route) && !requireRegistration(route)) return;

  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === route);
  });
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.classList.toggle("active", button.dataset.route === route);
  });
  history.replaceState(null, "", `#${route}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
};

let stepIndex = 0;
const setStep = (nextIndex) => {
  stepIndex = Math.max(0, Math.min(3, nextIndex));
  document.querySelectorAll(".wizard-step").forEach((step) => {
    step.classList.toggle("active", Number(step.dataset.step) === stepIndex);
  });
  document.querySelectorAll(".step").forEach((step, index) => {
    step.classList.toggle("active", index <= stepIndex);
  });
  document.querySelector("#prevStep").disabled = stepIndex === 0;
  document.querySelector("#nextStep").textContent = stepIndex === 3 ? "Confirmer le transfert" : "Continuer";
  updateTransactionSummary();
};

const saveRegistrationLocally = (payload) => {
  state.registered = true;
  state.user = payload;
  state.wallets = { ...zeroWallets };
  localStorage.setItem("afriflow_registered", "true");
  localStorage.setItem("afriflow_user", JSON.stringify(payload));
  localStorage.setItem("afriflow_wallets", JSON.stringify(state.wallets));
  updateAuthUi();
  updateWalletUi();
  updateSimulator();
};

const registerUser = async () => {
  const payload = {
    fullName: document.querySelector("#registerName").value.trim(),
    phone: document.querySelector("#registerPhone").value.trim(),
    country: document.querySelector("#registerCountry").value,
    otp: [...document.querySelectorAll(".register-otp")].map((input) => input.value).join(""),
    kycDocumentName: document.querySelector("#registerKyc").files[0]?.name || "document-demo.pdf"
  };

  if (!payload.fullName || !payload.phone || payload.otp.length < 4) {
    showToast("Renseigne le nom, le telephone et le code OTP avant de continuer.");
    return;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      saveRegistrationLocally(data.user);
      showToast("Inscription creee dans PostgreSQL. Tous les soldes commencent a zero.");
    } else {
      throw new Error("API indisponible");
    }
  } catch (error) {
    saveRegistrationLocally(payload);
    showToast("Mode demo actif : inscription locale creee. Lance le backend pour PostgreSQL.");
  }

  setRoute("dashboard");
};

document.querySelectorAll("[data-route]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    setRoute(button.dataset.route);
  });
});

document.querySelectorAll("[data-toast]").forEach((button) => {
  button.addEventListener("click", () => showToast(button.dataset.toast));
});

document.querySelector("#registerSubmit").addEventListener("click", registerUser);
document.querySelector("#logoutDemo").addEventListener("click", () => {
  localStorage.removeItem("afriflow_registered");
  localStorage.removeItem("afriflow_user");
  localStorage.removeItem("afriflow_wallets");
  state.registered = false;
  state.user = null;
  state.wallets = { ...zeroWallets };
  updateAuthUi();
  updateWalletUi();
  updateSimulator();
  showToast("Session remise a zero. Une nouvelle inscription est obligatoire.");
  setRoute("register");
});

["#sendAmount", "#sourceCurrency", "#destinationCountry"].forEach((selector) => {
  document.querySelector(selector).addEventListener("input", () => {
    if (requireRegistration("landing")) updateSimulator();
  });
});

["#txAmount", "#txCurrency", "#txCountry", "#recipientName"].forEach((selector) => {
  document.querySelector(selector).addEventListener("input", updateTransactionSummary);
});

document.querySelector("#prevStep").addEventListener("click", () => setStep(stepIndex - 1));
document.querySelector("#nextStep").addEventListener("click", () => {
  if (!requireRegistration("transaction")) return;
  if (stepIndex === 3) {
    showToast("Transfert enregistre en simulation : le debit reel dependra du backend et du solde disponible.");
    setRoute("dashboard");
    setStep(0);
    return;
  }
  setStep(stepIndex + 1);
});

const initialRoute = location.hash.replace("#", "") || (state.registered ? "landing" : "register");
updateAuthUi();
updateWalletUi();
updateSimulator();
setStep(0);
setRoute(document.getElementById(initialRoute) ? initialRoute : "register");
async function sinscrire() {
    const nouvelUtilisateur = {
        nom: "stickman",
        email: "jean@gemail.com"
    };

    const response = await fetch('http://localhost:3000/utilisateurs', {
        method: 'POST', // On envoie des données
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(nouvelUtilisateur) // On transforme l'objet en texte
    });

    const resultat = await response.json();
    console.log("Réponse de la base de données :", resultat);
}
async function chargerDonneesBanque() {
    try {
        // On appelle ton serveur sur la route qu'on vient de tester
        const response = await fetch('http://localhost:3000/utilisateurs');
        const utilisateurs = await response.json();

        // Si tu as un élément dans ton HTML pour afficher le solde
        if (utilisateurs.length > 0) {
            const premierUtilisateur = utilisateurs[0];
            
            // Exemple : si tu as un ID "solde-montant" dans ton HTML
            const soldeElement = document.getElementById('solde-montant');
            if (soldeElement) {
                soldeElement.innerText = `${premierUtilisateur.solde} XOF`;
            }
            
            console.log("Données chargées pour :", premierUtilisateur.nom);
        }
    } catch (erreur) {
        console.error("Erreur lors du chargement :", erreur);
    }
}

// Appeler la fonction au chargement de la page
window.onload = chargerDonneesBanque;

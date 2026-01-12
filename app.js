// =======================================
// Merchant Form Frontend (Azure Static Web App)
// =======================================

(() => {
  "use strict";

  // ---------------------------
  // DOM helper
  // ---------------------------
  const $ = (id) => document.getElementById(id);

  // ---------------------------
  // CONFIG
  // ---------------------------
  const API_URL =
    "https://merchant-form-api-ashir-egb2cqaze3d3bucy.canadacentral-01.azurewebsites.net/api/submitMerchant";

  const DEFAULT_NOTIFY_EMAIL_FALLBACK = "ez2getin@hotmail.com";
  const FROM_DISPLAY = "noreply@shift4.com";
  const INCLUDE_SIGNATURE = true;

  // ---------------------------
  // CONTEXT (Injected via index.html)
  // ---------------------------
  const CONTEXT =
    window.APP_CONTEXT && typeof window.APP_CONTEXT === "object"
      ? window.APP_CONTEXT
      : {};

  const SIGNED_IN_EMAIL = (CONTEXT.signedInEmail || "").trim();
  const DEFAULT_NOTIFY_EMAIL = (CONTEXT.notifyEmail || DEFAULT_NOTIFY_EMAIL_FALLBACK).trim();

  // ---------------------------
  // ELEMENTS
  // ---------------------------
  const userEmailInput = $("userEmail");
  const notifyEmailInput = $("notifyEmail");

  const merchantDba = $("merchantDba");
  const siteCode = $("siteCode");
  const mid = $("e2eMid");
  const serial = $("serialNumber");
  const business = $("businessAddress");
  const contactFirst = $("contactFirstName");
  const contactLast = $("contactLastName");
  const contactPhone = $("contactPhone");
  const pmsPos = $("pmsPos");

  const subjectInput = $("emailSubject");
  const bodyDiv = $("emailBodyDiv");

  const toList = $("toList");
  const addToBtn = $("addToBtn");
  const previewBtn = $("previewBtn");

  // ---------------------------
  // STATE
  // ---------------------------
  let isSubmitting = false;

  // ---------------------------
  // SAFE HELPERS
  // ---------------------------
  const esc = (s) =>
    String(s || "").replace(/[&<>"']/g, (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
    );

  const uuid = () => {
    try {
      return crypto.randomUUID();
    } catch {
      return Date.now() + "-" + Math.random().toString(36).slice(2);
    }
  };

  function setReadonlyValue(el, value) {
    if (!el) return;
    el.value = value || "";
  }

  // ---------------------------
  // RECIPIENT UI
  // ---------------------------
  function getRecipientInputs() {
    return Array.from(toList.querySelectorAll("input.email-to"));
  }

  function getRecipientEmails() {
    return getRecipientInputs()
      .map((i) => (i.value || "").trim())
      .filter(Boolean);
  }

  function isValidEmail(v) {
    if (!v) return false;
    v = v.trim();
    if (v.length > 254) return false;
    const basic = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!basic.test(v)) return false;
    const [local, domain] = v.split("@");
    if (!local || !domain) return false;
    if (local.length > 64) return false;
    if (/\.\./.test(local) || /\.\./.test(domain)) return false;
    const labels = domain.split(".");
    if (labels.some((l) => !l || l.length > 63 || l.startsWith("-") || l.endsWith("-"))) return false;
    return true;
  }

  function addRecipientField(prefill = "") {
    const row = document.createElement("div");
    row.style.display = "grid";
    row.style.gridTemplateColumns = "1fr auto";
    row.style.gap = "8px";
    row.style.marginTop = "8px";

    const input = document.createElement("input");
    input.type = "email";
    input.className = "input email-to";
    input.placeholder = "another@merchant.com";
    input.value = prefill;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "×";
    removeBtn.style.cssText =
      "padding:0 12px;border:1px solid #d1d5db;background:#fff;border-radius:8px;font-size:18px;cursor:pointer;";
    removeBtn.addEventListener("click", () => row.remove());

    row.appendChild(input);
    row.appendChild(removeBtn);
    toList.appendChild(row);
  }

  function ensureAtLeastOneRecipient() {
    if (getRecipientInputs().length === 0) addRecipientField("");
  }

  // ---------------------------
  // SUBJECT
  // ---------------------------
  function buildSubject() {
    const parts = [];
    if (merchantDba.value) parts.push(merchantDba.value.trim());
    if (siteCode.value) parts.push(siteCode.value.trim());
    if (mid.value) parts.push("MID " + mid.value.trim());
    if (serial.value) parts.push("SN " + serial.value.trim());
    return parts.length ? "Radisson Boarding — " + parts.join(" | ") : "Radisson Boarding";
  }

  // ---------------------------
  // EMAIL BODY
  // ---------------------------
  function makeSignatureBlockHTML() {
    return `
      <div style="text-align:center;margin-top:16px;">
        <img src="/assets/logo.png" alt="Shift4" style="width:96px;margin-bottom:8px;" />
        <div style="font-weight:700;">+1-888-276-2108</div>
        <div>©2025 Shift4. All rights reserved.</div>
        <div>Shift4 is a registered ISO/MSP of Citizens Bank, N.A., Providence, RI</div>
      </div>
    `;
  }

  function buildEmailBodyHTML() {
    const fullName = [contactFirst.value, contactLast.value].filter(Boolean).join(" ");

    const rows = [
      ["Merchant DBA Name", merchantDba.value],
      ["Radisson Site Code", siteCode.value],
      ["Shift4 E2E MID", mid.value],
      ["Shift4 Serial Number", serial.value],
      ["Business Address", business.value],
      ["Contact Phone", contactPhone.value],
      ["PMS/POS", pmsPos.value]
    ];

    return `
      <div style="background:#FFF3CD;border:1px solid #FFEEBA;border-radius:8px;padding:12px;font-weight:700;">
        This is to inform you that a conversion to Shift4 Gateway Only Services has been submitted.
      </div>

      <p>Hi <strong>${esc(fullName)}</strong>,</p>

      ${rows.map(([k, v]) => `<div><strong>${esc(k)}:</strong> ${esc(v)}</div>`).join("")}

      ${INCLUDE_SIGNATURE ? makeSignatureBlockHTML() : ""}
    `;
  }

  // ---------------------------
  // UPDATE
  // ---------------------------
  function updateAll() {
    subjectInput.value = buildSubject();
    if (document.activeElement !== bodyDiv) {
      bodyDiv.innerHTML = buildEmailBodyHTML();
    }
  }

  // ---------------------------
  // PREVIEW + SUBMIT
  // ---------------------------
  async function handlePreview() {
    if (isSubmitting) return;

    updateAll();

    const payload = {
      to: DEFAULT_NOTIFY_EMAIL,
      bcc: getRecipientEmails().filter(isValidEmail),
      subject: subjectInput.value,
      htmlBody: bodyDiv.innerHTML
    };

    isSubmitting = true;
    previewBtn.disabled = true;

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Submission failed");

      Swal.fire({
        icon: "success",
        title: "Email sent successfully",
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    } finally {
      isSubmitting = false;
      previewBtn.disabled = false;
    }
  }

  // ---------------------------
  // INIT
  // ---------------------------
  window.addEventListener("load", () => {
    setReadonlyValue(userEmailInput, SIGNED_IN_EMAIL);
    setReadonlyValue(notifyEmailInput, DEFAULT_NOTIFY_EMAIL);

    ensureAtLeastOneRecipient();
    addToBtn.addEventListener("click", () => addRecipientField(""));
    previewBtn.addEventListener("click", handlePreview);

    updateAll();
  });
})();

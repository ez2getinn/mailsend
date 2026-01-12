// =======================================
// Merchant Form Frontend (Azure Static Web App)
// FINAL – CLEAN, COMPLETE, PRODUCTION
// =======================================

(() => {
  "use strict";

  // ---------------------------
  // Helpers
  // ---------------------------
  const $ = (id) => document.getElementById(id);

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

  // ---------------------------
  // CONFIG
  // ---------------------------
  const API_URL =
    "https://merchant-form-api-ashir-egb2cqaze3d3bucy.canadacentral-01.azurewebsites.net/api/submitMerchant";

  const DEFAULT_NOTIFY_EMAIL = "ez2getin@hotmail.com";
  const FROM_DISPLAY = "noreply@shift4.com";

  // ---------------------------
  // CONTEXT (from index.html)
  // ---------------------------
  const CONTEXT = window.APP_CONTEXT || {};
  const SIGNED_IN_EMAIL = (CONTEXT.signedInEmail || "").trim();

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

  let isSubmitting = false;

  // ---------------------------
  // READONLY FIELDS
  // ---------------------------
  function setReadonlyValue(el, value) {
    if (!el) return;
    el.value = value || "";
  }

  // ---------------------------
  // RECIPIENTS
  // ---------------------------
  function getRecipientInputs() {
    return Array.from(toList.querySelectorAll("input.email-to"));
  }

  function getRecipientEmails() {
    return getRecipientInputs()
      .map((i) => i.value.trim())
      .filter(Boolean);
  }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
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
    input.placeholder = "merchant@example.com";
    input.value = prefill;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "×";
    removeBtn.style.cssText =
      "height:40px;border-radius:8px;border:1px solid #d1d5db;background:#fff;font-size:18px;cursor:pointer;";
    removeBtn.addEventListener("click", () => row.remove());

    row.appendChild(input);
    row.appendChild(removeBtn);
    toList.appendChild(row);
  }

  function ensureRecipientUI() {
    const existing = toList.querySelector("input.email-to");
    if (existing) {
      const val = existing.value;
      existing.remove();
      addRecipientField(val);
    } else {
      addRecipientField("");
    }
  }

  // ---------------------------
  // SUBJECT
  // ---------------------------
  function buildSubject() {
    return `Radisson Boarding — ${merchantDba.value || ""} | ${siteCode.value || ""} | MID ${mid.value || ""} | SN ${serial.value || ""}`.trim();
  }

  // ---------------------------
  // EMAIL BODY
  // ---------------------------
  function buildEmailBodyHTML() {
    const name = `${contactFirst.value} ${contactLast.value}`.trim();

    return `
      <p><strong>This is to inform you that a conversion to Shift4 Gateway Only Services has been submitted.</strong></p>

      <p>Hi <strong>${esc(name)}</strong>,</p>

      <p><strong>Merchant DBA Name:</strong> ${esc(merchantDba.value)}</p>
      <p><strong>Radisson Site Code:</strong> ${esc(siteCode.value)}</p>
      <p><strong>Shift4 E2E MID:</strong> ${esc(mid.value)}</p>
      <p><strong>Shift4 Serial Number:</strong> ${esc(serial.value)}</p>
      <p><strong>Business Address:</strong> ${esc(business.value)}</p>
      <p><strong>Contact Phone:</strong> ${esc(contactPhone.value)}</p>
      <p><strong>PMS / POS:</strong> ${esc(pmsPos.value)}</p>

      <hr />

      <p>
        <strong>Connectivity:</strong> ETHERNET ONLY<br />
        <strong>Key Injection Required:</strong><br />
        – Processor Key (DUKPT Slot 0)<br />
        – Shift4 P2PE Key (DUKPT Slot 4)
      </p>

      <hr />

      <p style="text-align:center;">
        <img src="./assets/logo.png" width="100" /><br />
        +1-888-276-2108<br />
        ©2025 Shift4. All rights reserved.
      </p>
    `;
  }

  // ---------------------------
  // VALIDATION
  // ---------------------------
  function validate() {
    const required = [
      merchantDba,
      siteCode,
      mid,
      serial,
      business,
      contactFirst,
      contactLast,
      contactPhone,
      pmsPos
    ];

    for (const el of required) {
      if (!el.value.trim()) {
        Swal.fire("Missing fields", "Please complete all required fields.", "error");
        return false;
      }
    }

    const recipients = getRecipientEmails().filter(isValidEmail);
    if (recipients.length === 0) {
      Swal.fire("Recipient required", "Add at least one valid email address.", "error");
      return false;
    }

    return true;
  }

  // ---------------------------
  // SUBMIT FLOW
  // ---------------------------
  async function handleSubmit() {
    if (isSubmitting) return;
    if (!validate()) return;

    const subject = buildSubject();
    const htmlBody = buildEmailBodyHTML();

    const recipients = getRecipientEmails().filter(isValidEmail);

    const payload = {
      idempotencyKey: uuid(),
      to: DEFAULT_NOTIFY_EMAIL,
      bcc: recipients,
      fromDisplay: FROM_DISPLAY,
      signedInEmail: SIGNED_IN_EMAIL,
      notifyEmail: DEFAULT_NOTIFY_EMAIL,
      subject,
      htmlBody
    };

    const confirm = await Swal.fire({
      title: "Confirm Submission",
      html: `<strong>To:</strong> ${DEFAULT_NOTIFY_EMAIL}<br/>
             <strong>BCC:</strong> ${recipients.join(", ")}<br/><br/>
             <strong>Subject:</strong><br/>${esc(subject)}`,
      showCancelButton: true,
      confirmButtonText: "Submit"
    });

    if (!confirm.isConfirmed) return;

    isSubmitting = true;
    previewBtn.disabled = true;

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Submission failed");

      Swal.fire("Success", "Email sent successfully.", "success");

    } catch (err) {
      Swal.fire("Error", err.message || "Failed to send email", "error");
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

    ensureRecipientUI();

    addToBtn.addEventListener("click", () => addRecipientField(""));
    previewBtn.addEventListener("click", handleSubmit);

    subjectInput.value = buildSubject();
    bodyDiv.innerHTML = buildEmailBodyHTML();
  });
})();

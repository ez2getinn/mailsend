// =======================================
// Merchant Form Frontend
// Azure Static Web App – FINAL, CLEAN
// =======================================

(function () {
  "use strict";

  // ---------------------------
  // HELPERS
  // ---------------------------
  function $(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, function (m) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[m];
    });
  }

  // ---------------------------
  // CONFIG
  // ---------------------------
  var API_URL = "/api/sendEmail";
  var DEFAULT_NOTIFY_EMAIL = "ez2getin@hotmail.com";

  // ---------------------------
  // CONTEXT FROM index.html
  // ---------------------------
  var CONTEXT = window.APP_CONTEXT || {};
  var SIGNED_IN_EMAIL = (CONTEXT.signedInEmail || "").trim();

  // ---------------------------
  // ELEMENTS
  // ---------------------------
  var userEmailInput = $("userEmail");
  var notifyEmailInput = $("notifyEmail");

  var merchantDba = $("merchantDba");
  var siteCode = $("siteCode");
  var mid = $("e2eMid");
  var serial = $("serialNumber");
  var business = $("businessAddress");
  var contactFirst = $("contactFirstName");
  var contactLast = $("contactLastName");
  var contactPhone = $("contactPhone");
  var pmsPos = $("pmsPos");

  var subjectInput = $("emailSubject");
  var bodyDiv = $("emailBodyDiv");

  var toList = $("toList");
  var addToBtn = $("addToBtn");
  var previewBtn = $("previewBtn");

  var isSubmitting = false;

  // ---------------------------
  // READ-ONLY FIELD SETTER (FIXED)
  // ---------------------------
  function setReadonlyValue(el, value) {
    if (!el) return;
    el.value = value || "";
    el.setAttribute("readonly", "readonly");
  }

  // ---------------------------
  // RECIPIENTS
  // ---------------------------
  function getRecipientEmails() {
    var inputs = toList.querySelectorAll("input.email-to");
    var emails = [];

    for (var i = 0; i < inputs.length; i++) {
      var v = inputs[i].value.trim();
      if (v) emails.push(v);
    }
    return emails;
  }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function addRecipientField(prefill) {
    var row = document.createElement("div");
    row.style.display = "grid";
    row.style.gridTemplateColumns = "1fr auto";
    row.style.gap = "8px";
    row.style.marginTop = "8px";

    var input = document.createElement("input");
    input.type = "email";
    input.className = "input email-to";
    input.placeholder = "merchant@example.com";
    input.value = prefill || "";

    var removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "×";
    removeBtn.style.cssText =
      "height:40px;border-radius:8px;border:1px solid #d1d5db;background:#fff;font-size:18px;cursor:pointer;";
    removeBtn.onclick = function () {
      row.remove();
    };

    row.appendChild(input);
    row.appendChild(removeBtn);
    toList.appendChild(row);
  }

  function normalizeRecipientUI() {
    var existing = toList.querySelector("input.email-to");
    if (existing) {
      var val = existing.value;
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
    return (
      "Radisson Boarding — " +
      (merchantDba.value || "") +
      " | " +
      (siteCode.value || "") +
      " | MID " +
      (mid.value || "") +
      " | SN " +
      (serial.value || "")
    ).trim();
  }

  // ---------------------------
  // EMAIL BODY
  // ---------------------------
  function buildEmailBody() {
    var fullName = (contactFirst.value + " " + contactLast.value).trim();

    return `
      <p><strong>
        This is to inform you that a conversion to Shift4 Gateway Only Services has been submitted.
      </strong></p>

      <p>Hi <strong>${esc(fullName)}</strong>,</p>

      <p><strong>Merchant DBA Name:</strong> ${esc(merchantDba.value)}</p>
      <p><strong>Radisson Site Code:</strong> ${esc(siteCode.value)}</p>
      <p><strong>Shift4 E2E MID:</strong> ${esc(mid.value)}</p>
      <p><strong>Shift4 Serial Number:</strong> ${esc(serial.value)}</p>
      <p><strong>Business Address:</strong> ${esc(business.value)}</p>
      <p><strong>Contact Phone:</strong> ${esc(contactPhone.value)}</p>
      <p><strong>PMS / POS:</strong> ${esc(pmsPos.value)}</p>

      <hr />

      <p>
        <strong>Connectivity:</strong> ETHERNET ONLY<br/>
        <strong>Key Injection Required:</strong><br/>
        – Processor Key (DUKPT Slot 0)<br/>
        – Shift4 P2PE Key (DUKPT Slot 4)
      </p>

      <hr />

      <p style="text-align:center;">
        <img src="/assets/logo.png" width="100"/><br/>
        +1-888-276-2108<br/>
        ©2025 Shift4. All rights reserved.
      </p>
    `;
  }

  // ---------------------------
  // VALIDATION
  // ---------------------------
  function validate() {
    var required = [
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

    for (var i = 0; i < required.length; i++) {
      if (!required[i].value.trim()) {
        Swal.fire("Missing fields", "Please complete all required fields.", "error");
        return false;
      }
    }

    var recipients = getRecipientEmails().filter(isValidEmail);
    if (recipients.length === 0) {
      Swal.fire("Recipient required", "Add at least one valid email.", "error");
      return false;
    }

    return true;
  }

  // ---------------------------
  // SUBMIT
  // ---------------------------
  async function handleSubmit() {
    if (isSubmitting) return;
    if (!validate()) return;

    var subject = buildSubject();
    var htmlBody = buildEmailBody();
    var recipients = getRecipientEmails().filter(isValidEmail);

    var payload = {
      to: DEFAULT_NOTIFY_EMAIL,     // ticket email
      subject: subject,
      body: htmlBody,               // BACKEND EXPECTS "body"
      bcc: recipients               // recipients
    };

    var confirm = await Swal.fire({
      title: "Confirm Submission",
      html: `
        <strong>To (Ticket):</strong> ${DEFAULT_NOTIFY_EMAIL}<br/>
        <strong>BCC (Recipients):</strong> ${recipients.join(", ")}<br/><br/>
        <strong>Subject:</strong><br/>${esc(subject)}
      `,
      showCancelButton: true,
      confirmButtonText: "Submit"
    });

    if (!confirm.isConfirmed) return;

    isSubmitting = true;
    previewBtn.disabled = true;

    try {
      var res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      var text = await res.text();
      if (!res.ok) throw new Error(text || "Send failed");

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
  window.addEventListener("load", function () {
    setReadonlyValue(userEmailInput, SIGNED_IN_EMAIL);
    setReadonlyValue(notifyEmailInput, DEFAULT_NOTIFY_EMAIL);

    normalizeRecipientUI();

    subjectInput.value = buildSubject();
    bodyDiv.innerHTML = buildEmailBody();

    addToBtn.onclick = function () {
      addRecipientField("");
    };

    previewBtn.onclick = handleSubmit;
  });

})();

// =======================================
// Merchant Form Frontend
// Azure Static Web App – FINAL WORKING
// =======================================

(function () {
  "use strict";

  // ---------------------------
  // Helpers
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
  // CONFIG (MATCHES BACKEND)
  // ---------------------------
  var API_URL = "/api/sendEmail";
  var DEFAULT_TO_EMAIL = "ez2getin@hotmail.com";

  // ---------------------------
  // ELEMENTS
  // ---------------------------
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
  var previewBtn = $("previewBtn");

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
  // EMAIL BODY (HTML)
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

    return true;
  }

  // ---------------------------
  // SUBMIT
  // ---------------------------
  async function handleSubmit() {
    if (!validate()) return;

    var subject = buildSubject();
    var body = buildEmailBody();

    var payload = {
      to: DEFAULT_TO_EMAIL,
      subject: subject,
      body: body
    };

    var confirm = await Swal.fire({
      title: "Confirm Email",
      html:
        "<strong>To:</strong> " + DEFAULT_TO_EMAIL +
        "<br/><strong>Subject:</strong><br/>" + esc(subject),
      showCancelButton: true,
      confirmButtonText: "Send Email"
    });

    if (!confirm.isConfirmed) return;

    try {
      var res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Request failed");

      Swal.fire("Success", "Email sent successfully.", "success");

    } catch (err) {
      Swal.fire("Error", "Failed to send email.", "error");
    }
  }

  // ---------------------------
  // INIT
  // ---------------------------
  window.addEventListener("load", function () {
    subjectInput.value = buildSubject();
    bodyDiv.innerHTML = buildEmailBody();
    previewBtn.addEventListener("click", handleSubmit);
  });

})();

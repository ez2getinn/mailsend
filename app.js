// =======================================
// Merchant Form Frontend
// Azure Static Web App – FINAL, CLEAN (WORKING)
// Sends: to + bcc + subject + htmlBody
// + NEW: Ask Shift4 Office Email (SweetAlert) + localStorage
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

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function isShift4Email(v) {
    if (!v) return false;
    var email = String(v).trim().toLowerCase();
    return isValidEmail(email) && email.endsWith("@shift4.com");
  }

  // ---------------------------
  // CONFIG
  // ---------------------------
  var API_URL = "/api/sendEmail";
  var DEFAULT_NOTIFY_EMAIL = "ez2getin@hotmail.com";

  // localStorage key
  var LS_OFFICE_EMAIL_KEY = "merchantForm_officeEmail";

  // ---------------------------
  // CONTEXT FROM index.html (fallback only)
  // ---------------------------
  var CONTEXT = window.APP_CONTEXT || {};
  var CONTEXT_SIGNED_IN_EMAIL = (CONTEXT.signedInEmail || "").trim();

  // ✅ This will be used everywhere (payload + UI)
  var SIGNED_IN_EMAIL = "";

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
  // READ-ONLY FIELD SETTER
  // ---------------------------
  function setReadonlyValue(el, value) {
    if (!el) return;
    el.value = value || "";
    el.setAttribute("readonly", "readonly");
  }

  // ---------------------------
  // RECIPIENTS (Bcc List)
  // ---------------------------
  function getRecipientEmails() {
    var inputs = toList.querySelectorAll("input.email-to");
    var emails = [];

    for (var i = 0; i < inputs.length; i++) {
      var v = (inputs[i].value || "").trim();
      if (v) emails.push(v);
    }

    return emails;
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
    // If GitHub page has 1 plain input, convert it into removable row
    var existing = toList.querySelector(":scope > input.email-to");
    if (existing) {
      var val = existing.value;
      existing.remove();
      addRecipientField(val);
    }

    // Ensure at least 1 input exists
    var after = toList.querySelectorAll("input.email-to");
    if (!after || after.length === 0) {
      addRecipientField("");
    }
  }

  // ---------------------------
  // SUBJECT
  // ---------------------------
  function buildSubject() {
    var parts = [];

    if ((merchantDba.value || "").trim()) parts.push((merchantDba.value || "").trim());
    if ((siteCode.value || "").trim()) parts.push((siteCode.value || "").trim());
    if ((mid.value || "").trim()) parts.push("MID " + (mid.value || "").trim());
    if ((serial.value || "").trim()) parts.push("SN " + (serial.value || "").trim());

    if (parts.length === 0) return "Radisson Boarding";

    return "Radisson Boarding — " + parts.join(" | ");
  }

  // ---------------------------
  // EMAIL BODY (HTML)
  // ---------------------------
  function buildEmailBody() {
    var fullName = (contactFirst.value + " " + contactLast.value).trim();

    var html = "";

    html +=
      '<div style="background:#FFF3CD;border:1px solid #FFEEBA;border-radius:8px;padding:12px 14px;font-weight:700;line-height:1.45;margin:0 0 12px 0;color:#664d03;">';
    html +=
      "This is to inform you that a conversion to Shift4 Gateway Only Services has been submitted for the property listed below.";
    html += "</div>";

    html += "<p>Hi <strong>" + esc(fullName) + "</strong>,</p>";

    html += "<div><strong>Merchant DBA Name:</strong> " + esc(merchantDba.value) + "</div>";
    html += "<div><strong>Radisson Site Code:</strong> " + esc(siteCode.value) + "</div>";
    html += "<div><strong>Shift4 E2E MID:</strong> " + esc(mid.value) + "</div>";
    html += "<div><strong>Shift4 Serial Number:</strong> " + esc(serial.value) + "</div>";
    html += "<div><strong>Business Address:</strong> " + esc(business.value) + "</div>";
    html += "<div><strong>Contact First Name:</strong> " + esc(contactFirst.value) + "</div>";
    html += "<div><strong>Contact Last Name:</strong> " + esc(contactLast.value) + "</div>";
    html += "<div><strong>Contact Phone:</strong> " + esc(contactPhone.value) + "</div>";
    html += "<div><strong>PMS/POS:</strong> " + esc(pmsPos.value) + "</div>";

    html += "<br/>";
    html +=
      "<p>Please be advised that you will need to purchase EMV devices through a PCI validated reseller. The key points are:</p>";

    html += '<ul style="list-style:none;padding-left:0;margin-left:0;">';

    html +=
      '<li style="padding:8px 0;border-bottom:1px solid #e5e7eb;"><span style="margin-right:6px;">⚠️</span><strong>Device Compatibility:</strong> Ingenico Lane 5000/7000 Pin Pad Devices support EMV chip &amp; PIN, EMV chip, magstripe, and contactless NFC transactions.</li>';

    html +=
      '<li style="padding:8px 0;border-bottom:1px solid #e5e7eb;"><span style="margin-right:6px;">⚠️</span><strong>Modern Payments:</strong> Supports mobile wallets, alternative payment methods, and QR code transactions.</li>';

    html +=
      '<li style="padding:8px 0;border-bottom:1px solid #e5e7eb;"><span style="margin-right:6px;">⚠️</span><strong>Advanced Features:</strong> Includes P2PE, line item display, and BIN management.</li>';

    html +=
      '<li style="padding:8px 0;border-bottom:1px solid #e5e7eb;"><span style="margin-right:6px;">⚠️</span><strong>Connectivity:</strong> Devices connect to UTG via Ethernet only. <span style="display:inline-block;margin-left:8px;padding:2px 8px;border-radius:9999px;background:rgba(19,110,246,.10);color:#136EF6;font-weight:700;font-size:12px;vertical-align:middle;">ETHERNET ONLY</span></li>';

    html +=
      '<li style="padding:8px 0;border-bottom:1px solid #e5e7eb;"><span style="margin-right:6px;">⚠️</span><strong>Key Injection Required:</strong><ul style="list-style:disc;margin:6px 0 0 22px;padding:0;"><li>Processor/Pin Encryption Key - Injected in DUKPT Slot 0</li><li>Shift4 P2PE Key - Injected in DUKPT Slot 4</li></ul></li>';

    html +=
      '<li style="padding:8px 0;"><span style="margin-right:6px;">⚠️</span><strong>Vendor Responsibility:</strong> You will be responsible for all upfront costs, warranty, and support directly with your vendor.</li>';

    html += "</ul>";

    // Footer logo + phone + copyright (absolute URL required for email clients)
    html += '<div style="text-align:center;margin-top:20px;">';
    html +=
      '<img src="https://jolly-hill-02879b60f.2.azurestaticapps.net/assets/logo.png" alt="Shift4" style="width:110px;height:auto;display:block;margin:0 auto 10px auto;"/>';
    html += "<div style='font-weight:700;'>+1-888-276-2108</div>";
    html += "<div>©2025 Shift4. All rights reserved.</div>";
    html += "<div>Shift4 is a registered ISO/MSP of Citizens Bank, N.A, Providence, RI</div>";
    html += "</div>";

    return html;
  }

  // ---------------------------
  // VALIDATION
  // ---------------------------
  function validate() {
    // ✅ must have signed in office email first
    if (!SIGNED_IN_EMAIL || !isShift4Email(SIGNED_IN_EMAIL)) {
      Swal.fire("Office Email Required", "Please enter a valid @shift4.com email.", "error");
      return false;
    }

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
  // OFFICE EMAIL FLOW (SweetAlert + localStorage)
  // ---------------------------
  async function ensureOfficeEmail() {
    // 1) check localStorage first
    var saved = "";
    try {
      saved = (localStorage.getItem(LS_OFFICE_EMAIL_KEY) || "").trim();
    } catch (e) {
      saved = "";
    }

    // 2) if saved and valid -> use it
    if (isShift4Email(saved)) {
      SIGNED_IN_EMAIL = saved;
      setReadonlyValue(userEmailInput, SIGNED_IN_EMAIL);
      return;
    }

    // 3) otherwise fallback to CONTEXT value if valid
    if (isShift4Email(CONTEXT_SIGNED_IN_EMAIL)) {
      SIGNED_IN_EMAIL = CONTEXT_SIGNED_IN_EMAIL;
      try {
        localStorage.setItem(LS_OFFICE_EMAIL_KEY, SIGNED_IN_EMAIL);
      } catch (e2) {}
      setReadonlyValue(userEmailInput, SIGNED_IN_EMAIL);
      return;
    }

    // 4) force user input until valid
    while (true) {
      var result = await Swal.fire({
        title: "Enter your Shift4 office email",
        html:
          "<div style='text-align:left;line-height:1.4;'>" +
          "<div style='font-weight:700;margin-bottom:6px;'>Office Email (must end with @shift4.com)</div>" +
          "<div style='font-size:13px;color:#6b7280;margin-bottom:10px;'>Example: john.doe@shift4.com</div>" +
          "</div>",
        input: "email",
        inputPlaceholder: "name@shift4.com",
        inputAttributes: { autocapitalize: "off", autocorrect: "off" },
        confirmButtonText: "Continue",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showCancelButton: false,
        preConfirm: function (value) {
          var v = (value || "").trim().toLowerCase();
          if (!isShift4Email(v)) {
            Swal.showValidationMessage("Invalid office email. Must end with @shift4.com");
            return false;
          }
          return v;
        }
      });

      var officeEmail = (result.value || "").trim().toLowerCase();
      if (isShift4Email(officeEmail)) {
        SIGNED_IN_EMAIL = officeEmail;

        try {
          localStorage.setItem(LS_OFFICE_EMAIL_KEY, SIGNED_IN_EMAIL);
        } catch (e3) {}

        setReadonlyValue(userEmailInput, SIGNED_IN_EMAIL);
        return;
      }
    }
  }

  // ---------------------------
  // SUBMIT
  // ---------------------------
  async function handleSubmit() {
    if (isSubmitting) return;

    // make sure office email exists first
    if (!SIGNED_IN_EMAIL || !isShift4Email(SIGNED_IN_EMAIL)) {
      await ensureOfficeEmail();
    }

    if (!validate()) return;

    var subject = buildSubject();
    var htmlBody = buildEmailBody();

    var recipients = getRecipientEmails().filter(isValidEmail);

    // ✅ payload matches backend index.js
    var payload = {
      to: DEFAULT_NOTIFY_EMAIL,
      subject: subject,
      htmlBody: htmlBody,
      recipients: recipients,

      merchantDba: merchantDba.value.trim(),
      siteCode: siteCode.value.trim(),
      mid: mid.value.trim(),
      serialNumber: serial.value.trim(),
      businessAddress: business.value.trim(),
      contactFirstName: contactFirst.value.trim(),
      contactLastName: contactLast.value.trim(),
      contactPhone: contactPhone.value.trim(),
      pmsPos: pmsPos.value.trim(),

      signedInEmail: SIGNED_IN_EMAIL,
      notifyEmail: DEFAULT_NOTIFY_EMAIL
    };

    var confirm = await Swal.fire({
      title: "Confirm Submission",
      html:
        "<div style='text-align:left;display:grid;gap:10px;max-height:70vh;overflow:auto;padding-right:2px;'>" +
        "<div style='border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#fff;'>" +
        "<div style='background:#136EF6;color:#fff;font-weight:800;padding:10px 12px;'>EMAIL ROUTING</div>" +
        "<div style='padding:12px;'>" +
        "<div><strong>Submitted By:</strong> " + esc(SIGNED_IN_EMAIL) + "</div>" +
        "<div><strong>To (Ticket):</strong> " + esc(DEFAULT_NOTIFY_EMAIL) + "</div>" +
        "<div><strong>BCC (Recipients):</strong> " + esc(recipients.join(", ")) + "</div>" +
        "<div style='margin-top:8px;'><strong>Subject:</strong> " + esc(subject) + "</div>" +
        "</div></div>" +
        "<div style='border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#fff;'>" +
        "<div style='background:#136EF6;color:#fff;font-weight:800;padding:10px 12px;'>EMAIL BODY PREVIEW</div>" +
        "<div style='padding:12px;'>" + htmlBody + "</div>" +
        "</div></div>",
      grow: "fullscreen",
      width: "100%",
      heightAuto: false,
      showCancelButton: true,
      cancelButtonText: "CANCEL",
      confirmButtonText: "SUBMIT",
      reverseButtons: true
    });

    if (!confirm.isConfirmed) return;

    isSubmitting = true;
    previewBtn.disabled = true;
    previewBtn.textContent = "Submitting...";

    try {
      var res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      var text = await res.text();
      if (!res.ok) throw new Error(text || "Send failed");

      Swal.fire({
        icon: "success",
        title: "Submitted",
        text: "Ticket created and recipients notified.",
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire("Error", err.message || "Failed to send email", "error");
    } finally {
      isSubmitting = false;
      previewBtn.disabled = false;
      previewBtn.textContent = "VIEW DETAILS BEFORE SUBMITTING";
    }
  }

  // ---------------------------
  // LIVE UPDATE
  // ---------------------------
  function updatePreviewFields() {
    if (subjectInput) subjectInput.value = buildSubject();

    if (bodyDiv) {
      var isEditing = document.activeElement === bodyDiv;
      if (!isEditing) {
        bodyDiv.innerHTML = buildEmailBody();
      }
    }
  }

  // ---------------------------
  // INIT
  // ---------------------------
  window.addEventListener("load", async function () {
  setReadonlyValue(notifyEmailInput, DEFAULT_NOTIFY_EMAIL);

  normalizeRecipientUI();
  updatePreviewFields();

  // ✅ FORCE office email popup on load when missing
  await ensureOfficeEmail();

  addToBtn.onclick = function () {
    addRecipientField("");
  };

  previewBtn.onclick = handleSubmit;

  var allInputs = [
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

  for (var i = 0; i < allInputs.length; i++) {
    if (!allInputs[i]) continue;
    allInputs[i].addEventListener("input", updatePreviewFields);
    allInputs[i].addEventListener("change", updatePreviewFields);
  }
});
})();



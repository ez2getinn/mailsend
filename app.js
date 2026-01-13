// =======================================
// Merchant Form Frontend
// Azure Static Web App – FINAL, CLEAN (WORKS WITH YOUR CURRENT BACKEND)
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

  function setReadonlyValue(el, value) {
    if (!el) return;
    el.value = value || "";
    el.setAttribute("readonly", "readonly");
    el.style.backgroundColor = "#f3f4f6";
    el.style.color = "#6b7280";
    el.style.cursor = "not-allowed";
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
  // RECIPIENTS UI
  // ---------------------------
  function getRecipientEmails() {
    if (!toList) return [];
    var inputs = toList.querySelectorAll("input.email-to");
    var emails = [];
    var i, v;

    for (i = 0; i < inputs.length; i++) {
      v = (inputs[i].value || "").trim();
      if (v) emails.push(v);
    }
    return emails;
  }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || "");
  }

  function addRecipientField(prefill) {
    if (!toList) return;

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
    if (!toList) return;

    var inline = toList.querySelector(":scope > input.email-to");
    if (inline) {
      var val = (inline.value || "").trim();
      inline.remove();
      addRecipientField(val);
      return;
    }

    var any = toList.querySelector("input.email-to");
    if (!any) addRecipientField("");
  }

  // ---------------------------
  // SUBJECT
  // ---------------------------
  function buildSubject() {
    var dba = (merchantDba && merchantDba.value ? merchantDba.value : "").trim();
    var sc = (siteCode && siteCode.value ? siteCode.value : "").trim();
    var m = (mid && mid.value ? mid.value : "").trim();
    var sn = (serial && serial.value ? serial.value : "").trim();

    var parts = [];
    if (dba) parts.push(dba);
    if (sc) parts.push(sc);
    if (m) parts.push("MID " + m);
    if (sn) parts.push("SN " + sn);

    if (parts.length === 0) return "Radisson Boarding";

    return "Radisson Boarding — " + parts.join(" | ");
  }

  // ---------------------------
  // EMAIL BODY (MATCH SCREENSHOT)
  // ---------------------------
  function buildEmailBody() {
    var first = (contactFirst && contactFirst.value ? contactFirst.value : "").trim();
    var last = (contactLast && contactLast.value ? contactLast.value : "").trim();
    var fullName = (first + " " + last).trim();

    var dba = (merchantDba.value || "").trim();
    var sc = (siteCode.value || "").trim();
    var m = (mid.value || "").trim();
    var sn = (serial.value || "").trim();
    var addr = (business.value || "").trim();
    var phone = (contactPhone.value || "").trim();
    var pms = (pmsPos.value || "").trim();

    var html = "";

    // Yellow message banner
    html += '<div style="background:#FFF3CD;border:1px solid #FFEEBA;border-radius:8px;padding:12px 14px;font-weight:700;line-height:1.45;margin:0 0 12px 0;color:#664d03;">';
    html += "This is to inform you that a conversion to Shift4 Gateway Only Services has been submitted for the property listed below.";
    html += "</div>";

    // Greeting
    html += "<p>Hi <strong>" + esc(fullName) + "</strong>,</p>";

    // Bold label fields (same style like screenshot)
    html += "<div style='line-height:1.65'>";
    html += "<div><strong>Merchant DBA Name:</strong> " + esc(dba) + "</div>";
    html += "<div><strong>Radisson Site Code:</strong> " + esc(sc) + "</div>";
    html += "<div><strong>Shift4 E2E MID:</strong> " + esc(m) + "</div>";
    html += "<div><strong>Shift4 Serial Number:</strong> " + esc(sn) + "</div>";
    html += "<div><strong>Business Address:</strong> " + esc(addr) + "</div>";
    html += "<div><strong>Contact First Name:</strong> " + esc(first) + "</div>";
    html += "<div><strong>Contact Last Name:</strong> " + esc(last) + "</div>";
    html += "<div><strong>Contact Phone:</strong> " + esc(phone) + "</div>";
    html += "<div><strong>PMS/POS:</strong> " + esc(pms) + "</div>";
    html += "</div>";

    html += "<br/>";

    // Paragraph before bullet list
    html += "<p>Please be advised that you will need to purchase EMV devices through a PCI validated reseller. The key points are:</p>";

    // Bullet list (warning style like screenshot)
    html += '<ul style="list-style:none;padding-left:0;margin-left:0;">';

    function bullet(title, text, extraHtml) {
      var b = "";
      b += '<li style="padding:10px 0;border-bottom:1px solid #e5e7eb;">';
      b += '<span style="margin-right:8px;">⚠️</span>';
      b += "<strong>" + esc(title) + ":</strong> ";
      b += esc(text);
      if (extraHtml) b += extraHtml;
      b += "</li>";
      return b;
    }

    html += bullet(
      "Device Compatibility",
      "Ingenico Lane 5000/7000 Pin Pad Devices support EMV chip & PIN, EMV chip, magstripe, and contactless NFC transactions.",
      ""
    );

    html += bullet(
      "Modern Payments",
      "Supports mobile wallets, alternative payment methods, and QR code transactions.",
      ""
    );

    html += bullet(
      "Advanced Features",
      "Includes P2PE, line item display, and BIN management.",
      ""
    );

    // Connectivity pill like screenshot
    var pill =
      '<span style="display:inline-block;margin-left:8px;padding:2px 8px;border-radius:9999px;background:rgba(19,110,246,.10);color:#136EF6;font-weight:700;font-size:12px;vertical-align:middle;">ETHERNET ONLY</span>';

    html += bullet(
      "Connectivity",
      "Devices connect to UTG via Ethernet only.",
      pill
    );

    // Key injection with inner bullet list
    html += '<li style="padding:10px 0;border-bottom:1px solid #e5e7eb;">';
    html += '<span style="margin-right:8px;">⚠️</span>';
    html += "<strong>Key Injection Required:</strong>";
    html += '<ul style="list-style:disc;margin:6px 0 0 22px;padding:0;">';
    html += "<li>Processor/Pin Encryption Key - Injected in DUKPT Slot 0</li>";
    html += "<li>Shift4 P2PE Key - Injected in DUKPT Slot 4</li>";
    html += "</ul>";
    html += "</li>";

    html += '<li style="padding:10px 0;">';
    html += '<span style="margin-right:8px;">⚠️</span>';
    html += "<strong>Vendor Responsibility:</strong> You will be responsible for all upfront costs, warranty, and support directly with your vendor.";
    html += "</li>";

    html += "</ul>";

    // Footer logo + phone + copyright (matches screenshot center)
    // ✅ Public logo URL (must be full https URL for email clients)
    var LOGO_URL = "https://jolly-hill-02879b60f.2.azurestaticapps.net/assets/logo.png";
    
    // Footer logo + phone + copyright (matches screenshot center)
    html += '<div style="text-align:center;margin-top:20px;">';
    html += '<img src="' + LOGO_URL + '" alt="Shift4" style="width:110px;height:auto;display:block;margin:0 auto 10px auto;"/>';
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
    var required = [
      merchantDba, siteCode, mid, serial, business,
      contactFirst, contactLast, contactPhone, pmsPos
    ];

    var i, v;
    for (i = 0; i < required.length; i++) {
      v = (required[i] && required[i].value ? required[i].value : "").trim();
      if (!v) {
        Swal.fire("Missing fields", "Please complete all required fields.", "error");
        return false;
      }
    }

    var recipients = getRecipientEmails();
    var good = [];
    for (i = 0; i < recipients.length; i++) {
      if (isValidEmail(recipients[i])) good.push(recipients[i]);
    }

    if (good.length === 0) {
      Swal.fire("Recipient required", "Add at least one valid email.", "error");
      return false;
    }

    return true;
  }

  // ---------------------------
  // SEND ONE EMAIL (matches your backend)
  // Backend requires: to + subject + body
  // We send both body + htmlBody for safety.
  // ---------------------------
  function sendOneEmail(toAddr, subject, htmlBody) {
    var payload = {
      to: toAddr,
      subject: subject,
      body: htmlBody,
      htmlBody: htmlBody
    };

    return fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.text().then(function (text) {
        if (!res.ok) {
          throw new Error(text || "Send failed");
        }
        return text;
      });
    });
  }

  // ---------------------------
  // SUBMIT (PREVIEW + SEND)
  // ---------------------------
  function handleSubmit() {
    if (isSubmitting) return;
    if (!validate()) return;

    var subject = buildSubject();

    // IMPORTANT:
    // Body must match EXACTLY what user sees in editor
    // so preview + email are identical
    var htmlBody = bodyDiv && bodyDiv.innerHTML ? bodyDiv.innerHTML : buildEmailBody();

    var recipientsRaw = getRecipientEmails();
    var recipients = [];
    var i;

    for (i = 0; i < recipientsRaw.length; i++) {
      if (isValidEmail(recipientsRaw[i])) recipients.push(recipientsRaw[i]);
    }

    var previewHTML = "";
    previewHTML += "<div style='text-align:left;display:grid;gap:14px;max-height:72vh;overflow:auto;padding-right:2px;'>";
    previewHTML += "  <div style='border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;background:#fff;'>";
    previewHTML += "    <div style='background:#136EF6;color:#fff;font-weight:800;padding:10px 12px;'>EMAIL ROUTING</div>";
    previewHTML += "    <div style='padding:12px;line-height:1.7;'>";
    previewHTML += "      <div><strong>Ticket To:</strong> " + esc(DEFAULT_NOTIFY_EMAIL) + "</div>";
    previewHTML += "      <div><strong>Recipients:</strong> " + esc(recipients.join(", ")) + "</div>";
    previewHTML += "      <div style='margin-top:8px;'><strong>Subject:</strong> " + esc(subject) + "</div>";
    previewHTML += "    </div>";
    previewHTML += "  </div>";

    previewHTML += "  <div style='border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;background:#fff;'>";
    previewHTML += "    <div style='background:#136EF6;color:#fff;font-weight:800;padding:10px 12px;'>EMAIL BODY PREVIEW</div>";
    previewHTML += "    <div style='padding:14px;'>";
    previewHTML += htmlBody;
    previewHTML += "    </div>";
    previewHTML += "  </div>";
    previewHTML += "</div>";

    Swal.fire({
      title: "Review Details",
      html: previewHTML,
      width: "100%",
      grow: "fullscreen",
      heightAuto: false,
      showCancelButton: true,
      confirmButtonText: "SUBMIT",
      cancelButtonText: "CANCEL",
      reverseButtons: true
    }).then(function (result) {
      if (!result.isConfirmed) return;

      isSubmitting = true;
      if (previewBtn) previewBtn.disabled = true;

      // 1) send ticket email
      sendOneEmail(DEFAULT_NOTIFY_EMAIL, subject, htmlBody)
        .then(function () {
          // 2) send to each recipient sequentially
          var chain = Promise.resolve();
          for (i = 0; i < recipients.length; i++) {
            (function (addr) {
              chain = chain.then(function () {
                return sendOneEmail(addr, subject, htmlBody);
              });
            })(recipients[i]);
          }
          return chain;
        })
        .then(function () {
          Swal.fire("Success", "Email sent to ticket + all recipients.", "success");
        })
        .catch(function (err) {
          Swal.fire("Error", err && err.message ? err.message : "Failed to send email", "error");
        })
        .finally(function () {
          isSubmitting = false;
          if (previewBtn) previewBtn.disabled = false;
        });
    });
  }

  // ---------------------------
  // INIT
  // ---------------------------
  window.addEventListener("load", function () {
    // show readonly top fields
    setReadonlyValue(userEmailInput, SIGNED_IN_EMAIL);
    setReadonlyValue(notifyEmailInput, DEFAULT_NOTIFY_EMAIL);

    // recipients
    normalizeRecipientUI();

    // initial values
    if (subjectInput) subjectInput.value = buildSubject();
    if (bodyDiv) bodyDiv.innerHTML = buildEmailBody();

    // live update subject + body (keeps screenshot output)
    var liveInputs = [merchantDba, siteCode, mid, serial, business, contactFirst, contactLast, contactPhone, pmsPos];
    for (var i = 0; i < liveInputs.length; i++) {
      if (!liveInputs[i]) continue;

      liveInputs[i].addEventListener("input", function () {
        if (subjectInput) subjectInput.value = buildSubject();
        if (bodyDiv) bodyDiv.innerHTML = buildEmailBody();
      });

      liveInputs[i].addEventListener("change", function () {
        if (subjectInput) subjectInput.value = buildSubject();
        if (bodyDiv) bodyDiv.innerHTML = buildEmailBody();
      });
    }

    // add recipient
    if (addToBtn) {
      addToBtn.onclick = function () {
        addRecipientField("");
      };
    }

    // submit
    if (previewBtn) {
      previewBtn.onclick = handleSubmit;
    }
  });

})();

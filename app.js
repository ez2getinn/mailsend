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
    // make it look "greyed out" even if readonly
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

    // If index.html has a single inline input, convert it into removable rows
    var inline = toList.querySelector(":scope > input.email-to");
    if (inline) {
      var val = (inline.value || "").trim();
      inline.remove();
      addRecipientField(val);
      return;
    }

    // If nothing exists, add one
    var any = toList.querySelector("input.email-to");
    if (!any) addRecipientField("");
  }

  // ---------------------------
  // SUBJECT
  // ---------------------------
  function buildSubject() {
    var a = (merchantDba && merchantDba.value ? merchantDba.value : "").trim();
    var b = (siteCode && siteCode.value ? siteCode.value : "").trim();
    var c = (mid && mid.value ? mid.value : "").trim();
    var d = (serial && serial.value ? serial.value : "").trim();

    var s = "Radisson Boarding — ";
    s += a;
    s += " | ";
    s += b;
    s += " | MID ";
    s += c;
    s += " | SN ";
    s += d;

    return s.trim();
  }

  // ---------------------------
  // EMAIL BODY
  // ---------------------------
  function buildEmailBody() {
    var fullName = ((contactFirst && contactFirst.value ? contactFirst.value : "") + " " +
                    (contactLast && contactLast.value ? contactLast.value : "")).trim();

    var html = "";
    html += '<p><strong>This is to inform you that a conversion to Shift4 Gateway Only Services has been submitted.</strong></p>';
    html += "<p>Hi <strong>" + esc(fullName) + "</strong>,</p>";

    html += "<p><strong>Merchant DBA Name:</strong> " + esc(merchantDba.value) + "</p>";
    html += "<p><strong>Radisson Site Code:</strong> " + esc(siteCode.value) + "</p>";
    html += "<p><strong>Shift4 E2E MID:</strong> " + esc(mid.value) + "</p>";
    html += "<p><strong>Shift4 Serial Number:</strong> " + esc(serial.value) + "</p>";
    html += "<p><strong>Business Address:</strong> " + esc(business.value) + "</p>";
    html += "<p><strong>Contact Phone:</strong> " + esc(contactPhone.value) + "</p>";
    html += "<p><strong>PMS / POS:</strong> " + esc(pmsPos.value) + "</p>";

    html += "<hr />";
    html += "<p><strong>Connectivity:</strong> ETHERNET ONLY<br/>";
    html += "<strong>Key Injection Required:</strong><br/>";
    html += "– Processor Key (DUKPT Slot 0)<br/>";
    html += "– Shift4 P2PE Key (DUKPT Slot 4)</p>";

    html += "<hr />";
    html += '<p style="text-align:center;">';
    html += '<img src="/assets/logo.png" width="100" alt="Shift4"/><br/>';
    html += "+1-888-276-2108<br/>";
    html += "©2025 Shift4. All rights reserved.";
    html += "</p>";

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
  // Backend requires: to + subject + (body OR htmlBody)
  // We send BOTH to be safe.
  // ---------------------------
  function sendOneEmail(toAddr, subject, htmlBody) {
    var payload = {
      to: toAddr,
      subject: subject,

      // support BOTH backend variants
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
  // SUBMIT
  // IMPORTANT:
  // Your current backend only sends to ONE address.
  // So we send:
  //  1) to DEFAULT_NOTIFY_EMAIL (ticket)
  //  2) then to EACH recipient (one-by-one)
  // This guarantees everyone gets it WITHOUT needing backend BCC support.
  // ---------------------------
  function handleSubmit() {
    if (isSubmitting) return;
    if (!validate()) return;

    var subject = buildSubject();
    var htmlBody = buildEmailBody();

    var recipientsRaw = getRecipientEmails();
    var recipients = [];
    var i;

    for (i = 0; i < recipientsRaw.length; i++) {
      if (isValidEmail(recipientsRaw[i])) recipients.push(recipientsRaw[i]);
    }

    var confirmHtml = "";
    confirmHtml += "<div style='text-align:left;line-height:1.5'>";
    confirmHtml += "<strong>Ticket To:</strong> " + esc(DEFAULT_NOTIFY_EMAIL) + "<br/>";
    confirmHtml += "<strong>Recipients:</strong> " + esc(recipients.join(", ")) + "<br/><br/>";
    confirmHtml += "<strong>Subject:</strong><br/>" + esc(subject);
    confirmHtml += "</div>";

    Swal.fire({
      title: "Confirm Submission",
      html: confirmHtml,
      showCancelButton: true,
      confirmButtonText: "Submit",
      cancelButtonText: "Cancel"
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
    // show defaults
    setReadonlyValue(userEmailInput, SIGNED_IN_EMAIL);
    setReadonlyValue(notifyEmailInput, DEFAULT_NOTIFY_EMAIL);

    // recipients UI
    normalizeRecipientUI();

    // initial content
    if (subjectInput) subjectInput.value = buildSubject();
    if (bodyDiv) bodyDiv.innerHTML = buildEmailBody();

    // update subject/body live
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

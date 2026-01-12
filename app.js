const form = document.getElementById("emailForm");
const statusDiv = document.getElementById("status");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  statusDiv.textContent = "Sending...";
  statusDiv.className = "status";

  const payload = {
    to: document.getElementById("to").value,
    subject: document.getElementById("subject").value,
    body: document.getElementById("body").value,
  };

  try {
    const response = await fetch("/api/sendEmail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(text);
    }

    statusDiv.textContent = "✅ Email sent successfully";
    statusDiv.classList.add("success");
    form.reset();
  } catch (err) {
    statusDiv.textContent = `❌ Failed to send email`;
    statusDiv.classList.add("error");
    console.error(err);
  }
});

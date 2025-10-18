document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Fetch activities from API and render
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      renderActivities(activities);
      populateSelect(activities);
    } catch (e) {
      activitiesList.innerHTML = `<p class="no-participants">Could not load activities.</p>`;
    }
  }

  function populateSelect(activities) {
    activitySelect.innerHTML =
      `<option value="">-- Select an activity --</option>` +
      Object.keys(activities)
        .map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
        .join("");
  }

  function renderActivities(activities) {
    activitiesList.innerHTML = "";
    Object.entries(activities).forEach(([name, activity]) => {
      const card = document.createElement("div");
      card.className = "activity-card";

      const title = document.createElement("h4");
      title.textContent = name;
      card.appendChild(title);

      const desc = document.createElement("div");
      desc.textContent = activity.description || "";
      card.appendChild(desc);

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = `Schedule: ${activity.schedule || "TBD"}`;
      card.appendChild(meta);

      const spotsLeft =
        typeof activity.max_participants === "number" && Array.isArray(activity.participants)
          ? Math.max(activity.max_participants - activity.participants.length, 0)
          : null;

      if (spotsLeft !== null) {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = `${spotsLeft} spots left`;
        card.appendChild(badge);
      }

      // --- Participants section ---
      const participantsSection = document.createElement("div");
      participantsSection.className = "participants";

      const participantsTitle = document.createElement("h5");
      participantsTitle.textContent = "Participants";
      participantsSection.appendChild(participantsTitle);

      if (Array.isArray(activity.participants) && activity.participants.length > 0) {
        const ul = document.createElement("ul");
        activity.participants.forEach(email => {
          const li = document.createElement("li");
          li.className = "participant-item";

          const span = document.createElement("span");
          span.className = "participant-email";
          span.textContent = email;

          // Delete button (trash icon)
          const btn = document.createElement("button");
          btn.className = "participant-remove";
          btn.setAttribute("aria-label", `Remove ${email} from ${name}`);
          btn.title = `Remove ${email}`;
          btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M3 6h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          `;

          // Click handler to remove participant
          btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (!confirm(`Remove ${email} from ${name}?`)) return;

            try {
              const url = `/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(email)}`;
              const res = await fetch(url, { method: "DELETE" });
              const data = await res.json().catch(() => ({}));

              if (!res.ok) {
                const detail = (data && data.detail) ? data.detail : 'Failed to remove participant';
                setMessage(detail, false);
              } else {
                setMessage(data.message || 'Participant removed', true);
                // Refresh activities to update UI
                await fetchActivities();
              }
            } catch (err) {
              setMessage('Network error. Please try again.', false);
            }
          });

          li.appendChild(span);
          li.appendChild(btn);
          ul.appendChild(li);
        });
        participantsSection.appendChild(ul);
      } else {
        const empty = document.createElement("div");
        empty.className = "no-participants";
        empty.textContent = "No participants yet";
        participantsSection.appendChild(empty);
      }

      card.appendChild(participantsSection);

      activitiesList.appendChild(card);
    });
  }

  // Sign up submit handler
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const activityName = activitySelect.value;

    if (!email || !activityName) return;

    setMessage("", true);

    try {
      const url = `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`;
      const res = await fetch(url, { method: "POST" });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // FastAPI returns 400 when duplicate
        const detail = (data && data.detail) ? data.detail : "Unknown error";
        setMessage(detail, false);
      } else {
        setMessage(data.message || "Signed up successfully!", true);
        await fetchActivities(); // refresh list & spots
        signupForm.reset();
      }
    } catch (err) {
      setMessage("Network error. Please try again.", false);
    }
  });

  function setMessage(text, ok) {
    messageDiv.classList.remove("hidden", "msg-ok", "msg-err");
    messageDiv.classList.add(ok ? "msg-ok" : "msg-err");
    messageDiv.textContent = text;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  // Initial load
  fetchActivities();
});

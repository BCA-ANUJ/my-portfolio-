"use strict";

const loginView = document.getElementById("adminLogin");
const dashboard = document.getElementById("adminDashboard");
const loginForm = document.getElementById("adminLoginForm");
const loginStatus = document.getElementById("loginStatus");
const adminNotice = document.getElementById("adminNotice");
const profileForm = document.getElementById("profileForm");
const itemDialog = document.getElementById("itemDialog");
const itemForm = document.getElementById("itemForm");
const dialogFields = document.getElementById("dialogFields");
const sections = {
    projects: {
        label: "Project",
        list: "projectsList",
        fields: [
            ["title", "Project name", true],
            ["type", "Category", false],
            ["description", "Description", true],
            ["tech", "Technologies", false],
            ["link", "Project link", true],
            ["icon", "Font Awesome icon class", false]
        ]
    },
    skills: {
        label: "Skill",
        list: "skillsList",
        fields: [
            ["name", "Skill name", true],
            ["icon", "Font Awesome icon class", false],
            ["colorClass", "Icon color class (optional)", false]
        ]
    },
    journey: {
        label: "Journey entry",
        list: "journeyList",
        fields: [
            ["period", "Date or status", false],
            ["title", "Title", true],
            ["organization", "School or organization", false],
            ["description", "Description", false],
            ["icon", "Font Awesome icon class", false]
        ]
    },
    certifications: {
        label: "Certification",
        list: "certificationsList",
        fields: [
            ["name", "Certificate or course", true],
            ["issuer", "Issuer or subject", false],
            ["icon", "Font Awesome icon class", false],
            ["file", "Published PDF filename (optional)", false]
        ]
    },
    strengths: {
        label: "Strength",
        list: "strengthsList",
        fields: [
            ["name", "Strength", true],
            ["icon", "Font Awesome icon class", false]
        ]
    },
    socials: {
        label: "Social link",
        list: "socialsList",
        fields: [
            ["label", "Platform name", true],
            ["url", "Profile URL", true],
            ["icon", "Font Awesome icon class", false]
        ]
    }
};

let content = null;
let messages = [];
let feedback = [];
let editing = { section: "", index: -1 };

async function api(url, options = {}) {
    const response = await fetch(url, {
        credentials: "same-origin",
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers
        }
    });
    let result = {};
    try {
        result = await response.json();
    } catch {
        throw new Error("The server returned an unexpected response.");
    }
    if (!response.ok) {
        throw new Error(result.error || "The request could not be completed.");
    }
    return result;
}

function showNotice(message, isError = false) {
    adminNotice.textContent = message;
    adminNotice.classList.toggle("is-error", isError);
    adminNotice.classList.add("visible");
    window.clearTimeout(showNotice.timeout);
    showNotice.timeout = window.setTimeout(() => adminNotice.classList.remove("visible"), 4500);
}

function showLogin(message = "", isError = false) {
    loginView.hidden = false;
    dashboard.hidden = true;
    loginStatus.textContent = message;
    loginStatus.classList.toggle("is-error", isError);
}

function showDashboard() {
    loginView.hidden = true;
    dashboard.hidden = false;
}

function createIcon(icon, className = "") {
    const element = document.createElement("i");
    element.className = `${icon || "fa-solid fa-circle"} ${className}`.trim();
    element.setAttribute("aria-hidden", "true");
    return element;
}

function createText(tagName, className, value) {
    const element = document.createElement(tagName);
    element.className = className;
    element.textContent = value || "";
    return element;
}

function renderProfile() {
    const profile = content.profile;
    const contact = content.contact;
    for (const [name, value] of Object.entries({
        name: profile.name,
        headline: profile.headline,
        tagline: profile.tagline,
        objective: profile.objective,
        email: profile.email,
        location: profile.location,
        permanentLocation: profile.permanentLocation,
        eyebrow: contact.eyebrow,
        contactTitle: contact.title,
        contactDescription: contact.description
    })) {
        profileForm.elements.namedItem(name).value = value || "";
    }
}

function renderCollection(section) {
    const config = sections[section];
    const container = document.getElementById(config.list);
    container.replaceChildren();

    if (!content[section].length) {
        container.append(createText("p", "admin-empty-state", `No ${config.label.toLowerCase()}s yet. Add one to get started.`));
        return;
    }

    content[section].forEach((item, index) => {
        const card = document.createElement("article");
        card.className = "admin-item-card";
        const icon = createIcon(item.icon, "admin-item-icon");
        const details = document.createElement("div");
        details.className = "admin-item-details";

        const title = item.title || item.name || item.label;
        details.append(createText("h3", "", title));
        const subtitle = section === "projects"
            ? item.type
            : section === "skills"
                ? "Resume skill"
                : section === "journey"
                    ? [item.period, item.organization].filter(Boolean).join(" · ")
                    : section === "certifications"
                        ? item.file || item.issuer || "Certificate or course"
                        : section === "strengths"
                            ? "Personal strength"
                            : item.url;
        details.append(createText("p", "", subtitle));

        const actions = document.createElement("div");
        actions.className = "admin-item-actions";
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "admin-icon-button";
        editButton.setAttribute("aria-label", `Edit ${title}`);
        editButton.append(createIcon("fa-solid fa-pen"));
        editButton.addEventListener("click", () => openItemDialog(section, index));
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "admin-icon-button is-danger";
        deleteButton.setAttribute("aria-label", `Delete ${title}`);
        deleteButton.append(createIcon("fa-solid fa-trash"));
        deleteButton.addEventListener("click", () => deleteItem(section, index));
        actions.append(editButton, deleteButton);
        card.append(icon, details, actions);
        container.append(card);
    });
}

function updateStats() {
    document.getElementById("projectStat").textContent = String(content.projects.length);
    document.getElementById("skillStat").textContent = String(content.skills.length);
    document.getElementById("messageStat").textContent = String(messages.length);
    document.getElementById("messageNavCount").textContent = String(messages.length);
    document.getElementById("feedbackStat").textContent = String(feedback.length);
    document.getElementById("feedbackNavCount").textContent = String(feedback.length);
    document.getElementById("feedbackTotal").textContent = String(feedback.length);
    const average = feedback.length
        ? feedback.reduce((total, entry) => total + entry.rating, 0) / feedback.length
        : 0;
    document.getElementById("averageRating").textContent =
        average ? average.toFixed(1) : "—";
}

function renderMessages() {
    const container = document.getElementById("messagesList");
    container.replaceChildren();
    if (!messages.length) {
        container.append(createText("p", "admin-empty-state", "Your inbox is clear. New contact form submissions will appear here."));
        return;
    }
    messages.forEach((message) => {
        const card = document.createElement("article");
        card.className = "admin-message-card";
        const heading = document.createElement("div");
        heading.className = "admin-message-heading";
        const identity = document.createElement("div");
        const identityHeader = document.createElement("div");
        identityHeader.className = "admin-message-name-row";
        identity.append(
            identityHeader,
            message.email
                ? createText("a", "admin-message-email", message.email)
                : createText("p", "admin-message-email", "No reply email provided")
        );
        identityHeader.append(
            createText("h3", "", message.name || "Visitor"),
            createText(
                "span",
                `admin-message-type ${message.type === "chat" ? "is-chat" : "is-inquiry"}`,
                message.type === "chat" ? "Chat message" : "Enquiry"
            )
        );
        if (message.email) {
            identity.querySelector("a").href = `mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`;
        }
        const date = new Date(`${message.created_at.replace(" ", "T")}Z`);
        heading.append(identity, createText("time", "admin-message-date",
            Number.isNaN(date.getTime()) ? message.created_at : date.toLocaleString()));
        card.append(heading);
        if (message.category && !["chat", "general"].includes(message.category)) {
            card.append(createText("span", "admin-message-category",
                message.category === "project" ? "Project enquiry" :
                    message.category === "collaboration" ? "Collaboration" : "Question"));
        }
        card.append(createText("h4", "admin-message-subject", message.subject));
        card.append(createText("p", "admin-message-body", message.message));
        if (message.email) {
            const reply = createText("a", "admin-reply-link", "Reply by email");
            reply.href = `mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`;
            reply.append(createIcon("fa-solid fa-arrow-up-right-from-square"));
            card.append(reply);
        }
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "admin-text-button is-danger";
        remove.textContent = "Delete message";
        remove.addEventListener("click", () => deleteMessage(message.id));
        card.append(remove);
        container.append(card);
    });
}

function renderFeedback() {
    const container = document.getElementById("feedbackList");
    container.replaceChildren();
    if (!feedback.length) {
        container.append(createText(
            "p",
            "admin-empty-state",
            "No website feedback yet. Visitor ratings and suggestions will appear here."
        ));
        return;
    }
    feedback.forEach((entry) => {
        const card = document.createElement("article");
        card.className = "admin-message-card admin-feedback-card";
        const heading = document.createElement("div");
        heading.className = "admin-message-heading";
        heading.append(
            createText("h3", "", entry.name || "Anonymous visitor"),
            createText("time", "admin-message-date",
                new Date(`${entry.created_at.replace(" ", "T")}Z`).toLocaleString())
        );
        const stars = createText(
            "p",
            "admin-feedback-stars",
            `${"★".repeat(entry.rating)}${"☆".repeat(5 - entry.rating)}`
        );
        stars.setAttribute("aria-label", `${entry.rating} out of 5 stars`);
        card.append(heading, stars);
        card.append(createText(
            "p",
            "admin-message-body",
            entry.message || "Visitor shared a rating without a written suggestion."
        ));
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "admin-text-button is-danger";
        remove.textContent = "Delete feedback";
        remove.addEventListener("click", () => deleteFeedback(entry.id));
        card.append(remove);
        container.append(card);
    });
}

async function loadMessages() {
    messages = await api("/api/admin/messages");
    renderMessages();
    updateStats();
}

async function loadFeedback() {
    feedback = await api("/api/admin/feedback");
    renderFeedback();
    updateStats();
}

async function loadDashboard() {
    [content, messages, feedback] = await Promise.all([
        api("/api/admin/content"),
        api("/api/admin/messages"),
        api("/api/admin/feedback")
    ]);
    renderProfile();
    Object.keys(sections).forEach(renderCollection);
    renderMessages();
    updateStats();
    showDashboard();
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = loginForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    loginStatus.textContent = "Signing in…";
    try {
        await api("/api/admin/login", {
            method: "POST",
            body: JSON.stringify({
                username: loginForm.elements.username.value,
                password: loginForm.elements.password.value
            })
        });
        loginForm.reset();
        await loadDashboard();
    } catch (error) {
        showLogin(error.message, true);
    } finally {
        submit.disabled = false;
    }
});

profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(profileForm);
    const nextContent = {
        ...content,
        profile: {
        name: form.get("name").trim(),
        headline: form.get("headline").trim(),
        tagline: form.get("tagline").trim(),
        objective: form.get("objective").trim(),
        email: form.get("email").trim(),
        location: form.get("location").trim(),
        permanentLocation: form.get("permanentLocation").trim()
        },
        contact: {
        eyebrow: form.get("eyebrow").trim(),
        title: form.get("contactTitle").trim(),
        description: form.get("contactDescription").trim()
        }
    };
    content = nextContent;
    await saveContent("Profile and contact details saved.");
});

async function saveContent(successMessage) {
    const previousContent = content;
    try {
        content = await api("/api/admin/content", {
            method: "PUT",
            body: JSON.stringify(content)
        });
        showNotice(successMessage);
        return true;
    } catch (error) {
        content = previousContent;
        showNotice(error.message, true);
        return false;
    }
}

function openItemDialog(section, index = -1) {
    editing = { section, index };
    const config = sections[section];
    const item = index < 0 ? {} : content[section][index];
    document.getElementById("dialogTitle").textContent =
        `${index < 0 ? "Add" : "Edit"} ${config.label.toLowerCase()}`;
    dialogFields.replaceChildren();
    config.fields.forEach(([key, label, required]) => {
        const fieldLabel = document.createElement("label");
        fieldLabel.textContent = label;
        const input = key === "description" ? document.createElement("textarea") : document.createElement("input");
        input.name = key;
        input.value = item[key] || "";
        input.maxLength = key === "description" ? 500 : 500;
        input.required = required;
        if (key === "url") {
            input.type = "url";
        }
        if (key === "link") {
            input.placeholder = "https://example.com, calculator.html, or #home";
        }
        if (key === "description") {
            input.rows = 4;
        }
        fieldLabel.append(input);
        dialogFields.append(fieldLabel);
    });
    itemDialog.showModal();
    dialogFields.querySelector("input, textarea")?.focus();
}

itemForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const config = sections[editing.section];
    const item = Object.fromEntries(new FormData(itemForm).entries());
    const previousContent = content;
    const items = [...content[editing.section]];
    if (editing.index < 0) {
        items.push(item);
    } else {
        items[editing.index] = item;
    }
    content = { ...content, [editing.section]: items };
    try {
        content = await api("/api/admin/content", {
            method: "PUT",
            body: JSON.stringify(content)
        });
        renderCollection(editing.section);
        itemDialog.close();
        showNotice(`${config.label} saved.`);
        updateStats();
    } catch (error) {
        content = previousContent;
        showNotice(error.message, true);
    }
});

async function deleteItem(section, index) {
    const title = content[section][index].title
        || content[section][index].name || content[section][index].label;
    if (!window.confirm(`Delete "${title}" from your portfolio?`)) {
        return;
    }
    const previousContent = content;
    content = {
        ...content,
        [section]: content[section].filter((_, itemIndex) => itemIndex !== index)
    };
    if (!await saveContent(`${sections[section].label} deleted.`)) {
        content = previousContent;
        return;
    }
    renderCollection(section);
    updateStats();
}

async function deleteMessage(id) {
    if (!window.confirm("Delete this message from your inbox?")) {
        return;
    }
    try {
        await api(`/api/admin/messages/${id}`, { method: "DELETE" });
        messages = messages.filter((message) => message.id !== id);
        renderMessages();
        updateStats();
        showNotice("Message deleted.");
    } catch (error) {
        showNotice(error.message, true);
    }
}

async function deleteFeedback(id) {
    if (!window.confirm("Delete this website feedback?")) {
        return;
    }
    try {
        await api(`/api/admin/messages/${id}`, { method: "DELETE" });
        feedback = feedback.filter((entry) => entry.id !== id);
        renderFeedback();
        updateStats();
        showNotice("Feedback deleted.");
    } catch (error) {
        showNotice(error.message, true);
    }
}

document.querySelector(".admin-nav").addEventListener("click", (event) => {
    const button = event.target.closest("[data-section]");
    if (button) {
        setSection(button.dataset.section);
    }
});

document.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => setSection(button.dataset.go));
});

function setSection(section) {
    document.querySelectorAll(".admin-nav [data-section]").forEach((button) => {
        button.classList.toggle("active", button.dataset.section === section);
    });
    document.querySelectorAll(".admin-panel").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.panel === section);
    });
    const activeButton = document.querySelector(`.admin-nav [data-section="${section}"]`);
    const pageTitle = activeButton.cloneNode(true);
    pageTitle.querySelectorAll("i, span").forEach((element) => element.remove());
    document.getElementById("adminPageTitle").textContent = pageTitle.textContent.trim();
    if (section === "messages") {
        loadMessages().catch((error) => showNotice(error.message, true));
    }
    if (section === "feedback") {
        loadFeedback().catch((error) => showNotice(error.message, true));
    }
}

document.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => openItemDialog(button.dataset.add));
});
document.getElementById("refreshMessages").addEventListener("click", () => {
    loadMessages().then(() => showNotice("Inbox refreshed."))
        .catch((error) => showNotice(error.message, true));
});
document.getElementById("refreshFeedback").addEventListener("click", () => {
    loadFeedback().then(() => showNotice("Website feedback refreshed."))
        .catch((error) => showNotice(error.message, true));
});
document.getElementById("closeDialog").addEventListener("click", () => itemDialog.close());
document.getElementById("cancelDialog").addEventListener("click", () => itemDialog.close());
itemDialog.addEventListener("click", (event) => {
    if (event.target === itemDialog) {
        itemDialog.close();
    }
});

document.getElementById("logoutButton").addEventListener("click", async () => {
    try {
        await api("/api/admin/logout", { method: "POST", body: "{}" });
        content = null;
        messages = [];
        showLogin();
    } catch (error) {
        showNotice(error.message, true);
    }
});

api("/api/admin/session")
    .then((session) => session.authenticated ? loadDashboard() : showLogin())
    .catch((error) => showLogin(`${error.message} Start the portfolio server and reload this page.`, true));

window.setInterval(async () => {
    if (dashboard.hidden) {
        return;
    }
    try {
        await Promise.all([loadMessages(), loadFeedback()]);
    } catch (error) {
        showNotice(error.message, true);
    }
}, 30_000);


const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");

    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute(
        "aria-label",
        isOpen ? "Close navigation" : "Open navigation"
    );

    menuToggle.innerHTML = isOpen
        ? '<i class="fa-solid fa-xmark"></i>'
        : '<i class="fa-solid fa-bars"></i>';
});

navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
        navLinks.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Open navigation");
        menuToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
    });
});

document.getElementById("year").textContent =
    new Date().getFullYear();

    
const themeToggle = document.getElementById("themeToggle");

function setTheme(isDark) {
    document.body.classList.toggle("dark-mode", isDark);
    themeToggle.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
    themeToggle.setAttribute("aria-pressed", String(isDark));
}

setTheme(localStorage.getItem("theme") === "dark");

themeToggle.addEventListener("click", () => {
    const isDark = !document.body.classList.contains("dark-mode");
    setTheme(isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
});

function makeIcon(className, colorClass = "") {
    const icon = document.createElement("i");
    icon.className = `${className || "fa-solid fa-circle"} ${colorClass}`.trim();
    icon.setAttribute("aria-hidden", "true");
    return icon;
}

function makeText(tagName, className, value) {
    const element = document.createElement(tagName);
    element.className = className;
    element.textContent = value || "";
    return element;
}

function renderPortfolio(content) {
    const nameParts = content.profile.name.trim().split(/\s+/);
    document.getElementById("profileFirstName").textContent = nameParts.shift().toUpperCase();
    document.getElementById("profileLastName").textContent = nameParts.join(" ").toUpperCase();
    document.getElementById("profileHeadline").textContent = content.profile.headline;
    document.getElementById("profileLocation").textContent = content.profile.location;
    document.getElementById("profileTagline").textContent = content.profile.tagline;
    document.getElementById("profileObjective").textContent = content.profile.objective;
    document.getElementById("aboutLocation").textContent = content.profile.location;
    document.getElementById("homeLocation").textContent = content.profile.permanentLocation;
    const contactEmail = document.getElementById("contactEmail");
    contactEmail.href = `mailto:${content.profile.email}`;
    contactEmail.textContent = content.profile.email;
    document.querySelectorAll(".brand strong, .footer-brand span").forEach((element) => {
        element.textContent = content.profile.name;
    });

    const socialLinks = document.getElementById("socialLinks");
    socialLinks.replaceChildren();
    content.socials.forEach((social) => {
        const link = document.createElement("a");
        link.href = social.url;
        link.setAttribute("aria-label", social.label);
        link.title = social.label;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.append(makeIcon(social.icon));
        socialLinks.append(link);
    });

    const projects = document.getElementById("projectGrid");
    projects.replaceChildren();
    content.projects.forEach((project, index) => {
        const card = document.createElement("article");
        card.className = "project-card";
        const visual = document.createElement("div");
        visual.className = `project-visual visual-${["one", "two", "three"][index % 3]}`;
        visual.append(makeIcon(project.icon));
        visual.append(makeText("span", "", String(index + 1).padStart(2, "0")));
        card.append(visual);
        card.append(makeText("p", "project-type", project.type));
        card.append(makeText("h3", "", project.title));
        card.append(makeText("p", "", project.description));
        const footer = document.createElement("div");
        footer.className = "project-footer";
        footer.append(makeText("span", "", project.tech));
        const link = document.createElement("a");
        link.href = project.link || "#work";
        link.setAttribute("aria-label", `Open ${project.title}`);
        link.append(makeIcon("fa-solid fa-arrow-up-right-from-square"));
        if (/^https?:\/\//i.test(project.link)) {
            link.target = "_blank";
            link.rel = "noopener noreferrer";
        }
        footer.append(link);
        card.append(footer);
        projects.append(card);
    });

    const skills = document.getElementById("skillGrid");
    skills.replaceChildren();
    content.skills.forEach((skill) => {
        const item = document.createElement("div");
        item.className = "skill-item";
        item.append(makeIcon(skill.icon, skill.colorClass));
        item.append(makeText("span", "", skill.name));
        skills.append(item);
    });

    const heroSkills = document.querySelector(".tech-icons");
    heroSkills.replaceChildren();
    heroSkills.setAttribute(
        "aria-label",
        `Skills and applications: ${content.skills.map((skill) => skill.name).join(", ")}`
    );
    content.skills.slice(0, 6).forEach((skill) => {
        const icon = makeIcon(skill.icon, `hero-skill-icon ${skill.colorClass}`);
        icon.title = skill.name;
        heroSkills.append(icon);
    });

    const strengths = document.getElementById("strengthGrid");
    strengths.replaceChildren();
    content.strengths.forEach((strength) => {
        const chip = makeText("span", "strength-chip", "");
        chip.append(makeIcon(strength.icon));
        chip.append(document.createTextNode(strength.name));
        strengths.append(chip);
    });

    const certifications = document.getElementById("certificationGrid");
    certifications.replaceChildren();
    content.certifications.forEach((certificate) => {
        const card = document.createElement("article");
        card.className = "certification-card";
        card.append(makeIcon(certificate.icon));
        const details = document.createElement("div");
        details.className = "certification-details";
        details.append(makeText("span", "certification-name", certificate.name));
        if (certificate.issuer) {
            details.append(makeText("small", "certification-issuer", certificate.issuer));
        }
        card.append(details);
        if (certificate.file) {
            const link = makeText("a", "certification-link", "View certificate");
            link.href = `/${certificate.file}`;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.setAttribute("aria-label", `View certificate: ${certificate.name}`);
            link.append(makeIcon("fa-solid fa-arrow-up-right-from-square"));
            card.append(link);
        }
        certifications.append(card);
    });

    const journey = document.getElementById("journeyList");
    journey.replaceChildren();
    content.journey.forEach((entry) => {
        const card = document.createElement("article");
        card.className = "experience-card";
        const iconWrap = document.createElement("div");
        iconWrap.className = "experience-icon";
        iconWrap.append(makeIcon(entry.icon));
        const details = document.createElement("div");
        details.append(makeText("span", "experience-date", entry.period));
        details.append(makeText("h3", "", entry.title));
        if (entry.organization) {
            details.append(makeText("p", "", entry.organization));
        }
        if (entry.description) {
            details.append(makeText("p", "muted", entry.description));
        }
        card.append(iconWrap, details);
        journey.append(card);
    });

    document.getElementById("contactEyebrow").textContent = content.contact.eyebrow;
    const contactTitle = document.getElementById("contactTitle");
    contactTitle.replaceChildren(document.createTextNode(content.contact.title.replace(/[.!?]+$/, "")));
    contactTitle.append(makeText("span", "", "."));
    document.getElementById("contactDescription").textContent = content.contact.description;
}

fetch("/api/content")
    .then((response) => {
        if (!response.ok) {
            throw new Error("Portfolio content could not be loaded.");
        }
        return response.json();
    })
    .then(renderPortfolio)
    .catch((error) => {
        const message = document.getElementById("contactMessage");
        if (message) {
            message.textContent = `${error.message} Start the portfolio server to load the latest content.`;
            message.classList.add("is-error");
        }
    });

const contactForm = document.getElementById("contactForm");
async function submitPortfolioMessage(form, type, status) {
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    status.classList.remove("is-error");
    status.textContent = "Sending your message…";
    const body = Object.fromEntries(new FormData(form).entries());
    body.type = type;
    try {
        const response = await fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Your message could not be sent.");
        }
        status.textContent = result.message;
        form.reset();
        return true;
    } catch (error) {
        status.textContent = error.message || "Unable to reach the server. Please try again.";
        status.classList.add("is-error");
        return false;
    } finally {
        submitButton.disabled = false;
    }
}

contactForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const sent = await submitPortfolioMessage(
        contactForm,
        "inquiry",
        document.getElementById("contactMessage")
    );
    if (sent) {
        window.location.assign("/thank-you.html?type=inquiry");
    }
});

const feedbackForm = document.getElementById("feedbackForm");
feedbackForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const sent = await submitPortfolioMessage(
        feedbackForm,
        "feedback",
        document.getElementById("feedbackMessage")
    );
    if (sent) {
        window.location.assign("/thank-you.html?type=feedback");
    }
});

const chatLauncher = document.getElementById("chatLauncher");
const chatPanel = document.getElementById("chatPanel");
const chatClose = document.getElementById("chatClose");
const chatForm = document.getElementById("chatForm");

function toggleChat(open) {
    chatPanel.hidden = !open;
    chatLauncher.setAttribute("aria-expanded", String(open));
    chatLauncher.innerHTML = open
        ? '<i class="fa-solid fa-xmark" aria-hidden="true"></i><span>Close chat</span>'
        : '<i class="fa-regular fa-comment-dots" aria-hidden="true"></i><span>Chat with me</span>';
    if (open) {
        document.getElementById("chatText").focus();
    } else {
        chatLauncher.focus();
    }
}

chatLauncher?.addEventListener("click", () => toggleChat(chatPanel.hidden));
chatClose?.addEventListener("click", () => toggleChat(false));
chatForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const sent = await submitPortfolioMessage(
        chatForm,
        "chat",
        document.getElementById("chatMessage")
    );
    if (sent) {
        window.location.assign("/thank-you.html?type=chat");
    }
});
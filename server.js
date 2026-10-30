"use strict";

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { randomBytes, scryptSync, timingSafeEqual } = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 64 * 1024;
const sessions = new Map();
const loginAttempts = new Map();
const contactAttempts = new Map();
const certificateFiles = new Set([
    "certificate-kyp.pdf",
    "certificate-tally-accounting.pdf",
    "certificate-design-thinking-beginners.pdf",
    "certificate-corporate-ai-training-1.pdf",
    "certificate-corporate-ai-training-2.pdf",
    "certificate-corporate-ai-training-3.pdf",
    "certificate-introduction-generative-ai-studio.pdf"
]);
const port = Number(process.env.PORT || 3000);

if (fs.existsSync(path.join(ROOT, ".env"))) {
    process.loadEnvFile(path.join(ROOT, ".env"));
}

const adminUsername = process.env.ADMIN_USERNAME;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminUsername || !adminPassword || adminPassword.length < 12) {
    throw new Error(
        "Set ADMIN_USERNAME and an ADMIN_PASSWORD of at least 12 characters in .env."
    );
}

const production = process.env.NODE_ENV === "production";
if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port number.");
}

let siteUrl;
if (process.env.SITE_URL) {
    try {
        siteUrl = new URL(process.env.SITE_URL);
    } catch {
        throw new Error("SITE_URL must be a valid absolute website URL.");
    }
    if (!["https:", "http:"].includes(siteUrl.protocol)
        || siteUrl.pathname !== "/" || siteUrl.search || siteUrl.hash
        || siteUrl.username || siteUrl.password) {
        throw new Error("SITE_URL must contain only the origin, with no path or credentials.");
    }
} else if (production) {
    throw new Error("Set SITE_URL to your HTTPS domain before starting in production.");
} else {
    siteUrl = new URL(`http://localhost:${port}`);
}

if (production && siteUrl.protocol !== "https:") {
    throw new Error("SITE_URL must use HTTPS in production.");
}

const publicSiteUrl = siteUrl.origin;
const analyticsMeasurementId = process.env.GOOGLE_ANALYTICS_ID || "";
if (analyticsMeasurementId && !/^G-[A-Z0-9]+$/.test(analyticsMeasurementId)) {
    throw new Error("GOOGLE_ANALYTICS_ID must be a valid GA4 measurement ID (G-XXXXXXXXXX).");
}

const adminPasswordHash = scryptSync(adminPassword, "portfolio-admin-password", 64);
const dbPath = path.join(DATA_DIR, "portfolio.sqlite");
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS portfolio_content (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        content TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS contact_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        type TEXT NOT NULL DEFAULT 'inquiry',
        rating INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
`);

const messageColumns = new Set(
    db.prepare("PRAGMA table_info(contact_messages)").all().map((column) => column.name)
);
for (const [column, definition] of [
    ["category", "TEXT NOT NULL DEFAULT 'general'"],
    ["type", "TEXT NOT NULL DEFAULT 'inquiry'"],
    ["rating", "INTEGER"]
]) {
    if (!messageColumns.has(column)) {
        db.exec(`ALTER TABLE contact_messages ADD COLUMN ${column} ${definition}`);
    }
}

const initialContent = {
    profile: {
        name: "Anuj Kumar",
        headline: "ASPIRING SOFTWARE DEVELOPER",
        tagline: "Motivated BCA student building a strong foundation in programming, computer applications and software development.",
        objective: "Motivated and hardworking first-year BCA student with a strong interest in software development and computer technology. Developing practical programming skills and working towards a career as a professional software developer.",
        email: "anujpc2026@gmail.com",
        location: "Haryana, India",
        permanentLocation: "Bihar, India"
    },
    socials: [
        { label: "GitHub", url: "https://github.com/BCA-ANUJ", icon: "fa-brands fa-github" },
        { label: "LinkedIn", url: "https://www.linkedin.com/in/anuj-kumar-395b92430", icon: "fa-brands fa-linkedin-in" },
        { label: "Instagram", url: "https://www.instagram.com/anuj_vlogger_50k", icon: "fa-brands fa-instagram" },
        { label: "YouTube", url: "https://www.youtube.com/", icon: "fa-brands fa-youtube" }
    ],
    projects: [
        {
            title: "Personal Portfolio",
            type: "WEB DEVELOPMENT",
            description: "A personal website showcasing my profile, projects and skills.",
            tech: "HTML · CSS · JavaScript",
            link: "#home",
            icon: "fa-solid fa-laptop-code"
        },
        {
            title: "Calculator App",
            type: "JAVASCRIPT",
            description: "A responsive calculator with keyboard and touch controls.",
            tech: "HTML · CSS · JavaScript",
            link: "calculator.html",
            icon: "fa-solid fa-calculator"
        },
        {
            title: "Login Page",
            type: "UI DEVELOPMENT",
            description: "A responsive sign-in interface designed as a front-end demo.",
            tech: "HTML · CSS",
            link: "login.html",
            icon: "fa-solid fa-window-maximize"
        }
    ],
    skills: [
        { name: "HTML5", icon: "fa-brands fa-html5", colorClass: "html" },
        { name: "CSS3", icon: "fa-brands fa-css3-alt", colorClass: "css" },
        { name: "JavaScript", icon: "fa-brands fa-js", colorClass: "js" },
        { name: "Basic programming concepts", icon: "fa-solid fa-code", colorClass: "cpp" },
        { name: "MS Office", icon: "fa-solid fa-file-word", colorClass: "css" },
        { name: "Microsoft Word", icon: "fa-solid fa-file-lines", colorClass: "css" },
        { name: "Microsoft Excel", icon: "fa-solid fa-table-cells-large", colorClass: "python" },
        { name: "Internet & computer applications", icon: "fa-solid fa-computer", colorClass: "" },
        { name: "Tally & accounting", icon: "fa-solid fa-calculator", colorClass: "" }
    ],
    journey: [
        {
            period: "FIRST YEAR · PURSUING",
            title: "Bachelor of Computer Applications",
            organization: "",
            description: "Currently pursuing the first year of the Bachelor of Computer Applications.",
            icon: "fa-solid fa-graduation-cap"
        },
        {
            period: "COMPLETED",
            title: "12th · Senior Secondary",
            organization: "Gauri Shankar Secondary High School · Rohtas, Bihar",
            description: "Senior secondary education.",
            icon: "fa-solid fa-school"
        },
        {
            period: "COMPLETED",
            title: "10th · Secondary",
            organization: "Gauri Shankar Secondary High School · Rohtas, Bihar",
            description: "Secondary education.",
            icon: "fa-solid fa-graduation-cap"
        },
        {
            period: "CAREER GOAL",
            title: "Professional Software Developer",
            organization: "",
            description: "Build strong programming skills, gain practical experience and contribute to real-world software projects.",
            icon: "fa-solid fa-bullseye"
        }
    ],
    certifications: [
        {
            name: "ADCA · Advanced Diploma in Computer Applications",
            issuer: "ADCA",
            icon: "fa-solid fa-computer"
        },
        {
            name: "Tally & Accounting Certificate",
            issuer: "Tally & Accounting",
            icon: "fa-solid fa-calculator",
            file: "certificate-tally-accounting.pdf"
        },
        {
            name: "Kushal Yuva Program Certificate",
            issuer: "Kushal Yuva Program",
            icon: "fa-solid fa-award",
            file: "certificate-kyp.pdf"
        },
        {
            name: "Design Thinking for Beginners",
            icon: "fa-solid fa-lightbulb",
            file: "certificate-design-thinking-beginners.pdf"
        },
        {
            name: "Corporate AI Training Program",
            issuer: "Innovative AI Solutions",
            icon: "fa-solid fa-robot",
            file: "certificate-corporate-ai-training-1.pdf"
        },
        {
            name: "Corporate AI Training Program",
            issuer: "Innovative AI Solutions",
            icon: "fa-solid fa-robot",
            file: "certificate-corporate-ai-training-2.pdf"
        },
        {
            name: "Corporate AI Training Program",
            issuer: "Innovative AI Solutions",
            icon: "fa-solid fa-robot",
            file: "certificate-corporate-ai-training-3.pdf"
        },
        {
            name: "Introduction to Generative AI Studio",
            icon: "fa-solid fa-wand-magic-sparkles",
            file: "certificate-introduction-generative-ai-studio.pdf"
        }
    ],
    strengths: [
        { name: "Self-motivated", icon: "fa-solid fa-bolt" },
        { name: "Hardworking & dedicated", icon: "fa-solid fa-heart" },
        { name: "Quick learner", icon: "fa-solid fa-lightbulb" },
        { name: "Positive attitude", icon: "fa-solid fa-face-smile" },
        { name: "Problem-solving mindset", icon: "fa-solid fa-puzzle-piece" },
        { name: "Responsible & disciplined", icon: "fa-solid fa-list-check" },
        { name: "Eager to learn", icon: "fa-solid fa-seedling" }
    ],
    contact: {
        eyebrow: "05 — CONTACT",
        title: "Let's build something meaningful.",
        description: "Have an idea, project or opportunity? Send me a message."
    }
};

if (!db.prepare("SELECT id FROM portfolio_content WHERE id = 1").get()) {
    db.prepare("INSERT INTO portfolio_content (id, content) VALUES (1, ?)").run(
        JSON.stringify(initialContent)
    );
} else {
    const existingContent = JSON.parse(
        db.prepare("SELECT content FROM portfolio_content WHERE id = 1").get().content
    );
    if (!existingContent.profile.objective) {
        const savedJourney = Array.isArray(existingContent.journey)
            ? existingContent.journey
            : [];
        existingContent.profile = {
            ...existingContent.profile,
            headline: "ASPIRING SOFTWARE DEVELOPER",
            tagline: initialContent.profile.tagline,
            objective: initialContent.profile.objective,
            email: "anujpc2026@gmail.com",
            location: "Haryana, India",
            permanentLocation: "Bihar, India"
        };
        existingContent.skills = initialContent.skills;
        for (const entry of initialContent.journey) {
            const alreadySaved = savedJourney.some((item) =>
                item.title === entry.title
                || (/career goal/i.test(entry.period) && /career goal/i.test(item.period))
            );
            if (!alreadySaved) {
                savedJourney.push(entry);
            }
        }
        existingContent.journey = savedJourney.map((entry) => {
            if (/bachelor of computer applications/i.test(entry.title)) {
                return { ...initialContent.journey[0], ...entry,
                    period: "FIRST YEAR · PURSUING",
                    organization: "",
                    description: "Currently pursuing the first year of the Bachelor of Computer Applications."
                };
            }
            if (/career goal/i.test(entry.period)) {
                return {
                    ...entry,
                    title: initialContent.journey[3].title,
                    organization: "",
                    description: initialContent.journey[3].description,
                    icon: initialContent.journey[3].icon
                };
            }
            return entry;
        });
        existingContent.certifications = initialContent.certifications;
        existingContent.strengths = initialContent.strengths;
        db.prepare("UPDATE portfolio_content SET content = ? WHERE id = 1")
            .run(JSON.stringify(existingContent));
    }
    if (/^04\s*[—-]\s*CONTACT$/i.test(existingContent.contact?.eyebrow || "")) {
        existingContent.contact.eyebrow = initialContent.contact.eyebrow;
        db.prepare("UPDATE portfolio_content SET content = ? WHERE id = 1")
            .run(JSON.stringify(existingContent));
    }
    if (!Array.isArray(existingContent.certifications)) {
        existingContent.certifications = [];
    }
    let certificationsChanged = false;
    for (const certificate of initialContent.certifications) {
        if (!certificate.file) {
            continue;
        }
        let savedCertificate = existingContent.certifications.find(
            (item) => item.file === certificate.file
        );
        if (!savedCertificate && certificate.file === "certificate-tally-accounting.pdf") {
            savedCertificate = existingContent.certifications.find(
                (item) => /tally/i.test(item.name)
            );
        }
        if (savedCertificate) {
            if (savedCertificate.file !== certificate.file) {
                savedCertificate.file = certificate.file;
                certificationsChanged = true;
            }
            if (!certificate.issuer && savedCertificate.issuer === "Course certificate") {
                savedCertificate.issuer = "";
                certificationsChanged = true;
            }
        } else {
            existingContent.certifications.push(certificate);
            certificationsChanged = true;
        }
    }
    if (certificationsChanged) {
        db.prepare("UPDATE portfolio_content SET content = ? WHERE id = 1")
            .run(JSON.stringify(existingContent));
    }
}

const getContent = db.prepare("SELECT content FROM portfolio_content WHERE id = 1");
const saveContent = db.prepare(
    "UPDATE portfolio_content SET content = ? WHERE id = 1"
);
const addMessage = db.prepare(
    "INSERT INTO contact_messages (name, email, subject, message, category, type, rating) VALUES (?, ?, ?, ?, ?, ?, ?)"
);

function sendJson(response, status, data, headers = {}) {
    response.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        ...headers
    });
    response.end(JSON.stringify(data));
}

function invalidInput(message) {
    return Object.assign(new Error(message), { status: 400 });
}

function readBody(request) {
    return new Promise((resolve, reject) => {
        let body = "";
        request.on("data", (chunk) => {
            body += chunk;
            if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
                reject(Object.assign(new Error("Request body is too large."), { status: 413 }));
                request.destroy();
            }
        });
        request.on("end", () => {
            let parsed;
            try {
                parsed = JSON.parse(body || "{}");
            } catch {
                reject(Object.assign(new Error("Request body must be valid JSON."), { status: 400 }));
                return;
            }
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                reject(invalidInput("Request body must be a JSON object."));
                return;
            }
            resolve(parsed);
        });
        request.on("error", reject);
    });
}

function getCookie(request, name) {
    const cookieHeader = request.headers.cookie || "";
    const item = cookieHeader.split(";").map((value) => value.trim())
        .find((value) => value.startsWith(`${name}=`));
    return item ? item.slice(name.length + 1) : "";
}

function authenticated(request) {
    const token = getCookie(request, "portfolio_session");
    const expiresAt = sessions.get(token);
    if (!expiresAt || expiresAt < Date.now()) {
        sessions.delete(token);
        return false;
    }
    sessions.set(token, Date.now() + SESSION_TTL_MS);
    return true;
}

function requestIsSameOrigin(request) {
    const origin = request.headers.origin;
    if (!origin) {
        return false;
    }
    try {
        return new URL(origin).host === request.headers.host;
    } catch {
        return false;
    }
}

function isRateLimited(store, key, maximum, windowMs) {
    const now = Date.now();
    const recent = (store.get(key) || []).filter((time) => now - time < windowMs);
    recent.push(now);
    store.set(key, recent);
    return recent.length > maximum;
}

function text(value, field, maxLength, required = true) {
    if (typeof value !== "string") {
        throw invalidInput(`${field} must be text.`);
    }
    const result = value.trim();
    if ((required && !result) || result.length > maxLength) {
        throw invalidInput(`${field} is required and must be at most ${maxLength} characters.`);
    }
    return result;
}

function validUrl(value, field, required = false) {
    const result = text(value, field, 500, false);
    if (!result && required) {
        throw invalidInput(`${field} is required.`);
    }
    if (!result) {
        return "";
    }
    if (result.startsWith("#") || /^[a-zA-Z0-9_-]+\.html(?:#[\w-]+)?$/.test(result)) {
        return result;
    }
    let parsed;
    try {
        parsed = new URL(result);
    } catch {
        throw invalidInput(`${field} must be a valid URL or local page.`);
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
        throw invalidInput(`${field} must use HTTP or HTTPS.`);
    }
    return result;
}

function validateItems(items, section, fields) {
    if (!Array.isArray(items) || items.length > 100) {
        throw invalidInput(`${section} must be a list containing at most 100 items.`);
    }
    return items.map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
            throw invalidInput(`${section} entries must be objects.`);
        }
        const result = {};
        for (const [key, maxLength, isUrl, required] of fields) {
            const value = isUrl
                ? validUrl(item[key], `${section} ${key}`, required)
                : text(item[key], `${section} ${key}`, maxLength, Boolean(required));
            result[key] = value;
            if (!value && ["title", "name", "label"].includes(key)) {
                throw invalidInput(`${section} ${key} cannot be empty.`);
            }
        }
        return result;
    });
}

function validateContent(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw invalidInput("Portfolio content must be an object.");
    }
    const profile = value.profile || {};
    const contact = value.contact || {};
    const email = text(profile.email, "Email", 254);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw invalidInput("Email must be a valid email address.");
    }
    const certificationItems = Array.isArray(value.certifications)
        ? value.certifications.map((item) =>
            item && typeof item === "object" && !Array.isArray(item) && item.file === undefined
                ? { ...item, file: "" }
                : item
        )
        : value.certifications || [];
    return {
        profile: {
            name: text(profile.name, "Name", 80),
            headline: text(profile.headline, "Headline", 100),
            tagline: text(profile.tagline, "Tagline", 240),
            objective: text(profile.objective || "", "Career objective", 600, false),
            email,
            location: text(profile.location, "Current location", 100, false),
            permanentLocation: text(profile.permanentLocation || "", "Home state", 100, false)
        },
        socials: validateItems(value.socials, "Social links", [
            ["label", 50, false, true], ["url", 500, true, true], ["icon", 100]
        ]),
        projects: validateItems(value.projects, "Projects", [
            ["title", 100, false, true], ["type", 60], ["description", 500, false, true],
            ["tech", 180], ["link", 500, true, true], ["icon", 100]
        ]),
        skills: validateItems(value.skills, "Skills", [
            ["name", 60, false, true], ["icon", 100], ["colorClass", 30]
        ]),
        journey: validateItems(value.journey, "Journey", [
            ["period", 60], ["title", 120, false, true], ["organization", 160],
            ["description", 500], ["icon", 100]
        ]),
        certifications: validateItems(certificationItems, "Certifications", [
            ["name", 180, false, true], ["issuer", 120], ["icon", 100], ["file", 100]
        ]).map((certificate) => {
            if (certificate.file && !certificateFiles.has(certificate.file)) {
                throw invalidInput("Certificate PDF must be a published certificate file.");
            }
            return certificate;
        }),
        strengths: validateItems(value.strengths || [], "Strengths", [
            ["name", 80, false, true], ["icon", 100]
        ]),
        contact: {
            eyebrow: text(contact.eyebrow, "Contact label", 80),
            title: text(contact.title, "Contact heading", 180),
            description: text(contact.description, "Contact description", 500)
        }
    };
}

function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function addSocialMetadata(html, fileName) {
    const marker = '<meta name="site-seo" content="dynamic">';
    if (!html.includes(marker)) {
        return html;
    }
    const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || "Anuj Kumar | Portfolio";
    const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] || "";
    const pagePath = fileName === "index.html" ? "/" : `/${fileName}`;
    const pageUrl = new URL(pagePath, publicSiteUrl).href;
    const shareImage = new URL("/og-image.png", publicSiteUrl).href;
    const metadata = [
        `<link rel="canonical" href="${escapeHtml(pageUrl)}">`,
        '<meta property="og:type" content="website">',
        `<meta property="og:title" content="${escapeHtml(title)}">`,
        `<meta property="og:description" content="${escapeHtml(description)}">`,
        `<meta property="og:url" content="${escapeHtml(pageUrl)}">`,
        `<meta property="og:image" content="${escapeHtml(shareImage)}">`,
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta property="og:image:alt" content="Anuj Kumar, web developer and BCA student">',
        '<meta name="twitter:card" content="summary_large_image">',
        `<meta name="twitter:title" content="${escapeHtml(title)}">`,
        `<meta name="twitter:description" content="${escapeHtml(description)}">`,
        `<meta name="twitter:image" content="${escapeHtml(shareImage)}">`
    ].join("\n    ");
    return html.replace(marker, metadata);
}

function sendNotFound(request, response) {
    const html = fs.readFileSync(path.join(ROOT, "404.html"), "utf8");
    response.writeHead(404, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
    });
    response.end(request.method === "HEAD" ? undefined : html);
}

function serveStatic(request, response, pathname) {
    let fileName;
    try {
        fileName = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
    } catch {
        sendNotFound(request, response);
        return;
    }
    const allowed = new Set([
        "index.html", "calculator.html", "login.html", "admin.html", "faq.html",
        "privacy.html", "thank-you.html", "favicon.svg", "og-image.png",
        "404.html",
        "style.css", "script.js", "calculator.js", "login.js", "admin.js",
        "analytics.js", "thank-you.js",
        "resume.pdf", ...certificateFiles,
        "image anujkumar.png", "web profile image.png", "BACKGROUND IMAGE .png"
    ]);
    if (!allowed.has(fileName)) {
        sendNotFound(request, response);
        return;
    }
    const filePath = path.join(ROOT, fileName);
    if (!filePath.startsWith(`${ROOT}${path.sep}`)) {
        sendNotFound(request, response);
        return;
    }
    const types = {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".svg": "image/svg+xml; charset=utf-8"
    };
    response.writeHead(200, {
        "Content-Type": types[path.extname(filePath)] || "application/octet-stream",
        ...(fileName === "resume.pdf" || certificateFiles.has(fileName) ? {
            "Content-Disposition": fileName === "resume.pdf"
                ? 'attachment; filename="Anuj-Kumar-Resume.pdf"'
                : `inline; filename="${fileName}"`,
            "X-Robots-Tag": "noindex, noarchive"
        } : {}),
        "Cache-Control": path.extname(filePath) === ".html"
            ? "no-cache" : "public, max-age=3600"
    });
    if (request.method === "HEAD") {
        response.end();
        return;
    }
    if (path.extname(filePath) === ".html") {
        const html = addSocialMetadata(fs.readFileSync(filePath, "utf8"), fileName);
        response.end(html);
        return;
    }
    fs.createReadStream(filePath).pipe(response);
}

function serveRobots(request, response) {
    const content = [
        "User-agent: *",
        "Allow: /",
        "Disallow: /admin.html",
        "Disallow: /api/",
        `Sitemap: ${new URL("/sitemap.xml", publicSiteUrl).href}`,
        ""
    ].join("\n");
    response.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600"
    });
    response.end(request.method === "HEAD" ? undefined : content);
}

function serveSitemap(request, response) {
    const pages = ["/", "/calculator.html", "/login.html", "/faq.html", "/privacy.html"];
    const locations = pages.map((page) =>
        `    <url><loc>${escapeHtml(new URL(page, publicSiteUrl).href)}</loc></url>`
    );
    response.writeHead(200, {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600"
    });
    response.end(request.method === "HEAD"
        ? undefined
        : `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locations.join("\n")}\n</urlset>`);
}

const server = http.createServer(async (request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    let url;
    try {
        url = new URL(request.url, publicSiteUrl);
    } catch {
        sendNotFound(request, response);
        return;
    }

    const forwardedProtocol = request.headers["x-forwarded-proto"]?.split(",")[0].trim().toLowerCase();
    if (production && forwardedProtocol !== "https") {
        const secureUrl = new URL(publicSiteUrl);
        secureUrl.pathname = url.pathname;
        secureUrl.search = url.search;
        response.writeHead(308, {
            Location: secureUrl.href,
            "Cache-Control": "no-store"
        });
        response.end();
        return;
    }
    if (production) {
        response.setHeader("Strict-Transport-Security", "max-age=31536000");
    }

    const { pathname } = url;
    const method = request.method;

    try {
        if (pathname === "/robots.txt" && ["GET", "HEAD"].includes(method)) {
            serveRobots(request, response);
            return;
        }

        if (pathname === "/sitemap.xml" && ["GET", "HEAD"].includes(method)) {
            serveSitemap(request, response);
            return;
        }

        if (pathname === "/analytics-config.js" && ["GET", "HEAD"].includes(method)) {
            response.writeHead(200, {
                "Content-Type": "text/javascript; charset=utf-8",
                "Cache-Control": "no-store"
            });
            response.end(
                method === "HEAD"
                    ? undefined
                    : `window.PORTFOLIO_ANALYTICS_ID = ${JSON.stringify(analyticsMeasurementId)};`
            );
            return;
        }

        if (pathname.startsWith("/api/") && ["POST", "PUT", "DELETE"].includes(method)
            && !requestIsSameOrigin(request)) {
            sendJson(response, 403, { error: "Request origin could not be verified." });
            return;
        }

        if (pathname === "/api/content" && method === "GET") {
            sendJson(response, 200, JSON.parse(getContent.get().content), {
                "Cache-Control": "public, max-age=60"
            });
            return;
        }

        if (pathname === "/api/contact" && method === "POST") {
            const ip = request.socket.remoteAddress || "unknown";
            if (isRateLimited(contactAttempts, ip, 5, 60 * 60 * 1000)) {
                sendJson(response, 429, { error: "Please wait before sending another message." });
                return;
            }
            const body = await readBody(request);
            if (typeof body.website === "string" && body.website.trim()) {
                sendJson(response, 200, { message: "Thanks, your message has been received." });
                return;
            }
            const type = body.type === undefined ? "inquiry" : body.type;
            if (!["inquiry", "chat", "feedback"].includes(type)) {
                sendJson(response, 400, { error: "Choose a valid message type." });
                return;
            }
            const name = text(body.name || "", "Name", 100, type === "inquiry");
            const email = text(body.email || "", "Email", 254, type === "inquiry");
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                sendJson(response, 400, { error: "Enter a valid email address." });
                return;
            }
            let subject;
            let message;
            let category;
            let rating = null;
            if (type === "inquiry") {
                subject = text(body.subject, "Subject", 140);
                message = text(body.message, "Message", 4000);
                category = body.category || "general";
                if (!["project", "collaboration", "question", "general"].includes(category)) {
                    sendJson(response, 400, { error: "Choose a valid enquiry category." });
                    return;
                }
            } else if (type === "chat") {
                subject = "Quick chat message";
                message = text(body.message, "Message", 2000);
                category = "chat";
            } else {
                subject = "Website feedback";
                message = text(body.message || "", "Feedback", 2000, false);
                rating = Number(body.rating);
                if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
                    sendJson(response, 400, { error: "Choose a rating from 1 to 5 stars." });
                    return;
                }
                category = "feedback";
            }
            addMessage.run(name, email, subject, message, category, type, rating);
            const successMessage = type === "feedback"
                ? "Thank you for sharing your feedback!"
                : "Thanks, your message has been sent.";
            sendJson(response, 201, { message: successMessage });
            return;
        }

        if (pathname === "/api/admin/login" && method === "POST") {
            const ip = request.socket.remoteAddress || "unknown";
            if (isRateLimited(loginAttempts, ip, 5, 15 * 60 * 1000)) {
                sendJson(response, 429, { error: "Too many attempts. Please try again later." });
                return;
            }
            const body = await readBody(request);
            const username = typeof body.username === "string" ? body.username : "";
            const password = typeof body.password === "string" ? body.password : "";
            const passwordBuffer = Buffer.from(password);
            const validPassword = passwordBuffer.length <= 1024
                && timingSafeEqual(
                    adminPasswordHash,
                    scryptSync(password, "portfolio-admin-password", 64)
                );
            if (username !== adminUsername || !validPassword) {
                sendJson(response, 401, { error: "Incorrect username or password." });
                return;
            }
            loginAttempts.delete(ip);
            const token = randomBytes(32).toString("hex");
            sessions.set(token, Date.now() + SESSION_TTL_MS);
            sendJson(response, 200, { authenticated: true }, {
                "Set-Cookie": `portfolio_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
            });
            return;
        }

        if (pathname === "/api/admin/session" && method === "GET") {
            sendJson(response, 200, { authenticated: authenticated(request) });
            return;
        }

        if (pathname === "/api/admin/logout" && method === "POST") {
            sessions.delete(getCookie(request, "portfolio_session"));
            sendJson(response, 200, { authenticated: false }, {
                "Set-Cookie": "portfolio_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"
            });
            return;
        }

        if (pathname.startsWith("/api/admin/") && !authenticated(request)) {
            sendJson(response, 401, { error: "Sign in to continue." });
            return;
        }

        if (pathname === "/api/admin/content" && method === "GET") {
            sendJson(response, 200, JSON.parse(getContent.get().content));
            return;
        }

        if (pathname === "/api/admin/content" && method === "PUT") {
            const content = validateContent(await readBody(request));
            saveContent.run(JSON.stringify(content));
            sendJson(response, 200, content);
            return;
        }

        if (pathname === "/api/admin/messages" && method === "GET") {
            const messages = db.prepare(
                "SELECT id, name, email, subject, message, category, type, rating, created_at FROM contact_messages WHERE type IN ('inquiry', 'chat') ORDER BY id DESC"
            ).all();
            sendJson(response, 200, messages);
            return;
        }

        if (pathname === "/api/admin/feedback" && method === "GET") {
            const feedback = db.prepare(
                "SELECT id, name, message, rating, created_at FROM contact_messages WHERE type = 'feedback' ORDER BY id DESC"
            ).all();
            sendJson(response, 200, feedback);
            return;
        }

        const messageMatch = pathname.match(/^\/api\/admin\/messages\/(\d+)$/);
        if (messageMatch && method === "DELETE") {
            const result = db.prepare("DELETE FROM contact_messages WHERE id = ?")
                .run(Number(messageMatch[1]));
            if (result.changes === 0) {
                sendJson(response, 404, { error: "Message not found." });
                return;
            }
            sendJson(response, 200, { deleted: true });
            return;
        }

        if (pathname.startsWith("/api/")) {
            sendJson(response, 404, { error: "API endpoint not found." });
            return;
        }

        if (method !== "GET" && method !== "HEAD") {
            response.writeHead(405);
            response.end("Method not allowed");
            return;
        }
        serveStatic(request, response, pathname);
    } catch (error) {
        if (response.headersSent || response.destroyed) {
            return;
        }
        const status = Number.isInteger(error.status) ? error.status : 500;
        sendJson(response, status, {
            error: status < 500 ? error.message : "The request could not be completed."
        });
    }
});

server.listen(port, () => {
    console.log(`Portfolio running at http://localhost:${port}`);
    console.log(`Admin panel at http://localhost:${port}/admin.html`);
});

function closeServer() {
    server.close(() => {
        db.close();
        process.exit(0);
    });
}

process.on("SIGINT", closeServer);
process.on("SIGTERM", closeServer);

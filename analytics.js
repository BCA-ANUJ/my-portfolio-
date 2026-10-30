"use strict";

(function () {
    const measurementId = window.PORTFOLIO_ANALYTICS_ID;
    const preferenceButton = document.getElementById("analyticsPreferences");
    if (!measurementId) {
        if (preferenceButton) {
            preferenceButton.hidden = true;
        }
        return;
    }

    const preferenceKey = "portfolio-analytics-consent";
    let banner;

    function loadAnalytics() {
        if (window.portfolioAnalyticsLoaded) {
            return;
        }
        window.portfolioAnalyticsLoaded = true;
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () {
            window.dataLayer.push(arguments);
        };
        window.gtag("consent", "default", {
            analytics_storage: "denied",
            ad_storage: "denied",
            ad_user_data: "denied",
            ad_personalization: "denied"
        });
        window.gtag("consent", "update", { analytics_storage: "granted" });
        window.gtag("js", new Date());
        window.gtag("config", measurementId, { anonymize_ip: true });
        const script = document.createElement("script");
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
        document.head.append(script);
    }

    function savePreference(choice) {
        localStorage.setItem(preferenceKey, choice);
        banner.remove();
        if (choice === "accepted") {
            loadAnalytics();
        } else if (window.gtag) {
            window.gtag("consent", "update", { analytics_storage: "denied" });
            document.cookie.split(";").forEach((cookie) => {
                const name = cookie.split("=")[0].trim();
                if (name === "_ga" || name.startsWith("_ga_")) {
                    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
                }
            });
        }
    }

    function showBanner() {
        if (banner) {
            return;
        }
        banner = document.createElement("section");
        banner.className = "analytics-consent-banner";
        banner.setAttribute("aria-label", "Analytics privacy choices");
        const copy = document.createElement("div");
        copy.className = "analytics-consent-copy";
        const heading = document.createElement("strong");
        heading.textContent = "Your privacy, your choice.";
        const explanation = document.createElement("p");
        explanation.textContent =
            "Allow optional Google Analytics so Anuj can understand how the portfolio is used. Analytics stays off until you agree.";
        const policy = document.createElement("a");
        policy.href = "/privacy.html#analytics";
        policy.textContent = "Read the privacy policy";
        policy.className = "analytics-consent-policy";
        copy.append(heading, explanation, policy);

        const actions = document.createElement("div");
        actions.className = "analytics-consent-actions";
        for (const [label, choice] of [
            ["Accept analytics", "accepted"],
            ["Decline", "rejected"]
        ]) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = choice === "accepted"
                ? "button dark"
                : "button light";
            button.textContent = label;
            button.addEventListener("click", () => savePreference(choice));
            actions.append(button);
        }
        banner.append(copy, actions);
        document.body.append(banner);
    }

    function updatePreference() {
        const choice = localStorage.getItem(preferenceKey);
        if (choice === "accepted") {
            loadAnalytics();
            return;
        }
        if (choice === "rejected") {
            return;
        }
        showBanner();
    }

    updatePreference();
    preferenceButton?.addEventListener("click", () => {
        localStorage.removeItem(preferenceKey);
        showBanner();
    });
})();

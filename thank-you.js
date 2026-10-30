"use strict";

const type = new URLSearchParams(window.location.search).get("type");
const title = document.getElementById("thankYouTitle");
const message = document.getElementById("thankYouMessage");

if (type === "feedback") {
    title.replaceChildren(document.createTextNode("Thanks for your feedback"));
    title.append(Object.assign(document.createElement("span"), { textContent: "." }));
    message.textContent = "Your rating has been added to Anuj's private feedback inbox.";
} else if (type === "chat") {
    title.replaceChildren(document.createTextNode("Thanks for saying hello"));
    title.append(Object.assign(document.createElement("span"), { textContent: "." }));
    message.textContent = "Your chat message is in Anuj's inbox. He'll reply by email if you shared your address.";
}

const cards = document.querySelectorAll(".feature-box");

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add("show");
        }
    });
}, {
    threshold: 0.2
});

cards.forEach((card) => {
    observer.observe(card);
});

const reviewCards = document.querySelectorAll(".review-card");

reviewCards.forEach((card) => {
    observer.observe(card);
});

const aboutItems = document.querySelectorAll(".item");
const statsBoxes = document.querySelectorAll(".stats-box");

aboutItems.forEach((item) => {
    observer.observe(item);
});

statsBoxes.forEach((box) => {
    observer.observe(box);
});

// ===============================
// CONTACT FORM
// ===============================

const contactForm =
    document.getElementById("contactForm");

const contactSubmitBtn =
    document.getElementById("contactSubmitBtn");

contactForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const name =
        document.getElementById("contactName").value.trim();

    const email =
        document.getElementById("contactEmail").value.trim();

    const message =
        document.getElementById("contactMessage").value.trim();

    if (!name || !email || !message) {
        alert("Please fill all fields.");
        return;
    }

    contactSubmitBtn.disabled = true;
    contactSubmitBtn.innerText = "Sending...";

    try {

        const response = await fetch(
            
            "https://logiccraft-ai.onrender.com/api/contact", 
            
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name,
                    email,
                    message
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Failed to send message"
            );
        }

        alert("Message sent successfully! 📩");
        alert("Thank you for reaching out. We will get back to you soon.");

        contactForm.reset();

    } catch (error) {

        console.error("Contact form error:", error);

        alert(
            "Unable to send message. Please try again."
        );

    } finally {

        contactSubmitBtn.disabled = false;
        contactSubmitBtn.innerText = "Send Message";

    }

});




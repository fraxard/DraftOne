const menuToggle = document.querySelector('.menu-toggle');
const body = document.body;

if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    const isOpen = body.classList.toggle('menu-open');
    menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Optional: close menu when clicking a link
  document.querySelectorAll('.fullscreen-menu a').forEach(link => {
    link.addEventListener('click', () => {
      body.classList.remove('menu-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}





// HOW WE WORK section interactions
const processItems = document.querySelectorAll('.process-item');
const processTitle = document.getElementById('process-title');
const processDescription = document.getElementById('process-description');
const processDetail = document.querySelector('.process-detail');

// make sure initial state is visible
if (processDetail) {
  processDetail.classList.add('visible');
}

processItems.forEach(item => {
  item.addEventListener('mouseenter', () => {
    const title = item.getAttribute('data-title');
    const desc = item.getAttribute('data-description');

    // update active state on list
    processItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    // smooth text change
    processDetail.classList.remove('visible');
    setTimeout(() => {
      processTitle.textContent = title;
      processDescription.textContent = desc;
      processDetail.classList.add('visible');
    }, 150);
  });

  // keyboard focus support
  item.addEventListener('focus', () => {
    item.dispatchEvent(new Event('mouseenter'));
  });
});






// const contactForm = document.getElementById("contactForm");

// if (contactForm) {
//   contactForm.addEventListener("submit", async (e) => {
//     e.preventDefault();

//     const form = e.target;

//     const data = {
//       name: form.name.value.trim(),
//       email: form.email.value.trim(),
//       message: form.message.value.trim()
//     };

//     try {
//       const response = await fetch(
//         "https://script.google.com/macros/s/AKfycbyDSEcGS6UI7Pc3RsZgCZu6iip-Vikzku_cxooYXW9rzBFudcTvEl9L0Z3jCTjkTH_l/exec",
//         {
//           method: "POST",
//           body: new URLSearchParams(data)
//         }
//       );

//       const text = await response.text();
//       let result;

//       try {
//         result = JSON.parse(text);
//       } catch (parseError) {
//         throw new Error(`Invalid server response: ${text}`);
//       }

//       if (!response.ok) {
//         throw new Error(result.error || `Network error: ${response.status}`);
//       }

//       if (result.success) {
//         alert("Message sent! Thank you for reaching out.");
//         form.reset();
//       } else {
//         throw new Error(result.error || "Failed to send message.");
//       }
//     } catch (error) {
//       alert(`Unable to send message. Please try again later.\n${error.message}`);
//       console.error("Contact form submit error:", error);
//     }
//   });
// }


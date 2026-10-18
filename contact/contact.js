document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  const successMessage = document.getElementById('success-message');
  const submitBtn = form.querySelector('.btn-submit');
  
  const groupTopic = document.getElementById('group-topic');
  const groupMessage = document.getElementById('group-message');
  
  const emailInput = document.getElementById('email');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Reset error states
    groupTopic.classList.remove('has-error');
    groupMessage.classList.remove('has-error');
    emailInput.style.borderColor = ''; 

    let isValid = true;

    // 1. Validate Topic (Radio)
    const selectedTopic = form.querySelector('input[name="topic"]:checked');
    if (!selectedTopic) {
      groupTopic.classList.add('has-error');
      isValid = false;
    }

    // 2. Validate Message (Textarea)
    const messageValue = document.getElementById('message').value.trim();
    if (!messageValue) {
      groupMessage.classList.add('has-error');
      isValid = false;
    }

    // 3. Validate Email format (if provided)
    const emailValue = emailInput.value.trim();
    if (emailValue) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailValue)) {
        emailInput.style.borderColor = '#EF4444';
        emailInput.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15)';
        isValid = false;
      }
    }

    // If invalid, stop here
    if (!isValid) return;

    // --- WEB3FORMS SUBMISSION ---
    
    // 1. Change button to loading state
    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.innerHTML = `<span>Sending...</span>`;
    submitBtn.disabled = true;

    // 2. Prepare the form data
    const formData = new FormData(form);
    const object = Object.fromEntries(formData);
    const json = JSON.stringify(object);

    try {
      // 3. Send the request to Web3Forms
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: json
      });
      
      const result = await response.json();

      if (response.status === 200) {
        // Success! Hide form and show success message
        form.style.opacity = '0';
        form.style.transform = 'translate3d(0, -10px, 0)';
        form.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
        
        setTimeout(() => {
          form.style.display = 'none';
          successMessage.style.display = 'block';
        }, 300);
      } else {
        // Web3Forms returned an error (e.g., invalid access key)
        console.error(result);
        alert('Something went wrong. Please try again later.');
        resetButton();
      }
    } catch (error) {
      // Network error
      console.error(error);
      alert('Network error. Please check your connection and try again.');
      resetButton();
    }

    function resetButton() {
      submitBtn.innerHTML = originalBtnHTML;
      submitBtn.disabled = false;
    }
  });

  // Clear error states when the user interacts
  form.querySelectorAll('input[name="topic"]').forEach(radio => {
    radio.addEventListener('change', () => groupTopic.classList.remove('has-error'));
  });

  document.getElementById('message').addEventListener('input', () => {
    groupMessage.classList.remove('has-error');
  });

  emailInput.addEventListener('input', () => {
    emailInput.style.borderColor = '';
    emailInput.style.boxShadow = '';
  });
});
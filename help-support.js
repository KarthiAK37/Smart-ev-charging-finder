document.getElementById("support-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const issue = document.getElementById("issue").value;
    alert(`Your issue has been submitted: ${issue}`);
    document.getElementById("support-form").reset();
});

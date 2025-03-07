const API_URL = "https://your-firebase-url.com"; // Заменишь на свой Firebase

async function fetchUsers() {
    const res = await fetch(API_URL + "/users");
    const users = await res.json();
    updateUserList(users);
}

function updateUserList(users) {
    const list = document.getElementById("user-list");
    list.innerHTML = "";
    users.forEach(user => {
        const li = document.createElement("li");
        li.classList.add("user");
        li.textContent = `${user.name} - ${user.status}`;
        list.appendChild(li);
    });
}

async function setStatus(status) {
    const username = document.getElementById("username").value;
    if (!username) return alert("Введите ник!");

    await fetch(API_URL + "/set-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: username, status })
    });

    fetchUsers();
}

setInterval(fetchUsers, 5000); // Обновляем каждые 5 сек
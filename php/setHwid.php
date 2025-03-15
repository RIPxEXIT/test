<?php
header('Content-Type: text/plain');

$login = $_GET['login'];
$password = $_GET['password'];
$hwid = $_GET['hwid'];

// Database connection
$mysqli = new mysqli("localhost", "root", "password", "launcher_db");

if ($mysqli->connect_error) {
    die("Connection failed: " . $mysqli->connect_error);
}

// Fetch user data
$stmt = $mysqli->prepare("SELECT password FROM users WHERE username = ?");
$stmt->bind_param("s", $login);
$stmt->execute();
$stmt->store_result();
$stmt->bind_result($db_password);
$stmt->fetch();

if ($stmt->num_rows > 0) {
    if (password_verify($password, $db_password)) {
        // Bind HWID
        $stmt = $mysqli->prepare("UPDATE users SET hwid = ? WHERE username = ?");
        $stmt->bind_param("ss", $hwid, $login);
        $stmt->execute();
        echo "HWID привязан"; // HWID bound
    } else {
        echo "Не найден"; // Invalid password
    }
} else {
    echo "Не найден"; // User not found
}

$stmt->close();
$mysqli->close();
?>
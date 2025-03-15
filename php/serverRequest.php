<?php
header('Content-Type: text/plain');

$login = $_GET['login'];
$password = $_GET['pass'];
$hwid = $_GET['hwid'];

// Database connection
$mysqli = new mysqli("localhost", "root", "password", "launcher_db");

if ($mysqli->connect_error) {
    die("Connection failed: " . $mysqli->connect_error);
}

// Fetch user data
$stmt = $mysqli->prepare("SELECT password, hwid FROM users WHERE username = ?");
$stmt->bind_param("s", $login);
$stmt->execute();
$stmt->store_result();
$stmt->bind_result($db_password, $db_hwid);
$stmt->fetch();

if ($stmt->num_rows > 0) {
    if (password_verify($password, $db_password)) {
        if ($db_hwid === $hwid || $db_hwid === NULL) {
            echo "Успешно"; // Success
        } else {
            echo "HWID не совпадает"; // HWID mismatch
        }
    } else {
        echo "Не найден"; // Invalid password
    }
} else {
    echo "Не найден"; // User not found
}

$stmt->close();
$mysqli->close();
?>
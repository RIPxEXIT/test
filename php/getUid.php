<?php
header('Content-Type: text/plain');

$hwid = $_GET['hwid'];

// Database connection
$mysqli = new mysqli("localhost", "root", "password", "launcher_db");

if ($mysqli->connect_error) {
    die("Connection failed: " . $mysqli->connect_error);
}

// Fetch UID
$stmt = $mysqli->prepare("SELECT uid FROM users WHERE hwid = ?");
$stmt->bind_param("s", $hwid);
$stmt->execute();
$stmt->store_result();
$stmt->bind_result($uid);
$stmt->fetch();

if ($stmt->num_rows > 0) {
    echo $uid; // Return the unique ID
} else {
    echo "N/A"; // Not found
}

$stmt->close();
$mysqli->close();
?>
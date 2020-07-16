<?php

require_once 'config.php';

$db = new mysqli(MYSQL_SERVER, MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_DB);

if ($db->connect_error) {
    die("Database conection failed: " . $db->connect_error);
}

$post_data = $_POST["data"];

$query = $db->prepare("INSERT INTO responses (response_id, ip_address, download, upload, ping, jitter, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)");
$query->bind_param("ssdddds", $post_data['id'], $post_data['ip'], $post_data['dlStatus'], $post_data['ulStatus'], $post_data['pingStatus'], $post_data['jitterStatus'], $_SERVER['HTTP_USER_AGENT']);
$query->execute();

$db->close();

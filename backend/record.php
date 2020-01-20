<?php

	require_once('config.php');

	$db = new mysqli(MYSQL_SERVER, MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_DB);
	if ($db->connect_error) {
		die("Database conection failed: ". $db->connect_error);
	 }

	$query = $db->prepare("INSERT INTO responses (response_id, ip_address, download, upload, ping, jitter, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)");
	$query->bind_param("ssdddds", $_POST['id'], $_POST['ip'], $_POST['dlStatus'], $_POST['ulStatus'], $_POST['pingStatus'], $_POST['jitterStatus'], $_SERVER['HTTP_USER_AGENT']);
	 $query->execute();
	 
	 $db->close();
	

?>

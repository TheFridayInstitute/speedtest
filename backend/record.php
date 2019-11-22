<?php

	$file = fopen("/var/www/results.csv", "w");
	fputcsv($file, $_POST);
	fclose($file);

?>

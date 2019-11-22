<?php

	$file = fopen("/var/www/results.csv", "a") or die;
	fputcsv($file, $_POST);
	fclose($file);

CREATE TABLE `responses` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `response_id` varchar(128) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ip_address` varchar(17) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT '',
  `download` float DEFAULT NULL,
  `upload` float DEFAULT NULL,
  `ping` float DEFAULT NULL,
  `jitter` float DEFAULT NULL,
  `user_agent` varchar(1024) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
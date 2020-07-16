CREATE TABLE `responses` (
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `response_id` VARCHAR(128) COLLATE utf8mb4_general_ci DEFAULT NULL,
    `ip_address` VARCHAR(17) CHARACTER
    SET
        utf8mb4 COLLATE utf8mb4_general_ci DEFAULT '',
        `download` FLOAT DEFAULT NULL,
        `upload` FLOAT DEFAULT NULL,
        `ping` FLOAT DEFAULT NULL,
        `jitter` FLOAT DEFAULT NULL,
        `user_agent` VARCHAR(1024) COLLATE utf8mb4_general_ci DEFAULT NULL,
        `timestamp` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 3 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci
CREATE TABLE `exercises` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playerId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`category` varchar(50) NOT NULL,
	`type` varchar(100),
	`frequency` varchar(255),
	`points` text,
	`mediaUrls` json,
	`createdBy` int NOT NULL,
	`providedDate` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exercises_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`practiceAm` text,
	`practicePm` text,
	`assignments` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `schedules_date_unique` UNIQUE(`date`)
);

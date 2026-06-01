CREATE TABLE `players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`number` int NOT NULL,
	`position` varchar(50) NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `players_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `treatments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playerId` int NOT NULL,
	`bodyParts` json NOT NULL,
	`treatmentTypes` json NOT NULL,
	`timing` varchar(50) NOT NULL,
	`duration` int NOT NULL,
	`soapS` text,
	`soapO` text,
	`soapA` text,
	`soapP` text,
	`comment` text,
	`createdBy` int NOT NULL,
	`treatmentDate` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `treatments_id` PRIMARY KEY(`id`)
);

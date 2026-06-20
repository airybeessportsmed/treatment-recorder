CREATE TABLE `exercise_master` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`category` varchar(50) NOT NULL,
	`defaultSets` int,
	`defaultReps` varchar(50),
	`defaultLoad` varchar(100),
	`attention` text,
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exercise_master_id` PRIMARY KEY(`id`),
	CONSTRAINT `exercise_master_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`programId` int NOT NULL,
	`athleteId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`ocrRawResult` text,
	`ocrParsed` json,
	`status` enum('pending','processing','done','error') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `programs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`athleteId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`phase` varchar(100),
	`periodCategory` varchar(100),
	`goal` text,
	`bodyWeight` float,
	`totalSets` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`programId` int NOT NULL,
	`exerciseId` int NOT NULL,
	`athleteId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`actualSets` int,
	`actualReps` varchar(50),
	`actualLoad` varchar(100),
	`notes` text,
	`source` enum('manual','ocr') NOT NULL DEFAULT 'manual',
	`changeReason` enum('condition','injury','technique','plan','other'),
	`changeNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`programId` int NOT NULL,
	`category` varchar(50) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `training_exercises` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sectionId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`sets` int,
	`reps` varchar(50),
	`load` varchar(100),
	`attention` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `training_exercises_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`approvedBy` int,
	`approvedAt` timestamp,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_approvals_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_approvals_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `players` ADD `bodyWeight` float;--> statement-breakpoint
ALTER TABLE `players` ADD `notes` text;
ALTER TABLE `treatments` ADD `treatmentDetails` json;--> statement-breakpoint
ALTER TABLE `treatments` ADD `severity` varchar(50) DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` int DEFAULT 1 NOT NULL;
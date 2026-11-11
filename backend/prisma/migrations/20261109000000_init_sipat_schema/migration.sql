-- CreateTable
CREATE TABLE `geo_departments` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(10) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `capital` VARCHAR(100) NOT NULL,
    `geoJson` LONGTEXT NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `geo_departments_code_key`(`code`),
    UNIQUE INDEX `geo_departments_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `geo_districts` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `departmentId` VARCHAR(191) NOT NULL,
    `isUrban` BOOLEAN NOT NULL DEFAULT false,
    `geoJson` LONGTEXT NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `geo_districts_code_key`(`code`),
    INDEX `geo_districts_departmentId_idx`(`departmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gov_organizations` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `shortName` VARCHAR(50) NOT NULL,
    `type` ENUM('MINISTRY', 'GENERAL_DIRECTION', 'DEPARTEMENT_OFFICE', 'MUNICIPALITY', 'DISTRICT_OFFICE', 'PUBLIC_AGENCY', 'TECHNICAL_PARTNER') NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `address` VARCHAR(255) NULL,
    `contactEmail` VARCHAR(100) NULL,
    `contactPhone` VARCHAR(50) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `gov_organizations_code_key`(`code`),
    INDEX `gov_organizations_parentId_idx`(`parentId`),
    INDEX `gov_organizations_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_users` (
    `id` VARCHAR(191) NOT NULL,
    `matricule` VARCHAR(50) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `firstName` VARCHAR(100) NOT NULL,
    `lastName` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(50) NULL,
    `functionTitle` VARCHAR(150) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isLocked` BOOLEAN NOT NULL DEFAULT false,
    `failedAttempts` INTEGER NOT NULL DEFAULT 0,
    `lastLoginAt` DATETIME(3) NULL,
    `tokenVersion` INTEGER NOT NULL DEFAULT 1,
    `organizationId` VARCHAR(191) NOT NULL,
    `territorialScope` ENUM('NATIONAL', 'DEPARTMENT', 'COMMUNE_DISTRICT', 'LOCALITY') NOT NULL DEFAULT 'NATIONAL',
    `departmentId` VARCHAR(191) NULL,
    `districtId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `auth_users_matricule_key`(`matricule`),
    UNIQUE INDEX `auth_users_email_key`(`email`),
    INDEX `auth_users_organizationId_idx`(`organizationId`),
    INDEX `auth_users_departmentId_idx`(`departmentId`),
    INDEX `auth_users_districtId_idx`(`districtId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_roles` (
    `id` VARCHAR(191) NOT NULL,
    `code` ENUM('SUPER_ADMIN', 'MINISTER_DIRECTOR', 'TECHNICAL_VALIDATOR', 'REGIONAL_DIRECTOR', 'PROJECT_MANAGER', 'FIELD_INSPECTOR', 'FINANCIAL_CONTROLLER', 'AUDITOR_READONLY') NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `auth_roles_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_user_roles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `auth_user_roles_userId_idx`(`userId`),
    INDEX `auth_user_roles_roleId_idx`(`roleId`),
    UNIQUE INDEX `auth_user_roles_userId_roleId_key`(`userId`, `roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `module` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `auth_permissions_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_role_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `permissionId` VARCHAR(191) NOT NULL,

    INDEX `auth_role_permissions_roleId_idx`(`roleId`),
    INDEX `auth_role_permissions_permissionId_idx`(`permissionId`),
    UNIQUE INDEX `auth_role_permissions_roleId_permissionId_key`(`roleId`, `permissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_refresh_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(255) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `isRevoked` BOOLEAN NOT NULL DEFAULT false,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `auth_refresh_tokens_tokenHash_key`(`tokenHash`),
    INDEX `auth_refresh_tokens_userId_idx`(`userId`),
    INDEX `auth_refresh_tokens_tokenHash_idx`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prj_projects` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `sector` VARCHAR(100) NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED_FOR_REVIEW', 'TECHNICAL_APPROVED', 'APPROVED', 'IN_PROGRESS', 'SUSPENDED', 'COMPLETED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `leadMinistryId` VARCHAR(191) NOT NULL,
    `projectManagerId` VARCHAR(191) NULL,
    `contractorName` VARCHAR(200) NULL,
    `supervisingFirm` VARCHAR(200) NULL,
    `departmentId` VARCHAR(191) NOT NULL,
    `districtId` VARCHAR(191) NULL,
    `localityName` VARCHAR(150) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `geoJsonShape` LONGTEXT NULL,
    `totalBudgetPlanned` DECIMAL(18, 2) NOT NULL,
    `totalAmountCommitted` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `totalAmountDisbursed` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `physicalProgressPct` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `startDatePlanned` DATETIME(3) NULL,
    `endDatePlanned` DATETIME(3) NULL,
    `startDateActual` DATETIME(3) NULL,
    `endDateActual` DATETIME(3) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `prj_projects_code_key`(`code`),
    INDEX `prj_projects_leadMinistryId_idx`(`leadMinistryId`),
    INDEX `prj_projects_departmentId_idx`(`departmentId`),
    INDEX `prj_projects_districtId_idx`(`districtId`),
    INDEX `prj_projects_status_idx`(`status`),
    INDEX `prj_projects_code_idx`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prj_milestones` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `targetProgressPct` DECIMAL(5, 2) NOT NULL,
    `actualProgressPct` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `dueDate` DATETIME(3) NULL,
    `achievedDate` DATETIME(3) NULL,
    `status` ENUM('PLANNED', 'IN_PROGRESS', 'PENDING_TECH_REVIEW', 'PENDING_INST_APPROVAL', 'VALIDATED', 'REJECTED') NOT NULL DEFAULT 'PLANNED',
    `technicalNotes` TEXT NULL,
    `hasReservations` BOOLEAN NOT NULL DEFAULT false,
    `reservationsDetails` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `prj_milestones_projectId_idx`(`projectId`),
    INDEX `prj_milestones_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fin_disbursements` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `disbursementNumber` VARCHAR(50) NOT NULL,
    `invoiceReference` VARCHAR(100) NOT NULL,
    `amountRequested` DECIMAL(18, 2) NOT NULL,
    `amountValidated` DECIMAL(18, 2) NULL,
    `status` ENUM('DRAFT', 'PENDING_TECH_AUDIT', 'PENDING_TREASURY_VISA', 'VALIDATED_FOR_PAYMENT', 'PAID', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `linkedPhysicalPct` DECIMAL(5, 2) NOT NULL,
    `isFullyJustified` BOOLEAN NOT NULL DEFAULT false,
    `justificationMemo` TEXT NULL,
    `submissionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `validationDate` DATETIME(3) NULL,
    `paymentDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `fin_disbursements_disbursementNumber_key`(`disbursementNumber`),
    INDEX `fin_disbursements_projectId_idx`(`projectId`),
    INDEX `fin_disbursements_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wf_instances` (
    `id` VARCHAR(191) NOT NULL,
    `targetType` ENUM('PROJECT_CREATION', 'PHYSICAL_MILESTONE', 'FINANCIAL_DISBURSEMENT', 'RECEPTION_PV') NOT NULL,
    `targetId` VARCHAR(64) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `currentStep` ENUM('TECHNICAL_REVIEW', 'INSTITUTIONAL_APPROVAL') NOT NULL DEFAULT 'TECHNICAL_REVIEW',
    `isCompleted` BOOLEAN NOT NULL DEFAULT false,
    `isRejected` BOOLEAN NOT NULL DEFAULT false,
    `projectId` VARCHAR(191) NULL,
    `milestoneId` VARCHAR(191) NULL,
    `disbursementId` VARCHAR(191) NULL,
    `organizationId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `wf_instances_targetType_targetId_idx`(`targetType`, `targetId`),
    INDEX `wf_instances_projectId_idx`(`projectId`),
    INDEX `wf_instances_currentStep_idx`(`currentStep`),
    INDEX `wf_instances_isCompleted_idx`(`isCompleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wf_reviews` (
    `id` VARCHAR(191) NOT NULL,
    `instanceId` VARCHAR(191) NOT NULL,
    `stepType` ENUM('TECHNICAL_REVIEW', 'INSTITUTIONAL_APPROVAL') NOT NULL,
    `reviewerId` VARCHAR(191) NOT NULL,
    `decision` ENUM('PENDING', 'APPROVED', 'REJECTED_WITH_RESERVATIONS', 'REJECTED_DEFINITIVELY') NOT NULL,
    `comments` TEXT NOT NULL,
    `reservations` TEXT NULL,
    `snapshotDataHash` VARCHAR(64) NOT NULL,
    `ipAddress` VARCHAR(45) NULL,
    `reviewedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `wf_reviews_instanceId_idx`(`instanceId`),
    INDEX `wf_reviews_reviewerId_idx`(`reviewerId`),
    INDEX `wf_reviews_stepType_idx`(`stepType`),
    INDEX `wf_reviews_decision_idx`(`decision`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `field_reports` (
    `id` VARCHAR(191) NOT NULL,
    `localOfflineId` VARCHAR(64) NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `milestoneId` VARCHAR(191) NULL,
    `inspectorId` VARCHAR(191) NOT NULL,
    `reportedProgressPct` DECIMAL(5, 2) NOT NULL,
    `findings` TEXT NOT NULL,
    `anomaliesObserved` TEXT NULL,
    `gpsLatitude` DOUBLE NULL,
    `gpsLongitude` DOUBLE NULL,
    `gpsAccuracyMeters` DOUBLE NULL,
    `collectedAtLocal` DATETIME(3) NOT NULL,
    `syncedAtServer` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `field_reports_localOfflineId_key`(`localOfflineId`),
    INDEX `field_reports_projectId_idx`(`projectId`),
    INDEX `field_reports_inspectorId_idx`(`inspectorId`),
    INDEX `field_reports_localOfflineId_idx`(`localOfflineId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `doc_project_files` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `disbursementId` VARCHAR(191) NULL,
    `fieldReportId` VARCHAR(191) NULL,
    `title` VARCHAR(200) NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `fileMimeType` VARCHAR(100) NOT NULL,
    `fileSizeBytes` BIGINT NOT NULL,
    `fileStoragePath` VARCHAR(500) NOT NULL,
    `fileHashSha256` VARCHAR(64) NOT NULL,
    `confidentiality` ENUM('PUBLIC', 'RESTRICTED_ADMIN', 'CONFIDENTIAL_DEFENSE', 'FINANCIAL_CONFIDENTIAL') NOT NULL DEFAULT 'RESTRICTED_ADMIN',
    `uploadedByUserId` VARCHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `doc_project_files_projectId_idx`(`projectId`),
    INDEX `doc_project_files_disbursementId_idx`(`disbursementId`),
    INDEX `doc_project_files_fileHashSha256_idx`(`fileHashSha256`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_system_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(100) NOT NULL,
    `entityName` VARCHAR(60) NOT NULL,
    `entityId` VARCHAR(64) NOT NULL,
    `departmentId` VARCHAR(64) NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` VARCHAR(255) NULL,
    `detailsJson` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_system_logs_userId_idx`(`userId`),
    INDEX `audit_system_logs_action_idx`(`action`),
    INDEX `audit_system_logs_entityName_entityId_idx`(`entityName`, `entityId`),
    INDEX `audit_system_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sync_queue_logs` (
    `id` VARCHAR(191) NOT NULL,
    `clientSyncId` VARCHAR(64) NOT NULL,
    `userId` VARCHAR(64) NOT NULL,
    `operation` VARCHAR(50) NOT NULL,
    `status` VARCHAR(30) NOT NULL,
    `conflictDetails` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sync_queue_logs_clientSyncId_key`(`clientSyncId`),
    INDEX `sync_queue_logs_userId_idx`(`userId`),
    INDEX `sync_queue_logs_clientSyncId_idx`(`clientSyncId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `geo_districts` ADD CONSTRAINT `geo_districts_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `geo_departments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gov_organizations` ADD CONSTRAINT `gov_organizations_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `gov_organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_users` ADD CONSTRAINT `auth_users_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `gov_organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_users` ADD CONSTRAINT `auth_users_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `geo_departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_users` ADD CONSTRAINT `auth_users_districtId_fkey` FOREIGN KEY (`districtId`) REFERENCES `geo_districts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_user_roles` ADD CONSTRAINT `auth_user_roles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `auth_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_user_roles` ADD CONSTRAINT `auth_user_roles_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `auth_roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_role_permissions` ADD CONSTRAINT `auth_role_permissions_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `auth_roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_role_permissions` ADD CONSTRAINT `auth_role_permissions_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `auth_permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_refresh_tokens` ADD CONSTRAINT `auth_refresh_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `auth_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prj_projects` ADD CONSTRAINT `prj_projects_leadMinistryId_fkey` FOREIGN KEY (`leadMinistryId`) REFERENCES `gov_organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prj_projects` ADD CONSTRAINT `prj_projects_projectManagerId_fkey` FOREIGN KEY (`projectManagerId`) REFERENCES `auth_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prj_projects` ADD CONSTRAINT `prj_projects_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `geo_departments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prj_projects` ADD CONSTRAINT `prj_projects_districtId_fkey` FOREIGN KEY (`districtId`) REFERENCES `geo_districts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prj_milestones` ADD CONSTRAINT `prj_milestones_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `prj_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fin_disbursements` ADD CONSTRAINT `fin_disbursements_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `prj_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wf_instances` ADD CONSTRAINT `wf_instances_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `prj_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wf_instances` ADD CONSTRAINT `wf_instances_milestoneId_fkey` FOREIGN KEY (`milestoneId`) REFERENCES `prj_milestones`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wf_instances` ADD CONSTRAINT `wf_instances_disbursementId_fkey` FOREIGN KEY (`disbursementId`) REFERENCES `fin_disbursements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wf_instances` ADD CONSTRAINT `wf_instances_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `gov_organizations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wf_reviews` ADD CONSTRAINT `wf_reviews_instanceId_fkey` FOREIGN KEY (`instanceId`) REFERENCES `wf_instances`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wf_reviews` ADD CONSTRAINT `wf_reviews_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `auth_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `field_reports` ADD CONSTRAINT `field_reports_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `prj_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `field_reports` ADD CONSTRAINT `field_reports_milestoneId_fkey` FOREIGN KEY (`milestoneId`) REFERENCES `prj_milestones`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `field_reports` ADD CONSTRAINT `field_reports_inspectorId_fkey` FOREIGN KEY (`inspectorId`) REFERENCES `auth_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `doc_project_files` ADD CONSTRAINT `doc_project_files_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `prj_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `doc_project_files` ADD CONSTRAINT `doc_project_files_disbursementId_fkey` FOREIGN KEY (`disbursementId`) REFERENCES `fin_disbursements`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `doc_project_files` ADD CONSTRAINT `doc_project_files_fieldReportId_fkey` FOREIGN KEY (`fieldReportId`) REFERENCES `field_reports`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_system_logs` ADD CONSTRAINT `audit_system_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `auth_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


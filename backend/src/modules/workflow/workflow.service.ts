import crypto from 'crypto';
import { prisma } from '../../config/database';
import {
  WorkflowTargetType,
  WorkflowStepType,
  WorkflowDecision,
  ProjectStatus,
  MilestoneStatus,
  PaymentStatus,
} from '@prisma/client';
import { AppError, ForbiddenError, NotFoundError, ValidationError } from '../../core/errors/AppError';
import { AuditService } from '../audit/audit.service';
import { UserTokenPayload } from '../../core/utils/token.utils';

export interface SubmitWorkflowDto {
  targetType: WorkflowTargetType;
  targetId: string;
  title: string;
  projectId?: string;
  milestoneId?: string;
  disbursementId?: string;
}

export interface ReviewWorkflowDto {
  decision: WorkflowDecision;
  comments: string;
  reservations?: string;
  snapshotData?: any; // Données vérifiées pour hash d'intégrité
}

export class WorkflowEngineService {
  /**
   * Initialise un workflow à double validation
   */
  static async startWorkflow(dto: SubmitWorkflowDto, user: UserTokenPayload) {
    const existingActive = await prisma.workflowInstance.findFirst({
      where: {
        targetType: dto.targetType,
        targetId: dto.targetId,
        isCompleted: false,
        isRejected: false,
      },
    });

    if (existingActive) {
      throw new ValidationError('Un circuit de validation est déjà actif pour cette cible');
    }

    const instance = await prisma.workflowInstance.create({
      data: {
        targetType: dto.targetType,
        targetId: dto.targetId,
        title: dto.title,
        currentStep: WorkflowStepType.TECHNICAL_REVIEW,
        projectId: dto.projectId || null,
        milestoneId: dto.milestoneId || null,
        disbursementId: dto.disbursementId || null,
        organizationId: user.organizationId,
      },
    });

    // Mettre à jour l'entité cible vers l'état en attente de revue technique
    await this.syncEntityStatus(dto.targetType, dto.targetId, 'PENDING_TECH_REVIEW');

    await AuditService.log({
      userId: user.userId,
      action: 'WORKFLOW_INITIATED',
      entityName: 'WorkflowInstance',
      entityId: instance.id,
      departmentId: user.departmentId,
      details: { targetType: dto.targetType, targetId: dto.targetId },
    });

    return instance;
  }

  /**
   * Traitement d'un visa de validation (Étape 1 Technique ou Étape 2 Institutionnelle)
   */
  static async processReview(
    instanceId: string,
    dto: ReviewWorkflowDto,
    user: UserTokenPayload,
    ipAddress?: string
  ) {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: { reviews: true },
    });

    if (!instance) {
      throw new NotFoundError('Instance de workflow introuvable');
    }

    if (instance.isCompleted || instance.isRejected) {
      throw new ValidationError('Ce circuit de validation est déjà clôturé');
    }

    // 1. CONTRÔLE D'HABILITATION SELON L'ÉTAPE DU WORKFLOW
    if (instance.currentStep === WorkflowStepType.TECHNICAL_REVIEW) {
      const isTech = user.roles.includes('TECHNICAL_VALIDATOR') || user.roles.includes('SUPER_ADMIN');
      if (!isTech) {
        throw new ForbiddenError(
          'Seul un Instructeur Technique qualifié (Visa 1) peut valider cette étape'
        );
      }
    } else if (instance.currentStep === WorkflowStepType.INSTITUTIONAL_APPROVAL) {
      const isInst = user.roles.includes('MINISTER_DIRECTOR') || user.roles.includes('SUPER_ADMIN');
      if (!isInst) {
        throw new ForbiddenError(
          'Seule l’Autorité Institutionnelle (Ministre / DG - Visa 2) peut accorder l’approbation finale'
        );
      }
    }

    // Calcul de l'empreinte cryptographique des données au moment du visa
    const dataString = JSON.stringify(dto.snapshotData || { instanceId, timestamp: Date.now() });
    const snapshotHash = crypto.createHash('sha256').update(dataString).digest('hex');

    // Enregistrement de l'avis formel dans l'historique
    const review = await prisma.workflowReview.create({
      data: {
        instanceId: instance.id,
        stepType: instance.currentStep,
        reviewerId: user.userId,
        decision: dto.decision,
        comments: dto.comments,
        reservations: dto.reservations || null,
        snapshotDataHash: snapshotHash,
        ipAddress,
      },
    });

    // 2. GESTION DES TRANSITIONS D'ÉTAT
    if (
      dto.decision === WorkflowDecision.REJECTED_DEFINITIVELY ||
      dto.decision === WorkflowDecision.REJECTED_WITH_RESERVATIONS
    ) {
      // Rejet du circuit
      await prisma.workflowInstance.update({
        where: { id: instance.id },
        data: { isRejected: true },
      });

      await this.syncEntityStatus(instance.targetType, instance.targetId, 'REJECTED');

      await AuditService.log({
        userId: user.userId,
        action: `WORKFLOW_REJECTED_${instance.currentStep}`,
        entityName: 'WorkflowInstance',
        entityId: instance.id,
        details: { decision: dto.decision, comments: dto.comments },
      });

      return {
        instanceId: instance.id,
        status: 'REJECTED',
        step: instance.currentStep,
        review,
      };
    }

    // Cas de l'approbation :
    if (instance.currentStep === WorkflowStepType.TECHNICAL_REVIEW) {
      // Le Visa 1 (Technique) est acquis -> Passage au Visa 2 (Institutionnel)
      await prisma.workflowInstance.update({
        where: { id: instance.id },
        data: { currentStep: WorkflowStepType.INSTITUTIONAL_APPROVAL },
      });

      await this.syncEntityStatus(instance.targetType, instance.targetId, 'PENDING_INST_APPROVAL');

      await AuditService.log({
        userId: user.userId,
        action: 'WORKFLOW_STEP1_TECH_APPROVED',
        entityName: 'WorkflowInstance',
        entityId: instance.id,
        details: { reviewer: user.matricule },
      });

      return {
        instanceId: instance.id,
        status: 'STEP1_APPROVED_PENDING_STEP2',
        nextStep: WorkflowStepType.INSTITUTIONAL_APPROVAL,
        review,
      };
    } else {
      // Le Visa 2 (Institutionnel) est acquis -> Approbation définitive
      await prisma.workflowInstance.update({
        where: { id: instance.id },
        data: { isCompleted: true },
      });

      await this.syncEntityStatus(instance.targetType, instance.targetId, 'VALIDATED');

      await AuditService.log({
        userId: user.userId,
        action: 'WORKFLOW_STEP2_INST_VALIDATED_FINAL',
        entityName: 'WorkflowInstance',
        entityId: instance.id,
        details: { reviewer: user.matricule },
      });

      return {
        instanceId: instance.id,
        status: 'FULLY_VALIDATED',
        isCompleted: true,
        review,
      };
    }
  }

  /**
   * Synchronise le statut de l'entité sous-jacente en fonction des étapes validées
   */
  private static async syncEntityStatus(
    targetType: WorkflowTargetType,
    targetId: string,
    statusKind: 'PENDING_TECH_REVIEW' | 'PENDING_INST_APPROVAL' | 'VALIDATED' | 'REJECTED'
  ) {
    switch (targetType) {
      case WorkflowTargetType.PROJECT_CREATION: {
        let pStatus: ProjectStatus = ProjectStatus.SUBMITTED_FOR_REVIEW;
        if (statusKind === 'PENDING_INST_APPROVAL') pStatus = ProjectStatus.TECHNICAL_APPROVED;
        if (statusKind === 'VALIDATED') pStatus = ProjectStatus.APPROVED;
        if (statusKind === 'REJECTED') pStatus = ProjectStatus.REJECTED;

        await prisma.project.update({
          where: { id: targetId },
          data: { status: pStatus },
        });
        break;
      }

      case WorkflowTargetType.PHYSICAL_MILESTONE: {
        let mStatus: MilestoneStatus = MilestoneStatus.PENDING_TECH_REVIEW;
        if (statusKind === 'PENDING_INST_APPROVAL') mStatus = MilestoneStatus.PENDING_INST_APPROVAL;
        if (statusKind === 'VALIDATED') mStatus = MilestoneStatus.VALIDATED;
        if (statusKind === 'REJECTED') mStatus = MilestoneStatus.REJECTED;

        await prisma.projectMilestone.update({
          where: { id: targetId },
          data: { status: mStatus },
        });
        break;
      }

      case WorkflowTargetType.FINANCIAL_DISBURSEMENT: {
        let payStatus: PaymentStatus = PaymentStatus.PENDING_TECH_AUDIT;
        if (statusKind === 'PENDING_INST_APPROVAL') payStatus = PaymentStatus.PENDING_TREASURY_VISA;
        if (statusKind === 'VALIDATED') payStatus = PaymentStatus.VALIDATED_FOR_PAYMENT;
        if (statusKind === 'REJECTED') payStatus = PaymentStatus.REJECTED;

        await prisma.financialDisbursement.update({
          where: { id: targetId },
          data: { status: payStatus },
        });
        break;
      }
    }
  }
}


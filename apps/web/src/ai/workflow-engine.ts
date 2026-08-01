import { db } from "@/lib/db";
import { runAgentTurn } from "./orchestrator";
import { ApiError } from "@/lib/session";

interface MetricThresholdConfig {
  metricKey: string;
  comparator: "drop_percent" | "rise_percent" | "below" | "above";
  value: number;
}

interface CreateTaskActionConfig {
  taskTitle?: string;
  taskDescription?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}

interface RunAgentActionConfig {
  prompt?: string;
}

/**
 * Evaluates a workflow rule's trigger and, if satisfied, executes its
 * action (create a task or run an agent). Called from
 * POST /api/workflows/[id]/run — see docs/DEPLOYMENT.md for how to drive
 * this from a scheduler (cron/PM2) in production for real automation.
 */
export async function evaluateAndRunWorkflow(workflowId: string, userId: string) {
  const workflow = await db.workflowRule.findUnique({
    where: { id: workflowId },
    include: { targetAgent: true },
  });
  if (!workflow) throw new ApiError(404, "Workflow not found");
  if (!workflow.isActive) throw new ApiError(400, "Workflow is disabled");

  let conditionMet = true;
  let evaluationNote = "";

  if (workflow.triggerType === "METRIC_THRESHOLD") {
    const cfg = workflow.triggerConfig as unknown as MetricThresholdConfig;
    const rows = await db.businessMetric.findMany({
      where: { metricKey: cfg.metricKey },
      orderBy: { periodDate: "desc" },
      take: 2,
    });

    if (rows.length < 2) {
      conditionMet = false;
      evaluationNote = `Not enough historical data for "${cfg.metricKey}" yet.`;
    } else {
      const [latest, previous] = rows;
      const period = latest.periodDate.toISOString().slice(0, 7);
      switch (cfg.comparator) {
        case "drop_percent": {
          const dropPct = ((previous.value - latest.value) / previous.value) * 100;
          conditionMet = dropPct >= cfg.value;
          evaluationNote = `${cfg.metricKey} (${period}): ${previous.value} → ${latest.value} (${dropPct.toFixed(1)}% ${dropPct >= 0 ? "drop" : "change"}).`;
          break;
        }
        case "rise_percent": {
          const risePct = ((latest.value - previous.value) / previous.value) * 100;
          conditionMet = risePct >= cfg.value;
          evaluationNote = `${cfg.metricKey} (${period}): ${previous.value} → ${latest.value} (${risePct.toFixed(1)}% ${risePct >= 0 ? "rise" : "change"}).`;
          break;
        }
        case "below":
          conditionMet = latest.value < cfg.value;
          evaluationNote = `${cfg.metricKey} (${period}) latest value: ${latest.value}.`;
          break;
        case "above":
          conditionMet = latest.value > cfg.value;
          evaluationNote = `${cfg.metricKey} (${period}) latest value: ${latest.value}.`;
          break;
        default:
          conditionMet = false;
          evaluationNote = `Unknown comparator "${cfg.comparator}".`;
      }
    }
  }
  // MANUAL and SCHEDULE trigger types are always considered satisfied when
  // this function is explicitly invoked (a human clicked "Run now", or a
  // scheduler decided it was time).

  if (!conditionMet) {
    const run = await db.workflowRun.create({
      data: {
        workflowId: workflow.id,
        status: "SKIPPED",
        summary: evaluationNote || "Trigger condition was not met.",
      },
    });
    return { run, task: null, agentResponse: null };
  }

  if (workflow.actionType === "CREATE_TASK") {
    const cfg = workflow.actionConfig as unknown as CreateTaskActionConfig;
    const task = await db.task.create({
      data: {
        title: cfg.taskTitle || workflow.name,
        description: [cfg.taskDescription || workflow.description, evaluationNote]
          .filter(Boolean)
          .join("\n\n"),
        priority: cfg.priority ?? "MEDIUM",
        assignedAgentId: workflow.targetAgentId ?? undefined,
        createdByUserId: userId,
      },
    });
    const run = await db.workflowRun.create({
      data: {
        workflowId: workflow.id,
        status: "TRIGGERED",
        summary: [evaluationNote, `Created task "${task.title}".`].filter(Boolean).join(" "),
      },
    });
    const updatedTask = await db.task.update({
      where: { id: task.id },
      data: { sourceWorkflowRunId: run.id },
    });
    await db.activityLog.create({
      data: {
        userId,
        agentId: workflow.targetAgentId ?? undefined,
        action: "workflow.triggered",
        entityType: "WorkflowRule",
        entityId: workflow.id,
        metadata: { taskId: task.id },
      },
    });
    return { run, task: updatedTask, agentResponse: null };
  }

  if (workflow.actionType === "RUN_AGENT") {
    if (!workflow.targetAgentId || !workflow.targetAgent) {
      throw new ApiError(400, "This workflow has no target agent configured");
    }
    const cfg = workflow.actionConfig as unknown as RunAgentActionConfig;
    const result = await runAgentTurn({
      agentSlug: workflow.targetAgent.slug,
      userId,
      message: cfg.prompt || workflow.description,
    });
    const run = await db.workflowRun.create({
      data: {
        workflowId: workflow.id,
        status: "TRIGGERED",
        summary: [evaluationNote, `${result.agent.title} responded: ${result.text.slice(0, 400)}`]
          .filter(Boolean)
          .join(" "),
      },
    });
    await db.activityLog.create({
      data: {
        userId,
        agentId: workflow.targetAgentId,
        action: "workflow.triggered",
        entityType: "WorkflowRule",
        entityId: workflow.id,
      },
    });
    return { run, task: null, agentResponse: result.text };
  }

  throw new ApiError(400, "Unknown workflow action type");
}

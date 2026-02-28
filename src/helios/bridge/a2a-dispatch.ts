/**
 * Agent Delegation Boundary Dispatcher
 *
 * Routes agent_delegation commands to local agents.
 * Implements a local echo agent for demonstration and testing.
 */

import type { LocalBusEnvelope } from "../runtime/protocol/types";

type CommandDispatch = (command: LocalBusEnvelope) => Promise<LocalBusEnvelope>;

function errorResponse(command: LocalBusEnvelope, code: string, message: string): LocalBusEnvelope {
  return {
    id: command.id,
    type: "response",
    ts: new Date().toISOString(),
    status: "error",
    result: null,
    error: { code, message, retryable: false, details: { method: command.method } },
  };
}

function successResponse(command: LocalBusEnvelope, result: Record<string, unknown>): LocalBusEnvelope {
  return {
    id: command.id,
    type: "response",
    ts: new Date().toISOString(),
    status: "ok",
    result,
    error: null,
  };
}

export function createA2ADispatch(): CommandDispatch {
  return async (command: LocalBusEnvelope): Promise<LocalBusEnvelope> => {
    const method = command.method;

    switch (method) {
      case "agent.run": {
        const message = (command.payload as Record<string, unknown>)?.message as string;
        return successResponse(command, {
          agent: "helios-local",
          message: `Echo: ${message}`,
          timestamp: new Date().toISOString(),
        });
      }
      case "agent.cancel":
        return successResponse(command, { cancelled: true });
      default:
        return errorResponse(command, "UNKNOWN_A2A_METHOD", `unknown a2a method: ${method}`);
    }
  };
}

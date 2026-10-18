import type {
  OrderKind,
  OrderStatus,
  ParticipantResource,
  StatementStatus,
  VeuOrder,
} from "@ebics-mock/shared";

export type StatusEntry = { color: string; label: string };

export const orderStatus: Record<OrderStatus, StatusEntry> = {
  RECEIVED: { color: "teal", label: "Eingegangen" },
  PENDING_VEU: { color: "warning", label: "Wartet auf Freigabe" },
  BOOKED: { color: "success", label: "Verbucht" },
  REJECTED: { color: "red", label: "Abgewiesen" },
};

export const veuStatus: Record<VeuOrder["status"], StatusEntry> = {
  OPEN: { color: "warning", label: "Offen" },
  SIGNED: { color: "success", label: "Freigegeben" },
  CANCELLED: { color: "red", label: "Storniert" },
};

export const statementStatus: Record<StatementStatus, StatusEntry> = {
  AVAILABLE: { color: "teal", label: "Abrufbar" },
  FETCHED: { color: "gray", label: "Abgeholt" },
};

export const orderKind: Record<OrderKind, string> = {
  CCT: "Überweisung",
  CCC: "Überweisung (Container)",
  CDD: "Lastschrift",
  CDC: "Lastschrift (Container)",
};

export type ParticipantStage = "CREATED" | "INITIALISING" | "AWAITING_LETTER" | "ACTIVATED" | "READY";

/** Where a participant stands in INI → HIA → INI-Brief → HPB. */
export function participantStage({ iniState, hiaState, activated, hpbState }: ParticipantResource): ParticipantStage {
  if (iniState === "NEW" && hiaState === "NEW") return "CREATED";
  if (iniState === "NEW" || hiaState === "NEW") return "INITIALISING";
  if (!activated) return "AWAITING_LETTER";
  return hpbState === "DELIVERED" ? "READY" : "ACTIVATED";
}

export const participantStatus: Record<ParticipantStage, StatusEntry> = {
  CREATED: { color: "gray", label: "Angelegt" },
  INITIALISING: { color: "teal", label: "Initialisierung läuft" },
  AWAITING_LETTER: { color: "warning", label: "INI-Brief fehlt" },
  ACTIVATED: { color: "teal", label: "Freigeschaltet" },
  READY: { color: "success", label: "Bereit" },
};

export function returnCodeStatus(code: string): StatusEntry {
  if (code === "000000" || code === "011000") {
    return { color: "success", label: code };
  }
  return { color: code === "090005" ? "gray" : "red", label: code };
}

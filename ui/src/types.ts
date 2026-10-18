import type { BankKeyInfo, ParticipantKey } from "@ebics-mock/shared";

export type * from "@ebics-mock/shared";

export type BankKey = BankKeyInfo & { id: string };

export type ParticipantKeyResource = ParticipantKey & { id: string };

export type Health = { status: string; hostId: string };

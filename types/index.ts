export interface Problem {
  id: string | null;
  slug: string;
  title: string;
  url: string;
  solved: boolean;
}

export interface DayGroup {
  label: string;
  week: string;
  kind: "daily" | "weekend";
  problems: Problem[];
  solvedCount: number;
  totalCount: number;
}

export type SolveMode = "full" | "limited";

export interface TrackResponse {
  username: string;
  totalAssigned: number;
  totalSolved: number;
  percentage: number;
  groups: DayGroup[];
  fetchedAt: string;
  /** "full" = authenticated, complete history.  "limited" = recent 20 only. */
  solveMode: SolveMode;
  solveModeWarning?: string;
}

export interface TrackError {
  error: string;
  code: "USER_NOT_FOUND" | "SHEET_FETCH_FAILED" | "LEETCODE_FETCH_FAILED" | "UNKNOWN";
}

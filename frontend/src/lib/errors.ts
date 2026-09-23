export const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export const errorName = (e: unknown): string | undefined => (e instanceof Error ? e.name : undefined);

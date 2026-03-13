export function buildToolCallErrorResult(message: string, code: number) {
  return {
    content: [{ type: "text" as const, text: message }],
    structuredContent: {
      status: "error" as const,
      error: message,
      code,
    },
    isError: true,
  };
}

export function shouldExposeToolCallErrorResult(message: string, code: number) {
  if (code === -32602) {
    return true;
  }

  return (
    message.startsWith("Validation:") ||
    message.startsWith("NotFound:") ||
    message.startsWith("Conflict:")
  );
}

export function getMcpErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const errorWithData = error as Error & { data?: unknown };
    if (typeof errorWithData.data === "string") {
      return errorWithData.data;
    }
    if (errorWithData.data && typeof errorWithData.data === "object") {
      const data = errorWithData.data as { message?: unknown; error?: unknown };
      if (typeof data.message === "string") {
        return data.message;
      }
      if (typeof data.error === "string") {
        return data.error;
      }
    }
    return error.message;
  }

  return typeof error === "string" ? error : "Unknown error";
}

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

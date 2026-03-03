export const parseEditArgs = (argsString: string): string[] => {
  const args: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";

  for (const char of argsString) {
    if (!inQuote && (char === '"' || char === "'")) {
      inQuote = true;
      quoteChar = char;
      continue;
    }

    if (inQuote && char === quoteChar) {
      inQuote = false;
      quoteChar = "";
      continue;
    }

    if (!inQuote && char === " ") {
      if (current) {
        args.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current) {
    args.push(current);
  }

  return args;
};

export const parseBuiltinEditCommand = (commandLine: string): string[] | null => {
  const trimmed = commandLine.trim();
  const editMatch = trimmed.match(/^edit\s+(.+)$/);
  if (editMatch) {
    return parseEditArgs(editMatch[1]);
  }

  const colabMatch = trimmed.match(/^colab\s+(.+)$/);
  if (colabMatch) {
    return parseEditArgs(colabMatch[1]);
  }

  return null;
};

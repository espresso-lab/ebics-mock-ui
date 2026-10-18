const NOISE = /[\s€$£%"']/g;
const ALLOWED = /^[0-9.,+\-*/()]+$/;
const NUMBER_RUN = /[0-9.,]+/g;

const stripSeparators = (token: string, decimal: string): string => {
  const kept = token.lastIndexOf(decimal);
  return [...token]
    .map((char, index) => {
      if (char !== "." && char !== ",") return char;
      return index === kept ? "." : "";
    })
    .join("");
};

const normalizeNumberRun = (token: string): string => {
  const commas = token.split(",").length - 1;
  const dots = token.split(".").length - 1;

  if (commas > 0 && dots > 0) {
    return stripSeparators(token, token.lastIndexOf(",") > token.lastIndexOf(".") ? "," : ".");
  }

  const separator = commas > 0 ? "," : dots > 0 ? "." : "";
  if (!separator) return token;

  const count = commas > 0 ? commas : dots;
  const integerPart = token.slice(0, token.indexOf(separator));
  const fractionDigits = token.length - token.lastIndexOf(separator) - 1;
  const isGrouping =
    count > 1 ||
    (separator === "." &&
      fractionDigits === 3 &&
      integerPart.length > 0 &&
      integerPart.length <= 3 &&
      !integerPart.startsWith("0"));

  return isGrouping ? token.split(separator).join("") : stripSeparators(token, separator);
};

const evaluateExpression = (input: string): number | undefined => {
  let pos = 0;
  const peek = () => input[pos];

  const factor = (): number | undefined => {
    if (peek() === "+") {
      pos++;
      return factor();
    }
    if (peek() === "-") {
      pos++;
      const inner = factor();
      return inner === undefined ? undefined : -inner;
    }
    if (peek() === "(") {
      pos++;
      const inner = expression();
      if (inner === undefined || input[pos] !== ")") return undefined;
      pos++;
      return inner;
    }
    const start = pos;
    while (pos < input.length && /[0-9.]/.test(input[pos])) pos++;
    if (pos === start) return undefined;
    const parsed = Number(input.slice(start, pos));
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const term = (): number | undefined => {
    let left = factor();
    while (left !== undefined && (peek() === "*" || peek() === "/")) {
      const operator = input[pos++];
      const right = factor();
      if (right === undefined || (operator === "/" && right === 0)) return undefined;
      left = operator === "*" ? left * right : left / right;
    }
    return left;
  };

  const expression = (): number | undefined => {
    let left = term();
    while (left !== undefined && (peek() === "+" || peek() === "-")) {
      const operator = input[pos++];
      const right = term();
      if (right === undefined) return undefined;
      left = operator === "+" ? left + right : left - right;
    }
    return left;
  };

  const result = expression();
  return result !== undefined && pos === input.length && Number.isFinite(result)
    ? result
    : undefined;
};

export const parseDecimalInput = (input: string, decimalScale = 2): number | undefined => {
  const cleaned = input.replace(NOISE, "");
  if (!cleaned || !ALLOWED.test(cleaned)) return undefined;

  const result = evaluateExpression(cleaned.replace(NUMBER_RUN, normalizeNumberRun));
  return result === undefined ? undefined : Number(result.toFixed(decimalScale));
};

export const formatDecimal = (value: number, decimalScale: number, fixed = false): string =>
  new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: fixed ? decimalScale : 0,
    maximumFractionDigits: decimalScale,
  }).format(value);

export const toEditableDecimal = (value: number, decimalScale: number, fixed = false): string =>
  new Intl.NumberFormat("de-DE", {
    useGrouping: false,
    minimumFractionDigits: fixed ? decimalScale : 0,
    maximumFractionDigits: decimalScale,
  }).format(value);

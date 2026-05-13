// Random++ Lexer - Tokenizer for Python-like syntax
// Converts source code into a stream of tokens

const TokenType = {
  // Literals
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  FSTRING: 'FSTRING',
  BOOLEAN: 'BOOLEAN',
  NONE: 'NONE',

  // Identifiers & Keywords
  IDENTIFIER: 'IDENTIFIER',
  KEYWORD: 'KEYWORD',

  // Operators
  PLUS: 'PLUS',
  MINUS: 'MINUS',
  MULTIPLY: 'MULTIPLY',
  DIVIDE: 'DIVIDE',
  FLOOR_DIVIDE: 'FLOOR_DIVIDE',
  MODULO: 'MODULO',
  POWER: 'POWER',
  ASSIGN: 'ASSIGN',
  PLUS_ASSIGN: 'PLUS_ASSIGN',
  MINUS_ASSIGN: 'MINUS_ASSIGN',
  MULTIPLY_ASSIGN: 'MULTIPLY_ASSIGN',
  DIVIDE_ASSIGN: 'DIVIDE_ASSIGN',
  MODULO_ASSIGN: 'MODULO_ASSIGN',
  FLOOR_DIVIDE_ASSIGN: 'FLOOR_DIVIDE_ASSIGN',
  POWER_ASSIGN: 'POWER_ASSIGN',

  // Comparison
  EQUAL: 'EQUAL',
  NOT_EQUAL: 'NOT_EQUAL',
  LESS: 'LESS',
  GREATER: 'GREATER',
  LESS_EQUAL: 'LESS_EQUAL',
  GREATER_EQUAL: 'GREATER_EQUAL',

  // Logical
  AND: 'AND',
  OR: 'OR',
  NOT: 'NOT',
  IN: 'IN',
  NOT_IN: 'NOT_IN',
  IS: 'IS',
  IS_NOT: 'IS_NOT',

  // Delimiters
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  LBRACKET: 'LBRACKET',
  RBRACKET: 'RBRACKET',
  LBRACE: 'LBRACE',
  RBRACE: 'RBRACE',
  COMMA: 'COMMA',
  COLON: 'COLON',
  DOT: 'DOT',

  // Structure
  NEWLINE: 'NEWLINE',
  INDENT: 'INDENT',
  DEDENT: 'DEDENT',
  EOF: 'EOF',
};

const KEYWORDS = new Set([
  'if', 'elif', 'else',
  'while', 'for', 'in',
  'def', 'return', 'class',
  'and', 'or', 'not',
  'True', 'False', 'None',
  'print', 'input',
  'break', 'continue', 'pass',
  'import', 'from', 'as',
  'try', 'except', 'finally', 'raise',
  'with',
  'lambda',
  'global',
  'del',
  'assert',
  'is',
]);

class Token {
  constructor(type, value, line, col) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.col = col;
  }

  toString() {
    return `Token(${this.type}, ${JSON.stringify(this.value)}, L${this.line}:${this.col})`;
  }
}

class LexerError extends Error {
  constructor(message, line, col) {
    super(message);
    this.name = 'LexerError';
    this.line = line;
    this.col = col;
  }
}

class Lexer {
  constructor(source) {
    this.source = source;
    this.pos = 0;
    this.line = 1;
    this.col = 1;
    this.tokens = [];
    this.indentStack = [0];
    this.atLineStart = true;
    this.parenDepth = 0;
  }

  peek() {
    if (this.pos >= this.source.length) return null;
    return this.source[this.pos];
  }

  advance() {
    const ch = this.source[this.pos];
    this.pos++;
    if (ch === '\n') {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    return ch;
  }

  lookAhead(offset) {
    const idx = this.pos + offset;
    if (idx >= this.source.length) return null;
    return this.source[idx];
  }

  error(msg) {
    throw new LexerError(`${msg} at line ${this.line}, col ${this.col}`, this.line, this.col);
  }

  tokenize() {
    while (this.pos < this.source.length) {
      if (this.atLineStart) {
        this.handleIndentation();
        this.atLineStart = false;
      }

      const ch = this.peek();

      if (ch === null) break;

      // Skip blank lines and comments at any position
      if (ch === '#') {
        this.skipComment();
        continue;
      }

      if (ch === '\n') {
        if (this.parenDepth === 0) {
          this.tokens.push(new Token(TokenType.NEWLINE, '\\n', this.line, this.col));
        }
        this.advance();
        this.atLineStart = true;
        continue;
      }

      if (ch === '\r') {
        this.advance();
        continue;
      }

      // Skip whitespace (not at line start)
      if (ch === ' ' || ch === '\t') {
        this.advance();
        continue;
      }

      // Line continuation
      if (ch === '\\' && this.lookAhead(1) === '\n') {
        this.advance(); // skip backslash
        this.advance(); // skip newline
        continue;
      }

      // Numbers
      if (this.isDigit(ch) || (ch === '.' && this.isDigit(this.lookAhead(1)))) {
        this.readNumber();
        continue;
      }

      // Strings
      if (ch === '"' || ch === "'") {
        this.readString();
        continue;
      }

      // F-strings
      if ((ch === 'f' || ch === 'F') && (this.lookAhead(1) === '"' || this.lookAhead(1) === "'")) {
        this.readFString();
        continue;
      }

      // Identifiers and keywords
      if (this.isAlpha(ch) || ch === '_') {
        this.readIdentifier();
        continue;
      }

      // Operators and delimiters
      this.readOperator();
    }

    // Emit remaining DEDENTs
    while (this.indentStack.length > 1) {
      this.indentStack.pop();
      this.tokens.push(new Token(TokenType.DEDENT, '', this.line, this.col));
    }

    // Ensure there's a trailing NEWLINE
    if (this.tokens.length > 0 && this.tokens[this.tokens.length - 1].type !== TokenType.NEWLINE) {
      this.tokens.push(new Token(TokenType.NEWLINE, '\\n', this.line, this.col));
    }

    this.tokens.push(new Token(TokenType.EOF, '', this.line, this.col));
    return this.tokens;
  }

  handleIndentation() {
    let indent = 0;
    while (this.pos < this.source.length) {
      const ch = this.peek();
      if (ch === ' ') {
        indent++;
        this.advance();
      } else if (ch === '\t') {
        indent += 4;
        this.advance();
      } else {
        break;
      }
    }

    // Skip blank lines and comment-only lines
    const ch = this.peek();
    if (ch === '\n' || ch === '\r' || ch === '#' || ch === null) {
      return;
    }

    if (this.parenDepth > 0) return;

    const currentIndent = this.indentStack[this.indentStack.length - 1];

    if (indent > currentIndent) {
      this.indentStack.push(indent);
      this.tokens.push(new Token(TokenType.INDENT, indent, this.line, 1));
    } else if (indent < currentIndent) {
      while (this.indentStack.length > 1 && this.indentStack[this.indentStack.length - 1] > indent) {
        this.indentStack.pop();
        this.tokens.push(new Token(TokenType.DEDENT, '', this.line, 1));
      }
      if (this.indentStack[this.indentStack.length - 1] !== indent) {
        this.error('Indentation error');
      }
    }
  }

  skipComment() {
    while (this.pos < this.source.length && this.peek() !== '\n') {
      this.advance();
    }
  }

  isDigit(ch) {
    return ch !== null && ch >= '0' && ch <= '9';
  }

  isAlpha(ch) {
    return ch !== null && ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_');
  }

  isAlphaNumeric(ch) {
    return this.isAlpha(ch) || this.isDigit(ch);
  }

  readNumber() {
    const startLine = this.line;
    const startCol = this.col;
    let num = '';
    let isFloat = false;

    // Handle 0x, 0b, 0o prefixes
    if (this.peek() === '0' && this.lookAhead(1)) {
      const next = this.lookAhead(1).toLowerCase();
      if (next === 'x' || next === 'b' || next === 'o') {
        num += this.advance();
        num += this.advance();
        while (this.pos < this.source.length && this.isAlphaNumeric(this.peek())) {
          num += this.advance();
        }
        this.tokens.push(new Token(TokenType.NUMBER, Number(num), startLine, startCol));
        return;
      }
    }

    while (this.pos < this.source.length && (this.isDigit(this.peek()) || this.peek() === '_')) {
      if (this.peek() !== '_') num += this.peek();
      this.advance();
    }

    if (this.peek() === '.' && this.isDigit(this.lookAhead(1))) {
      isFloat = true;
      num += this.advance(); // the dot
      while (this.pos < this.source.length && (this.isDigit(this.peek()) || this.peek() === '_')) {
        if (this.peek() !== '_') num += this.peek();
        this.advance();
      }
    }

    // Scientific notation
    if (this.peek() === 'e' || this.peek() === 'E') {
      isFloat = true;
      num += this.advance();
      if (this.peek() === '+' || this.peek() === '-') {
        num += this.advance();
      }
      while (this.pos < this.source.length && this.isDigit(this.peek())) {
        num += this.advance();
      }
    }

    this.tokens.push(new Token(TokenType.NUMBER, Number(num), startLine, startCol));
  }

  readString() {
    const startLine = this.line;
    const startCol = this.col;
    const quote = this.advance();
    let str = '';
    let isTriple = false;

    // Check for triple quotes
    if (this.peek() === quote && this.lookAhead(1) === quote) {
      isTriple = true;
      this.advance();
      this.advance();
    }

    while (this.pos < this.source.length) {
      const ch = this.peek();

      if (isTriple) {
        if (ch === quote && this.lookAhead(1) === quote && this.lookAhead(2) === quote) {
          this.advance();
          this.advance();
          this.advance();
          this.tokens.push(new Token(TokenType.STRING, str, startLine, startCol));
          return;
        }
      } else {
        if (ch === quote) {
          this.advance();
          this.tokens.push(new Token(TokenType.STRING, str, startLine, startCol));
          return;
        }
        if (ch === '\n') {
          this.error('Unterminated string literal');
        }
      }

      if (ch === '\\') {
        this.advance();
        const escaped = this.advance();
        switch (escaped) {
          case 'n': str += '\n'; break;
          case 't': str += '\t'; break;
          case 'r': str += '\r'; break;
          case '\\': str += '\\'; break;
          case "'": str += "'"; break;
          case '"': str += '"'; break;
          case '0': str += '\0'; break;
          default: str += '\\' + escaped;
        }
      } else {
        str += this.advance();
      }
    }

    this.error('Unterminated string literal');
  }

  readFString() {
    const startLine = this.line;
    const startCol = this.col;
    this.advance(); // skip f/F
    const quote = this.advance();
    let parts = [];
    let current = '';

    while (this.pos < this.source.length) {
      const ch = this.peek();

      if (ch === quote) {
        this.advance();
        if (current) parts.push({ type: 'text', value: current });
        this.tokens.push(new Token(TokenType.FSTRING, parts, startLine, startCol));
        return;
      }

      if (ch === '{') {
        if (this.lookAhead(1) === '{') {
          current += '{';
          this.advance();
          this.advance();
          continue;
        }
        if (current) parts.push({ type: 'text', value: current });
        current = '';
        this.advance(); // skip {
        let expr = '';
        let depth = 1;
        while (this.pos < this.source.length && depth > 0) {
          const c = this.peek();
          if (c === '{') depth++;
          if (c === '}') depth--;
          if (depth > 0) expr += this.advance();
          else this.advance();
        }
        parts.push({ type: 'expr', value: expr.trim() });
        continue;
      }

      if (ch === '}' && this.lookAhead(1) === '}') {
        current += '}';
        this.advance();
        this.advance();
        continue;
      }

      if (ch === '\\') {
        this.advance();
        const escaped = this.advance();
        switch (escaped) {
          case 'n': current += '\n'; break;
          case 't': current += '\t'; break;
          default: current += '\\' + escaped;
        }
      } else {
        current += this.advance();
      }
    }

    this.error('Unterminated f-string');
  }

  readIdentifier() {
    const startLine = this.line;
    const startCol = this.col;
    let name = '';

    while (this.pos < this.source.length && this.isAlphaNumeric(this.peek())) {
      name += this.advance();
    }

    // Check for boolean and None
    if (name === 'True' || name === 'False') {
      this.tokens.push(new Token(TokenType.BOOLEAN, name === 'True', startLine, startCol));
    } else if (name === 'None') {
      this.tokens.push(new Token(TokenType.NONE, null, startLine, startCol));
    } else if (name === 'and') {
      this.tokens.push(new Token(TokenType.AND, 'and', startLine, startCol));
    } else if (name === 'or') {
      this.tokens.push(new Token(TokenType.OR, 'or', startLine, startCol));
    } else if (name === 'not') {
      // Check for "not in"
      this.skipSpaces();
      if (this.peekWord() === 'in') {
        this.readWord();
        this.tokens.push(new Token(TokenType.NOT_IN, 'not in', startLine, startCol));
      } else {
        this.tokens.push(new Token(TokenType.NOT, 'not', startLine, startCol));
      }
    } else if (name === 'in') {
      this.tokens.push(new Token(TokenType.IN, 'in', startLine, startCol));
    } else if (name === 'is') {
      // Check for "is not"
      this.skipSpaces();
      if (this.peekWord() === 'not') {
        this.readWord();
        this.tokens.push(new Token(TokenType.IS_NOT, 'is not', startLine, startCol));
      } else {
        this.tokens.push(new Token(TokenType.IS, 'is', startLine, startCol));
      }
    } else if (KEYWORDS.has(name)) {
      this.tokens.push(new Token(TokenType.KEYWORD, name, startLine, startCol));
    } else {
      this.tokens.push(new Token(TokenType.IDENTIFIER, name, startLine, startCol));
    }
  }

  skipSpaces() {
    const saved = this.pos;
    while (this.pos < this.source.length && this.peek() === ' ') {
      this.advance();
    }
  }

  peekWord() {
    let i = this.pos;
    let word = '';
    while (i < this.source.length && this.isAlphaNumeric(this.source[i])) {
      word += this.source[i];
      i++;
    }
    return word;
  }

  readWord() {
    let word = '';
    while (this.pos < this.source.length && this.isAlphaNumeric(this.peek())) {
      word += this.advance();
    }
    return word;
  }

  readOperator() {
    const startLine = this.line;
    const startCol = this.col;
    const ch = this.advance();

    switch (ch) {
      case '+':
        if (this.peek() === '=') { this.advance(); this.tokens.push(new Token(TokenType.PLUS_ASSIGN, '+=', startLine, startCol)); }
        else this.tokens.push(new Token(TokenType.PLUS, '+', startLine, startCol));
        break;
      case '-':
        if (this.peek() === '=') { this.advance(); this.tokens.push(new Token(TokenType.MINUS_ASSIGN, '-=', startLine, startCol)); }
        else this.tokens.push(new Token(TokenType.MINUS, '-', startLine, startCol));
        break;
      case '*':
        if (this.peek() === '*') {
          this.advance();
          if (this.peek() === '=') { this.advance(); this.tokens.push(new Token(TokenType.POWER_ASSIGN, '**=', startLine, startCol)); }
          else this.tokens.push(new Token(TokenType.POWER, '**', startLine, startCol));
        } else if (this.peek() === '=') { this.advance(); this.tokens.push(new Token(TokenType.MULTIPLY_ASSIGN, '*=', startLine, startCol)); }
        else this.tokens.push(new Token(TokenType.MULTIPLY, '*', startLine, startCol));
        break;
      case '/':
        if (this.peek() === '/') {
          this.advance();
          if (this.peek() === '=') { this.advance(); this.tokens.push(new Token(TokenType.FLOOR_DIVIDE_ASSIGN, '//=', startLine, startCol)); }
          else this.tokens.push(new Token(TokenType.FLOOR_DIVIDE, '//', startLine, startCol));
        } else if (this.peek() === '=') { this.advance(); this.tokens.push(new Token(TokenType.DIVIDE_ASSIGN, '/=', startLine, startCol)); }
        else this.tokens.push(new Token(TokenType.DIVIDE, '/', startLine, startCol));
        break;
      case '%':
        if (this.peek() === '=') { this.advance(); this.tokens.push(new Token(TokenType.MODULO_ASSIGN, '%=', startLine, startCol)); }
        else this.tokens.push(new Token(TokenType.MODULO, '%', startLine, startCol));
        break;
      case '=':
        if (this.peek() === '=') { this.advance(); this.tokens.push(new Token(TokenType.EQUAL, '==', startLine, startCol)); }
        else this.tokens.push(new Token(TokenType.ASSIGN, '=', startLine, startCol));
        break;
      case '!':
        if (this.peek() === '=') { this.advance(); this.tokens.push(new Token(TokenType.NOT_EQUAL, '!=', startLine, startCol)); }
        else this.error(`Unexpected character '!'`);
        break;
      case '<':
        if (this.peek() === '=') { this.advance(); this.tokens.push(new Token(TokenType.LESS_EQUAL, '<=', startLine, startCol)); }
        else this.tokens.push(new Token(TokenType.LESS, '<', startLine, startCol));
        break;
      case '>':
        if (this.peek() === '=') { this.advance(); this.tokens.push(new Token(TokenType.GREATER_EQUAL, '>=', startLine, startCol)); }
        else this.tokens.push(new Token(TokenType.GREATER, '>', startLine, startCol));
        break;
      case '(':
        this.parenDepth++;
        this.tokens.push(new Token(TokenType.LPAREN, '(', startLine, startCol));
        break;
      case ')':
        this.parenDepth = Math.max(0, this.parenDepth - 1);
        this.tokens.push(new Token(TokenType.RPAREN, ')', startLine, startCol));
        break;
      case '[':
        this.parenDepth++;
        this.tokens.push(new Token(TokenType.LBRACKET, '[', startLine, startCol));
        break;
      case ']':
        this.parenDepth = Math.max(0, this.parenDepth - 1);
        this.tokens.push(new Token(TokenType.RBRACKET, ']', startLine, startCol));
        break;
      case '{':
        this.parenDepth++;
        this.tokens.push(new Token(TokenType.LBRACE, '{', startLine, startCol));
        break;
      case '}':
        this.parenDepth = Math.max(0, this.parenDepth - 1);
        this.tokens.push(new Token(TokenType.RBRACE, '}', startLine, startCol));
        break;
      case ',':
        this.tokens.push(new Token(TokenType.COMMA, ',', startLine, startCol));
        break;
      case ':':
        this.tokens.push(new Token(TokenType.COLON, ':', startLine, startCol));
        break;
      case '.':
        this.tokens.push(new Token(TokenType.DOT, '.', startLine, startCol));
        break;
      default:
        this.error(`Unexpected character '${ch}'`);
    }
  }
}

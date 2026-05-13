// Random++ Parser - Builds AST from token stream

class ParseError extends Error {
  constructor(message, token) {
    super(message);
    this.name = 'ParseError';
    this.token = token;
    this.line = token ? token.line : 0;
    this.col = token ? token.col : 0;
  }
}

// AST Node types
class ASTNode {
  constructor(type, props = {}) {
    this.type = type;
    Object.assign(this, props);
  }
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() {
    return this.tokens[this.pos];
  }

  advance() {
    const token = this.tokens[this.pos];
    this.pos++;
    return token;
  }

  expect(type, value) {
    const token = this.peek();
    if (!token || token.type !== type || (value !== undefined && token.value !== value)) {
      const expected = value !== undefined ? `${type}(${value})` : type;
      const got = token ? `${token.type}(${JSON.stringify(token.value)})` : 'EOF';
      throw new ParseError(`Expected ${expected}, got ${got} at line ${token ? token.line : '?'}`, token);
    }
    return this.advance();
  }

  match(type, value) {
    const token = this.peek();
    if (token && token.type === type && (value === undefined || token.value === value)) {
      return this.advance();
    }
    return null;
  }

  skipNewlines() {
    while (this.peek() && this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }
  }

  parse() {
    const body = [];
    this.skipNewlines();
    while (this.peek() && this.peek().type !== TokenType.EOF) {
      const stmt = this.parseStatement();
      if (stmt) body.push(stmt);
      this.skipNewlines();
    }
    return new ASTNode('Program', { body });
  }

  parseStatement() {
    const token = this.peek();
    if (!token || token.type === TokenType.EOF) return null;

    switch (token.type) {
      case TokenType.KEYWORD:
        switch (token.value) {
          case 'if': return this.parseIf();
          case 'while': return this.parseWhile();
          case 'for': return this.parseFor();
          case 'def': return this.parseFunctionDef();
          case 'class': return this.parseClass();
          case 'return': return this.parseReturn();
          case 'print': return this.parsePrint();
          case 'import': return this.parseImport();
          case 'from': return this.parseFromImport();
          case 'break': this.advance(); this.expectNewline(); return new ASTNode('Break');
          case 'continue': this.advance(); this.expectNewline(); return new ASTNode('Continue');
          case 'pass': this.advance(); this.expectNewline(); return new ASTNode('Pass');
          case 'try': return this.parseTry();
          case 'raise': return this.parseRaise();
          case 'with': return this.parseWith();
          case 'del': return this.parseDel();
          case 'assert': return this.parseAssert();
          case 'global': return this.parseGlobal();
          default:
            return this.parseExpressionStatement();
        }
      default:
        return this.parseExpressionStatement();
    }
  }

  expectNewline() {
    const t = this.peek();
    if (t && t.type !== TokenType.NEWLINE && t.type !== TokenType.EOF && t.type !== TokenType.DEDENT) {
      throw new ParseError(`Expected newline, got ${t.type}(${JSON.stringify(t.value)})`, t);
    }
    if (t && t.type === TokenType.NEWLINE) this.advance();
  }

  parseBlock() {
    this.expect(TokenType.COLON, ':');
    this.skipNewlines();
    this.expect(TokenType.INDENT);
    const body = [];
    this.skipNewlines();
    while (this.peek() && this.peek().type !== TokenType.DEDENT && this.peek().type !== TokenType.EOF) {
      const stmt = this.parseStatement();
      if (stmt) body.push(stmt);
      this.skipNewlines();
    }
    if (this.peek() && this.peek().type === TokenType.DEDENT) {
      this.advance();
    }
    return body;
  }

  parseIf() {
    this.expect(TokenType.KEYWORD, 'if');
    const test = this.parseExpression();
    const body = this.parseBlock();
    const orelse = [];

    this.skipNewlines();
    while (this.peek() && this.peek().type === TokenType.KEYWORD && this.peek().value === 'elif') {
      this.advance();
      const elifTest = this.parseExpression();
      const elifBody = this.parseBlock();
      orelse.push(new ASTNode('If', { test: elifTest, body: elifBody, orelse: [] }));
      this.skipNewlines();
    }

    if (this.peek() && this.peek().type === TokenType.KEYWORD && this.peek().value === 'else') {
      this.advance();
      const elseBody = this.parseBlock();
      // Nest the else into the deepest elif
      let target = orelse;
      if (target.length > 0) {
        let node = target[target.length - 1];
        while (node.orelse && node.orelse.length > 0 && node.orelse[0].type === 'If') {
          node = node.orelse[node.orelse.length - 1];
        }
        node.orelse = elseBody;
      } else {
        orelse.push(...elseBody);
      }
    }

    // Flatten elif chain
    let finalOrelse = orelse;

    return new ASTNode('If', { test, body, orelse: finalOrelse });
  }

  parseWhile() {
    this.expect(TokenType.KEYWORD, 'while');
    const test = this.parseExpression();
    const body = this.parseBlock();
    return new ASTNode('While', { test, body });
  }

  parseFor() {
    this.expect(TokenType.KEYWORD, 'for');
    const target = this.parseTarget();
    this.expect(TokenType.IN, 'in');
    const iter = this.parseExpression();
    const body = this.parseBlock();
    return new ASTNode('For', { target, iter, body });
  }

  parseTarget() {
    const token = this.peek();
    if (token.type === TokenType.IDENTIFIER) {
      this.advance();
      // Check for tuple unpacking: for a, b in ...
      if (this.peek() && this.peek().type === TokenType.COMMA) {
        const targets = [new ASTNode('Identifier', { name: token.value })];
        while (this.match(TokenType.COMMA)) {
          const next = this.expect(TokenType.IDENTIFIER);
          targets.push(new ASTNode('Identifier', { name: next.value }));
        }
        return new ASTNode('TupleUnpack', { targets });
      }
      return new ASTNode('Identifier', { name: token.value });
    }
    throw new ParseError(`Expected identifier in for target, got ${token.type}`, token);
  }

  parseFunctionDef() {
    this.expect(TokenType.KEYWORD, 'def');
    const name = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.LPAREN);
    const params = this.parseParams();
    this.expect(TokenType.RPAREN);
    const body = this.parseBlock();
    return new ASTNode('FunctionDef', { name, params, body });
  }

  parseParams() {
    const params = [];
    if (this.peek() && this.peek().type === TokenType.RPAREN) return params;

    do {
      // Handle *args and **kwargs
      let kind = 'normal';
      if (this.match(TokenType.MULTIPLY)) {
        if (this.match(TokenType.MULTIPLY)) {
          kind = 'kwargs';
        } else {
          kind = 'args';
        }
      }
      const name = this.expect(TokenType.IDENTIFIER).value;
      let defaultVal = null;
      if (this.match(TokenType.ASSIGN)) {
        defaultVal = this.parseExpression();
      }
      params.push({ name, default: defaultVal, kind });
    } while (this.match(TokenType.COMMA));

    return params;
  }

  parseClass() {
    this.expect(TokenType.KEYWORD, 'class');
    const name = this.expect(TokenType.IDENTIFIER).value;
    let bases = [];
    if (this.match(TokenType.LPAREN)) {
      if (this.peek().type !== TokenType.RPAREN) {
        do {
          bases.push(this.parseExpression());
        } while (this.match(TokenType.COMMA));
      }
      this.expect(TokenType.RPAREN);
    }
    const body = this.parseBlock();
    return new ASTNode('ClassDef', { name, bases, body });
  }

  parseReturn() {
    this.expect(TokenType.KEYWORD, 'return');
    let value = null;
    if (this.peek() && this.peek().type !== TokenType.NEWLINE && this.peek().type !== TokenType.EOF) {
      value = this.parseExpressionList();
    }
    this.expectNewline();
    return new ASTNode('Return', { value });
  }

  parsePrint() {
    const token = this.advance(); // 'print'
    // Check if it's being used as a function call: print(...)
    if (this.peek() && this.peek().type === TokenType.LPAREN) {
      this.advance(); // skip (
      const args = [];
      let kwargs = {};
      if (this.peek() && this.peek().type !== TokenType.RPAREN) {
        do {
          // Check for keyword arguments like sep=, end=
          if (this.peek().type === TokenType.IDENTIFIER &&
              this.tokens[this.pos + 1] && this.tokens[this.pos + 1].type === TokenType.ASSIGN) {
            const key = this.advance().value;
            this.advance(); // skip =
            const val = this.parseExpression();
            kwargs[key] = val;
          } else {
            args.push(this.parseExpression());
          }
        } while (this.match(TokenType.COMMA));
      }
      this.expect(TokenType.RPAREN);
      this.expectNewline();
      return new ASTNode('Print', { args, kwargs });
    } else {
      // print without parens (Python 2 style, we'll support it)
      const args = [];
      if (this.peek() && this.peek().type !== TokenType.NEWLINE && this.peek().type !== TokenType.EOF) {
        args.push(this.parseExpression());
        while (this.match(TokenType.COMMA)) {
          args.push(this.parseExpression());
        }
      }
      this.expectNewline();
      return new ASTNode('Print', { args, kwargs: {} });
    }
  }

  parseImport() {
    this.advance(); // 'import'
    const modules = [];
    do {
      const name = this.expect(TokenType.IDENTIFIER).value;
      let alias = null;
      if (this.peek() && this.peek().type === TokenType.KEYWORD && this.peek().value === 'as') {
        this.advance();
        alias = this.expect(TokenType.IDENTIFIER).value;
      }
      modules.push({ name, alias });
    } while (this.match(TokenType.COMMA));
    this.expectNewline();
    return new ASTNode('Import', { modules });
  }

  parseFromImport() {
    this.advance(); // 'from'
    const module = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.KEYWORD, 'import');
    const names = [];
    do {
      const name = this.expect(TokenType.IDENTIFIER).value;
      let alias = null;
      if (this.peek() && this.peek().type === TokenType.KEYWORD && this.peek().value === 'as') {
        this.advance();
        alias = this.expect(TokenType.IDENTIFIER).value;
      }
      names.push({ name, alias });
    } while (this.match(TokenType.COMMA));
    this.expectNewline();
    return new ASTNode('FromImport', { module, names });
  }

  parseTry() {
    this.expect(TokenType.KEYWORD, 'try');
    const body = this.parseBlock();
    const handlers = [];
    let finallyBody = null;

    this.skipNewlines();
    while (this.peek() && this.peek().type === TokenType.KEYWORD && this.peek().value === 'except') {
      this.advance();
      let exceptionType = null;
      let name = null;
      if (this.peek() && this.peek().type !== TokenType.COLON) {
        exceptionType = this.expect(TokenType.IDENTIFIER).value;
        if (this.peek() && this.peek().type === TokenType.KEYWORD && this.peek().value === 'as') {
          this.advance();
          name = this.expect(TokenType.IDENTIFIER).value;
        }
      }
      const handlerBody = this.parseBlock();
      handlers.push({ exceptionType, name, body: handlerBody });
      this.skipNewlines();
    }

    if (this.peek() && this.peek().type === TokenType.KEYWORD && this.peek().value === 'finally') {
      this.advance();
      finallyBody = this.parseBlock();
    }

    return new ASTNode('Try', { body, handlers, finallyBody });
  }

  parseRaise() {
    this.advance(); // 'raise'
    let exception = null;
    if (this.peek() && this.peek().type !== TokenType.NEWLINE && this.peek().type !== TokenType.EOF) {
      exception = this.parseExpression();
    }
    this.expectNewline();
    return new ASTNode('Raise', { exception });
  }

  parseWith() {
    this.advance(); // 'with'
    const expr = this.parseExpression();
    let name = null;
    if (this.peek() && this.peek().type === TokenType.KEYWORD && this.peek().value === 'as') {
      this.advance();
      name = this.expect(TokenType.IDENTIFIER).value;
    }
    const body = this.parseBlock();
    return new ASTNode('With', { expr, name, body });
  }

  parseDel() {
    this.advance(); // 'del'
    const target = this.parseExpression();
    this.expectNewline();
    return new ASTNode('Del', { target });
  }

  parseAssert() {
    this.advance(); // 'assert'
    const test = this.parseExpression();
    let msg = null;
    if (this.match(TokenType.COMMA)) {
      msg = this.parseExpression();
    }
    this.expectNewline();
    return new ASTNode('Assert', { test, msg });
  }

  parseGlobal() {
    this.advance(); // 'global'
    const names = [];
    do {
      names.push(this.expect(TokenType.IDENTIFIER).value);
    } while (this.match(TokenType.COMMA));
    this.expectNewline();
    return new ASTNode('Global', { names });
  }

  parseExpressionStatement() {
    const expr = this.parseExpressionList();

    // Check for augmented assignment
    const augOps = {
      [TokenType.PLUS_ASSIGN]: '+=',
      [TokenType.MINUS_ASSIGN]: '-=',
      [TokenType.MULTIPLY_ASSIGN]: '*=',
      [TokenType.DIVIDE_ASSIGN]: '/=',
      [TokenType.MODULO_ASSIGN]: '%=',
      [TokenType.FLOOR_DIVIDE_ASSIGN]: '//=',
      [TokenType.POWER_ASSIGN]: '**=',
    };

    const t = this.peek();
    if (t && augOps[t.type]) {
      const op = this.advance();
      const value = this.parseExpression();
      this.expectNewline();
      return new ASTNode('AugAssign', { target: expr, op: augOps[op.type], value });
    }

    // Check for assignment
    if (this.match(TokenType.ASSIGN)) {
      const value = this.parseExpressionList();
      this.expectNewline();
      return new ASTNode('Assign', { target: expr, value });
    }

    this.expectNewline();
    return new ASTNode('ExprStatement', { expr });
  }

  parseExpressionList() {
    const expr = this.parseExpression();
    // Check for tuple
    if (this.peek() && this.peek().type === TokenType.COMMA &&
        this.peek().type !== TokenType.RPAREN) {
      // Could be a tuple
      const elements = [expr];
      while (this.peek() && this.peek().type === TokenType.COMMA) {
        // Don't consume comma if next token is RPAREN, RBRACKET, NEWLINE, etc.
        const afterComma = this.tokens[this.pos + 1];
        if (!afterComma ||
            afterComma.type === TokenType.RPAREN ||
            afterComma.type === TokenType.RBRACKET ||
            afterComma.type === TokenType.NEWLINE ||
            afterComma.type === TokenType.EOF ||
            afterComma.type === TokenType.ASSIGN ||
            afterComma.type === TokenType.COLON) {
          break;
        }
        this.advance(); // skip comma
        elements.push(this.parseExpression());
      }
      if (elements.length > 1) {
        return new ASTNode('Tuple', { elements });
      }
    }
    return expr;
  }

  // Expression parsing with precedence
  parseExpression() {
    return this.parseTernary();
  }

  parseTernary() {
    let expr = this.parseLambda();
    if (this.peek() && this.peek().type === TokenType.KEYWORD && this.peek().value === 'if') {
      this.advance();
      const test = this.parseOr();
      this.expect(TokenType.KEYWORD, 'else');
      const alt = this.parseExpression();
      return new ASTNode('Ternary', { body: expr, test, orelse: alt });
    }
    return expr;
  }

  parseLambda() {
    if (this.peek() && this.peek().type === TokenType.KEYWORD && this.peek().value === 'lambda') {
      this.advance();
      const params = [];
      if (this.peek() && this.peek().type !== TokenType.COLON) {
        do {
          const name = this.expect(TokenType.IDENTIFIER).value;
          let defaultVal = null;
          if (this.match(TokenType.ASSIGN)) {
            defaultVal = this.parseExpression();
          }
          params.push({ name, default: defaultVal, kind: 'normal' });
        } while (this.match(TokenType.COMMA));
      }
      this.expect(TokenType.COLON);
      const body = this.parseExpression();
      return new ASTNode('Lambda', { params, body });
    }
    return this.parseOr();
  }

  parseOr() {
    let left = this.parseAnd();
    while (this.match(TokenType.OR)) {
      const right = this.parseAnd();
      left = new ASTNode('BoolOp', { op: 'or', left, right });
    }
    return left;
  }

  parseAnd() {
    let left = this.parseNot();
    while (this.match(TokenType.AND)) {
      const right = this.parseNot();
      left = new ASTNode('BoolOp', { op: 'and', left, right });
    }
    return left;
  }

  parseNot() {
    if (this.match(TokenType.NOT)) {
      const operand = this.parseNot();
      return new ASTNode('UnaryOp', { op: 'not', operand });
    }
    return this.parseComparison();
  }

  parseComparison() {
    let left = this.parseAddSub();
    const compOps = [
      TokenType.EQUAL, TokenType.NOT_EQUAL,
      TokenType.LESS, TokenType.GREATER,
      TokenType.LESS_EQUAL, TokenType.GREATER_EQUAL,
      TokenType.IN, TokenType.NOT_IN,
      TokenType.IS, TokenType.IS_NOT,
    ];

    while (this.peek() && compOps.includes(this.peek().type)) {
      const op = this.advance();
      const right = this.parseAddSub();
      left = new ASTNode('Compare', { op: op.value, left, right });
    }
    return left;
  }

  parseAddSub() {
    let left = this.parseMulDiv();
    while (this.peek() && (this.peek().type === TokenType.PLUS || this.peek().type === TokenType.MINUS)) {
      const op = this.advance();
      const right = this.parseMulDiv();
      left = new ASTNode('BinOp', { op: op.value, left, right });
    }
    return left;
  }

  parseMulDiv() {
    let left = this.parsePower();
    while (this.peek() && (
      this.peek().type === TokenType.MULTIPLY ||
      this.peek().type === TokenType.DIVIDE ||
      this.peek().type === TokenType.FLOOR_DIVIDE ||
      this.peek().type === TokenType.MODULO
    )) {
      const op = this.advance();
      const right = this.parsePower();
      left = new ASTNode('BinOp', { op: op.value, left, right });
    }
    return left;
  }

  parsePower() {
    let base = this.parseUnary();
    if (this.peek() && this.peek().type === TokenType.POWER) {
      this.advance();
      const exp = this.parseUnary();
      return new ASTNode('BinOp', { op: '**', left: base, right: exp });
    }
    return base;
  }

  parseUnary() {
    if (this.peek() && this.peek().type === TokenType.MINUS) {
      this.advance();
      const operand = this.parseUnary();
      return new ASTNode('UnaryOp', { op: '-', operand });
    }
    if (this.peek() && this.peek().type === TokenType.PLUS) {
      this.advance();
      return this.parseUnary();
    }
    return this.parsePostfix();
  }

  parsePostfix() {
    let expr = this.parsePrimary();

    while (true) {
      if (this.peek() && this.peek().type === TokenType.LPAREN) {
        // Function call
        this.advance();
        const args = [];
        const kwargs = {};
        if (this.peek() && this.peek().type !== TokenType.RPAREN) {
          do {
            // Check for keyword argument
            if (this.peek().type === TokenType.IDENTIFIER &&
                this.tokens[this.pos + 1] && this.tokens[this.pos + 1].type === TokenType.ASSIGN) {
              const key = this.advance().value;
              this.advance(); // skip =
              kwargs[key] = this.parseExpression();
            } else if (this.peek().type === TokenType.MULTIPLY) {
              // *args spread
              this.advance();
              args.push(new ASTNode('Spread', { value: this.parseExpression() }));
            } else {
              args.push(this.parseExpression());
            }
          } while (this.match(TokenType.COMMA));
        }
        this.expect(TokenType.RPAREN);
        expr = new ASTNode('Call', { callee: expr, args, kwargs });
      } else if (this.peek() && this.peek().type === TokenType.LBRACKET) {
        // Subscript / slice
        this.advance();
        // Check for slice
        if (this.peek().type === TokenType.COLON) {
          // [:end] or [::step]
          this.advance();
          let end = null, step = null;
          if (this.peek().type !== TokenType.RBRACKET && this.peek().type !== TokenType.COLON) {
            end = this.parseExpression();
          }
          if (this.match(TokenType.COLON)) {
            if (this.peek().type !== TokenType.RBRACKET) {
              step = this.parseExpression();
            }
          }
          this.expect(TokenType.RBRACKET);
          expr = new ASTNode('Slice', { object: expr, start: null, end, step });
        } else {
          const index = this.parseExpression();
          if (this.match(TokenType.COLON)) {
            // [start:end] or [start:end:step]
            let end = null, step = null;
            if (this.peek().type !== TokenType.RBRACKET && this.peek().type !== TokenType.COLON) {
              end = this.parseExpression();
            }
            if (this.match(TokenType.COLON)) {
              if (this.peek().type !== TokenType.RBRACKET) {
                step = this.parseExpression();
              }
            }
            this.expect(TokenType.RBRACKET);
            expr = new ASTNode('Slice', { object: expr, start: index, end, step });
          } else {
            this.expect(TokenType.RBRACKET);
            expr = new ASTNode('Subscript', { object: expr, index });
          }
        }
      } else if (this.peek() && this.peek().type === TokenType.DOT) {
        // Attribute access
        this.advance();
        const attr = this.expect(TokenType.IDENTIFIER).value;
        expr = new ASTNode('Attribute', { object: expr, attr });
      } else {
        break;
      }
    }

    return expr;
  }

  parsePrimary() {
    const token = this.peek();

    if (!token || token.type === TokenType.EOF) {
      throw new ParseError('Unexpected end of input', token);
    }

    switch (token.type) {
      case TokenType.NUMBER:
        this.advance();
        return new ASTNode('Number', { value: token.value });

      case TokenType.STRING:
        this.advance();
        return new ASTNode('String', { value: token.value });

      case TokenType.FSTRING:
        this.advance();
        return new ASTNode('FString', { parts: token.value });

      case TokenType.BOOLEAN:
        this.advance();
        return new ASTNode('Boolean', { value: token.value });

      case TokenType.NONE:
        this.advance();
        return new ASTNode('NoneValue', {});

      case TokenType.IDENTIFIER:
        this.advance();
        return new ASTNode('Identifier', { name: token.value });

      case TokenType.KEYWORD:
        if (token.value === 'input') {
          return this.parseInput();
        }
        if (token.value === 'lambda') {
          return this.parseLambda();
        }
        if (token.value === 'not') {
          return this.parseNot();
        }
        this.advance();
        return new ASTNode('Identifier', { name: token.value });

      case TokenType.LPAREN:
        this.advance();
        if (this.peek().type === TokenType.RPAREN) {
          this.advance();
          return new ASTNode('Tuple', { elements: [] });
        }
        const expr = this.parseExpressionList();
        this.expect(TokenType.RPAREN);
        return expr;

      case TokenType.LBRACKET:
        return this.parseList();

      case TokenType.LBRACE:
        return this.parseDictOrSet();

      default:
        throw new ParseError(`Unexpected token ${token.type}(${JSON.stringify(token.value)})`, token);
    }
  }

  parseInput() {
    this.advance(); // 'input'
    this.expect(TokenType.LPAREN);
    let prompt = null;
    if (this.peek() && this.peek().type !== TokenType.RPAREN) {
      prompt = this.parseExpression();
    }
    this.expect(TokenType.RPAREN);
    return new ASTNode('Input', { prompt });
  }

  parseList() {
    this.advance(); // [
    const elements = [];

    if (this.peek().type === TokenType.RBRACKET) {
      this.advance();
      return new ASTNode('List', { elements });
    }

    const first = this.parseExpression();

    // Check for list comprehension
    if (this.peek() && this.peek().type === TokenType.KEYWORD && this.peek().value === 'for') {
      return this.parseListComprehension(first);
    }

    elements.push(first);
    while (this.match(TokenType.COMMA)) {
      if (this.peek().type === TokenType.RBRACKET) break;
      elements.push(this.parseExpression());
    }
    this.expect(TokenType.RBRACKET);
    return new ASTNode('List', { elements });
  }

  parseListComprehension(expr) {
    this.expect(TokenType.KEYWORD, 'for');
    const target = this.parseTarget();
    this.expect(TokenType.IN, 'in');
    const iter = this.parseExpression();
    let condition = null;
    if (this.peek() && this.peek().type === TokenType.KEYWORD && this.peek().value === 'if') {
      this.advance();
      condition = this.parseExpression();
    }
    this.expect(TokenType.RBRACKET);
    return new ASTNode('ListComp', { expr, target, iter, condition });
  }

  parseDictOrSet() {
    this.advance(); // {
    if (this.peek().type === TokenType.RBRACE) {
      this.advance();
      return new ASTNode('Dict', { pairs: [] });
    }

    const first = this.parseExpression();

    // Dict
    if (this.match(TokenType.COLON)) {
      const value = this.parseExpression();
      const pairs = [{ key: first, value }];

      // Check for dict comprehension
      if (this.peek() && this.peek().type === TokenType.KEYWORD && this.peek().value === 'for') {
        this.expect(TokenType.KEYWORD, 'for');
        const target = this.parseTarget();
        this.expect(TokenType.IN, 'in');
        const iter = this.parseExpression();
        let condition = null;
        if (this.peek() && this.peek().type === TokenType.KEYWORD && this.peek().value === 'if') {
          this.advance();
          condition = this.parseExpression();
        }
        this.expect(TokenType.RBRACE);
        return new ASTNode('DictComp', { key: first, value: pairs[0].value, target, iter, condition });
      }

      while (this.match(TokenType.COMMA)) {
        if (this.peek().type === TokenType.RBRACE) break;
        const k = this.parseExpression();
        this.expect(TokenType.COLON);
        const v = this.parseExpression();
        pairs.push({ key: k, value: v });
      }
      this.expect(TokenType.RBRACE);
      return new ASTNode('Dict', { pairs });
    }

    // Set
    const elements = [first];
    while (this.match(TokenType.COMMA)) {
      if (this.peek().type === TokenType.RBRACE) break;
      elements.push(this.parseExpression());
    }
    this.expect(TokenType.RBRACE);
    return new ASTNode('Set', { elements });
  }
}

// Random++ Interpreter - Executes AST nodes

class RuntimeError extends Error {
  constructor(message, line) {
    super(message);
    this.name = 'RuntimeError';
    this.line = line;
  }
}

class ReturnSignal {
  constructor(value) { this.value = value; }
}
class BreakSignal {}
class ContinueSignal {}

class Environment {
  constructor(parent = null) {
    this.vars = new Map();
    this.parent = parent;
    this.globals = parent ? parent.globals : new Set();
  }

  get(name) {
    if (this.globals.has(name) && this.parent) {
      return this.getGlobal(name);
    }
    if (this.vars.has(name)) return this.vars.get(name);
    if (this.parent) return this.parent.get(name);
    throw new RuntimeError(`Name '${name}' is not defined`);
  }

  set(name, value) {
    if (this.globals.has(name) && this.parent) {
      this.setGlobal(name, value);
      return;
    }
    this.vars.set(name, value);
  }

  has(name) {
    if (this.vars.has(name)) return true;
    if (this.parent) return this.parent.has(name);
    return false;
  }

  update(name, value) {
    if (this.globals.has(name) && this.parent) {
      this.setGlobal(name, value);
      return;
    }
    if (this.vars.has(name)) {
      this.vars.set(name, value);
      return;
    }
    if (this.parent) {
      this.parent.update(name, value);
      return;
    }
    this.vars.set(name, value);
  }

  getGlobal(name) {
    let env = this;
    while (env.parent) env = env.parent;
    if (env.vars.has(name)) return env.vars.get(name);
    throw new RuntimeError(`Name '${name}' is not defined`);
  }

  setGlobal(name, value) {
    let env = this;
    while (env.parent) env = env.parent;
    env.vars.set(name, value);
  }

  addGlobal(name) {
    this.globals.add(name);
  }
}

class RppFunction {
  constructor(name, params, body, closure) {
    this.name = name;
    this.params = params;
    this.body = body;
    this.closure = closure;
    this._isFunction = true;
  }
}

class RppClass {
  constructor(name, bases, methods) {
    this.name = name;
    this.bases = bases;
    this.methods = methods;
    this._isClass = true;
  }
}

class RppInstance {
  constructor(cls) {
    this.cls = cls;
    this.attrs = new Map();
    this._isInstance = true;

    // Copy class methods as instance attributes
    if (cls && cls.methods) {
      for (const [key, val] of cls.methods.entries()) {
        this.attrs.set(key, val);
      }
    }
  }

  get(name) {
    if (this.attrs.has(name)) return this.attrs.get(name);
    if (this.cls && this.cls.methods && this.cls.methods.has(name)) {
      return this.cls.methods.get(name);
    }
    // Check base classes
    if (this.cls && this.cls.bases) {
      for (const base of this.cls.bases) {
        if (base.methods && base.methods.has(name)) {
          return base.methods.get(name);
        }
      }
    }
    throw new RuntimeError(`'${this.cls ? this.cls.name : 'object'}' has no attribute '${name}'`);
  }

  set(name, value) {
    this.attrs.set(name, value);
  }

  has(name) {
    return this.attrs.has(name) ||
      (this.cls && this.cls.methods && this.cls.methods.has(name));
  }
}

class Interpreter {
  constructor(outputCallback, inputCallback) {
    this.output = outputCallback || console.log;
    this.inputCallback = inputCallback;
    this.globalEnv = new Environment();
    this.maxIterations = 100000;
    this.iterationCount = 0;
    this.setupBuiltins();
  }

  setupBuiltins() {
    const env = this.globalEnv;

    // Built-in functions
    env.set('len', { _isBuiltin: true, name: 'len', fn: (args) => {
      if (args.length !== 1) throw new RuntimeError('len() takes exactly 1 argument');
      const val = args[0];
      if (typeof val === 'string') return val.length;
      if (Array.isArray(val)) return val.length;
      if (val instanceof Map) return val.size;
      if (val instanceof Set) return val.size;
      throw new RuntimeError(`object of type '${this.typeOf(val)}' has no len()`);
    }});

    env.set('range', { _isBuiltin: true, name: 'range', fn: (args) => {
      let start = 0, stop, step = 1;
      if (args.length === 1) { stop = args[0]; }
      else if (args.length === 2) { start = args[0]; stop = args[1]; }
      else if (args.length === 3) { start = args[0]; stop = args[1]; step = args[2]; }
      else throw new RuntimeError('range() takes 1 to 3 arguments');
      if (step === 0) throw new RuntimeError('range() step argument must not be zero');
      const result = [];
      if (step > 0) {
        for (let i = start; i < stop; i += step) result.push(i);
      } else {
        for (let i = start; i > stop; i += step) result.push(i);
      }
      return result;
    }});

    env.set('int', { _isBuiltin: true, name: 'int', fn: (args) => {
      if (args.length === 0) return 0;
      if (args.length === 1) {
        const v = args[0];
        if (typeof v === 'number') return Math.trunc(v);
        if (typeof v === 'string') {
          const n = parseInt(v, 10);
          if (isNaN(n)) throw new RuntimeError(`invalid literal for int(): '${v}'`);
          return n;
        }
        if (typeof v === 'boolean') return v ? 1 : 0;
        throw new RuntimeError(`int() argument must be a string or number`);
      }
      if (args.length === 2) {
        return parseInt(args[0], args[1]);
      }
      throw new RuntimeError('int() takes at most 2 arguments');
    }});

    env.set('float', { _isBuiltin: true, name: 'float', fn: (args) => {
      if (args.length === 0) return 0.0;
      const v = args[0];
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const n = parseFloat(v);
        if (isNaN(n)) throw new RuntimeError(`could not convert string to float: '${v}'`);
        return n;
      }
      throw new RuntimeError('float() argument must be a string or number');
    }});

    env.set('str', { _isBuiltin: true, name: 'str', fn: (args) => {
      if (args.length === 0) return '';
      return this.toPyString(args[0]);
    }});

    env.set('bool', { _isBuiltin: true, name: 'bool', fn: (args) => {
      if (args.length === 0) return false;
      return this.isTruthy(args[0]);
    }});

    env.set('list', { _isBuiltin: true, name: 'list', fn: (args) => {
      if (args.length === 0) return [];
      const val = args[0];
      if (typeof val === 'string') return val.split('');
      if (Array.isArray(val)) return [...val];
      if (val instanceof Set) return [...val];
      if (val instanceof Map) return [...val.keys()];
      throw new RuntimeError('list() argument must be an iterable');
    }});

    env.set('dict', { _isBuiltin: true, name: 'dict', fn: (args, kwargs) => {
      const result = new Map();
      if (kwargs) {
        for (const [k, v] of Object.entries(kwargs)) {
          result.set(k, v);
        }
      }
      return result;
    }});

    env.set('set', { _isBuiltin: true, name: 'set', fn: (args) => {
      if (args.length === 0) return new Set();
      const val = args[0];
      if (Array.isArray(val)) return new Set(val);
      if (typeof val === 'string') return new Set(val.split(''));
      throw new RuntimeError('set() argument must be an iterable');
    }});

    env.set('tuple', { _isBuiltin: true, name: 'tuple', fn: (args) => {
      if (args.length === 0) return [];
      const val = args[0];
      if (Array.isArray(val)) return [...val];
      if (typeof val === 'string') return val.split('');
      throw new RuntimeError('tuple() argument must be an iterable');
    }});

    env.set('abs', { _isBuiltin: true, name: 'abs', fn: (args) => Math.abs(args[0]) });
    env.set('max', { _isBuiltin: true, name: 'max', fn: (args) => {
      if (args.length === 1 && Array.isArray(args[0])) return Math.max(...args[0]);
      return Math.max(...args);
    }});
    env.set('min', { _isBuiltin: true, name: 'min', fn: (args) => {
      if (args.length === 1 && Array.isArray(args[0])) return Math.min(...args[0]);
      return Math.min(...args);
    }});
    env.set('sum', { _isBuiltin: true, name: 'sum', fn: (args) => {
      const arr = Array.isArray(args[0]) ? args[0] : args;
      const start = args.length > 1 ? args[1] : 0;
      return arr.reduce((a, b) => a + b, start);
    }});

    env.set('round', { _isBuiltin: true, name: 'round', fn: (args) => {
      if (args.length === 1) return Math.round(args[0]);
      const factor = Math.pow(10, args[1]);
      return Math.round(args[0] * factor) / factor;
    }});

    env.set('sorted', { _isBuiltin: true, name: 'sorted', fn: (args, kwargs) => {
      const arr = Array.isArray(args[0]) ? [...args[0]] : [...args[0]];
      const reverse = kwargs && kwargs.reverse;
      const key = kwargs && kwargs.key;
      if (key) {
        arr.sort((a, b) => {
          const ka = this.callFunction(key, [a]);
          const kb = this.callFunction(key, [b]);
          if (ka < kb) return -1;
          if (ka > kb) return 1;
          return 0;
        });
      } else {
        arr.sort((a, b) => {
          if (a < b) return -1;
          if (a > b) return 1;
          return 0;
        });
      }
      if (reverse) arr.reverse();
      return arr;
    }});

    env.set('reversed', { _isBuiltin: true, name: 'reversed', fn: (args) => {
      if (Array.isArray(args[0])) return [...args[0]].reverse();
      if (typeof args[0] === 'string') return args[0].split('').reverse().join('');
      throw new RuntimeError('reversed() argument must be a sequence');
    }});

    env.set('enumerate', { _isBuiltin: true, name: 'enumerate', fn: (args) => {
      const iterable = args[0];
      const start = args.length > 1 ? args[1] : 0;
      if (!Array.isArray(iterable)) throw new RuntimeError('enumerate() argument must be iterable');
      return iterable.map((item, i) => [start + i, item]);
    }});

    env.set('zip', { _isBuiltin: true, name: 'zip', fn: (args) => {
      const minLen = Math.min(...args.map(a => a.length));
      const result = [];
      for (let i = 0; i < minLen; i++) {
        result.push(args.map(a => a[i]));
      }
      return result;
    }});

    env.set('map', { _isBuiltin: true, name: 'map', fn: (args) => {
      const fn = args[0];
      const iterable = args[1];
      return iterable.map(item => this.callFunction(fn, [item]));
    }});

    env.set('filter', { _isBuiltin: true, name: 'filter', fn: (args) => {
      const fn = args[0];
      const iterable = args[1];
      if (fn === null) return iterable.filter(item => this.isTruthy(item));
      return iterable.filter(item => this.isTruthy(this.callFunction(fn, [item])));
    }});

    env.set('type', { _isBuiltin: true, name: 'type', fn: (args) => {
      return `<class '${this.typeOf(args[0])}'>`;
    }});

    env.set('isinstance', { _isBuiltin: true, name: 'isinstance', fn: (args) => {
      const obj = args[0];
      const cls = args[1];
      if (obj && obj._isInstance && cls && cls._isClass) {
        return obj.cls === cls || (obj.cls.bases && obj.cls.bases.includes(cls));
      }
      return false;
    }});

    env.set('hasattr', { _isBuiltin: true, name: 'hasattr', fn: (args) => {
      const obj = args[0];
      const name = args[1];
      if (obj && obj._isInstance) return obj.has(name);
      return false;
    }});

    env.set('getattr', { _isBuiltin: true, name: 'getattr', fn: (args) => {
      const obj = args[0];
      const name = args[1];
      const def = args.length > 2 ? args[2] : undefined;
      if (obj && obj._isInstance) {
        try { return obj.get(name); } catch(e) {
          if (def !== undefined) return def;
          throw e;
        }
      }
      throw new RuntimeError(`getattr: object has no attribute '${name}'`);
    }});

    env.set('setattr', { _isBuiltin: true, name: 'setattr', fn: (args) => {
      const obj = args[0];
      const name = args[1];
      const value = args[2];
      if (obj && obj._isInstance) { obj.set(name, value); return null; }
      throw new RuntimeError('setattr: argument must be an instance');
    }});

    env.set('chr', { _isBuiltin: true, name: 'chr', fn: (args) => String.fromCharCode(args[0]) });
    env.set('ord', { _isBuiltin: true, name: 'ord', fn: (args) => {
      if (typeof args[0] !== 'string' || args[0].length !== 1)
        throw new RuntimeError('ord() expected a character');
      return args[0].charCodeAt(0);
    }});

    env.set('hex', { _isBuiltin: true, name: 'hex', fn: (args) => '0x' + args[0].toString(16) });
    env.set('bin', { _isBuiltin: true, name: 'bin', fn: (args) => '0b' + args[0].toString(2) });
    env.set('oct', { _isBuiltin: true, name: 'oct', fn: (args) => '0o' + args[0].toString(8) });

    env.set('id', { _isBuiltin: true, name: 'id', fn: (args) => {
      // Simulated id - returns a hash-like number
      return Math.floor(Math.random() * 1000000);
    }});

    env.set('hash', { _isBuiltin: true, name: 'hash', fn: (args) => {
      const v = args[0];
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        let h = 0;
        for (let i = 0; i < v.length; i++) {
          h = (h * 31 + v.charCodeAt(i)) | 0;
        }
        return h;
      }
      return 0;
    }});

    env.set('repr', { _isBuiltin: true, name: 'repr', fn: (args) => this.toRepr(args[0]) });

    env.set('any', { _isBuiltin: true, name: 'any', fn: (args) => {
      const arr = Array.isArray(args[0]) ? args[0] : args;
      return arr.some(x => this.isTruthy(x));
    }});

    env.set('all', { _isBuiltin: true, name: 'all', fn: (args) => {
      const arr = Array.isArray(args[0]) ? args[0] : args;
      return arr.every(x => this.isTruthy(x));
    }});

    env.set('pow', { _isBuiltin: true, name: 'pow', fn: (args) => {
      if (args.length === 2) return Math.pow(args[0], args[1]);
      if (args.length === 3) return Math.pow(args[0], args[1]) % args[2];
      throw new RuntimeError('pow() takes 2 or 3 arguments');
    }});

    env.set('divmod', { _isBuiltin: true, name: 'divmod', fn: (args) => {
      return [Math.floor(args[0] / args[1]), args[0] % args[1]];
    }});

    // Math module (simplified as builtins)
    env.set('math', (() => {
      const mathObj = new RppInstance(null);
      mathObj.attrs.set('pi', Math.PI);
      mathObj.attrs.set('e', Math.E);
      mathObj.attrs.set('inf', Infinity);
      mathObj.attrs.set('nan', NaN);
      mathObj.attrs.set('sqrt', { _isBuiltin: true, name: 'math.sqrt', fn: (args) => Math.sqrt(args[0]) });
      mathObj.attrs.set('floor', { _isBuiltin: true, name: 'math.floor', fn: (args) => Math.floor(args[0]) });
      mathObj.attrs.set('ceil', { _isBuiltin: true, name: 'math.ceil', fn: (args) => Math.ceil(args[0]) });
      mathObj.attrs.set('log', { _isBuiltin: true, name: 'math.log', fn: (args) => {
        if (args.length === 1) return Math.log(args[0]);
        return Math.log(args[0]) / Math.log(args[1]);
      }});
      mathObj.attrs.set('log2', { _isBuiltin: true, name: 'math.log2', fn: (args) => Math.log2(args[0]) });
      mathObj.attrs.set('log10', { _isBuiltin: true, name: 'math.log10', fn: (args) => Math.log10(args[0]) });
      mathObj.attrs.set('sin', { _isBuiltin: true, name: 'math.sin', fn: (args) => Math.sin(args[0]) });
      mathObj.attrs.set('cos', { _isBuiltin: true, name: 'math.cos', fn: (args) => Math.cos(args[0]) });
      mathObj.attrs.set('tan', { _isBuiltin: true, name: 'math.tan', fn: (args) => Math.tan(args[0]) });
      mathObj.attrs.set('pow', { _isBuiltin: true, name: 'math.pow', fn: (args) => Math.pow(args[0], args[1]) });
      mathObj.attrs.set('factorial', { _isBuiltin: true, name: 'math.factorial', fn: (args) => {
        let n = args[0], r = 1;
        for (let i = 2; i <= n; i++) r *= i;
        return r;
      }});
      mathObj.attrs.set('gcd', { _isBuiltin: true, name: 'math.gcd', fn: (args) => {
        let a = Math.abs(args[0]), b = Math.abs(args[1]);
        while (b) { [a, b] = [b, a % b]; }
        return a;
      }});
      return mathObj;
    })());

    // Random module
    env.set('random', (() => {
      const randObj = new RppInstance(null);
      randObj.attrs.set('random', { _isBuiltin: true, name: 'random.random', fn: () => Math.random() });
      randObj.attrs.set('randint', { _isBuiltin: true, name: 'random.randint', fn: (args) =>
        Math.floor(Math.random() * (args[1] - args[0] + 1)) + args[0]
      });
      randObj.attrs.set('choice', { _isBuiltin: true, name: 'random.choice', fn: (args) => {
        const arr = args[0];
        return arr[Math.floor(Math.random() * arr.length)];
      }});
      randObj.attrs.set('shuffle', { _isBuiltin: true, name: 'random.shuffle', fn: (args) => {
        const arr = args[0];
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return null;
      }});
      randObj.attrs.set('uniform', { _isBuiltin: true, name: 'random.uniform', fn: (args) =>
        args[0] + Math.random() * (args[1] - args[0])
      });
      randObj.attrs.set('sample', { _isBuiltin: true, name: 'random.sample', fn: (args) => {
        const arr = [...args[0]];
        const k = args[1];
        const result = [];
        for (let i = 0; i < k && arr.length > 0; i++) {
          const idx = Math.floor(Math.random() * arr.length);
          result.push(arr.splice(idx, 1)[0]);
        }
        return result;
      }});
      return randObj;
    })());
  }

  run(ast) {
    this.iterationCount = 0;
    return this.execBlock(ast.body, this.globalEnv);
  }

  execBlock(stmts, env) {
    let result = null;
    for (const stmt of stmts) {
      result = this.execStmt(stmt, env);
      if (result instanceof ReturnSignal || result instanceof BreakSignal || result instanceof ContinueSignal) {
        return result;
      }
    }
    return result;
  }

  execStmt(node, env) {
    this.iterationCount++;
    if (this.iterationCount > this.maxIterations) {
      throw new RuntimeError('Maximum iteration limit exceeded (possible infinite loop)');
    }

    switch (node.type) {
      case 'ExprStatement':
        return this.evalExpr(node.expr, env);

      case 'Assign':
        return this.execAssign(node, env);

      case 'AugAssign':
        return this.execAugAssign(node, env);

      case 'Print':
        return this.execPrint(node, env);

      case 'If':
        return this.execIf(node, env);

      case 'While':
        return this.execWhile(node, env);

      case 'For':
        return this.execFor(node, env);

      case 'FunctionDef':
        return this.execFunctionDef(node, env);

      case 'ClassDef':
        return this.execClassDef(node, env);

      case 'Return':
        return new ReturnSignal(node.value ? this.evalExpr(node.value, env) : null);

      case 'Break':
        return new BreakSignal();

      case 'Continue':
        return new ContinueSignal();

      case 'Pass':
        return null;

      case 'Import':
        // Silently handle imports - modules are pre-loaded as builtins
        return null;

      case 'FromImport':
        return this.execFromImport(node, env);

      case 'Try':
        return this.execTry(node, env);

      case 'Raise':
        return this.execRaise(node, env);

      case 'With':
        return this.execBlock(node.body, env);

      case 'Del':
        return this.execDel(node, env);

      case 'Assert':
        return this.execAssert(node, env);

      case 'Global':
        for (const name of node.names) {
          env.addGlobal(name);
        }
        return null;

      default:
        return this.evalExpr(node, env);
    }
  }

  execAssign(node, env) {
    const value = this.evalExpr(node.value, env);

    if (node.target.type === 'Identifier') {
      env.set(node.target.name, value);
    } else if (node.target.type === 'Subscript') {
      const obj = this.evalExpr(node.target.object, env);
      const index = this.evalExpr(node.target.index, env);
      if (Array.isArray(obj)) {
        obj[index < 0 ? obj.length + index : index] = value;
      } else if (obj instanceof Map) {
        obj.set(index, value);
      } else {
        throw new RuntimeError('Cannot assign to subscript of non-list/dict');
      }
    } else if (node.target.type === 'Attribute') {
      const obj = this.evalExpr(node.target.object, env);
      if (obj && obj._isInstance) {
        obj.set(node.target.attr, value);
      } else {
        throw new RuntimeError('Cannot set attribute on non-instance');
      }
    } else if (node.target.type === 'Tuple') {
      if (!Array.isArray(value)) throw new RuntimeError('Cannot unpack non-iterable');
      for (let i = 0; i < node.target.elements.length; i++) {
        const target = node.target.elements[i];
        if (target.type === 'Identifier') {
          env.set(target.name, value[i]);
        }
      }
    }
    return value;
  }

  execAugAssign(node, env) {
    const target = node.target;
    let current;

    if (target.type === 'Identifier') {
      current = env.get(target.name);
    } else if (target.type === 'Subscript') {
      const obj = this.evalExpr(target.object, env);
      const idx = this.evalExpr(target.index, env);
      current = Array.isArray(obj) ? obj[idx < 0 ? obj.length + idx : idx] : obj.get(idx);
    }

    const right = this.evalExpr(node.value, env);
    let result;

    switch (node.op) {
      case '+=':
        if (typeof current === 'string') result = current + this.toPyString(right);
        else if (Array.isArray(current)) result = [...current, ...right];
        else result = current + right;
        break;
      case '-=': result = current - right; break;
      case '*=':
        if (typeof current === 'string') result = current.repeat(right);
        else if (Array.isArray(current)) {
          result = [];
          for (let i = 0; i < right; i++) result.push(...current);
        }
        else result = current * right;
        break;
      case '/=': result = current / right; break;
      case '//=': result = Math.floor(current / right); break;
      case '%=': result = ((current % right) + right) % right; break;
      case '**=': result = Math.pow(current, right); break;
      default: throw new RuntimeError(`Unknown augmented operator: ${node.op}`);
    }

    if (target.type === 'Identifier') {
      env.set(target.name, result);
    } else if (target.type === 'Subscript') {
      const obj = this.evalExpr(target.object, env);
      const idx = this.evalExpr(target.index, env);
      if (Array.isArray(obj)) obj[idx < 0 ? obj.length + idx : idx] = result;
      else obj.set(idx, result);
    }

    return result;
  }

  execPrint(node, env) {
    const values = node.args.map(a => this.evalExpr(a, env));
    const sep = node.kwargs.sep ? this.evalExpr(node.kwargs.sep, env) : ' ';
    const end = node.kwargs.end !== undefined ? this.evalExpr(node.kwargs.end, env) : '\n';
    const text = values.map(v => this.toPyString(v)).join(sep);
    this.output(text + (end === '\n' ? '' : end), 'output');
    return null;
  }

  execIf(node, env) {
    if (this.isTruthy(this.evalExpr(node.test, env))) {
      return this.execBlock(node.body, env);
    }
    for (const alt of node.orelse) {
      if (alt.type === 'If') {
        if (this.isTruthy(this.evalExpr(alt.test, env))) {
          return this.execBlock(alt.body, env);
        }
        if (alt.orelse && alt.orelse.length > 0) {
          // Check nested elif/else
          for (const inner of alt.orelse) {
            if (inner.type === 'If') {
              const result = this.execStmt(inner, env);
              if (result !== undefined) return result;
            } else {
              return this.execStmt(inner, env);
            }
          }
        }
      } else {
        return this.execStmt(alt, env);
      }
    }
    return null;
  }

  execWhile(node, env) {
    let result = null;
    while (this.isTruthy(this.evalExpr(node.test, env))) {
      result = this.execBlock(node.body, env);
      if (result instanceof BreakSignal) break;
      if (result instanceof ContinueSignal) continue;
      if (result instanceof ReturnSignal) return result;
    }
    return null;
  }

  execFor(node, env) {
    const iterable = this.evalExpr(node.iter, env);
    let items;

    if (Array.isArray(iterable)) items = iterable;
    else if (typeof iterable === 'string') items = iterable.split('');
    else if (iterable instanceof Map) items = [...iterable.keys()];
    else if (iterable instanceof Set) items = [...iterable];
    else throw new RuntimeError(`'${this.typeOf(iterable)}' object is not iterable`);

    for (const item of items) {
      // Assign to target
      if (node.target.type === 'Identifier') {
        env.set(node.target.name, item);
      } else if (node.target.type === 'TupleUnpack') {
        if (!Array.isArray(item)) throw new RuntimeError('Cannot unpack non-iterable');
        for (let i = 0; i < node.target.targets.length; i++) {
          env.set(node.target.targets[i].name, item[i]);
        }
      } else if (node.target.type === 'Tuple') {
        if (!Array.isArray(item)) throw new RuntimeError('Cannot unpack non-iterable');
        for (let i = 0; i < node.target.elements.length; i++) {
          env.set(node.target.elements[i].name, item[i]);
        }
      }

      const result = this.execBlock(node.body, env);
      if (result instanceof BreakSignal) break;
      if (result instanceof ContinueSignal) continue;
      if (result instanceof ReturnSignal) return result;
    }
    return null;
  }

  execFunctionDef(node, env) {
    const func = new RppFunction(node.name, node.params, node.body, env);
    env.set(node.name, func);
    return null;
  }

  execClassDef(node, env) {
    const classEnv = new Environment(env);
    const bases = node.bases.map(b => this.evalExpr(b, env));

    // Execute class body to collect methods
    this.execBlock(node.body, classEnv);

    const methods = new Map();
    for (const [name, value] of classEnv.vars) {
      methods.set(name, value);
    }

    const cls = new RppClass(node.name, bases, methods);
    env.set(node.name, cls);
    return null;
  }

  execFromImport(node, env) {
    // Handle from module import name - try to find the module
    if (env.has(node.module)) {
      const mod = env.get(node.module);
      if (mod && mod._isInstance) {
        for (const { name, alias } of node.names) {
          if (mod.attrs.has(name)) {
            env.set(alias || name, mod.attrs.get(name));
          }
        }
      }
    }
    return null;
  }

  execTry(node, env) {
    try {
      const result = this.execBlock(node.body, env);
      if (result instanceof ReturnSignal) return result;
    } catch (e) {
      let handled = false;
      for (const handler of node.handlers) {
        if (!handler.exceptionType || handler.exceptionType === 'Exception' || handler.exceptionType === e.name) {
          if (handler.name) {
            env.set(handler.name, e.message || String(e));
          }
          const result = this.execBlock(handler.body, env);
          if (result instanceof ReturnSignal) return result;
          handled = true;
          break;
        }
      }
      if (!handled) throw e;
    } finally {
      if (node.finallyBody) {
        this.execBlock(node.finallyBody, env);
      }
    }
    return null;
  }

  execRaise(node, env) {
    if (node.exception) {
      const val = this.evalExpr(node.exception, env);
      if (typeof val === 'string') throw new RuntimeError(val);
      if (val && val._isInstance) {
        throw new RuntimeError(val.attrs.get('message') || val.cls.name);
      }
      throw new RuntimeError(this.toPyString(val));
    }
    throw new RuntimeError('Exception');
  }

  execDel(node, env) {
    if (node.target.type === 'Identifier') {
      env.vars.delete(node.target.name);
    } else if (node.target.type === 'Subscript') {
      const obj = this.evalExpr(node.target.object, env);
      const idx = this.evalExpr(node.target.index, env);
      if (Array.isArray(obj)) obj.splice(idx, 1);
      else if (obj instanceof Map) obj.delete(idx);
    }
    return null;
  }

  execAssert(node, env) {
    const val = this.evalExpr(node.test, env);
    if (!this.isTruthy(val)) {
      const msg = node.msg ? this.evalExpr(node.msg, env) : 'Assertion failed';
      throw new RuntimeError(`AssertionError: ${msg}`);
    }
    return null;
  }

  // Expression evaluation
  evalExpr(node, env) {
    switch (node.type) {
      case 'Number':
        return node.value;
      case 'String':
        return node.value;
      case 'Boolean':
        return node.value;
      case 'NoneValue':
        return null;
      case 'Identifier':
        return env.get(node.name);
      case 'List':
        return node.elements.map(e => this.evalExpr(e, env));
      case 'Tuple':
        return node.elements.map(e => this.evalExpr(e, env));
      case 'Dict':
        const map = new Map();
        for (const pair of node.pairs) {
          map.set(this.evalExpr(pair.key, env), this.evalExpr(pair.value, env));
        }
        return map;
      case 'Set':
        return new Set(node.elements.map(e => this.evalExpr(e, env)));
      case 'FString':
        return this.evalFString(node, env);
      case 'BinOp':
        return this.evalBinOp(node, env);
      case 'UnaryOp':
        return this.evalUnaryOp(node, env);
      case 'BoolOp':
        return this.evalBoolOp(node, env);
      case 'Compare':
        return this.evalCompare(node, env);
      case 'Call':
        return this.evalCall(node, env);
      case 'Subscript':
        return this.evalSubscript(node, env);
      case 'Slice':
        return this.evalSlice(node, env);
      case 'Attribute':
        return this.evalAttribute(node, env);
      case 'Ternary':
        return this.isTruthy(this.evalExpr(node.test, env))
          ? this.evalExpr(node.body, env)
          : this.evalExpr(node.orelse, env);
      case 'Lambda':
        return new RppFunction('<lambda>', node.params, [new ASTNode('Return', { value: node.body })], env);
      case 'ListComp':
        return this.evalListComp(node, env);
      case 'DictComp':
        return this.evalDictComp(node, env);
      case 'Input':
        return this.evalInput(node, env);
      default:
        throw new RuntimeError(`Unknown expression type: ${node.type}`);
    }
  }

  evalFString(node, env) {
    let result = '';
    for (const part of node.parts) {
      if (part.type === 'text') {
        result += part.value;
      } else if (part.type === 'expr') {
        // Parse and evaluate the expression
        const lexer = new Lexer(part.value);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const expr = parser.parseExpression();
        const val = this.evalExpr(expr, env);
        result += this.toPyString(val);
      }
    }
    return result;
  }

  evalBinOp(node, env) {
    const left = this.evalExpr(node.left, env);
    const right = this.evalExpr(node.right, env);

    switch (node.op) {
      case '+':
        if (typeof left === 'string' && typeof right === 'string') return left + right;
        if (Array.isArray(left) && Array.isArray(right)) return [...left, ...right];
        if (typeof left === 'number' && typeof right === 'number') return left + right;
        if (typeof left === 'string' || typeof right === 'string') return this.toPyString(left) + this.toPyString(right);
        return left + right;
      case '-': return left - right;
      case '*':
        if (typeof left === 'string' && typeof right === 'number') return left.repeat(right);
        if (typeof right === 'string' && typeof left === 'number') return right.repeat(left);
        if (Array.isArray(left) && typeof right === 'number') {
          const result = [];
          for (let i = 0; i < right; i++) result.push(...left);
          return result;
        }
        return left * right;
      case '/':
        if (right === 0) throw new RuntimeError('ZeroDivisionError: division by zero');
        return left / right;
      case '//':
        if (right === 0) throw new RuntimeError('ZeroDivisionError: integer division by zero');
        return Math.floor(left / right);
      case '%':
        if (typeof left === 'string') return this.formatString(left, right);
        return ((left % right) + right) % right;
      case '**': return Math.pow(left, right);
      default: throw new RuntimeError(`Unknown binary operator: ${node.op}`);
    }
  }

  formatString(fmt, args) {
    // Python-style % formatting
    if (!Array.isArray(args)) args = [args];
    let i = 0;
    return fmt.replace(/%[sdifr%]/g, (match) => {
      if (match === '%%') return '%';
      if (i >= args.length) throw new RuntimeError('not enough arguments for format string');
      const val = args[i++];
      switch (match) {
        case '%s': return this.toPyString(val);
        case '%d': case '%i': return Math.trunc(val).toString();
        case '%f': return val.toFixed(6);
        case '%r': return this.toRepr(val);
        default: return match;
      }
    });
  }

  evalUnaryOp(node, env) {
    const operand = this.evalExpr(node.operand, env);
    switch (node.op) {
      case '-': return -operand;
      case 'not': return !this.isTruthy(operand);
      default: throw new RuntimeError(`Unknown unary operator: ${node.op}`);
    }
  }

  evalBoolOp(node, env) {
    const left = this.evalExpr(node.left, env);
    switch (node.op) {
      case 'and': return this.isTruthy(left) ? this.evalExpr(node.right, env) : left;
      case 'or': return this.isTruthy(left) ? left : this.evalExpr(node.right, env);
      default: throw new RuntimeError(`Unknown boolean operator: ${node.op}`);
    }
  }

  evalCompare(node, env) {
    const left = this.evalExpr(node.left, env);
    const right = this.evalExpr(node.right, env);

    switch (node.op) {
      case '==': return this.isEqual(left, right);
      case '!=': return !this.isEqual(left, right);
      case '<': return left < right;
      case '>': return left > right;
      case '<=': return left <= right;
      case '>=': return left >= right;
      case 'in':
        if (typeof right === 'string') return right.includes(left);
        if (Array.isArray(right)) return right.some(x => this.isEqual(x, left));
        if (right instanceof Map) return right.has(left);
        if (right instanceof Set) return right.has(left);
        throw new RuntimeError(`argument of type '${this.typeOf(right)}' is not iterable`);
      case 'not in':
        if (typeof right === 'string') return !right.includes(left);
        if (Array.isArray(right)) return !right.some(x => this.isEqual(x, left));
        if (right instanceof Map) return !right.has(left);
        if (right instanceof Set) return !right.has(left);
        throw new RuntimeError(`argument of type '${this.typeOf(right)}' is not iterable`);
      case 'is': return left === right;
      case 'is not': return left !== right;
      default: throw new RuntimeError(`Unknown comparison operator: ${node.op}`);
    }
  }

  evalCall(node, env) {
    const callee = this.evalExpr(node.callee, env);
    const args = [];
    for (const arg of node.args) {
      if (arg.type === 'Spread') {
        const spread = this.evalExpr(arg.value, env);
        if (Array.isArray(spread)) args.push(...spread);
        else throw new RuntimeError('Cannot spread non-iterable');
      } else {
        args.push(this.evalExpr(arg, env));
      }
    }
    const kwargs = {};
    for (const [k, v] of Object.entries(node.kwargs)) {
      kwargs[k] = this.evalExpr(v, env);
    }

    return this.callFunction(callee, args, kwargs);
  }

  callFunction(callee, args, kwargs = {}) {
    if (!callee) throw new RuntimeError("Cannot call None");

    // Built-in function
    if (callee._isBuiltin) {
      return callee.fn(args, kwargs);
    }

    // Class instantiation
    if (callee._isClass) {
      const instance = new RppInstance(callee);
      // Call __init__ if it exists
      if (callee.methods.has('__init__')) {
        const init = callee.methods.get('__init__');
        this.callFunction(init, [instance, ...args], kwargs);
      }
      return instance;
    }

    // User-defined function
    if (callee._isFunction || callee instanceof RppFunction) {
      const funcEnv = new Environment(callee.closure);

      // Bind parameters
      let argIdx = 0;
      for (const param of callee.params) {
        if (param.kind === 'args') {
          funcEnv.set(param.name, args.slice(argIdx));
          argIdx = args.length;
        } else if (param.kind === 'kwargs') {
          funcEnv.set(param.name, kwargs);
        } else {
          if (kwargs[param.name] !== undefined) {
            funcEnv.set(param.name, kwargs[param.name]);
          } else if (argIdx < args.length) {
            funcEnv.set(param.name, args[argIdx++]);
          } else if (param.default !== null) {
            funcEnv.set(param.name, this.evalExpr(param.default, callee.closure));
          } else {
            throw new RuntimeError(`${callee.name}() missing required argument: '${param.name}'`);
          }
        }
      }

      const result = this.execBlock(callee.body, funcEnv);
      if (result instanceof ReturnSignal) return result.value;
      return null;
    }

    throw new RuntimeError(`'${this.typeOf(callee)}' is not callable`);
  }

  evalSubscript(node, env) {
    const obj = this.evalExpr(node.object, env);
    const index = this.evalExpr(node.index, env);

    if (typeof obj === 'string') {
      const i = index < 0 ? obj.length + index : index;
      if (i < 0 || i >= obj.length) throw new RuntimeError('IndexError: string index out of range');
      return obj[i];
    }
    if (Array.isArray(obj)) {
      const i = index < 0 ? obj.length + index : index;
      if (i < 0 || i >= obj.length) throw new RuntimeError('IndexError: list index out of range');
      return obj[i];
    }
    if (obj instanceof Map) {
      if (!obj.has(index)) throw new RuntimeError(`KeyError: ${this.toRepr(index)}`);
      return obj.get(index);
    }
    throw new RuntimeError(`'${this.typeOf(obj)}' is not subscriptable`);
  }

  evalSlice(node, env) {
    const obj = this.evalExpr(node.object, env);
    const start = node.start ? this.evalExpr(node.start, env) : null;
    const end = node.end ? this.evalExpr(node.end, env) : null;
    const step = node.step ? this.evalExpr(node.step, env) : null;

    if (typeof obj === 'string') {
      return this.sliceSequence(obj.split(''), start, end, step).join('');
    }
    if (Array.isArray(obj)) {
      return this.sliceSequence(obj, start, end, step);
    }
    throw new RuntimeError(`'${this.typeOf(obj)}' is not sliceable`);
  }

  sliceSequence(arr, start, end, step) {
    const len = arr.length;
    step = step || 1;

    if (step === 0) throw new RuntimeError('slice step cannot be zero');

    if (step > 0) {
      start = start === null ? 0 : (start < 0 ? Math.max(0, len + start) : Math.min(start, len));
      end = end === null ? len : (end < 0 ? Math.max(0, len + end) : Math.min(end, len));
    } else {
      start = start === null ? len - 1 : (start < 0 ? Math.max(-1, len + start) : Math.min(start, len - 1));
      end = end === null ? -1 : (end < 0 ? Math.max(-1, len + end) : Math.min(end, len - 1));
    }

    const result = [];
    if (step > 0) {
      for (let i = start; i < end; i += step) result.push(arr[i]);
    } else {
      for (let i = start; i > end; i += step) result.push(arr[i]);
    }
    return result;
  }

  evalAttribute(node, env) {
    const obj = this.evalExpr(node.object, env);
    const attr = node.attr;

    // String methods
    if (typeof obj === 'string') {
      return this.getStringMethod(obj, attr);
    }

    // List methods
    if (Array.isArray(obj)) {
      return this.getListMethod(obj, attr);
    }

    // Dict methods
    if (obj instanceof Map) {
      return this.getDictMethod(obj, attr);
    }

    // Set methods
    if (obj instanceof Set) {
      return this.getSetMethod(obj, attr);
    }

    // Instance/module attributes
    if (obj && (obj._isInstance || obj._isClass)) {
      try {
        const val = obj._isInstance ? obj.get(attr) : obj.methods.get(attr);
        if (val && (val._isFunction || val instanceof RppFunction)) {
          // Bind 'self' for instance methods
          if (obj._isInstance) {
            return { _isBuiltin: true, name: attr, fn: (args, kwargs) => {
              return this.callFunction(val, [obj, ...args], kwargs);
            }};
          }
        }
        return val;
      } catch(e) {
        throw new RuntimeError(`'${obj._isClass ? obj.name : (obj.cls ? obj.cls.name : 'object')}' has no attribute '${attr}'`);
      }
    }

    // Number methods (limited)
    if (typeof obj === 'number') {
      if (attr === 'bit_length') return { _isBuiltin: true, name: 'bit_length', fn: () => obj.toString(2).replace('-','').length };
    }

    throw new RuntimeError(`'${this.typeOf(obj)}' has no attribute '${attr}'`);
  }

  getStringMethod(str, method) {
    const methods = {
      upper: { _isBuiltin: true, name: 'str.upper', fn: () => str.toUpperCase() },
      lower: { _isBuiltin: true, name: 'str.lower', fn: () => str.toLowerCase() },
      strip: { _isBuiltin: true, name: 'str.strip', fn: (args) => args.length ? str.replace(new RegExp(`^[${args[0]}]+|[${args[0]}]+$`, 'g'), '') : str.trim() },
      lstrip: { _isBuiltin: true, name: 'str.lstrip', fn: (args) => args.length ? str.replace(new RegExp(`^[${args[0]}]+`), '') : str.trimStart() },
      rstrip: { _isBuiltin: true, name: 'str.rstrip', fn: (args) => args.length ? str.replace(new RegExp(`[${args[0]}]+$`), '') : str.trimEnd() },
      split: { _isBuiltin: true, name: 'str.split', fn: (args) => {
        if (args.length === 0 || args[0] === null) return str.trim().split(/\s+/);
        return str.split(args[0]);
      }},
      join: { _isBuiltin: true, name: 'str.join', fn: (args) => {
        if (!Array.isArray(args[0])) throw new RuntimeError('join() argument must be iterable');
        return args[0].map(x => this.toPyString(x)).join(str);
      }},
      replace: { _isBuiltin: true, name: 'str.replace', fn: (args) => {
        if (args.length >= 3) {
          let result = str;
          let count = args[2];
          let idx = 0;
          while (count > 0 && idx < result.length) {
            const pos = result.indexOf(args[0], idx);
            if (pos === -1) break;
            result = result.substring(0, pos) + args[1] + result.substring(pos + args[0].length);
            idx = pos + args[1].length;
            count--;
          }
          return result;
        }
        return str.split(args[0]).join(args[1]);
      }},
      find: { _isBuiltin: true, name: 'str.find', fn: (args) => str.indexOf(args[0], args[1] || 0) },
      rfind: { _isBuiltin: true, name: 'str.rfind', fn: (args) => str.lastIndexOf(args[0]) },
      index: { _isBuiltin: true, name: 'str.index', fn: (args) => {
        const i = str.indexOf(args[0]);
        if (i === -1) throw new RuntimeError('ValueError: substring not found');
        return i;
      }},
      count: { _isBuiltin: true, name: 'str.count', fn: (args) => str.split(args[0]).length - 1 },
      startswith: { _isBuiltin: true, name: 'str.startswith', fn: (args) => str.startsWith(args[0]) },
      endswith: { _isBuiltin: true, name: 'str.endswith', fn: (args) => str.endsWith(args[0]) },
      title: { _isBuiltin: true, name: 'str.title', fn: () => str.replace(/\b\w/g, c => c.toUpperCase()) },
      capitalize: { _isBuiltin: true, name: 'str.capitalize', fn: () => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() },
      swapcase: { _isBuiltin: true, name: 'str.swapcase', fn: () => str.split('').map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join('') },
      center: { _isBuiltin: true, name: 'str.center', fn: (args) => str.padStart(Math.floor((args[0] + str.length) / 2), args[1] || ' ').padEnd(args[0], args[1] || ' ') },
      ljust: { _isBuiltin: true, name: 'str.ljust', fn: (args) => str.padEnd(args[0], args[1] || ' ') },
      rjust: { _isBuiltin: true, name: 'str.rjust', fn: (args) => str.padStart(args[0], args[1] || ' ') },
      zfill: { _isBuiltin: true, name: 'str.zfill', fn: (args) => str.padStart(args[0], '0') },
      isdigit: { _isBuiltin: true, name: 'str.isdigit', fn: () => /^\d+$/.test(str) },
      isalpha: { _isBuiltin: true, name: 'str.isalpha', fn: () => /^[a-zA-Z]+$/.test(str) },
      isalnum: { _isBuiltin: true, name: 'str.isalnum', fn: () => /^[a-zA-Z0-9]+$/.test(str) },
      isspace: { _isBuiltin: true, name: 'str.isspace', fn: () => /^\s+$/.test(str) },
      isupper: { _isBuiltin: true, name: 'str.isupper', fn: () => str === str.toUpperCase() && str !== str.toLowerCase() },
      islower: { _isBuiltin: true, name: 'str.islower', fn: () => str === str.toLowerCase() && str !== str.toUpperCase() },
      format: { _isBuiltin: true, name: 'str.format', fn: (args) => {
        let result = str;
        let i = 0;
        result = result.replace(/\{(\d*)\}/g, (_, idx) => {
          const index = idx === '' ? i++ : parseInt(idx);
          return this.toPyString(args[index]);
        });
        return result;
      }},
      encode: { _isBuiltin: true, name: 'str.encode', fn: () => str },
    };

    if (method in methods) return methods[method];
    throw new RuntimeError(`'str' has no attribute '${method}'`);
  }

  getListMethod(arr, method) {
    const methods = {
      append: { _isBuiltin: true, name: 'list.append', fn: (args) => { arr.push(args[0]); return null; } },
      extend: { _isBuiltin: true, name: 'list.extend', fn: (args) => { arr.push(...args[0]); return null; } },
      insert: { _isBuiltin: true, name: 'list.insert', fn: (args) => { arr.splice(args[0], 0, args[1]); return null; } },
      remove: { _isBuiltin: true, name: 'list.remove', fn: (args) => {
        const idx = arr.findIndex(x => this.isEqual(x, args[0]));
        if (idx === -1) throw new RuntimeError(`ValueError: list.remove(x): x not in list`);
        arr.splice(idx, 1);
        return null;
      }},
      pop: { _isBuiltin: true, name: 'list.pop', fn: (args) => {
        const idx = args.length > 0 ? (args[0] < 0 ? arr.length + args[0] : args[0]) : arr.length - 1;
        if (idx < 0 || idx >= arr.length) throw new RuntimeError('IndexError: pop index out of range');
        return arr.splice(idx, 1)[0];
      }},
      clear: { _isBuiltin: true, name: 'list.clear', fn: () => { arr.length = 0; return null; } },
      index: { _isBuiltin: true, name: 'list.index', fn: (args) => {
        const idx = arr.findIndex(x => this.isEqual(x, args[0]));
        if (idx === -1) throw new RuntimeError(`ValueError: ${this.toRepr(args[0])} is not in list`);
        return idx;
      }},
      count: { _isBuiltin: true, name: 'list.count', fn: (args) => arr.filter(x => this.isEqual(x, args[0])).length },
      sort: { _isBuiltin: true, name: 'list.sort', fn: (args, kwargs) => {
        const reverse = kwargs && kwargs.reverse;
        const key = kwargs && kwargs.key;
        if (key) {
          arr.sort((a, b) => {
            const ka = this.callFunction(key, [a]);
            const kb = this.callFunction(key, [b]);
            return ka < kb ? -1 : ka > kb ? 1 : 0;
          });
        } else {
          arr.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
        }
        if (reverse) arr.reverse();
        return null;
      }},
      reverse: { _isBuiltin: true, name: 'list.reverse', fn: () => { arr.reverse(); return null; } },
      copy: { _isBuiltin: true, name: 'list.copy', fn: () => [...arr] },
    };

    if (method in methods) return methods[method];
    throw new RuntimeError(`'list' has no attribute '${method}'`);
  }

  getDictMethod(dict, method) {
    const methods = {
      keys: { _isBuiltin: true, name: 'dict.keys', fn: () => [...dict.keys()] },
      values: { _isBuiltin: true, name: 'dict.values', fn: () => [...dict.values()] },
      items: { _isBuiltin: true, name: 'dict.items', fn: () => [...dict.entries()].map(e => e) },
      get: { _isBuiltin: true, name: 'dict.get', fn: (args) => dict.has(args[0]) ? dict.get(args[0]) : (args.length > 1 ? args[1] : null) },
      setdefault: { _isBuiltin: true, name: 'dict.setdefault', fn: (args) => {
        if (!dict.has(args[0])) dict.set(args[0], args.length > 1 ? args[1] : null);
        return dict.get(args[0]);
      }},
      update: { _isBuiltin: true, name: 'dict.update', fn: (args) => {
        if (args[0] instanceof Map) {
          for (const [k, v] of args[0]) dict.set(k, v);
        } else if (typeof args[0] === 'object') {
          for (const [k, v] of Object.entries(args[0])) dict.set(k, v);
        }
        return null;
      }},
      pop: { _isBuiltin: true, name: 'dict.pop', fn: (args) => {
        if (dict.has(args[0])) {
          const val = dict.get(args[0]);
          dict.delete(args[0]);
          return val;
        }
        if (args.length > 1) return args[1];
        throw new RuntimeError(`KeyError: ${this.toRepr(args[0])}`);
      }},
      clear: { _isBuiltin: true, name: 'dict.clear', fn: () => { dict.clear(); return null; } },
      copy: { _isBuiltin: true, name: 'dict.copy', fn: () => new Map(dict) },
    };

    if (method in methods) return methods[method];
    throw new RuntimeError(`'dict' has no attribute '${method}'`);
  }

  getSetMethod(s, method) {
    const methods = {
      add: { _isBuiltin: true, name: 'set.add', fn: (args) => { s.add(args[0]); return null; } },
      remove: { _isBuiltin: true, name: 'set.remove', fn: (args) => {
        if (!s.has(args[0])) throw new RuntimeError(`KeyError: ${args[0]}`);
        s.delete(args[0]); return null;
      }},
      discard: { _isBuiltin: true, name: 'set.discard', fn: (args) => { s.delete(args[0]); return null; } },
      union: { _isBuiltin: true, name: 'set.union', fn: (args) => new Set([...s, ...args[0]]) },
      intersection: { _isBuiltin: true, name: 'set.intersection', fn: (args) => {
        const other = args[0] instanceof Set ? args[0] : new Set(args[0]);
        return new Set([...s].filter(x => other.has(x)));
      }},
      difference: { _isBuiltin: true, name: 'set.difference', fn: (args) => {
        const other = args[0] instanceof Set ? args[0] : new Set(args[0]);
        return new Set([...s].filter(x => !other.has(x)));
      }},
      clear: { _isBuiltin: true, name: 'set.clear', fn: () => { s.clear(); return null; } },
      copy: { _isBuiltin: true, name: 'set.copy', fn: () => new Set(s) },
    };

    if (method in methods) return methods[method];
    throw new RuntimeError(`'set' has no attribute '${method}'`);
  }

  evalListComp(node, env) {
    const result = [];
    const iter = this.evalExpr(node.iter, env);
    const items = Array.isArray(iter) ? iter : (typeof iter === 'string' ? iter.split('') : [...iter]);
    const compEnv = new Environment(env);

    for (const item of items) {
      if (node.target.type === 'Identifier') {
        compEnv.set(node.target.name, item);
      } else if (node.target.type === 'TupleUnpack') {
        for (let i = 0; i < node.target.targets.length; i++) {
          compEnv.set(node.target.targets[i].name, item[i]);
        }
      }

      if (node.condition) {
        if (!this.isTruthy(this.evalExpr(node.condition, compEnv))) continue;
      }
      result.push(this.evalExpr(node.expr, compEnv));
    }
    return result;
  }

  evalDictComp(node, env) {
    const result = new Map();
    const iter = this.evalExpr(node.iter, env);
    const items = Array.isArray(iter) ? iter : [...iter];
    const compEnv = new Environment(env);

    for (const item of items) {
      if (node.target.type === 'Identifier') {
        compEnv.set(node.target.name, item);
      } else if (node.target.type === 'TupleUnpack') {
        for (let i = 0; i < node.target.targets.length; i++) {
          compEnv.set(node.target.targets[i].name, item[i]);
        }
      }

      if (node.condition) {
        if (!this.isTruthy(this.evalExpr(node.condition, compEnv))) continue;
      }
      const key = this.evalExpr(node.key, compEnv);
      const value = this.evalExpr(node.value, compEnv);
      result.set(key, value);
    }
    return result;
  }

  evalInput(node, env) {
    if (node.prompt) {
      const prompt = this.evalExpr(node.prompt, env);
      this.output(this.toPyString(prompt), 'output');
    }
    if (this.inputCallback) {
      return this.inputCallback(node.prompt ? this.toPyString(this.evalExpr(node.prompt, env)) : '');
    }
    return '';
  }

  // Utility methods
  isTruthy(val) {
    if (val === null || val === undefined) return false;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val !== 0;
    if (typeof val === 'string') return val.length > 0;
    if (Array.isArray(val)) return val.length > 0;
    if (val instanceof Map) return val.size > 0;
    if (val instanceof Set) return val.size > 0;
    return true;
  }

  isEqual(a, b) {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((v, i) => this.isEqual(v, b[i]));
    }
    if (a instanceof Map && b instanceof Map) {
      if (a.size !== b.size) return false;
      for (const [k, v] of a) {
        if (!b.has(k) || !this.isEqual(v, b.get(k))) return false;
      }
      return true;
    }
    return a == b;
  }

  typeOf(val) {
    if (val === null || val === undefined) return 'NoneType';
    if (typeof val === 'boolean') return 'bool';
    if (typeof val === 'number') return Number.isInteger(val) ? 'int' : 'float';
    if (typeof val === 'string') return 'str';
    if (Array.isArray(val)) return 'list';
    if (val instanceof Map) return 'dict';
    if (val instanceof Set) return 'set';
    if (val._isFunction || val instanceof RppFunction) return 'function';
    if (val._isClass) return 'type';
    if (val._isInstance) return val.cls ? val.cls.name : 'object';
    if (val._isBuiltin) return 'builtin_function';
    return 'object';
  }

  toPyString(val) {
    if (val === null || val === undefined) return 'None';
    if (typeof val === 'boolean') return val ? 'True' : 'False';
    if (typeof val === 'number') return String(val);
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return '[' + val.map(v => this.toRepr(v)).join(', ') + ']';
    if (val instanceof Map) {
      const entries = [...val.entries()].map(([k, v]) => `${this.toRepr(k)}: ${this.toRepr(v)}`);
      return '{' + entries.join(', ') + '}';
    }
    if (val instanceof Set) {
      if (val.size === 0) return 'set()';
      return '{' + [...val].map(v => this.toRepr(v)).join(', ') + '}';
    }
    if (val._isFunction || val instanceof RppFunction) return `<function ${val.name}>`;
    if (val._isClass) return `<class '${val.name}'>`;
    if (val._isInstance) return `<${val.cls ? val.cls.name : 'object'} instance>`;
    if (val._isBuiltin) return `<built-in function ${val.name}>`;
    return String(val);
  }

  toRepr(val) {
    if (val === null || val === undefined) return 'None';
    if (typeof val === 'boolean') return val ? 'True' : 'False';
    if (typeof val === 'number') return String(val);
    if (typeof val === 'string') return `'${val}'`;
    return this.toPyString(val);
  }
}

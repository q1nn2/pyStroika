/*
 * mini-python.js
 * A minimal Python interpreter for the crane game.
 * Supports: variables, for/while/if/elif/else, def, return,
 *           arithmetic, comparisons, boolean ops, strings, lists.
 * Crane built-ins are injected into the global env.
 */
(function(global) {

  /* ─── Tokenizer ─────────────────────────────────────────── */
  var TT = {
    NUM: 'NUM', STR: 'STR', NAME: 'NAME',
    PLUS: '+', MINUS: '-', STAR: '*', SLASH: '/', DSLASH: '//', PERCENT: '%',
    EQ: '==', NEQ: '!=', LT: '<', GT: '>', LE: '<=', GE: '>=',
    ASSIGN: '=', LPAREN: '(', RPAREN: ')', LBRACE: '[', RBRACE: ']',
    COLON: ':', COMMA: ',', DOT: '.', NOT: 'not',
    AND: 'and', OR: 'or', IN: 'in', IF: 'if', ELSE: 'else',
    ELIF: 'elif', FOR: 'for', WHILE: 'while', DEF: 'def',
    RETURN: 'return', PASS: 'pass', BREAK: 'break', CONTINUE: 'continue',
    INDENT: 'INDENT', DEDENT: 'DEDENT', NEWLINE: 'NEWLINE', EOF: 'EOF'
  };

  var KEYWORDS = {
    'if': TT.IF, 'else': TT.ELSE, 'elif': TT.ELIF,
    'for': TT.FOR, 'while': TT.WHILE, 'def': TT.DEF,
    'return': TT.RETURN, 'pass': TT.PASS, 'break': TT.BREAK,
    'continue': TT.CONTINUE, 'and': TT.AND, 'or': TT.OR,
    'not': TT.NOT, 'in': TT.IN,
    'True': 'True', 'False': 'False', 'None': 'None'
  };

  function tokenize(src) {
    var tokens = [];
    var lines = src.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    var indentStack = [0];

    for (var li = 0; li < lines.length; li++) {
      var line = lines[li];
      // Strip trailing whitespace / comments
      var stripped = line.replace(/#.*$/, '').replace(/\s+$/, '');
      if (!stripped) continue; // blank / comment-only line

      // Measure indent
      var indent = 0;
      while (indent < line.length && (line[indent] === ' ' || line[indent] === '\t')) {
        indent += (line[indent] === '\t') ? 4 : 1;
      }

      var curIndent = indentStack[indentStack.length - 1];
      if (indent > curIndent) {
        indentStack.push(indent);
        tokens.push({ type: TT.INDENT });
      } else {
        while (indent < curIndent) {
          indentStack.pop();
          curIndent = indentStack[indentStack.length - 1];
          tokens.push({ type: TT.DEDENT });
        }
      }

      // Tokenize the line content
      var col = indent;
      while (col < line.length) {
        var ch = line[col];
        // Skip whitespace
        if (ch === ' ' || ch === '\t') { col++; continue; }
        // Comment
        if (ch === '#') break;
        // String
        if (ch === '"' || ch === "'") {
          var q = ch; var s = ''; col++;
          while (col < line.length && line[col] !== q) {
            if (line[col] === '\\') { col++; s += ({ 'n': '\n', 't': '\t', "'": "'", '"': '"', '\\': '\\' }[line[col]] || line[col]); col++; }
            else { s += line[col++]; }
          }
          col++; // closing quote
          tokens.push({ type: TT.STR, val: s });
          continue;
        }
        // Number
        if (/[0-9]/.test(ch) || (ch === '-' && /[0-9]/.test(line[col+1]||''))) {
          var num = '';
          if (ch === '-') { num = '-'; col++; }
          while (col < line.length && /[0-9.]/.test(line[col])) num += line[col++];
          tokens.push({ type: TT.NUM, val: parseFloat(num) });
          continue;
        }
        // Identifier / keyword
        if (/[a-zA-Z_]/.test(ch)) {
          var id = '';
          while (col < line.length && /[a-zA-Z0-9_]/.test(line[col])) id += line[col++];
          var kw = KEYWORDS[id];
          if (kw === 'True')  { tokens.push({ type: TT.NUM, val: true }); continue; }
          if (kw === 'False') { tokens.push({ type: TT.NUM, val: false }); continue; }
          if (kw === 'None')  { tokens.push({ type: TT.NUM, val: null }); continue; }
          tokens.push({ type: kw || TT.NAME, val: id });
          continue;
        }
        // Two-char operators
        var two = line.slice(col, col+2);
        if (two === '//') { tokens.push({ type: TT.DSLASH }); col+=2; continue; }
        if (two === '==') { tokens.push({ type: TT.EQ }); col+=2; continue; }
        if (two === '!=') { tokens.push({ type: TT.NEQ }); col+=2; continue; }
        if (two === '<=') { tokens.push({ type: TT.LE }); col+=2; continue; }
        if (two === '>=') { tokens.push({ type: TT.GE }); col+=2; continue; }
        // Single-char operators
        var oneMap = { '+': TT.PLUS, '-': TT.MINUS, '*': TT.STAR, '/': TT.SLASH,
                       '%': TT.PERCENT, '=': TT.ASSIGN, '<': TT.LT, '>': TT.GT,
                       '(': TT.LPAREN, ')': TT.RPAREN, '[': TT.LBRACE, ']': TT.RBRACE,
                       ':': TT.COLON, ',': TT.COMMA, '.': TT.DOT };
        if (oneMap[ch]) { tokens.push({ type: oneMap[ch] }); col++; continue; }
        col++; // skip unknown char
      }
      tokens.push({ type: TT.NEWLINE });
    }
    // Close remaining indents
    while (indentStack.length > 1) {
      indentStack.pop();
      tokens.push({ type: TT.DEDENT });
    }
    tokens.push({ type: TT.EOF });
    return tokens;
  }

  /* ─── Parser ─────────────────────────────────────────────── */
  function Parser(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }
  Parser.prototype.peek = function() { return this.tokens[this.pos]; };
  Parser.prototype.consume = function(type) {
    var t = this.tokens[this.pos];
    if (type && t.type !== type) throw new SyntaxError('Expected ' + type + ' got ' + t.type);
    this.pos++;
    return t;
  };
  Parser.prototype.match = function(type) {
    if (this.tokens[this.pos].type === type) { this.pos++; return true; }
    return false;
  };
  Parser.prototype.skipNewlines = function() {
    while (this.peek().type === TT.NEWLINE) this.pos++;
  };

  // Parse a block (INDENT ... DEDENT)
  Parser.prototype.parseBlock = function() {
    this.consume(TT.INDENT);
    var stmts = [];
    while (this.peek().type !== TT.DEDENT && this.peek().type !== TT.EOF) {
      this.skipNewlines();
      if (this.peek().type === TT.DEDENT) break;
      stmts.push(this.parseStatement());
    }
    this.consume(TT.DEDENT);
    return { type: 'Block', body: stmts };
  };

  Parser.prototype.parseStatement = function() {
    var t = this.peek();
    if (t.type === TT.DEF) return this.parseDef();
    if (t.type === TT.IF) return this.parseIf();
    if (t.type === TT.FOR) return this.parseFor();
    if (t.type === TT.WHILE) return this.parseWhile();
    if (t.type === TT.RETURN) { this.consume(TT.RETURN); var v = (this.peek().type !== TT.NEWLINE && this.peek().type !== TT.EOF) ? this.parseExpr() : null; this.match(TT.NEWLINE); return { type: 'Return', value: v }; }
    if (t.type === TT.PASS)   { this.consume(TT.PASS);   this.match(TT.NEWLINE); return { type: 'Pass' }; }
    if (t.type === TT.BREAK)  { this.consume(TT.BREAK);  this.match(TT.NEWLINE); return { type: 'Break' }; }
    if (t.type === TT.CONTINUE){ this.consume(TT.CONTINUE); this.match(TT.NEWLINE); return { type: 'Continue' }; }
    return this.parseExprStatement();
  };

  Parser.prototype.parseExprStatement = function() {
    var expr = this.parseExpr();
    // Assignment?
    if (this.peek().type === TT.ASSIGN) {
      this.consume(TT.ASSIGN);
      var val = this.parseExpr();
      this.match(TT.NEWLINE);
      if (expr.type === 'Name') return { type: 'Assign', name: expr.val, value: val };
      if (expr.type === 'Index') return { type: 'SetIndex', target: expr.target, index: expr.index, value: val };
      throw new SyntaxError('Invalid assignment target');
    }
    this.match(TT.NEWLINE);
    return { type: 'ExprStat', expr: expr };
  };

  Parser.prototype.parseDef = function() {
    this.consume(TT.DEF);
    var name = this.consume(TT.NAME).val;
    this.consume(TT.LPAREN);
    var params = [];
    while (this.peek().type !== TT.RPAREN) {
      params.push(this.consume(TT.NAME).val);
      if (!this.match(TT.COMMA)) break;
    }
    this.consume(TT.RPAREN);
    this.consume(TT.COLON);
    this.match(TT.NEWLINE);
    var body = this.parseBlock();
    return { type: 'FuncDef', name: name, params: params, body: body };
  };

  Parser.prototype.parseIf = function() {
    this.consume(TT.IF);
    var test = this.parseExpr();
    this.consume(TT.COLON);
    this.match(TT.NEWLINE);
    var body = this.parseBlock();
    var alts = [];
    while (this.peek().type === TT.ELIF) {
      this.consume(TT.ELIF);
      var et = this.parseExpr();
      this.consume(TT.COLON);
      this.match(TT.NEWLINE);
      alts.push({ test: et, body: this.parseBlock() });
    }
    var orelse = null;
    if (this.peek().type === TT.ELSE) {
      this.consume(TT.ELSE);
      this.consume(TT.COLON);
      this.match(TT.NEWLINE);
      orelse = this.parseBlock();
    }
    return { type: 'If', test: test, body: body, alts: alts, orelse: orelse };
  };

  Parser.prototype.parseFor = function() {
    this.consume(TT.FOR);
    var iter = this.consume(TT.NAME).val;
    this.consume(TT.IN);
    var iterable = this.parseExpr();
    this.consume(TT.COLON);
    this.match(TT.NEWLINE);
    var body = this.parseBlock();
    return { type: 'For', iter: iter, iterable: iterable, body: body };
  };

  Parser.prototype.parseWhile = function() {
    this.consume(TT.WHILE);
    var test = this.parseExpr();
    this.consume(TT.COLON);
    this.match(TT.NEWLINE);
    var body = this.parseBlock();
    return { type: 'While', test: test, body: body };
  };

  // Expression with operator precedence (Pratt-style)
  Parser.prototype.parseExpr = function() { return this.parseOr(); };

  Parser.prototype.parseOr = function() {
    var left = this.parseAnd();
    while (this.peek().type === TT.OR) { this.consume(TT.OR); left = { type: 'BinOp', op: 'or', left: left, right: this.parseAnd() }; }
    return left;
  };
  Parser.prototype.parseAnd = function() {
    var left = this.parseNot();
    while (this.peek().type === TT.AND) { this.consume(TT.AND); left = { type: 'BinOp', op: 'and', left: left, right: this.parseNot() }; }
    return left;
  };
  Parser.prototype.parseNot = function() {
    if (this.peek().type === TT.NOT) { this.consume(TT.NOT); return { type: 'UnOp', op: 'not', operand: this.parseNot() }; }
    return this.parseComparison();
  };
  Parser.prototype.parseComparison = function() {
    var left = this.parseAdd();
    var cmpOps = [TT.EQ, TT.NEQ, TT.LT, TT.GT, TT.LE, TT.GE, TT.IN];
    while (cmpOps.indexOf(this.peek().type) !== -1) {
      var op = this.consume().type;
      left = { type: 'BinOp', op: op, left: left, right: this.parseAdd() };
    }
    return left;
  };
  Parser.prototype.parseAdd = function() {
    var left = this.parseMul();
    while (this.peek().type === TT.PLUS || this.peek().type === TT.MINUS) {
      var op = this.consume().type;
      left = { type: 'BinOp', op: op, left: left, right: this.parseMul() };
    }
    return left;
  };
  Parser.prototype.parseMul = function() {
    var left = this.parseUnary();
    while ([TT.STAR, TT.SLASH, TT.DSLASH, TT.PERCENT].indexOf(this.peek().type) !== -1) {
      var op = this.consume().type;
      left = { type: 'BinOp', op: op, left: left, right: this.parseUnary() };
    }
    return left;
  };
  Parser.prototype.parseUnary = function() {
    if (this.peek().type === TT.MINUS) { this.consume(TT.MINUS); return { type: 'UnOp', op: '-', operand: this.parsePrimary() }; }
    return this.parsePostfix(this.parsePrimary());
  };
  Parser.prototype.parsePrimary = function() {
    var t = this.peek();
    if (t.type === TT.NUM) { this.consume(); return { type: 'Literal', val: t.val }; }
    if (t.type === TT.STR) { this.consume(); return { type: 'Literal', val: t.val }; }
    if (t.type === TT.LBRACE) { // list literal
      this.consume(TT.LBRACE);
      var elems = [];
      while (this.peek().type !== TT.RBRACE) {
        elems.push(this.parseExpr());
        if (!this.match(TT.COMMA)) break;
      }
      this.consume(TT.RBRACE);
      return { type: 'List', elems: elems };
    }
    if (t.type === TT.LPAREN) { this.consume(TT.LPAREN); var e = this.parseExpr(); this.consume(TT.RPAREN); return e; }
    if (t.type === TT.NAME || KEYWORDS[t.val] === undefined && t.val) {
      this.consume();
      return { type: 'Name', val: t.val };
    }
    throw new SyntaxError('Unexpected token: ' + JSON.stringify(t));
  };
  Parser.prototype.parsePostfix = function(expr) {
    while (true) {
      if (this.peek().type === TT.LPAREN) { // call
        this.consume(TT.LPAREN);
        var args = [];
        while (this.peek().type !== TT.RPAREN) {
          args.push(this.parseExpr());
          if (!this.match(TT.COMMA)) break;
        }
        this.consume(TT.RPAREN);
        expr = { type: 'Call', callee: expr, args: args };
      } else if (this.peek().type === TT.LBRACE) { // index
        this.consume(TT.LBRACE);
        var idx = this.parseExpr();
        this.consume(TT.RBRACE);
        expr = { type: 'Index', target: expr, index: idx };
      } else if (this.peek().type === TT.DOT) { // attribute
        this.consume(TT.DOT);
        var attr = this.consume(TT.NAME).val;
        expr = { type: 'Attr', target: expr, attr: attr };
      } else break;
    }
    return expr;
  };

  /* ─── Evaluator ──────────────────────────────────────────── */
  var RETURN_SIG  = { signal: 'return' };
  var BREAK_SIG   = { signal: 'break' };
  var CONT_SIG    = { signal: 'continue' };
  var MAX_ITER = 10000; // safety limit

  function Env(parent) { this.vars = {}; this.parent = parent; }
  Env.prototype.get = function(name) {
    if (name in this.vars) return this.vars[name];
    if (this.parent) return this.parent.get(name);
    throw new ReferenceError('Имя "' + name + '" не определено');
  };
  Env.prototype.set = function(name, val) { this.vars[name] = val; };
  Env.prototype.setGlobal = function(name, val) {
    if (this.parent) this.parent.setGlobal(name, val);
    else this.vars[name] = val;
  };

  function evalBlock(block, env) {
    for (var i = 0; i < block.body.length; i++) {
      var r = evalStmt(block.body[i], env);
      if (r === RETURN_SIG || r === BREAK_SIG || r === CONT_SIG) return r;
      if (r && r.signal === 'return') return r;
    }
    return null;
  }

  function evalStmt(node, env) {
    switch (node.type) {
      case 'Pass': return null;
      case 'Break': return BREAK_SIG;
      case 'Continue': return CONT_SIG;
      case 'Assign':
        env.set(node.name, evalExpr(node.value, env));
        return null;
      case 'SetIndex': {
        var tgt = evalExpr(node.target, env);
        var idx = evalExpr(node.index, env);
        tgt[idx] = evalExpr(node.value, env);
        return null;
      }
      case 'FuncDef':
        env.set(node.name, { __func__: true, node: node, closure: env });
        return null;
      case 'Return':
        return { signal: 'return', value: node.value ? evalExpr(node.value, env) : null };
      case 'ExprStat':
        evalExpr(node.expr, env);
        return null;
      case 'If': {
        if (evalExpr(node.test, env)) return evalBlock(node.body, env);
        for (var ai = 0; ai < node.alts.length; ai++) {
          if (evalExpr(node.alts[ai].test, env)) return evalBlock(node.alts[ai].body, env);
        }
        if (node.orelse) return evalBlock(node.orelse, env);
        return null;
      }
      case 'For': {
        var iterable = evalExpr(node.iterable, env);
        if (!Array.isArray(iterable)) throw new TypeError('for loop requires iterable');
        for (var fi = 0; fi < iterable.length && fi < MAX_ITER; fi++) {
          env.set(node.iter, iterable[fi]);
          var fr = evalBlock(node.body, env);
          if (fr === BREAK_SIG) break;
          if (fr && fr.signal === 'return') return fr;
        }
        return null;
      }
      case 'While': {
        var wc = 0;
        while (evalExpr(node.test, env) && wc++ < MAX_ITER) {
          var wr = evalBlock(node.body, env);
          if (wr === BREAK_SIG) break;
          if (wr && wr.signal === 'return') return wr;
        }
        return null;
      }
      case 'Block': return evalBlock(node, env);
      default: throw new Error('Unknown statement: ' + node.type);
    }
  }

  function evalExpr(node, env) {
    switch (node.type) {
      case 'Literal': return node.val;
      case 'Name': return env.get(node.val);
      case 'List': return node.elems.map(function(e) { return evalExpr(e, env); });
      case 'UnOp':
        if (node.op === '-') return -evalExpr(node.operand, env);
        if (node.op === 'not') return !evalExpr(node.operand, env);
        break;
      case 'BinOp': {
        var lv = evalExpr(node.left, env);
        var rv; // lazy eval for and/or
        switch (node.op) {
          case '+': rv = evalExpr(node.right, env); return (typeof lv === 'string' || typeof rv === 'string') ? String(lv) + String(rv) : lv + rv;
          case '-': return lv - evalExpr(node.right, env);
          case '*': return lv * evalExpr(node.right, env);
          case '/': return lv / evalExpr(node.right, env);
          case '//': return Math.floor(lv / evalExpr(node.right, env));
          case '%': return lv % evalExpr(node.right, env);
          case '==': return lv == evalExpr(node.right, env);
          case '!=': return lv != evalExpr(node.right, env);
          case '<':  return lv < evalExpr(node.right, env);
          case '>':  return lv > evalExpr(node.right, env);
          case '<=': return lv <= evalExpr(node.right, env);
          case '>=': return lv >= evalExpr(node.right, env);
          case 'in': rv = evalExpr(node.right, env); return Array.isArray(rv) ? rv.indexOf(lv) !== -1 : String(rv).indexOf(String(lv)) !== -1;
          case 'and': return lv ? evalExpr(node.right, env) : lv;
          case 'or':  return lv ? lv : evalExpr(node.right, env);
        }
        break;
      }
      case 'Call': {
        var callee = evalExpr(node.callee, env);
        var args = node.args.map(function(a) { return evalExpr(a, env); });
        if (typeof callee === 'function') return callee.apply(null, args);
        if (callee && callee.__func__) {
          var fenv = new Env(callee.closure);
          for (var pi = 0; pi < callee.node.params.length; pi++) {
            fenv.set(callee.node.params[pi], args[pi] !== undefined ? args[pi] : null);
          }
          var ret = evalBlock(callee.node.body, fenv);
          return (ret && ret.signal === 'return') ? ret.value : null;
        }
        if (callee && callee.__method__) return callee.fn.apply(null, args);
        throw new TypeError('"' + JSON.stringify(node.callee) + '" не является функцией');
      }
      case 'Index': {
        var obj = evalExpr(node.target, env);
        var key = evalExpr(node.index, env);
        return obj[key];
      }
      case 'Attr': {
        var obj2 = evalExpr(node.target, env);
        var attr = node.attr;
        // Built-in string/list methods
        if (attr === 'append') return { __method__: true, fn: function(v) { obj2.push(v); } };
        if (attr === 'len' || attr === 'length') return obj2.length;
        if (attr === 'upper') return { __method__: true, fn: function() { return String(obj2).toUpperCase(); } };
        if (attr === 'lower') return { __method__: true, fn: function() { return String(obj2).toLowerCase(); } };
        if (attr === 'strip') return { __method__: true, fn: function() { return String(obj2).trim(); } };
        return null;
      }
      default: throw new Error('Unknown expr: ' + node.type);
    }
  }

  /* ─── Built-ins ──────────────────────────────────────────── */
  function makeBuiltins(stdout, craneQueue) {
    var DIR_DX = { N: 0, E: 1, S: 0, W: -1 };
    var DIR_DY = { N: -1, E: 0, S: 1, W: 0 };
    var DIRS = ['N', 'E', 'S', 'W'];

    function craneCmd(cmd, arg) {
      craneQueue.push(arg !== undefined ? { cmd: cmd, arg: arg } : { cmd: cmd });
    }

    // Simulate look() from current crane state + pending queue
    function craneSimLook() {
      if (!global.GameCrane || !global.GameWorld) return 'empty';
      var crane = global.GameCrane;
      var x = crane.x, y = crane.y, dir = crane.dir;
      for (var i = 0; i < craneQueue.length; i++) {
        var c = craneQueue[i].cmd;
        if (c === 'move') { x += DIR_DX[dir]; y += DIR_DY[dir]; }
        else if (c === 'turn_left')  dir = DIRS[(DIRS.indexOf(dir) + 3) % 4];
        else if (c === 'turn_right') dir = DIRS[(DIRS.indexOf(dir) + 1) % 4];
      }
      var tx = x + DIR_DX[dir], ty = y + DIR_DY[dir];
      var world = global.GameWorld;
      if (tx < 0 || tx >= world.gridW || ty < 0 || ty >= world.gridH) return 'wall';
      var tz = world.getTopZ(tx, ty);
      return (tz < 0 ? 'empty' : (world.getBlock(tx, ty, tz) || 'empty'));
    }

    return {
      // Python built-ins
      print: function() {
        var parts = Array.prototype.slice.call(arguments).map(function(a) {
          return (a === null) ? 'None' : (a === true) ? 'True' : (a === false) ? 'False' : String(a);
        });
        stdout.push(parts.join(' ') + '\n');
      },
      range: function(a, b, step) {
        var start = (b !== undefined) ? a : 0;
        var end   = (b !== undefined) ? b : a;
        var s     = (step !== undefined) ? step : 1;
        var result = [];
        if (s > 0) { for (var i = start; i < end; i += s) result.push(i); }
        else       { for (var i = start; i > end; i += s) result.push(i); }
        return result;
      },
      len: function(x) { return Array.isArray(x) ? x.length : String(x).length; },
      int: function(x) { return parseInt(x, 10); },
      float: function(x) { return parseFloat(x); },
      str: function(x) { return String(x); },
      abs: function(x) { return Math.abs(x); },
      max: function() { return Math.max.apply(null, Array.isArray(arguments[0]) ? arguments[0] : Array.prototype.slice.call(arguments)); },
      min: function() { return Math.min.apply(null, Array.isArray(arguments[0]) ? arguments[0] : Array.prototype.slice.call(arguments)); },
      input: function() { return ''; },
      // Crane commands
      move:        function() { craneCmd('move'); },
      turn_left:   function() { craneCmd('turn_left'); },
      turn_right:  function() { craneCmd('turn_right'); },
      lift:        function() { craneCmd('lift'); },
      place:       function() { craneCmd('place'); },
      dig:         function() { craneCmd('dig'); },
      look:        function() { return craneSimLook(); },
      place_block: function(type) { craneCmd('place_block', type || 'brick'); }
    };
  }

  /* ─── Public API ─────────────────────────────────────────── */
  function runCode(code, stdin) {
    var stdout = [];
    var craneQueue = [];
    var err = null;

    try {
      var tokens = tokenize(code);
      var parser = new Parser(tokens);
      var stmts = [];
      parser.skipNewlines();
      while (parser.peek().type !== TT.EOF) {
        stmts.push(parser.parseStatement());
        parser.skipNewlines();
      }

      var env = new Env(null);
      var builtins = makeBuiltins(stdout, craneQueue);
      for (var k in builtins) env.set(k, builtins[k]);

      for (var i = 0; i < stmts.length; i++) {
        evalStmt(stmts[i], env);
      }
    } catch(e) {
      err = e.message || String(e);
    }

    // Replay crane commands with animation
    return new Promise(function(resolve) {
      if (err) { resolve({ stdout: stdout.join(''), error: err }); return; }
      if (craneQueue.length === 0 || !global.GameCrane) {
        resolve({ stdout: stdout.join(''), error: null }); return;
      }
      global.GameCrane.runQueue(craneQueue).then(function() {
        resolve({ stdout: stdout.join(''), error: null });
      }).catch(function(e) {
        resolve({ stdout: stdout.join(''), error: e.message || String(e) });
      });
    });
  }

  global.MiniPython = { runCode: runCode };
})(window);

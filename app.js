// Random++ Compiler - Main Application Logic

const EXAMPLES = [
  {
    title: 'Hello World',
    desc: 'The classic first program',
    code: `# Hello World in Random++
yeet("Hello, World!")
yeet("Welcome to Random++!")`,
  },
  {
    title: 'Variables & Types',
    desc: 'Working with different data types',
    code: `# Variables and data types
name = "Random++"
version = 1.0
is_awesome = nocap
features = ["fast", "fun", "chaotic"]

yeet(f"Language: {name}")
yeet(f"Version: {version}")
yeet(f"Awesome: {is_awesome}")
yeet(f"Features: {features}")
yeet(f"Type of name: {type(name)}")`,
  },
  {
    title: 'FizzBuzz',
    desc: 'Classic coding challenge',
    code: `# FizzBuzz in Random++
vibe i thru range(1, 31):
    bruh i % 15 == 0:
        yeet("FizzBuzz")
    sus i % 3 == 0:
        yeet("Fizz")
    sus i % 5 == 0:
        yeet("Buzz")
    nah:
        yeet(i)`,
  },
  {
    title: 'Functions',
    desc: 'Cooking up some functions',
    code: `# Functions in Random++
cook greet(name, greeting="Hello"):
    serve f"{greeting}, {name}!"

cook factorial(n):
    bruh n <= 1:
        serve 1
    serve n * factorial(n - 1)

cook fibonacci(n):
    a, b = 0, 1
    result = []
    vibe i thru range(n):
        result.append(a)
        a, b = b, a + b
    serve result

yeet(greet("World"))
yeet(greet("Random++", "Welcome to"))
yeet(f"5! = {factorial(5)}")
yeet(f"10! = {factorial(10)}")
yeet(f"Fibonacci(10): {fibonacci(10)}")`,
  },
  {
    title: 'List Comprehensions',
    desc: 'One-liner vibe checks',
    code: `# List comprehensions
squares = [x ** 2 vibe x thru range(10)]
yeet(f"Squares: {squares}")

evens = [x vibe x thru range(20) bruh x % 2 == 0]
yeet(f"Evens: {evens}")

matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
flat = [x vibe row thru matrix vibe x thru row]
yeet(f"Flattened: {flat}")

words = ["hello", "world", "random", "plus"]
upper = [w.upper() vibe w thru words]
yeet(f"Uppercase: {upper}")`,
  },
  {
    title: 'Blueprints & OOP',
    desc: 'Object-oriented programming',
    code: `# Blueprints (classes) in Random++
blueprint Animal:
    cook __init__(self, name, sound):
        self.name = name
        self.sound = sound

    cook speak(self):
        serve f"{self.name} says {self.sound}!"

    cook info(self):
        serve f"I am a {self.name}"

blueprint Dog(Animal):
    cook __init__(self, name):
        self.name = name
        self.sound = "Woof"
        self.tricks = []

    cook learn_trick(self, trick):
        self.tricks.append(trick)
        serve f"{self.name} learned {trick}!"

dog = Dog("Buddy")
yeet(dog.speak())
yeet(dog.learn_trick("sit"))
yeet(dog.learn_trick("shake"))
yeet(f"{dog.name}'s tricks: {dog.tricks}")

cat = Animal("Whiskers", "Meow")
yeet(cat.speak())`,
  },
  {
    title: 'String Methods',
    desc: 'Built-in string operations',
    code: `# String methods
text = "  Hello, Random++ World!  "
yeet(f"Original: '{text}'")
yeet(f"Stripped: '{text.strip()}'")
yeet(f"Upper: '{text.upper()}'")
yeet(f"Lower: '{text.lower()}'")
yeet(f"Title: '{text.title()}'")

csv = "apple,banana,cherry,date"
fruits = csv.split(",")
yeet(f"Split: {fruits}")
yeet(f"Joined: {' | '.join(fruits)}")

msg = "Hello World"
yeet(f"Starts with 'Hello': {msg.startswith('Hello')}")
yeet(f"Ends with 'World': {msg.endswith('World')}")
yeet(f"Replace: {msg.replace('World', 'Random++')}")
yeet(f"Count 'l': {msg.count('l')}")`,
  },
  {
    title: 'Dictionary Operations',
    desc: 'Working with key-value pairs',
    code: `# Dictionary operations
scores = {"Alice": 95, "Bob": 87, "Charlie": 92, "Diana": 98}

yeet("All scores:")
vibe name, score thru scores.items():
    grade = "A" bruh score >= 90 nah "B" bruh score >= 80 nah "C"
    yeet(f"  {name}: {score} ({grade})")

yeet(f"\\nHighest: {max(scores.values())}")
yeet(f"Average: {sum(scores.values()) / len(scores)}")
yeet(f"Students: {scores.keys()}")

# Dictionary comprehension
doubled = {k: v * 2 vibe k, v thru scores.items()}
yeet(f"Doubled: {doubled}")`,
  },
  {
    title: 'Error Handling',
    desc: 'YOLO/oof for graceful error handling',
    code: `# Error handling
cook safe_divide(a, b):
    yolo:
        result = a / b
        serve f"{a} / {b} = {result}"
    oof Exception aka e:
        serve f"Error: {e}"

yeet(safe_divide(10, 3))
yeet(safe_divide(10, 0))

# Custom validation
cook validate_age(age):
    bruh age < 0:
        tantrum "Age cannot be negative"
    bruh age > 150:
        tantrum "Age seems unrealistic"
    serve f"Age {age} is valid"

yolo:
    yeet(validate_age(25))
    yeet(validate_age(-5))
oof Exception aka e:
    yeet(f"Caught: {e}")`,
  },
  {
    title: 'Sorting & Algorithms',
    desc: 'Sorting and algorithmic operations',
    code: `# Sorting algorithms demo
cook bubble_sort(arr):
    n = len(arr)
    vibe i thru range(n):
        vibe j thru range(0, n - i - 1):
            bruh arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    serve arr

cook binary_search(arr, target):
    low = 0
    high = len(arr) - 1
    grind low <= high:
        mid = (low + high) // 2
        bruh arr[mid] == target:
            serve mid
        sus arr[mid] < target:
            low = mid + 1
        nah:
            high = mid - 1
    serve -1

numbers = [64, 34, 25, 12, 22, 11, 90]
yeet(f"Original: {numbers}")
sorted_nums = bubble_sort(numbers)
yeet(f"Sorted:   {sorted_nums}")

idx = binary_search(sorted_nums, 25)
yeet(f"Found 25 at index: {idx}")

idx = binary_search(sorted_nums, 50)
yeet(f"Found 50 at index: {idx}")`,
  },
  {
    title: 'Math & Random',
    desc: 'Mathematical and random operations',
    code: `# Math operations
steal math
steal random

yeet(f"Pi: {math.pi}")
yeet(f"E: {math.e}")
yeet(f"sqrt(144): {math.sqrt(144)}")
yeet(f"factorial(7): {math.factorial(7)}")
yeet(f"gcd(48, 18): {math.gcd(48, 18)}")
yeet(f"pow(2, 10): {pow(2, 10)}")

# Random numbers
yeet(f"\\nRandom int (1-100): {random.randint(1, 100)}")
yeet(f"Random float: {random.random()}")

colors = ["red", "green", "blue", "yellow", "purple"]
yeet(f"Random choice: {random.choice(colors)}")
yeet(f"Sample of 3: {random.sample(colors, 3)}")`,
  },
  {
    title: 'Number Guessing Game',
    desc: 'A simple interactive game',
    code: `# Number Guessing Game (non-interactive demo)
steal random

secret = random.randint(1, 100)
yeet("=== Number Guessing Game ===")
yeet(f"(Secret number is {secret})")

# Simulate AI guessing
low = 1
high = 100
attempts = 0

grind low <= high:
    guess = (low + high) // 2
    attempts += 1

    bruh guess == secret:
        yeet(f"Attempt {attempts}: Guessed {guess} - Correct!")
        bail
    sus guess < secret:
        yeet(f"Attempt {attempts}: Guessed {guess} - Too low!")
        low = guess + 1
    nah:
        yeet(f"Attempt {attempts}: Guessed {guess} - Too high!")
        high = guess - 1

yeet(f"\\nFound {secret} in {attempts} attempts using binary search!")`,
  },
];

class RandomPPApp {
  constructor() {
    this.editor = document.getElementById('codeEditor');
    this.outputEl = document.getElementById('output');
    this.lineNumbers = document.getElementById('lineNumbers');
    this.statusText = document.getElementById('statusText');
    this.statusDot = document.getElementById('statusDot');
    this.lineCountEl = document.getElementById('lineCount');
    this.charCountEl = document.getElementById('charCount');

    this.setupEventListeners();
    this.loadExample(0);
    this.updateLineNumbers();
  }

  setupEventListeners() {
    // Editor events
    this.editor.addEventListener('input', () => this.updateLineNumbers());
    this.editor.addEventListener('scroll', () => this.syncScroll());
    this.editor.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Button events
    document.getElementById('runBtn').addEventListener('click', () => this.runCode());
    document.getElementById('clearBtn').addEventListener('click', () => this.clearOutput());
    document.getElementById('clearCodeBtn').addEventListener('click', () => {
      this.editor.value = '';
      this.updateLineNumbers();
    });
    document.getElementById('examplesBtn').addEventListener('click', () => this.toggleExamples());
    document.getElementById('docsBtn').addEventListener('click', () => this.toggleDocs());

    // Drawer close buttons
    document.getElementById('closeExamples').addEventListener('click', () => this.toggleExamples());
    document.getElementById('closeDocs').addEventListener('click', () => this.toggleDocs());
    document.getElementById('overlay').addEventListener('click', () => this.closeDrawers());

    // Load examples
    this.loadExampleCards();

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.runCode();
      }
    });
  }

  handleKeyDown(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = this.editor.selectionStart;
      const end = this.editor.selectionEnd;
      const value = this.editor.value;

      if (e.shiftKey) {
        // Dedent
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const line = value.substring(lineStart, end);
        if (line.startsWith('    ')) {
          this.editor.value = value.substring(0, lineStart) + line.substring(4);
          this.editor.selectionStart = this.editor.selectionEnd = start - 4;
        }
      } else {
        // Indent
        this.editor.value = value.substring(0, start) + '    ' + value.substring(end);
        this.editor.selectionStart = this.editor.selectionEnd = start + 4;
      }
      this.updateLineNumbers();
    }

    // Auto-indent on Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      const start = this.editor.selectionStart;
      const value = this.editor.value;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const line = value.substring(lineStart, start);
      const indent = line.match(/^\s*/)[0];
      const extraIndent = line.trimEnd().endsWith(':') ? '    ' : '';
      const insertion = '\n' + indent + extraIndent;
      this.editor.value = value.substring(0, start) + insertion + value.substring(start);
      this.editor.selectionStart = this.editor.selectionEnd = start + insertion.length;
      this.updateLineNumbers();
    }
  }

  updateLineNumbers() {
    const lines = this.editor.value.split('\n');
    const count = lines.length;
    let html = '';
    for (let i = 1; i <= count; i++) {
      html += `<span class="line-num">${i}</span>\n`;
    }
    this.lineNumbers.innerHTML = html;
    this.lineCountEl.textContent = `Ln ${count}`;
    this.charCountEl.textContent = `Ch ${this.editor.value.length}`;
  }

  syncScroll() {
    this.lineNumbers.scrollTop = this.editor.scrollTop;
  }

  runCode() {
    const code = this.editor.value;
    if (!code.trim()) {
      this.addOutput('No code to run.', 'warning');
      return;
    }

    this.clearOutput();
    this.setStatus('running', 'Running...');

    const startTime = performance.now();

    try {
      // Lexer
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // Parser
      const parser = new Parser(tokens);
      const ast = parser.parse();

      // Interpreter
      const interpreter = new Interpreter(
        (text, type) => this.addOutput(text, type || 'output'),
        (prompt) => {
          const result = window.prompt(prompt || 'Input:');
          return result || '';
        }
      );

      interpreter.run(ast);

      const elapsed = (performance.now() - startTime).toFixed(2);
      this.addOutput(`\n--- Program finished in ${elapsed}ms ---`, 'system');
      this.setStatus('ready', 'Ready');

    } catch (e) {
      const elapsed = (performance.now() - startTime).toFixed(2);
      let errorMsg = '';

      if (e instanceof LexerError) {
        errorMsg = `SyntaxError (Lexer): ${e.message}`;
      } else if (e instanceof ParseError) {
        errorMsg = `SyntaxError (Parser): ${e.message}`;
      } else if (e instanceof RuntimeError) {
        errorMsg = `RuntimeError: ${e.message}`;
      } else {
        errorMsg = `Error: ${e.message}`;
      }

      this.addOutput(errorMsg, 'error');
      this.addOutput(`\n--- Program failed after ${elapsed}ms ---`, 'system');
      this.setStatus('error', 'Error');
    }
  }

  addOutput(text, type = 'output') {
    const line = document.createElement('div');
    line.className = `output-line ${type}`;
    line.textContent = text;
    this.outputEl.appendChild(line);
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
  }

  clearOutput() {
    this.outputEl.innerHTML = '';
    this.setStatus('ready', 'Ready');
  }

  setStatus(state, text) {
    this.statusDot.className = `status-dot ${state === 'error' ? 'error' : state === 'running' ? 'running' : ''}`;
    this.statusText.textContent = text;
  }

  loadExample(index) {
    this.editor.value = EXAMPLES[index].code;
    this.updateLineNumbers();
    this.closeDrawers();
  }

  loadExampleCards() {
    const container = document.getElementById('examplesList');
    EXAMPLES.forEach((example, index) => {
      const card = document.createElement('div');
      card.className = 'example-card';
      card.innerHTML = `
        <h3>${example.title}</h3>
        <p>${example.desc}</p>
        <pre>${this.escapeHtml(example.code.substring(0, 200))}${example.code.length > 200 ? '...' : ''}</pre>
      `;
      card.addEventListener('click', () => this.loadExample(index));
      container.appendChild(card);
    });
  }

  toggleExamples() {
    const drawer = document.getElementById('examplesDrawer');
    const overlay = document.getElementById('overlay');
    const isOpen = drawer.classList.contains('open');
    this.closeDrawers();
    if (!isOpen) {
      drawer.classList.add('open');
      overlay.classList.add('active');
    }
  }

  toggleDocs() {
    const drawer = document.getElementById('docsDrawer');
    const overlay = document.getElementById('overlay');
    const isOpen = drawer.classList.contains('open');
    this.closeDrawers();
    if (!isOpen) {
      drawer.classList.add('open');
      overlay.classList.add('active');
    }
  }

  closeDrawers() {
    document.getElementById('examplesDrawer').classList.remove('open');
    document.getElementById('docsDrawer').classList.remove('open');
    document.getElementById('overlay').classList.remove('active');
  }

  escapeHtml(str) {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;');
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new RandomPPApp();
});

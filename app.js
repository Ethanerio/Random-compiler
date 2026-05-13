// Random++ Compiler - Main Application Logic

const EXAMPLES = [
  {
    title: 'Hello World',
    desc: 'The classic first program',
    code: `# Hello World in Random++
print("Hello, World!")
print("Welcome to Random++!")`,
  },
  {
    title: 'Variables & Types',
    desc: 'Working with different data types',
    code: `# Variables and data types
name = "Random++"
version = 1.0
is_awesome = True
features = ["fast", "fun", "pythonic"]

print(f"Language: {name}")
print(f"Version: {version}")
print(f"Awesome: {is_awesome}")
print(f"Features: {features}")
print(f"Type of name: {type(name)}")`,
  },
  {
    title: 'FizzBuzz',
    desc: 'Classic coding challenge',
    code: `# FizzBuzz in Random++
for i in range(1, 31):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)`,
  },
  {
    title: 'Functions',
    desc: 'Defining and calling functions',
    code: `# Functions in Random++
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

def fibonacci(n):
    a, b = 0, 1
    result = []
    for i in range(n):
        result.append(a)
        a, b = b, a + b
    return result

print(greet("World"))
print(greet("Random++", "Welcome to"))
print(f"5! = {factorial(5)}")
print(f"10! = {factorial(10)}")
print(f"Fibonacci(10): {fibonacci(10)}")`,
  },
  {
    title: 'List Comprehensions',
    desc: 'Powerful one-liner data transformations',
    code: `# List comprehensions
squares = [x ** 2 for x in range(10)]
print(f"Squares: {squares}")

evens = [x for x in range(20) if x % 2 == 0]
print(f"Evens: {evens}")

matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
flat = [x for row in matrix for x in row]
print(f"Flattened: {flat}")

words = ["hello", "world", "random", "plus"]
upper = [w.upper() for w in words]
print(f"Uppercase: {upper}")`,
  },
  {
    title: 'Classes & OOP',
    desc: 'Object-oriented programming',
    code: `# Classes in Random++
class Animal:
    def __init__(self, name, sound):
        self.name = name
        self.sound = sound

    def speak(self):
        return f"{self.name} says {self.sound}!"

    def info(self):
        return f"I am a {self.name}"

class Dog(Animal):
    def __init__(self, name):
        self.name = name
        self.sound = "Woof"
        self.tricks = []

    def learn_trick(self, trick):
        self.tricks.append(trick)
        return f"{self.name} learned {trick}!"

dog = Dog("Buddy")
print(dog.speak())
print(dog.learn_trick("sit"))
print(dog.learn_trick("shake"))
print(f"{dog.name}'s tricks: {dog.tricks}")

cat = Animal("Whiskers", "Meow")
print(cat.speak())`,
  },
  {
    title: 'String Methods',
    desc: 'Built-in string operations',
    code: `# String methods
text = "  Hello, Random++ World!  "
print(f"Original: '{text}'")
print(f"Stripped: '{text.strip()}'")
print(f"Upper: '{text.upper()}'")
print(f"Lower: '{text.lower()}'")
print(f"Title: '{text.title()}'")

csv = "apple,banana,cherry,date"
fruits = csv.split(",")
print(f"Split: {fruits}")
print(f"Joined: {' | '.join(fruits)}")

msg = "Hello World"
print(f"Starts with 'Hello': {msg.startswith('Hello')}")
print(f"Ends with 'World': {msg.endswith('World')}")
print(f"Replace: {msg.replace('World', 'Random++')}")
print(f"Count 'l': {msg.count('l')}")`,
  },
  {
    title: 'Dictionary Operations',
    desc: 'Working with key-value pairs',
    code: `# Dictionary operations
scores = {"Alice": 95, "Bob": 87, "Charlie": 92, "Diana": 98}

print("All scores:")
for name, score in scores.items():
    grade = "A" if score >= 90 else "B" if score >= 80 else "C"
    print(f"  {name}: {score} ({grade})")

print(f"\\nHighest: {max(scores.values())}")
print(f"Average: {sum(scores.values()) / len(scores)}")
print(f"Students: {scores.keys()}")

# Dictionary comprehension
doubled = {k: v * 2 for k, v in scores.items()}
print(f"Doubled: {doubled}")`,
  },
  {
    title: 'Error Handling',
    desc: 'Try/except for graceful error handling',
    code: `# Error handling
def safe_divide(a, b):
    try:
        result = a / b
        return f"{a} / {b} = {result}"
    except Exception as e:
        return f"Error: {e}"

print(safe_divide(10, 3))
print(safe_divide(10, 0))

# Custom validation
def validate_age(age):
    if age < 0:
        raise "Age cannot be negative"
    if age > 150:
        raise "Age seems unrealistic"
    return f"Age {age} is valid"

try:
    print(validate_age(25))
    print(validate_age(-5))
except Exception as e:
    print(f"Caught: {e}")`,
  },
  {
    title: 'Sorting & Algorithms',
    desc: 'Sorting and algorithmic operations',
    code: `# Sorting algorithms demo
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr

def binary_search(arr, target):
    low = 0
    high = len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

numbers = [64, 34, 25, 12, 22, 11, 90]
print(f"Original: {numbers}")
sorted_nums = bubble_sort(numbers)
print(f"Sorted:   {sorted_nums}")

idx = binary_search(sorted_nums, 25)
print(f"Found 25 at index: {idx}")

idx = binary_search(sorted_nums, 50)
print(f"Found 50 at index: {idx}")`,
  },
  {
    title: 'Math & Random',
    desc: 'Mathematical and random operations',
    code: `# Math operations
import math
import random

print(f"Pi: {math.pi}")
print(f"E: {math.e}")
print(f"sqrt(144): {math.sqrt(144)}")
print(f"factorial(7): {math.factorial(7)}")
print(f"gcd(48, 18): {math.gcd(48, 18)}")
print(f"pow(2, 10): {pow(2, 10)}")

# Random numbers
print(f"\\nRandom int (1-100): {random.randint(1, 100)}")
print(f"Random float: {random.random()}")

colors = ["red", "green", "blue", "yellow", "purple"]
print(f"Random choice: {random.choice(colors)}")
print(f"Sample of 3: {random.sample(colors, 3)}")`,
  },
  {
    title: 'Number Guessing Game',
    desc: 'A simple interactive game',
    code: `# Number Guessing Game (non-interactive demo)
import random

secret = random.randint(1, 100)
print("=== Number Guessing Game ===")
print(f"(Secret number is {secret})")

# Simulate AI guessing
low = 1
high = 100
attempts = 0

while low <= high:
    guess = (low + high) // 2
    attempts += 1
    
    if guess == secret:
        print(f"Attempt {attempts}: Guessed {guess} - Correct!")
        break
    elif guess < secret:
        print(f"Attempt {attempts}: Guessed {guess} - Too low!")
        low = guess + 1
    else:
        print(f"Attempt {attempts}: Guessed {guess} - Too high!")
        high = guess - 1

print(f"\\nFound {secret} in {attempts} attempts using binary search!")`,
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
